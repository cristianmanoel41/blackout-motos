import { createClient } from './server'

/*
 * Rota interna confere o login ela mesma.
 *
 * Revisão de segurança de 13/11/2026. Antes, estas rotas
 * confiavam só no middleware. Mas o middleware deixa passar,
 * sem conferir, todo endereço que termina em .png, .jpg, .mp4...
 * (são as imagens e o vídeo do site). Hoje isso não vaza nada,
 * porque sem login o banco não devolve dado (RLS). Mas é uma
 * porta a menos se a rota também conferir.
 *
 * Uso, na primeira linha da função da rota:
 *
 *   const semLogin = await recusarSemLogin();
 *   if (semLogin) return semLogin;
 */
export async function recusarSemLogin(): Promise<Response | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) return null

  return Response.json(
    { error: 'Faça login no sistema para continuar.' },
    { status: 401 }
  )
}
