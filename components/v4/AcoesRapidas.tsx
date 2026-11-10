'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  Bike,
  LayoutDashboard,
  Plus,
  PlusCircle,
  Receipt,
  Search,
  UserPlus,
  Wallet,
  Warehouse,
} from 'lucide-react'
import { itemAtivo } from '@/components/v4/menu'

/*
 * O QUE MAIS SE FAZ, A UM TOQUE
 *
 * "+ Novo" no topo: as telas de cadastro sem passar pelo menu.
 * No celular, a barra de baixo faz o papel do menu para o que
 * se usa toda hora - o polegar alcança, a gaveta fica para o
 * resto.
 *
 * São só atalhos para telas que já existem; nada é gravado aqui.
 */

const NOVOS = [
  { label: 'Comprar moto', detalhe: 'Cadastrar moto que entrou', href: '/motos/nova', icon: Bike },
  { label: 'Novo cliente', detalhe: 'Cadastro com CPF e endereço', href: '/clientes/novo', icon: UserPlus },
  { label: 'Despesa da loja', detalhe: 'Conta, aluguel, material', href: '/despesas/nova', icon: Receipt },
  { label: 'Lançar no caixa', detalhe: 'Entrada ou saída avulsa', href: '/caixa', icon: Wallet },
]

export function BotaoNovo() {
  const [aberto, setAberto] = useState(false)
  const caixa = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    function fora(e: MouseEvent) {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false)
    }
    function esc(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberto(false)
    }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', esc)
    }
  }, [aberto])

  return (
    <div ref={caixa} className="relative hidden md:block">
      <button
        type="button"
        data-v4-novo
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold"
      >
        <Plus size={16} strokeWidth={2.4} />
        Novo
      </button>

      {aberto && (
        <div data-v4-flutuante className="absolute right-0 top-11 z-50 w-72 overflow-hidden rounded-xl p-1.5">
          {NOVOS.map((n) => {
            const Icone = n.icon
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setAberto(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-white/[.06]"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#e0b129]/10 text-[#e0b129]">
                  <Icone size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold text-white">{n.label}</span>
                  <span className="block truncate text-xs text-white/45">{n.detalhe}</span>
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

const ABAS = [
  { label: 'Início', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Estoque', href: '/admin/estoque', icon: Warehouse },
  { label: 'Comprar', href: '/motos/nova', icon: PlusCircle, destaque: true },
  { label: 'Caixa', href: '/caixa', icon: Wallet },
]

export function BarraDeBaixo({ aoBuscar }: { aoBuscar: () => void }) {
  const pathname = usePathname()

  return (
    <nav
      data-v4-abas
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 px-2 pb-[max(.4rem,env(safe-area-inset-bottom))] pt-1.5 md:hidden"
    >
      {ABAS.map((aba) => {
        const Icone = aba.icon
        const ativo = itemAtivo(pathname, aba.href)
        return (
          <Link
            key={aba.href}
            href={aba.href}
            data-ativo={ativo ? 'sim' : undefined}
            className="flex flex-col items-center gap-0.5 rounded-lg py-1 text-[10.5px] font-medium"
          >
            {aba.destaque ? (
              <span className="grid h-8 w-11 place-items-center rounded-full bg-[#e0b129] text-black">
                <Icone size={18} strokeWidth={2.2} />
              </span>
            ) : (
              <span className="grid h-8 place-items-center">
                <Icone size={20} strokeWidth={ativo ? 2.2 : 1.8} />
              </span>
            )}
            {aba.label}
          </Link>
        )
      })}

      <button
        type="button"
        onClick={aoBuscar}
        className="flex flex-col items-center gap-0.5 rounded-lg py-1 text-[10.5px] font-medium"
      >
        <span className="grid h-8 place-items-center">
          <Search size={20} strokeWidth={1.8} />
        </span>
        Buscar
      </button>
    </nav>
  )
}
