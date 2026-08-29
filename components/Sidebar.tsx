'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  FileBarChart,
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
        className="fixed left-4 top-4 z-[60] rounded-xl border border-black/10 bg-white p-2.5 text-black shadow-lg md:hidden"
        aria-label="Abrir menu"
      >
        <Menu size={24} />
      </button>

      {aberto && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setAberto(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-black/10 bg-white shadow-[10px_0_35px_rgba(0,0,0,0.06)] transition-transform duration-200 ${
          aberto ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div className="relative flex h-32 shrink-0 items-center justify-center border-b border-black/10 px-4">
          <Link
            href="/dashboard"
            onClick={() => setAberto(false)}
            className="flex w-full items-center justify-center"
          >
            <span className="relative block h-[92px] w-[190px]">
              {/* Usamos img para evitar falhas do otimizador do Next já vistas neste projeto. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-blackout-clara.png"
                alt="Blackout Motos"
                className="h-full w-full object-contain"
              />
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setAberto(false)}
            className="absolute right-3 top-3 rounded-lg p-2 text-black/60 hover:bg-black/5 hover:text-black md:hidden"
            aria-label="Fechar menu"
          >
            <X size={22} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {menuItems.map((item) => {
            const Icone = item.icon
            const ativo = pathname === item.href || pathname.startsWith(`${item.href}/`)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setAberto(false)}
                className={`group flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-semibold transition-all duration-200 ${
                  ativo
                    ? 'border-[#b68b20] bg-[#d4af37] text-black shadow-[0_5px_0_#8b6918,0_9px_18px_rgba(0,0,0,0.18)] -translate-y-0.5'
                    : 'border-transparent text-black/70 shadow-[0_2px_0_rgba(0,0,0,0.05)] hover:-translate-y-0.5 hover:border-black/10 hover:bg-white hover:text-black hover:shadow-[0_5px_12px_rgba(0,0,0,0.10)]'
                }`}
              >
                <Icone size={18} className={ativo ? 'text-black' : 'text-black/55 group-hover:text-black'} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-black/10 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-black/65 transition hover:bg-red-50 hover:text-red-700"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>
    </>
  )
}
