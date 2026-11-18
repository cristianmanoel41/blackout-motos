import { createHash } from "crypto";
import { estoqueDoSite } from "@/lib/dados/estoque-site";

/*
 * A "impressão digital" do site neste momento.
 *
 * O site aberto no navegador pergunta aqui de tempo em tempo
 * (components/site/AtualizarSozinho). Se a impressão mudou -
 * moto nova, moto vendida, preço, foto ou uma versão nova do
 * site publicada - a tela se atualiza sozinha.
 *
 * Devolve só um resumo (hash), nunca o estoque: quem pergunta
 * é visitante sem login.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { motos, fotos, falhou } = await estoqueDoSite();

  /* Consulta que falhou não pode parecer "o estoque mudou". */
  const versao = falhou
    ? null
    : createHash("sha1")
        .update(JSON.stringify({ motos, galerias: fotos.galerias, videos: fotos.videos }))
        .digest("hex")
        .slice(0, 16);

  return Response.json(
    {
      versao,
      deploy: process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || "local",
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
