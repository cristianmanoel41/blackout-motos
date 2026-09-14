import {
  enderecoDeRetorno,
  salvarConta,
  trocarCodigoPorToken,
} from "@/lib/olx";

/*
 * Onde a OLX devolve a loja depois de autorizar.
 *
 * O codigo de uso unico vira o token guardado, e a pessoa
 * volta para Configuracoes com o resultado escrito na tela -
 * sem JSON cru na cara de quem nao e programador.
 */

export const dynamic = "force-dynamic";

function voltarPara(requisicao: Request, parametro: string) {
  const origem = new URL(requisicao.url).origin;

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${origem}/configuracoes?${parametro}`,
    },
  });
}

export async function GET(requisicao: Request) {
  const url = new URL(requisicao.url);

  const codigo = url.searchParams.get("code");
  const estado = url.searchParams.get("state");
  const recusado = url.searchParams.get("error");

  if (recusado) {
    return voltarPara(requisicao, "olx=recusado");
  }

  if (!codigo) {
    return voltarPara(requisicao, "olx=sem_codigo");
  }

  const guardado = requisicao.headers
    .get("cookie")
    ?.split(";")
    .map((parte) => parte.trim())
    .find((parte) => parte.startsWith("olx_state="))
    ?.slice("olx_state=".length);

  if (!guardado || guardado !== estado) {
    return voltarPara(requisicao, "olx=estado_invalido");
  }

  try {
    const dados = await trocarCodigoPorToken(
      codigo,
      enderecoDeRetorno(requisicao)
    );

    await salvarConta(dados);

    return voltarPara(requisicao, "olx=conectado");
  } catch (falha) {
    const mensagem =
      falha instanceof Error
        ? falha.message
        : "erro desconhecido";

    return voltarPara(
      requisicao,
      `olx=erro&motivo=${encodeURIComponent(mensagem)}`
    );
  }
}
