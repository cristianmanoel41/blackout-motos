/*
 * O resultado dos anúncios do Meta, lido de dentro do sistema.
 *
 * A loja gasta em anúncio, as conversas chegam no WhatsApp e a
 * venda é lançada aqui. Esses três números moram em três
 * lugares diferentes, e por isso ninguém sabe dizer se o
 * anúncio se paga. Aqui eles ficam lado a lado.
 *
 * É leitura, não gestão: criar campanha, mexer em público e em
 * orçamento continua no Gerenciador de Anúncios, que faz isso
 * melhor do que qualquer tela que eu escrevesse.
 *
 * Precisa de META_AD_ACCOUNT_ID e META_ACCESS_TOKEN no
 * ambiente. Sem eles, devolve "não configurado" e a tela
 * explica o que falta, em vez de quebrar.
 */

const VERSAO = process.env.META_API_VERSION || "v21.0";

const GUARDAR = 600;

/*
 * O que conta como conversa.
 *
 * Anúncio que abre o WhatsApp registra a conversa iniciada com
 * estes nomes - o Meta mudou a nomenclatura ao longo do tempo
 * e mantém as duas. Somar as duas contaria duplicado, então
 * vale a primeira que aparecer.
 */
const CONVERSAS = [
  "onsite_conversion.messaging_conversation_started_7d",
  "onsite_conversion.total_messaging_connection",
];

export type Resultado = {
  gasto: number;
  conversas: number;
  cliques: number;
  alcance: number;
  /* Quanto custou cada conversa; nulo quando não houve. */
  porConversa: number | null;
};

export type Anuncios = {
  configurado: boolean;
  erro: string;
  hoje: Resultado | null;
  semana: Resultado | null;
  mes: Resultado | null;
};

function conta() {
  const id = String(
    process.env.META_AD_ACCOUNT_ID || ""
  ).trim();

  if (!id) return "";

  /* Aceita com ou sem o "act_" que o Meta mostra na tela. */
  return id.startsWith("act_") ? id : `act_${id}`;
}

function token() {
  return String(
    process.env.META_ACCESS_TOKEN || ""
  ).trim();
}

export function configurado() {
  return Boolean(conta() && token());
}

function numero(valor: unknown) {
  const n = Number(valor);

  return Number.isFinite(n) ? n : 0;
}

function conversasDe(acoes: any[]) {
  for (const nome of CONVERSAS) {
    const achou = (acoes || []).find(
      (item) => item?.action_type === nome
    );

    if (achou) return numero(achou.value);
  }

  return 0;
}

async function periodo(
  preset: string
): Promise<Resultado | null> {
  const busca = new URLSearchParams({
    fields: "spend,clicks,reach,actions",
    date_preset: preset,
    level: "account",
    access_token: token(),
  });

  const endereco = `https://graph.facebook.com/${VERSAO}/${conta()}/insights?${busca}`;

  try {
    const resposta = await fetch(endereco, {
      next: { revalidate: GUARDAR },
    });

    const corpo = await resposta.json();

    if (corpo?.error) {
      throw new Error(
        corpo.error.message || "o Meta recusou a consulta"
      );
    }

    /*
     * Sem gasto no período, o Meta devolve lista vazia - não é
     * erro, é um dia sem anúncio rodando.
     */
    const linha = corpo?.data?.[0];

    if (!linha) {
      return {
        gasto: 0,
        conversas: 0,
        cliques: 0,
        alcance: 0,
        porConversa: null,
      };
    }

    const gasto = numero(linha.spend);
    const conversas = conversasDe(linha.actions);

    return {
      gasto,
      conversas,
      cliques: numero(linha.clicks),
      alcance: numero(linha.reach),
      porConversa: conversas > 0 ? gasto / conversas : null,
    };
  } catch (erro: any) {
    console.error(
      "Anúncios do Meta: não deu para ler",
      erro?.message || erro
    );

    throw erro;
  }
}

export async function anunciosDoMeta(): Promise<Anuncios> {
  if (!configurado()) {
    return {
      configurado: false,
      erro: "",
      hoje: null,
      semana: null,
      mes: null,
    };
  }

  try {
    const [hoje, semana, mes] = await Promise.all([
      periodo("today"),
      periodo("last_7d"),
      periodo("last_30d"),
    ]);

    return {
      configurado: true,
      erro: "",
      hoje,
      semana,
      mes,
    };
  } catch (erro: any) {
    return {
      configurado: true,
      erro: String(erro?.message || erro).slice(0, 300),
      hoje: null,
      semana: null,
      mes: null,
    };
  }
}
