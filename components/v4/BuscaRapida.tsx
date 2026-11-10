'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bike, CornerDownLeft, Search, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ITENS_DO_MENU } from '@/components/v4/menu'

/*
 * A BUSCA RÁPIDA (Ctrl+K)
 *
 * Uma caixa só para ir a qualquer lugar: digita "caixa" e vai
 * para o Caixa, digita a placa e abre a ficha da moto, digita
 * o nome e abre o cliente. Só leitura - não muda nada no banco.
 *
 * Motos e clientes vêm do Supabase com a sessão de quem está
 * logado, então valem as mesmas permissões das outras telas.
 */

type Resultado = {
  chave: string
  titulo: string
  detalhe?: string
  href: string
  tipo: 'pagina' | 'moto' | 'cliente'
}

function semAcento(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export default function BuscaRapida({
  aberta,
  aoFechar,
}: {
  aberta: boolean
  aoFechar: () => void
}) {
  const router = useRouter()
  const campo = useRef<HTMLInputElement>(null)
  const [texto, setTexto] = useState('')
  const [selecionado, setSelecionado] = useState(0)
  const [doBanco, setDoBanco] = useState<Resultado[]>([])

  useEffect(() => {
    if (!aberta) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTexto('')
    setSelecionado(0)
    setDoBanco([])
    window.setTimeout(() => campo.current?.focus(), 20)
  }, [aberta])

  const paginas = useMemo<Resultado[]>(() => {
    const termo = semAcento(texto.trim())
    return ITENS_DO_MENU.filter(
      (item) =>
        !termo || semAcento(`${item.label} ${item.busca || ''}`).includes(termo)
    ).map((item) => ({
      chave: `p-${item.href}`,
      titulo: item.label,
      href: item.href,
      tipo: 'pagina' as const,
    }))
  }, [texto])

  /* Motos e clientes, depois de uma pausa na digitação. */
  useEffect(() => {
    const termo = texto.trim().replace(/[%,()]/g, '')
    if (!aberta || termo.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDoBanco([])
      return
    }

    let cancelado = false
    const espera = window.setTimeout(async () => {
      const supabase = createClient()
      const padrao = `%${termo}%`

      const [motos, clientes] = await Promise.all([
        supabase
          .from('motorcycles')
          .select('id, marca, modelo, ano_modelo, placa, status')
          .or(`placa.ilike.${padrao},modelo.ilike.${padrao},marca.ilike.${padrao}`)
          .order('data_entrada', { ascending: false, nullsFirst: false })
          .limit(6),
        supabase
          .from('customers')
          .select('id, nome, cpf, telefone')
          .or(`nome.ilike.${padrao},cpf.ilike.${padrao}`)
          .order('nome')
          .limit(5),
      ])

      if (cancelado) return

      setDoBanco([
        ...(motos.data || []).map((m) => ({
          chave: `m-${m.id}`,
          titulo: [m.marca, m.modelo, m.ano_modelo].filter(Boolean).join(' '),
          detalhe: [m.placa ? String(m.placa).toUpperCase() : '', m.status === 'vendida' ? 'vendida' : ''].filter(Boolean).join(' · '),
          href: `/motos/${m.id}`,
          tipo: 'moto' as const,
        })),
        ...(clientes.data || []).map((c) => ({
          chave: `c-${c.id}`,
          titulo: String(c.nome || 'Cliente'),
          detalhe: String(c.telefone || c.cpf || ''),
          href: `/clientes/${c.id}`,
          tipo: 'cliente' as const,
        })),
      ])
    }, 220)

    return () => {
      cancelado = true
      window.clearTimeout(espera)
    }
  }, [texto, aberta])

  const lista = [...doBanco, ...paginas]

  function ir(resultado?: Resultado) {
    if (!resultado) return
    aoFechar()
    router.push(resultado.href)
  }

  if (!aberta) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) aoFechar()
      }}
    >
      <div
        role="dialog"
        aria-label="Busca rápida"
        data-v4-busca
        className="w-full max-w-xl overflow-hidden rounded-2xl"
      >
        <div className="flex items-center gap-3 border-b border-white/[.07] px-4">
          <Search size={18} className="shrink-0 text-white/40" />
          <input
            ref={campo}
            data-v4-busca-campo
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value)
              setSelecionado(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') aoFechar()
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelecionado((s) => Math.min(s + 1, lista.length - 1))
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelecionado((s) => Math.max(s - 1, 0))
              }
              if (e.key === 'Enter') ir(lista[selecionado])
            }}
            placeholder="Buscar moto, placa, cliente ou tela..."
            className="h-14 w-full bg-transparent text-[15px] outline-none"
          />
          <kbd className="hidden rounded-md border border-white/10 px-1.5 py-0.5 text-[11px] text-white/40 sm:block">
            Esc
          </kbd>
        </div>

        <ul className="max-h-[55vh] overflow-y-auto p-2">
          {lista.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-white/40">
              Nada encontrado para “{texto}”.
            </li>
          )}

          {lista.map((r, i) => {
            const Icone =
              r.tipo === 'moto'
                ? Bike
                : r.tipo === 'cliente'
                  ? User
                  : ITENS_DO_MENU.find((m) => m.href === r.href)?.icon || Search
            const ativo = i === selecionado
            const primeiroDoTipo = i === 0 || lista[i - 1].tipo !== r.tipo

            return (
              <li key={r.chave}>
                {primeiroDoTipo && (
                  <p className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[.12em] text-white/35">
                    {r.tipo === 'moto' ? 'Motos' : r.tipo === 'cliente' ? 'Clientes' : 'Telas'}
                  </p>
                )}
                <button
                  type="button"
                  onMouseEnter={() => setSelecionado(i)}
                  onClick={() => ir(r)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${
                    ativo ? 'bg-white/[.07] text-white' : 'text-white/75'
                  }`}
                >
                  <Icone size={16} className={ativo ? 'text-[#e0b129]' : 'text-white/40'} />
                  <span className="flex-1 truncate font-medium">{r.titulo}</span>
                  {r.detalhe && (
                    <span className="truncate text-xs text-white/40">{r.detalhe}</span>
                  )}
                  {ativo && <CornerDownLeft size={14} className="text-white/40" />}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
