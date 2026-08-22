import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
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
    <div className="min-h-screen bg-preto text-texto p-8">
      <h1 className="text-2xl font-bold text-dourado">
        Bem-vindo, {perfil?.nome ?? 'usuário'} 👋
      </h1>
      <p className="text-texto-suave mt-2">
        Papel: {perfil?.papel} — Login funcionando corretamente com o Supabase.
      </p>
      <p className="text-texto-suave mt-1">
        (Este é um dashboard temporário. Na próxima etapa vamos construir o
        painel completo com menu lateral, cards e gráficos.)
      </p>
    </div>
  )
}