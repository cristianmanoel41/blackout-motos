'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { GRUPOS_DO_MENU, itemAtivo } from '@/components/v4/menu'

/*
 * O MENU LATERAL (v4)
 *
 * Plano e calmo: fundo liso, item sem caixa nem sombra, e o
 * item atual marcado por um fundo leve e o ícone dourado. O
 * dourado sai do resto do menu para valer alguma coisa onde
 * aparece.
 *
 * No celular é a gaveta que a barra do topo abre; quem guarda
 * se está aberta é o AppShell.
 */

export default function Sidebar({
  recolhido = false,
  aoRecolher,
  aberto,
  aoFechar,
}: {
  recolhido?: boolean
  aoRecolher?: (recolhido: boolean) => void
  aberto: boolean
  aoFechar: () => void
}) {
  const seRecolhido = (classes: string) => (recolhido ? classes : '')

  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {aberto && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={aoFechar}
        />
      )}

      <aside
        data-v4-menu
        className={`fixed left-0 top-0 z-50 flex altura-da-tela w-64 flex-col ${seRecolhido('md:w-[72px]')} transition-transform duration-200 ${
          aberto ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div data-v4-logo className={`relative flex h-16 shrink-0 items-center px-5 ${seRecolhido('md:justify-center md:px-2')}`}>
          <Link href="/dashboard" onClick={aoFechar} className="flex items-center">
            <span className={`relative block h-9 w-[120px] ${seRecolhido('md:w-10')}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-blackout-marca.png"
                alt="Blackout Motos"
                className={`h-full w-full object-contain ${recolhido ? 'md:object-left' : 'object-left'}`}
              />
            </span>
          </Link>

          <button
            type="button"
            onClick={aoFechar}
            className="absolute right-3 top-3 rounded-lg p-2 text-white/50 hover:bg-white/5 hover:text-white md:hidden"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className={`flex-1 overflow-y-auto px-3 pb-3 ${seRecolhido('md:px-2')}`}>
          {GRUPOS_DO_MENU.map((grupo) => (
            <div key={grupo.titulo} className="mt-3 first:mt-0">
              <p
                data-v4-grupo
                className={`mb-1 px-3 text-[10.5px] font-semibold uppercase tracking-[.12em] ${seRecolhido('md:hidden')}`}
              >
                {grupo.titulo}
              </p>
              {recolhido && <div className="mx-3 mb-2 hidden h-px bg-white/[.06] md:block" />}

              <div className="space-y-0.5">
                {grupo.itens.map((item) => {
                  const Icone = item.icon
                  const ativo = itemAtivo(pathname, item.href)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={aoFechar}
                      title={recolhido ? item.label : undefined}
                      data-ativo={ativo ? 'sim' : undefined}
                      className={`flex items-center gap-3 rounded-lg px-3 py-[7px] text-[13.5px] font-medium ${seRecolhido('md:justify-center md:px-0')}`}
                    >
                      <Icone size={17} strokeWidth={ativo ? 2.2 : 1.8} />
                      <span className={seRecolhido('md:hidden')}>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div data-v4-rodape className={`flex gap-1 p-2 pb-[max(.5rem,env(safe-area-inset-bottom))] ${seRecolhido('md:flex-col')}`}>
          {aoRecolher && (
            <button
              type="button"
              onClick={() => aoRecolher(!recolhido)}
              title={recolhido ? 'Abrir o menu' : 'Recolher o menu'}
              className="hidden flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2 text-[13px] font-medium md:flex"
            >
              {recolhido ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
              <span className={seRecolhido('md:hidden')}>Recolher</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleLogout}
            title={recolhido ? 'Sair' : undefined}
            data-sair
            className="flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2 text-[13px] font-medium"
          >
            <LogOut size={17} />
            <span className={seRecolhido('md:hidden')}>Sair</span>
          </button>
        </div>
      </aside>
    </>
  )
}
