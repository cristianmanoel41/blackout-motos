'use client'

import { usePathname } from 'next/navigation'
import MarcaDaguaBlackout from '@/components/MarcaDaguaBlackout'
import Sidebar from '@/components/Sidebar'
import styles from './AppShell.module.css'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const paginaDocumento =
    pathname.startsWith('/recibos/') ||
    pathname.startsWith('/documentos/')

  if (paginaDocumento) return <>{children}</>

  if (pathname === '/' || pathname === '/login') {
    return (
      <div className={`${styles.legibilidade} ${styles.loginComLogo}`}>
        <div className={styles.logoLogin} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            data-logo-login-atual="true"
            src="/logo-blackout-clara.png"
            alt=""
          />
        </div>

        {children}
      </div>
    )
  }

  return (
    <div className={`${styles.legibilidade} relative min-h-screen bg-[#f7f8fa]`}>
      <Sidebar />
      <MarcaDaguaBlackout />

      <main className="relative z-10 min-h-screen w-full pt-16 md:ml-64 md:w-[calc(100%-16rem)] md:pt-0">
        <div className="w-full p-4 md:p-6">{children}</div>
      </main>
    </div>
  )
}
