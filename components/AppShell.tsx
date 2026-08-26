'use client'

import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function AppShell({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  /*
   * Telas de documento (recibo) abrem limpas, sem menu
   * nem marca d'agua, para sair certo na impressao.
   */
  const paginaSemMenu =
    pathname === '/' ||
    pathname === '/login' ||
    pathname.startsWith('/recibos/') ||
    pathname.startsWith('/documentos/')

  if (paginaSemMenu) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-preto">
      <Sidebar />

      {/* MARCA D'ÁGUA */}

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          fixed
          inset-0
          z-0
          flex
          items-center
          justify-center
          overflow-hidden
          md:left-64
        "
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-blackout.png"
          alt=""
          className="
            w-[min(90vw,900px)]
            max-w-none
            object-contain
            opacity-[0.06]
            mix-blend-screen
          "
        />
      </div>

      <main
        className="
          relative
          z-10
          min-h-screen
          w-full
          pt-16
          md:ml-64
          md:w-[calc(100%-16rem)]
          md:pt-0
        "
      >
        <div className="w-full p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}