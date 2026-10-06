import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/*
 * O CONTRATO ASSINADO, PARA O CLIENTE
 *
 * É o endereço que vai na mensagem de WhatsApp. Quem abre recebe
 * o PDF; quem não tem o código, ou cujo link foi revogado, não
 * recebe nada.
 *
 * POR QUE AQUI TEM CHAVE DE SERVIÇO
 *
 * O balde dos contratos é fechado: nem a chave pública do site
 * lê. Isso é de propósito - o arquivo tem CPF, endereço e a
 * assinatura das duas partes, e um balde aberto protegeria
 * apenas por obscuridade do endereço.
 *
 * Então quem lê é o servidor, com a chave de serviço, DEPOIS de
 * conferir o token. O cliente nunca vê o endereço do arquivo no
 * Storage: ele vê este endereço, e é este que a loja revoga.
 *
 * A chave vive só neste arquivo e só no servidor. Se ela
 * faltar, a rota diz que não está configurada em vez de abrir o
 * contrato por um caminho mais frouxo.
 */

const BALDE = "contratos-assinados";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const endereco = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chaveDeServico = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!endereco || !chaveDeServico) {
    return new Response(
      "A entrega de contratos ainda não foi configurada.",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  const supabase = createClient(endereco, chaveDeServico, {
    auth: { persistSession: false },
  });

  /*
   * A função confere o token e o "ativo" por conta própria.
   *
   * Ela existe para isto: a regra de quem pode ver mora no
   * banco, não espalhada pelo código. Revogou, devolve vazio.
   */
  const { data, error } = await supabase.rpc("contrato_assinado", {
    p_token: token,
  });

  const contrato = (data || [])[0] as
    | { arquivo: string; paginas: number; criado_em: string }
    | undefined;

  if (error || !contrato) {
    return new Response(
      [
        "Este link não está mais disponível.",
        "",
        "Se você precisa da cópia do seu contrato, fale com a Blackout Motos.",
      ].join("\n"),
      {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }
    );
  }

  const { data: arquivo, error: erroArquivo } = await supabase.storage
    .from(BALDE)
    .download(contrato.arquivo);

  if (erroArquivo || !arquivo) {
    return new Response(
      "Não consegui abrir o arquivo do contrato. Fale com a loja.",
      { status: 502, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  /*
   * Ver ou baixar, conforme o botão que a pessoa apertou.
   *
   * `inline` abre na tela, que é o que quem só quer conferir
   * espera. `attachment` manda salvar, e é o que o botão de
   * baixar pede - sem isso o cliente dependeria do menu do
   * navegador dele, que muda de aparelho para aparelho.
   */
  const baixar =
    new URL(_request.url).searchParams.get("baixar") === "1";

  const nome = "Contrato - Blackout Motos.pdf";

  return new Response(await arquivo.arrayBuffer(), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${
        baixar ? "attachment" : "inline"
      }; filename="${nome}"`,
      /*
       * Sem cache em lugar nenhum do caminho.
       *
       * Revogar precisa valer na hora. Se um intermediário
       * guardasse a cópia, o link continuaria servindo o
       * contrato depois de a loja cortar.
       */
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
