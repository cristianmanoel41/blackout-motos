'use client'

import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import styles from './AppShell.module.css'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  /*
   * Telas que nao sao do sistema: o site da loja, a vitrine
   * por link e os documentos para imprimir.
   *
   * Nelas nao entra menu, nem o <main> do painel - e dentro
   * dele que o tema pinta card de preto e inverte texto
   * branco, o que fora do painel sai errado.
   */
  const SITE = [
    '/',
    '/estoque',
    '/financiamento',
    '/sobre',
    '/contato',
  ]

  const foraDoPainel =
    SITE.includes(pathname) ||
    pathname.startsWith('/estoque/') ||
    pathname.startsWith('/novo') ||
    pathname.startsWith('/vitrine/') ||
    pathname.startsWith('/documentos/') ||
    pathname.startsWith('/recibos/')
  if (foraDoPainel) return <>{children}</>

  if (pathname === '/login') {
    return (
      <div className={`${styles.legibilidade} ${styles.loginComLogo}`}>
        <div className={styles.fundoLogin} aria-hidden="true" />

        <div className={styles.logoLogin} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            data-logo-login-atual="true"
            src="/logo-blackout-clara.png"
            alt=""
          />
        </div>

        <div className={styles.conteudoLogin}>{children}</div>
      </div>
    )
  }

  return (
    <div className={`${styles.legibilidade} relative min-h-screen bg-[#f7f8fa]`}>
      <Sidebar />

      <main className="relative z-10 min-h-screen w-full pt-16 md:ml-64 md:w-[calc(100%-16rem)] md:pt-0">
        {/*
          * pb-28: o botao de voltar e fixo no canto de baixo
          * e cobriria a ultima linha de qualquer tela
          * comprida. A folga vale para o painel inteiro, nao
          * so para a tela onde o problema apareceu.
          */}
        <div className="w-full p-4 pb-28 md:p-6 md:pb-28">
          {children}
        </div>
      </main>
    </div>
  )
}
