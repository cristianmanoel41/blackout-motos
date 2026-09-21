import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import {
  configurado,
  enderecoDeAutorizacao,
} from "@/lib/tiktok";

/*
 * Começa a autorização: manda a loja para a tela do TikTok.
 *
 * O "state" é um número sorteado que vai junto e volta junto.
 * Guardamos ele num cookie de servidor e conferimos na volta:
 * é o que impede alguém de forjar um retorno e conectar outra
 * conta no lugar da loja.
 *
 * A rota fica atrás do login, como o resto do sistema.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!configurado()) {
    return Response.json(
      {
        error:
          "Falta cadastrar TIKTOK_CLIENT_KEY e TIKTOK_CLIENT_SECRET.",
      },
      { status: 503 }
    );
  }

  const estado = randomUUID();

  const resposta = NextResponse.redirect(
    enderecoDeAutorizacao(estado)
  );

  /*
   * O cookie vai preso nesta resposta, e não pelo depósito
   * global: assim ele sai junto com o redirecionamento, sem
   * depender de o Next juntar as duas coisas depois.
   *
   * Dez minutos bastam para autorizar; passou disso, o estado
   * caduca e a volta é recusada.
   */
  resposta.cookies.set("tiktok_estado", estado, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return resposta;
}
