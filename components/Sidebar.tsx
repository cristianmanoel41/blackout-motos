'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  FileBarChart,
  History,
  Sparkles,
  LayoutDashboard,
  LogOut,
  Megaphone,
  BellRing,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  PlusCircle,
  Receipt,
  Settings,
  ShoppingCart,
  Users,
  Wallet,
  Warehouse,
  Wrench,
  NotebookPen,
  X,
} from 'lucide-react'

const menuItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Estoque', href: '/admin/estoque', icon: Warehouse },
  { label: 'Comprar / Cadastrar Moto', href: '/motos/nova', icon: PlusCircle },
  { label: 'Vendas', href: '/vendas', icon: ShoppingCart },
  { label: 'Clientes', href: '/clientes', icon: Users },
  { label: 'Anúncios na OLX', href: '/olx', icon: Megaphone },
  /* A campanha do mês, montada com o pátio de hoje. */
  { label: 'Marketing', href: '/marketing', icon: Sparkles },
  { label: 'Lista de Interesse', href: '/interessados', icon: BellRing },
  { label: 'Capacetes', href: '/capacetes', icon: Package },
  { label: 'Gastos das Motos', href: '/gastos', icon: Wrench },
  { label: 'Despesas da Loja', href: '/despesas', icon: Receipt },
  { label: 'Anotações do Dia', href: '/anotacoes', icon: NotebookPen },
  { label: 'Caixa', href: '/caixa', icon: Wallet },
  { label: 'Relatórios', href: '/relatorios', icon: FileBarChart },
  { label: 'Histórico', href: '/historico', icon: History },
  { label: 'Configurações', href: '/configuracoes', icon: Settings },
] as const

export default function Sidebar({
  recolhido = false,
  aoRecolher,
}: {
  /* Menu só com os ícones, no computador. No celular o menu
     é a gaveta de sempre e isto não vale. */
  recolhido?: boolean
  aoRecolher?: (recolhido: boolean) => void
}) {
  /* As classes que só valem no computador com o menu recolhido. */
  const seRecolhido = (classes: string) => (recolhido ? classes : '')

  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [aberto, setAberto] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="fixed left-4 top-4 z-[60] rounded-2xl border border-[#e0b129]/35 bg-gradient-to-b from-[#1b1e22] to-[#101214] p-3 text-[#f0c640] shadow-[0_10px_30px_rgba(0,0,0,.45)] md:hidden"
        aria-label="Abrir menu"
      >
        <Menu size={23} />
      </button>

      {aberto && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] md:hidden"
          onClick={() => setAberto(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex altura-da-tela w-64 flex-col ${seRecolhido('md:w-[76px]')} border-r border-black/[.07] bg-white shadow-[10px_0_35px_rgba(15,23,42,.05)] transition-transform duration-200 ${
          aberto ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div className={`relative flex h-[88px] shrink-0 items-center justify-center border-b border-black/[.07] px-4 ${seRecolhido('md:h-20 md:px-2')}`}>
          <Link
            href="/dashboard"
            onClick={() => setAberto(false)}
            className="flex w-full items-center justify-center"
          >
            {/*
              logo-blackout-marca.png sai do timbre dos contratos,
              onde a logo esta em 1278x475 - dez vezes mais
              resolucao que o arquivo antigo.
              A arte e branca com MOTOS em dourado, e o fundo e
              transparente de verdade: ate 02/10/2026 era um JPEG
              de fundo preto, apagado por mix-blend-mode screen
              mais um contraste alto. Os dois truques sairam junto.
            */}
            <span className={`relative block h-[68px] w-[180px] ${seRecolhido('md:h-10 md:w-14')}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-blackout-marca.png"
                alt="Blackout Motos"
                className="h-full w-full object-contain"
              />
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setAberto(false)}
            className="absolute right-3 top-3 rounded-xl p-2 text-white/55 hover:bg-white/10 hover:text-[#f0c640] md:hidden"
            aria-label="Fechar menu"
          >
            <X size={21} />
          </button>
        </div>

        <nav className={`flex-1 space-y-1 overflow-y-auto px-3 py-3 ${seRecolhido('md:px-2')}`}>
          {menuItems.map((item) => {
            const Icone = item.icon
            const ativo =
              pathname === item.href || pathname.startsWith(`${item.href}/`)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setAberto(false)}
                title={recolhido ? item.label : undefined}
                className={`group relative flex items-center gap-3 ${seRecolhido('md:justify-center md:px-0')} overflow-hidden rounded-xl border px-3 py-2.5 text-sm font-extrabold transition-all duration-200 ${
                  ativo
                    ? 'menu-item-ativo -translate-y-px'
                    : 'border-transparent bg-white text-black/65 hover:-translate-y-px hover:border-black/[.07] hover:bg-[#fafafa] hover:text-black hover:shadow-[0_7px_18px_rgba(15,23,42,.06)]'
                }`}
              >
                {ativo && (
                  <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-[#d3a516] shadow-[0_0_12px_rgba(211,165,22,.55)]" />
                )}

                <Icone
                  size={18}
                  className={
                    ativo
                      ? '!text-[#e2b72d]'
                      : 'text-black/45 group-hover:text-[#a97800]'
                  }
                />

                <span className={`${ativo ? '!text-white' : ''} ${seRecolhido('md:hidden')}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        {/*
          * O rodapé numa linha só: Recolher e Sair lado a lado.
          * Era um bloco de três andares, com um cartão "Sistema
          * de gestão" que repetia a logo - no notebook ele
          * comia metade da lista do menu.
          *
          * Recolher o menu deixa só os ícones e dá à tela uns
          * 180px a mais: é o que faz a tabela larga caber no
          * notebook sem diminuir a letra.
          */}
        <div className={`flex gap-1 border-t border-white/[.07] p-2 pb-[max(.5rem,env(safe-area-inset-bottom))] ${seRecolhido('md:flex-col')}`}>
          {aoRecolher && (
            <button
              type="button"
              onClick={() => aoRecolher(!recolhido)}
              title={recolhido ? 'Abrir o menu' : 'Recolher o menu'}
              className="hidden flex-1 items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-sm font-extrabold text-black/60 transition hover:bg-white/10 hover:text-[#f0c640] md:flex"
            >
              {recolhido ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              <span className={seRecolhido('md:hidden')}>Recolher</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleLogout}
            title={recolhido ? 'Sair' : undefined}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-sm font-extrabold text-black/60 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut size={18} />
            <span className={seRecolhido('md:hidden')}>Sair</span>
          </button>
        </div>
      </aside>
    </>
  )
}
