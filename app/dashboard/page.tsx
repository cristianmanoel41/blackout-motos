import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: perfil } = await supabase
    .from('profiles')
    .select('nome')
    .eq('id', user?.id)
    .single()

  return (
    <div>
      <h1 className="text-2xl font-bold text-dourado mb-2">
        Bem-vindo, {perfil?.nome ?? 'usuário'} 👋
      </h1>
      <p className="text-texto-suave">
        Este é o seu painel de controle. Em breve, aqui vão aparecer os cards
        com o resumo da loja (motos disponíveis, vendas do mês, faturamento,
        lucro, caixa e muito mais).
      </p>
    </div>
  )
}