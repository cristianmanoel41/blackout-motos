'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Warehouse,
  PlusCircle,
  ShoppingCart,
  Users,
  Wrench,
  Receipt,
  Wallet,
  FileBarChart,
  Settings,
  Menu,
  X,
  LogOut,
} from 'lucide-react'

const menuItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Estoque', href: '/estoque', icon: Warehouse },
  { label: 'Cadastrar Moto', href: '/motos/nova', icon: PlusCircle },
  { label: 'Vendas', href: '/vendas', icon: ShoppingCart },
  { label: 'Clientes', href: '/clientes', icon: Users },
  { label: 'Gastos das Motos', href: '/gastos', icon: Wrench },
  { label: 'Despesas da Loja', href: '/despesas', icon: Receipt },
  { label: 'Caixa', href: '/caixa', icon: Wallet },
  { label: 'Relatórios', href: '/relatorios', icon: FileBarChart },
  { label: 'Configurações', href: '/configuracoes', icon: Settings },
]

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
        onClick={() => setAberto(true)}
        className="md:hidden fixed top-4 left-4 z-40 bg-grafite border border-grafite-claro rounded-lg p-2 text-dourado"
        aria-label="Abrir menu"
      >
        <Menu size={24} />
      </button>

      {aberto && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setAberto(false)}
        />
      )}

      <aside
        className={`
          fixed md:static top-0 left-0 h-full w-64 bg-grafite border-r border-grafite-claro
          flex flex-col z-50 transition-transform duration-200
          ${aberto ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        `}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-grafite-claro">
  <div className="flex items-center gap-3">
    <Image
      src="/logo-blackout.png"
      alt="Blackout Motos"
      width={120}
      height={120}
      priority
      className="h-auto w-28 object-contain"
    />
  </div>

  <button
    onClick={() => setAberto(false)}
    className="md:hidden text-texto-suave"
    aria-label="Fechar menu"
  >
    <X size={22} />
  </button>
</div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {menuItems.map((item) => {
            const ativo = pathname === item.href
            const Icone = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setAberto(false)}
                className={`
                  flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition
                  ${
                    ativo
                      ? 'bg-dourado text-preto'
                      : 'text-texto-suave hover:bg-grafite-claro hover:text-texto'
                  }
                `}
              >
                <Icone size={18} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-grafite-claro">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-texto-suave hover:bg-grafite-claro hover:text-red-400 transition"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>
    </>
  )
}