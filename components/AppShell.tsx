'use client'

import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function AppShell({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const paginaSemMenu =
    pathname === '/' ||
    pathname === '/login'

  if (paginaSemMenu) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-preto">
      <Sidebar />

      <main
        className="
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