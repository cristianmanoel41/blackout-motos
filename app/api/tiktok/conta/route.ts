import { createClient } from "@/lib/supabase/server";
import { configurado, contaSalva } from "@/lib/tiktok";

/*
 * Em que pé está a ligação com o TikTok.
 *
 * Devolve só o que a tela precisa mostrar. Token nunca sai
 * daqui, nem para o navegador da própria loja.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const conta = await contaSalva();

  const vale =
    conta?.refresh_expira_em &&
    new Date(conta.refresh_expira_em).getTime() >
      Date.now();

  return Response.json({
    configurado: configurado(),
    conectado: Boolean(conta?.access_token && vale),
    /* Autorização vencida: dá para reconectar num clique. */
    vencida: Boolean(conta?.access_token && !vale),
    conectadoEm: conta?.conectado_em || null,
    valeAte: conta?.refresh_expira_em || null,
  });
}

/* Desligar: some com o token guardado. */
export async function DELETE() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json(
      { error: "Faça login." },
      { status: 401 }
    );
  }

  const { error } = await supabase
    .from("tiktok_conta")
    .delete()
    .eq("id", "principal");

  if (error) {
    return Response.json(
      { error: error.message },
      { status: 502 }
    );
  }

  return Response.json({ ok: true });
}
