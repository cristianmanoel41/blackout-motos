import { createClient } from "@/lib/supabase/server";
import {
  chegadaDaVisita,
  dispositivoDoAgente,
  ehRobo,
} from "@/lib/dados/origem-visita";

/*
 * Onde as visitas ao site são registradas.
 *
 * A página manda o mínimo - o endereço aberto, a moto da ficha
 * e as duas pistas cruas de onde a pessoa veio. Quem pensa é
 * daqui para dentro: classificar a origem e reconhecer o
 * aparelho do lado do servidor deixa o site sem uma linha de
 * regra de negócio, e permite corrigir a classificação depois
 * sem publicar página nova.
 *
 * A rota não escreve na tabela: chama a função do banco, que é
 * a única com permissão. Assim o visitante nunca tem acesso ao
 * que o site inteiro fez - isso é informação da loja.
 *
 * Responde sempre 204, mesmo quando não grava. O navegador
 * dispara isto por `sendBeacon`, sem ninguém do outro lado
 * esperando resposta: erro aqui não pode virar erro na tela de
 * quem está olhando moto.
 */

export const runtime = "nodejs";

function texto(valor: unknown, limite: number) {
  return String(valor ?? "").slice(0, limite);
}

const NADA = new Response(null, { status: 204 });

export async function POST(requisicao: Request) {
  const agente = requisicao.headers.get("user-agent") || "";

  if (ehRobo(agente)) return NADA;

  const corpo = await requisicao.json().catch(() => null);

  const caminho = texto(corpo?.caminho, 200).trim();

  if (!caminho.startsWith("/")) return NADA;

  const tipo =
    corpo?.tipo === "whatsapp" ? "whatsapp" : "pagina";

  /*
   * Só a primeira tela de cada visita carrega origem. Dentro
   * do site o navegador continua dizendo "veio do Instagram"
   * em toda página, porque o endereço de origem é gravado na
   * hora que a aba carregou e não muda mais - sem esta trava,
   * quem entrou uma vez e abriu seis motos contaria como seis
   * pessoas vindas do Instagram.
   */
  const chegada = corpo?.primeira
    ? chegadaDaVisita(
        texto(corpo?.referencia, 300),
        texto(corpo?.busca, 300),
        /* O cabeçalho traz a porta junto no localhost, e o
           endereço de origem não - sem cortar, o site acharia
           que é outro site e contaria chegada a cada clique. */
        (requisicao.headers.get("host") || "").split(":")[0]
      )
    : { origem: null, campanha: null };

  const moto =
    typeof corpo?.moto === "string" &&
    /^[0-9a-f-]{36}$/i.test(corpo.moto)
      ? corpo.moto
      : null;

  const supabase = await createClient();

  const { error } = await supabase.rpc("registrar_visita", {
    p_caminho: caminho,
    p_tipo: tipo,
    p_moto: moto,
    p_origem: chegada.origem,
    p_referencia: chegada.origem
      ? texto(corpo?.referencia, 200) || null
      : null,
    p_campanha: chegada.campanha,
    p_dispositivo: dispositivoDoAgente(agente),
  });

  if (error) {
    console.error("Visita não registrada:", error);
  } else if (process.env.NODE_ENV !== "production") {
    /*
     * Em desenvolvimento, diz em voz alta o que entrou.
     *
     * Medição falha calada por natureza - ninguém do outro
     * lado esperando resposta -, e isso torna difícil saber se
     * um clique foi contado ou perdido. Esta linha só existe
     * no `next dev`; em produção não é impressa.
     */
    console.log(
      `[visita] ${tipo} ${caminho} moto=${moto || "-"} origem=${
        chegada.origem || "-"
      }`
    );
  }

  return NADA;
}
