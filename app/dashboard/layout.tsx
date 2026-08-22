import Sidebar from '@/components/Sidebar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: perfil } = await supabase
    .from('profiles')
    .select('nome, papel')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex min-h-screen bg-preto">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-grafite-claro bg-grafite px-6 py-4 flex items-center justify-end md:justify-between">
          <span className="hidden md:block text-texto-suave text-sm">
            Painel de Gestão
          </span>
          <span className="text-sm text-texto">
            Olá, <span className="text-dourado font-medium">{perfil?.nome ?? 'usuário'}</span>
          </span>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}