'use client'

import { usePathname } from 'next/navigation'
import Image from 'next/image'
import Sidebar from '@/components/Sidebar'

export default function AppShell({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  /*
   * Recibos e documentos ficam limpos:
   * sem menu e sem marca-d'água.
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

      {/* MARCA-D'ÁGUA BLACKOUT MOTOS */}
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
        <div
          className="
            relative
            h-[280px]
            w-[min(78vw,720px)]
            opacity-[0.18]
          "
        >
          <Image
            src="/logo-blackout.png"
            alt=""
            fill
            priority
            quality={100}
            sizes="(max-width: 768px) 78vw, 720px"
            className="
              select-none
              object-contain
              drop-shadow-[0_0_18px_rgba(212,175,55,0.22)]
            "
          />
        </div>
      </div>

      {/* CONTEÚDO */}
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