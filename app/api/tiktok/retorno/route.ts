import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { trocarCodigo } from "@/lib/tiktok";

/*
 * A volta da tela do TikTok.
 *
 * Confere o "state" contra o cookie, troca o código por tokens
 * e devolve a pessoa para Configurações com o recado do que
 * aconteceu - nada de tela branca de API no meio do caminho.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function voltarPara(pedido: Request, recado: string) {
  const destino = new URL("/configuracoes", pedido.url);

  destino.searchParams.set("tiktok", recado);

  const resposta = NextResponse.redirect(destino);

  /* O estado ja foi usado; nao serve mais para nada. */
  resposta.cookies.delete("tiktok_estado");

  return resposta;
}

export async function GET(pedido: Request) {
  const endereco = new URL(pedido.url);

  const codigo = endereco.searchParams.get("code");
  const estado = endereco.searchParams.get("state");

  /* A pessoa pode ter desistido na tela do TikTok. */
  if (endereco.searchParams.get("error")) {
    return voltarPara(pedido, "cancelado");
  }

  const biscoitos = await cookies();

  const guardado = biscoitos.get("tiktok_estado")?.value;

  if (!codigo || !estado || estado !== guardado) {
    return voltarPara(pedido, "estado");
  }

  try {
    await trocarCodigo(codigo);
  } catch (erro: any) {
    console.error("TikTok: não deu para conectar", erro);

    return voltarPara(pedido, "falhou");
  }

  return voltarPara(pedido, "ok");
}
