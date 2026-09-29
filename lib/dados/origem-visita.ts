/*
 * De onde a pessoa veio, e em que aparelho.
 *
 * O navegador entrega duas pistas cruas - o endereço de onde a
 * pessoa clicou (`document.referrer`) e o que veio depois do
 * "?" no link. Aqui elas viram um nome que a loja lê:
 * Instagram, Google, OLX, Direto.
 *
 * Classificar na hora de gravar, e não na hora de mostrar, é o
 * que deixa o painel somar por origem sem ler linha por linha.
 * O endereço cru fica guardado do lado, para quando "Outro
 * site" aparecer e alguém quiser saber qual era.
 */

/*
 * As redes chegam com endereço diferente do nome delas. O
 * Instagram manda `l.instagram.com`; o Facebook, `l.facebook.com`
 * ou `lm.facebook.com`; o WhatsApp, `wa.me` ou `l.wa.me`. É por
 * isso que a comparação é por pedaço do nome, e não igualdade.
 */
const REDES: { marca: RegExp; nome: string }[] = [
  { marca: /instagram/, nome: "Instagram" },
  { marca: /facebook|fb\.com|fb\.me/, nome: "Facebook" },
  { marca: /wa\.me|whatsapp/, nome: "WhatsApp" },
  { marca: /tiktok/, nome: "TikTok" },
  { marca: /olx/, nome: "OLX" },
  { marca: /mercadolivre|mercadolibre/, nome: "Mercado Livre" },
  { marca: /webmotors/, nome: "Webmotors" },
  { marca: /youtube|youtu\.be/, nome: "YouTube" },
  { marca: /google/, nome: "Google" },
  { marca: /bing|duckduckgo|yahoo|ecosia/, nome: "Busca" },
];

function host(endereco: string) {
  try {
    return new URL(endereco).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/*
 * O nome da rede a partir do endereço de onde veio o clique.
 *
 * Devolve o próprio host quando não reconhece: um site de
 * classificados novo mandando gente é notícia boa, e some se
 * tudo que não é conhecido virar "Outro".
 */
function pelaReferencia(referencia: string) {
  const endereco = host(referencia);

  if (!endereco) return null;

  const rede = REDES.find((item) => item.marca.test(endereco));

  if (rede) return rede.nome;

  /* www.alguma-coisa.com.br → alguma-coisa.com.br */
  return endereco.replace(/^www\./, "");
}

export type Chegada = {
  origem: string | null;
  campanha: string | null;
};

/*
 * De onde veio esta chegada.
 *
 * `propria` é o endereço do próprio site: quem vem de lá não
 * está chegando, está andando dentro de casa - e isso não é
 * origem nenhuma.
 *
 * A ordem importa. O `utm_source` vem primeiro porque é o que
 * a loja escreveu de propósito no link do anúncio, e vale mais
 * do que qualquer dedução. Depois o endereço de onde veio o
 * clique. Só no fim os rastros de anúncio (`fbclid`, `gclid`),
 * que servem justamente para quando o aplicativo apaga o
 * endereço - o Instagram faz isso.
 */
export function chegadaDaVisita(
  referencia: string,
  busca: string,
  propria: string
): Chegada {
  const parametros = new URLSearchParams(
    busca.startsWith("?") ? busca.slice(1) : busca
  );

  const campanha =
    parametros.get("utm_campaign") ||
    parametros.get("utm_content") ||
    null;

  const marcada = parametros.get("utm_source");

  if (marcada) {
    return {
      origem: pelaReferencia(`https://${marcada}`) || marcada,
      campanha,
    };
  }

  const de = host(referencia);

  /* Veio de dentro do próprio site: não é chegada. */
  if (de && propria && de.replace(/^www\./, "") === propria.replace(/^www\./, "")) {
    return { origem: null, campanha: null };
  }

  const rede = pelaReferencia(referencia);

  if (rede) return { origem: rede, campanha };

  if (parametros.has("fbclid")) {
    return { origem: "Instagram ou Facebook", campanha };
  }

  if (parametros.has("gclid")) {
    return { origem: "Google", campanha };
  }

  /*
   * Sem endereço de origem: a pessoa digitou, tinha salvo, ou
   * clicou num link fora do navegador. Para a loja é tudo a
   * mesma coisa - chegou sozinha.
   */
  return { origem: "Direto", campanha };
}

/*
 * Em que aparelho a pessoa está.
 *
 * Sai do user-agent, que o navegador manda sozinho em toda
 * requisição - não é pergunta que se faz à página, e por isso
 * não depende de nada do lado de lá.
 */
export function dispositivoDoAgente(agente: string) {
  const texto = (agente || "").toLowerCase();

  if (/ipad|tablet|playbook|silk/.test(texto)) return "tablet";

  if (/mobi|android|iphone|ipod|phone/.test(texto)) {
    return "celular";
  }

  return "computador";
}

/*
 * Se quem bateu na porta é robô.
 *
 * A medição roda no navegador, então robô de buscador quase
 * nunca chega aqui - quase. O que chega são os que executam
 * script para montar a prévia do link: WhatsApp, Facebook,
 * Slack. Contar essa gente como visita inflaria justamente o
 * número que a loja usa para decidir onde anunciar.
 */
const ROBOS =
  /bot|crawler|spider|crawling|preview|headless|lighthouse|pagespeed|facebookexternalhit|whatsapp|slackbot|telegrambot|discordbot|curl|wget|python-requests|axios|node-fetch/;

export function ehRobo(agente: string) {
  return ROBOS.test((agente || "").toLowerCase());
}
