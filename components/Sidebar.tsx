'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  FileBarChart,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PlusCircle,
  Receipt,
  Settings,
  ShoppingCart,
  Users,
  Wallet,
  Warehouse,
  Wrench,
  X,
} from 'lucide-react'

const menuItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Estoque', href: '/estoque', icon: Warehouse },
  { label: 'Comprar / Cadastrar Moto', href: '/motos/nova', icon: PlusCircle },
  { label: 'Vendas', href: '/vendas', icon: ShoppingCart },
  { label: 'Clientes', href: '/clientes', icon: Users },
  { label: 'Capacetes', href: '/capacetes', icon: Package },
  { label: 'Gastos das Motos', href: '/gastos', icon: Wrench },
  { label: 'Despesas da Loja', href: '/despesas', icon: Receipt },
  { label: 'Caixa', href: '/caixa', icon: Wallet },
  { label: 'Relatórios', href: '/relatorios', icon: FileBarChart },
  { label: 'Histórico', href: '/historico', icon: History },
  { label: 'Configurações', href: '/configuracoes', icon: Settings },
] as const

export default function Sidebar() {
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
        className="fixed left-4 top-4 z-[60] rounded-2xl border border-black/10 bg-white p-3 text-black shadow-[0_10px_30px_rgba(0,0,0,.12)] md:hidden"
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
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-black/[.07] bg-white shadow-[10px_0_35px_rgba(15,23,42,.05)] transition-transform duration-200 ${
          aberto ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div className="relative flex h-32 shrink-0 items-center justify-center border-b border-black/[.07] px-4">
          <Link
            href="/dashboard"
            onClick={() => setAberto(false)}
            className="flex w-full items-center justify-center"
          >
            {/*
              logo-blackout-menu.png sai do timbre dos contratos,
              onde a logo está em 1278x475 - dez vezes mais
              resolução que o arquivo antigo.
              A arte é branca sobre preto, então foi invertida
              para o fundo claro: capacete e BLACKOUT em preto,
              MOTOS no dourado original. O ruído do JPEG foi
              tratado antes da inversão, senão cada sujeirinha
              do fundo virava um ponto cinza no branco.
            */}
            <span className="relative block h-[88px] w-[214px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-blackout-menu.png"
                alt="Blackout Motos"
                className="h-full w-full object-contain"
              />
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setAberto(false)}
            className="absolute right-3 top-3 rounded-xl p-2 text-black/55 hover:bg-black/5 hover:text-black md:hidden"
            aria-label="Fechar menu"
          >
            <X size={21} />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4">
          {menuItems.map((item) => {
            const Icone = item.icon
            const ativo =
              pathname === item.href || pathname.startsWith(`${item.href}/`)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setAberto(false)}
                className={`group relative flex items-center gap-3 overflow-hidden rounded-xl border px-3 py-3 text-sm font-extrabold transition-all duration-200 ${
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

                <span className={ativo ? '!text-white' : ''}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-black/[.07] p-3">
          <div className="mb-3 rounded-2xl border border-[#d7b447]/30 bg-[linear-gradient(145deg,#fffdf7,#f7edcf)] p-3 shadow-[inset_0_1px_0_#fff,0_8px_20px_rgba(169,120,0,.07)]">
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#8a6400]">
              Blackout Motos
            </p>
            <p className="mt-1 text-xs font-bold text-black/50">
              Sistema de gestão
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-extrabold text-black/60 transition hover:bg-red-50 hover:text-red-700"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>
    </>
  )
}
