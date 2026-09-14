import { createClient } from "@/lib/supabase/server";

/*
 * Monta a legenda do post com o que a ficha da moto ja tem.
 *
 * Sem IA e sem custo: o texto e armado aqui mesmo, com
 * aberturas e fechos sorteados a cada clique. Se toda moto
 * sair com a mesma frase o alcance cai, entao clicar de novo
 * traz outra versao - da para ir trocando ate gostar.
 *
 * Tres modos: "chamada" para o dia a dia, "detalhada" para
 * quando o cliente quer a ficha, e "pedido", que devolve o
 * texto pronto para colar numa IA de conversa - assim o post
 * sai com jeito de gente sem o sistema precisar de credito.
 */

export const dynamic = "force-dynamic";

const QUEBRA = "\n";

/* Sorteia um item da lista. */
function sortear(opcoes: string[]) {
  return opcoes[
    Math.floor(Math.random() * opcoes.length)
  ];
}

function moeda(valor: unknown) {
  const numero = Number(valor || 0);

  if (!numero) return "";

  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function kmTexto(valor: unknown) {
  const numero = Number(valor || 0);

  if (!numero) return "";

  return `${numero.toLocaleString("pt-BR")} km`;
}

function anoTexto(moto: any) {
  if (moto.ano_fabricacao && moto.ano_modelo) {
    return moto.ano_fabricacao === moto.ano_modelo
      ? String(moto.ano_modelo)
      : `${moto.ano_fabricacao}/${moto.ano_modelo}`;
  }

  return String(
    moto.ano_modelo || moto.ano_fabricacao || ""
  );
}

/*
 * A cor vem do cadastro como a pessoa digitou - "VERMELHA",
 * "vermelha", "Vermelha". Numa legenda, caixa alta vira grito.
 */
function corTexto(valor: unknown) {
  const texto = String(valor || "").trim();

  if (!texto) return "";

  return texto
    .toLocaleLowerCase("pt-BR")
    .replace(/(^|\s)\p{L}/gu, (letra) =>
      letra.toLocaleUpperCase("pt-BR")
    );
}

function nomeDaMoto(moto: any) {
  return [moto.marca, moto.modelo, moto.versao]
    .filter(Boolean)
    .join(" ");
}

/* Vira #hondacb250f, sem acento e sem espaco. */
function tag(valor: unknown) {
  const texto = String(valor || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();

  return texto ? `#${texto}` : "";
}

function ganchos(moto: any, nome: string) {
  const km = Number(moto.quilometragem) || 0;
  const anoModelo = Number(moto.ano_modelo) || 0;
  const agora = new Date().getFullYear();

  const lista: string[] = [];

  if (km > 0 && km < 1500) {
    lista.push(
      "Essa aqui é praticamente zero.",
      `${km.toLocaleString("pt-BR")} km. Só isso.`,
      "Nem amaciou direito e já tá aqui."
    );
  } else if (km > 0 && km < 15000) {
    lista.push(
      "Rodou pouco e tá no ponto.",
      "Pouquíssimo km pra idade dela."
    );
  }

  if (anoModelo >= agora) {
    lista.push(
      `${anoModelo} na loja. Sim, ${anoModelo}.`,
      "Modelo novo, sem fila e sem espera."
    );
  }

  if (moto.unico_dono) {
    lista.push(
      "Um dono só. Daqueles que cuidam.",
      "Dono único, história inteira conhecida."
    );
  }

  /* Vale para qualquer moto, quando nada acima se aplica. */
  lista.push(
    `Quem tava esperando uma ${moto.modelo || "dessas"}, chegou.`,
    "Entrou hoje e já tá disponível.",
    "Essa não costuma ficar muito tempo parada.",
    "Olha o que apareceu no pátio."
  );

  return lista;
}

const CHAMADA_WHATSAPP =
  "Chama no WhatsApp — link na bio";

const FECHOS = [
  "Chama no WhatsApp e vem ver.",
  "Passa na loja pra conhecer.",
  "Manda mensagem que a gente te explica tudo.",
  "Chama aqui que a gente segura pra você.",
  "Vem ver de perto, sem compromisso.",
];

export async function POST(requisicao: Request) {
  const corpo = await requisicao.json().catch(() => null);

  const motorcycleId = String(
    corpo?.motorcycleId || ""
  ).trim();

  const estilo = [
    "detalhada",
    "pedido",
    "feed",
    "story",
  ].includes(corpo?.estilo)
    ? corpo.estilo
    : "chamada";

  if (!motorcycleId) {
    return Response.json(
      { error: "Moto não informada." },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data: moto, error } = await supabase
    .from("motorcycles")
    .select(
      `
      marca, modelo, versao, ano_fabricacao, ano_modelo,
      cor, quilometragem, cilindrada, preco_anunciado,
      possui_manual, possui_chave_reserva, unico_dono
    `
    )
    .eq("id", motorcycleId)
    .maybeSingle();

  if (error || !moto) {
    return Response.json(
      { error: "Moto não encontrada." },
      { status: 404 }
    );
  }

  const nome = nomeDaMoto(moto) || "Moto";
  const ano = anoTexto(moto);
  const preco = moeda(moto.preco_anunciado);
  const km = kmTexto(moto.quilometragem);

  const hashtags = [
    "#blackoutmotos",
    tag(moto.marca),
    tag(moto.modelo),
    "#sjc",
  ]
    .filter(Boolean)
    .join(" ");

  /* Só o que está preenchido: campo vazio convida a inventar. */
  const ficha = [
    ["Modelo", nome],
    ["Ano", ano],
    ["Cor", corTexto(moto.cor)],
    ["Quilometragem", km],
    [
      "Cilindrada",
      moto.cilindrada ? `${moto.cilindrada}cc` : "",
    ],
    ["Preço", preco],
    ["Único dono", moto.unico_dono ? "sim" : ""],
    ["Manual", moto.possui_manual ? "sim" : ""],
    [
      "Chave reserva",
      moto.possui_chave_reserva ? "sim" : "",
    ],
  ]
    .filter(([, valor]) => valor)
    .map(([rotulo, valor]) => `- ${rotulo}: ${valor}`)
    .join(QUEBRA);

  if (estilo === "pedido") {
    const pedido = [
      "Escreva 3 opções de legenda para um post no TikTok da Blackout Motos, loja de motos usadas em São José dos Campos.",
      "",
      "Como deve soar:",
      "- Como alguém da loja falando, não como anúncio de agência.",
      "- Frases curtas, do jeito que se fala.",
      "- Sem palavra de catálogo: nada de impecável, oportunidade única, não perca.",
      "- Não prometa nada que não esteja na ficha.",
      "- No máximo 3 linhas por opção, e as três bem diferentes entre si.",
      "- Termine convidando a chamar no WhatsApp, variando o jeito.",
      "- Até 4 hashtags no fim de cada uma.",
      "",
      "Ficha da moto:",
      ficha,
    ].join(QUEBRA);

    return Response.json({ legenda: pedido });
  }

  if (estilo === "story") {
    const bloco = [
      sortear(ganchos(moto, nome)),
      `${nome}${ano ? ` ${ano}` : ""}`,
    ];

    /* Km só entra quando é argumento de venda. */
    if (km && Number(moto.quilometragem) < 30000) {
      bloco.push(`Só ${km}`);
    }

    if (preco) bloco.push(preco);

    bloco.push("");
    bloco.push(CHAMADA_WHATSAPP);

    return Response.json({
      legenda: bloco.join(QUEBRA),
    });
  }

  /*
   * Post de feed: mais largo que a chamada. Emoji para dar
   * ritmo, uma informacao por linha e o WhatsApp no fim, que e
   * onde a conversa comeca de verdade.
   */
  if (estilo === "feed") {
    const itens: string[] = [];

    if (km) itens.push(`🛣️ ${km}`);
    if (moto.cor) itens.push(`🎨 ${corTexto(moto.cor)}`);

    if (moto.cilindrada) {
      itens.push(`⚙️ ${moto.cilindrada}cc`);
    }

    const extras = [
      moto.unico_dono ? "único dono" : "",
      moto.possui_manual ? "manual" : "",
      moto.possui_chave_reserva ? "chave reserva" : "",
    ].filter(Boolean);

    if (extras.length > 0) {
      itens.push(`✅ ${extras.join(", ")}`);
    }

    const bloco = [
      `🏍️ ${sortear(ganchos(moto, nome))}`,
      "",
      `${nome}${ano ? ` ${ano}` : ""}`,
      ...itens,
    ];

    if (preco) {
      bloco.push("");
      bloco.push(`💰 ${preco}`);
    }

    bloco.push("");
    bloco.push(`📲 ${CHAMADA_WHATSAPP}`);
    bloco.push("Avenida Andrômeda, 3521 - São José dos Campos");

    return Response.json({
      legenda: `${bloco.join(QUEBRA)}${QUEBRA}${QUEBRA}${hashtags}`,
    });
  }

  const linhas: string[] = [];

  if (estilo === "chamada") {
    linhas.push(sortear(ganchos(moto, nome)));
    linhas.push(`${nome}${ano ? ` ${ano}` : ""}.`);

    /* Km baixa é argumento; km alta não precisa virar manchete. */
    const destaque = [
      km && Number(moto.quilometragem) < 30000
        ? `Só ${km}`
        : "",
      moto.unico_dono ? "Único dono" : "",
    ].filter(Boolean);

    if (destaque.length > 0 && preco) {
      linhas.push(`${destaque.join(" · ")} — ${preco}.`);
    } else if (preco) {
      linhas.push(`${preco}.`);
    } else if (destaque.length > 0) {
      linhas.push(`${destaque.join(" · ")}.`);
    }

    linhas.push(sortear(FECHOS));
  } else {
    linhas.push(`${nome}${ano ? ` ${ano}` : ""}`);

    if (km) linhas.push(km);
    if (moto.cor) {
      linhas.push(`Cor ${corTexto(moto.cor)}`);
    }

    if (moto.cilindrada) {
      linhas.push(`${moto.cilindrada}cc`);
    }

    const extras = [
      moto.unico_dono ? "único dono" : "",
      moto.possui_manual ? "com manual" : "",
      moto.possui_chave_reserva
        ? "com chave reserva"
        : "",
    ].filter(Boolean);

    if (extras.length > 0) {
      linhas.push(
        extras
          .join(", ")
          .replace(/^./, (letra) => letra.toUpperCase())
      );
    }

    if (preco) linhas.push(preco);

    linhas.push("");
    linhas.push(sortear(FECHOS));
  }

  const corpoTexto = linhas
    .filter((linha, indice) => linha || indice > 0)
    .join(QUEBRA);

  return Response.json({
    legenda: `${corpoTexto}${QUEBRA}${QUEBRA}${hashtags}`,
  });
}
