import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/*
 * BAIXAR O CRLV PELA VITRINE
 *
 * A loja parceira que financia precisa do CRLV para passar a
 * ficha da moto no banco. O arquivo fica no balde "vistorias",
 * que é fechado - tem nome e CPF do dono.
 *
 * Quem decide se pode é o banco, na função crlv_da_vitrine: o
 * link precisa estar ativo, com "Liberar CRLV" ligado, e a moto
 * disponível. Só então o servidor gera, com a chave de serviço,
 * um link de download que vence em um minuto, e manda o
 * navegador para ele. O endereço do arquivo no Storage nunca
 * aparece na vitrine; desligar a opção ou o link corta na hora.
 */

const BALDE = "vistorias";

function texto(mensagem: string, status: number) {
  return new Response(mensagem, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string; moto: string }> }
) {
  const { token, moto } = await params;

  const endereco = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chaveDeServico = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!endereco || !chaveDeServico) {
    return texto("O download do CRLV ainda não foi configurado.", 503);
  }

  const supabase = createClient(endereco, chaveDeServico, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.rpc("crlv_da_vitrine", {
    p_token: token,
    p_moto: moto,
  });

  const crlv = (data || [])[0] as
    | { arquivo_path: string; arquivo_nome: string }
    | undefined;

  if (error || !crlv) {
    return texto(
      "CRLV indisponível para este link. Peça à Blackout Motos.",
      404
    );
  }

  const { data: assinado, error: erroAssinatura } =
    await supabase.storage
      .from(BALDE)
      .createSignedUrl(crlv.arquivo_path, 60, {
        download: crlv.arquivo_nome || "crlv.pdf",
      });

  if (erroAssinatura || !assinado?.signedUrl) {
    return texto("Não foi possível gerar o download do CRLV.", 500);
  }

  return Response.redirect(assinado.signedUrl, 302);
}
