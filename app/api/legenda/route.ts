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

/*
 * Sorteia um item da lista, fugindo do que veio antes.
 *
 * Clicar de novo tem de trazer outra frase: se o sorteio
 * repetir o que já estava na tela, o botão parece quebrado.
 * Com uma opção só, não há o que fugir.
 */
function sortear(opcoes: string[], anterior = "") {
  const livres = anterior
    ? opcoes.filter((opcao) => !anterior.includes(opcao))
    : opcoes;

  const de = livres.length > 0 ? livres : opcoes;

  return de[Math.floor(Math.random() * de.length)];
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

function kmRedondo(valor: unknown) {
  const numero = Number(valor || 0);

  if (!numero) return "";

  /*
   * Abaixo de 2 mil o exato e curto e soa melhor: "1.482 km"
   * em vez de "1 mil km", que ainda esconderia quase 500.
   */
  if (numero < 2000) {
    return `${numero.toLocaleString("pt-BR")} km`;
  }

  const milhares = Math.round(numero / 1000);

  return `${milhares} mil km`;
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

/*
 * A que "família" a moto pertence, pelo nome do modelo.
 *
 * Não é classificação técnica: é o jeito como o cliente pensa
 * a moto. Quem procura CG quer trabalhar; quem procura MT
 * quer passear no fim de semana. A abertura muda conforme
 * isso, senão toda moto vira "olha o que chegou".
 */
function familia(moto: any) {
  const nome = [moto.marca, moto.modelo, moto.versao]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    /(pcx|nmax|n-max|burgman|elite|biz|pop|dafra|citycom|adv 150)/.test(
      nome
    )
  ) {
    return "scooter";
  }

  if (/(xre|lander|xtz|bros|falcon|tenere|himalayan|sahara)/.test(nome)) {
    return "trail";
  }

  if (
    /(mt-|mt 0|cb 5|cb 6|cb 3|twister|fazer|ninja|r3|z400|z900|hornet|xj6|srad|gsx|duke)/.test(
      nome
    )
  ) {
    return "esportiva";
  }

  if (/(cg|titan|fan|factor|ybr|start|sport 160|cargo)/.test(nome)) {
    return "trabalho";
  }

  return "";
}

/*
 * As aberturas do post.
 *
 * A lista é montada por moto: o que é verdade sobre ela entra,
 * o resto fica de fora. Quanto mais coisa a ficha tem
 * preenchida, mais variada fica a abertura - e é por isso que
 * vale preencher km, único dono e chave reserva no cadastro.
 *
 * As frases genéricas ficam por último e são muitas de
 * propósito: são elas que seguram a variedade quando a moto
 * não tem nenhum destaque forte.
 */
function ganchos(moto: any, nome: string) {
  const km = Number(moto.quilometragem) || 0;
  const anoModelo = Number(moto.ano_modelo) || 0;
  const cilindrada = Number(moto.cilindrada) || 0;
  const agora = new Date().getFullYear();

  const modelo = moto.modelo || "dessas";
  const cor = (moto.cor || "").toLowerCase();

  const lista: string[] = [];

  /* ---------- quilometragem ---------- */

  if (km > 0 && km < 1500) {
    lista.push(
      "Essa aqui é praticamente zero.",
      `${km.toLocaleString("pt-BR")} km. Só isso.`,
      "Nem amaciou direito e já tá aqui.",
      "Cheiro de nova ainda.",
      "Zero de uso, preço de seminova."
    );
  } else if (km > 0 && km < 15000) {
    lista.push(
      "Rodou pouco e tá no ponto.",
      "Pouquíssimo km pra idade dela.",
      `Só ${km.toLocaleString("pt-BR")} km rodados.`,
      "Andou o suficiente pra amaciar, e só."
    );
  } else if (km >= 15000 && km < 40000) {
    lista.push(
      "Km honesta e manutenção em dia.",
      "Rodada na medida, sem susto."
    );
  }

  /* ---------- ano ---------- */

  if (anoModelo >= agora) {
    lista.push(
      `${anoModelo} na loja. Sim, ${anoModelo}.`,
      "Modelo novo, sem fila e sem espera.",
      "Zero quilômetro tem fila. Essa aqui, não.",
      `Modelo ${anoModelo} disponível agora.`
    );
  } else if (anoModelo > 0 && agora - anoModelo <= 3) {
    lista.push(
      `${anoModelo} e conservada como se fosse de hoje.`,
      "Novinha, e já sem o preço de novinha."
    );
  }

  /* ---------- o que a ficha garante ---------- */

  if (moto.unico_dono) {
    lista.push(
      "Um dono só. Daqueles que cuidam.",
      "Dono único, história inteira conhecida.",
      "Primeiro dono, e dá pra ver."
    );
  }

  if (moto.possui_manual && moto.possui_chave_reserva) {
    lista.push(
      "Com manual e chave reserva. Do jeito que tem que ser.",
      "Completa: manual, chave reserva, tudo certo."
    );
  }

  /* ---------- para que ela serve ---------- */

  const tipo = familia(moto);

  if (tipo === "trabalho") {
    lista.push(
      "Essa é pra trabalhar e não dar dor de cabeça.",
      "Econômica, peça em qualquer canto, roda o dia todo.",
      "A moto que paga ela mesma.",
      "Pra quem precisa rodar todo dia."
    );
  } else if (tipo === "esportiva") {
    lista.push(
      "Essa é pra quem gosta de andar de moto.",
      "Pro fim de semana valer a pena.",
      "Barulho bom, postura boa.",
      "Não é só transporte. É passeio."
    );
  } else if (tipo === "trail") {
    lista.push(
      "Asfalto, terra, buraco. Pra ela tanto faz.",
      "Pra quem não escolhe caminho.",
      "Alta, firme e sem medo de rua ruim."
    );
  } else if (tipo === "scooter") {
    lista.push(
      "Automática: só acelerar e ir.",
      "Sem marcha, sem embreagem, sem stress no trânsito.",
      "A mais prática que existe pra cidade."
    );
  }

  if (cilindrada > 0 && cilindrada <= 160) {
    lista.push(
      "Primeira moto sem susto no bolso.",
      "Gasta pouco e é fácil de pilotar."
    );
  } else if (cilindrada >= 300) {
    lista.push(
      `${cilindrada}cc pra estrada não ser sacrifício.`,
      "Aguenta estrada sem reclamar."
    );
  }

  /* ---------- cor, quando é cor que chama ---------- */

  if (/(vermelh|azul|amarel|verde|laranja)/.test(cor)) {
    lista.push(`Essa ${cor} não passa despercebida.`);
  } else if (/(preta|preto)/.test(cor)) {
    lista.push("Preta. Sempre funciona.");
  }

  /* ---------- servem para qualquer moto ---------- */

  lista.push(
    `Quem tava esperando uma ${modelo}, chegou.`,
    `Chegou ${modelo} no pátio.`,
    "Entrou hoje e já tá disponível.",
    "Essa não costuma ficar muito tempo parada.",
    "Olha o que apareceu no pátio.",
    "Novidade no pátio.",
    "Entrou agora. Aproveita antes de sair.",
    "Chegou, passou pela revisão e já tá pronta.",
    "Pronta pra sair rodando hoje.",
    "Documentação em dia, cautelar aprovada.",
    "Dessas que a gente segura pouco tempo.",
    "Se você tava procurando, é essa.",
    "Deu entrada hoje e já tá disponível.",
    "Tá no pátio e tá pronta.",
    `Olha essa ${modelo} que entrou.`,
    "Essa aqui vale a visita."
  );

  return lista;
}

const TELEFONE_FIXO = "(12) 3917-3777";

const TELEFONE_CELULAR = "(12) 99662-6666";

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
    "olx",
  ].includes(corpo?.estilo)
    ? corpo.estilo
    : "chamada";

  /*
   * O que já estava na tela. Serve para o sorteio fugir do
   * que a pessoa acabou de ler - é isso que faz clicar de
   * novo valer a pena.
   */
  const anterior = String(corpo?.anterior || "");

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

  /* Para legenda; a ficha detalhada continua com o exato. */
  const kmCurto = kmRedondo(moto.quilometragem);

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

  /*
   * Descricao para classificado, no modelo que a loja ja usa
   * na OLX: titulo em caixa alta, km, endereco, e o bloco de
   * garantias e financiamento que vale para todas as motos.
   *
   * O km vai exato de proposito - em anuncio, numero redondo
   * levanta duvida, e o formulario da OLX ja pede o valor
   * certo.
   *
   * A cilindrada nao entra no titulo: ela ja esta no nome do
   * modelo (CG 160, XTZ 250, MT-03), e repetir vira
   * "CG 160 160CC".
   */
  if (estilo === "olx") {
    /* YAMAHA MT-03 321cc ABS 2019 */
    const titulo = [
      moto.marca,
      moto.modelo,
      moto.versao,
      ano,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleUpperCase("pt-BR");

    const bloco = [titulo];

    if (km) bloco.push(km);

    bloco.push(
      "BLACKOUT MOTOS",
      "",
      "Localizada na Avenida Andrômeda, 3521 - São José dos Campos/SP",
      `Telefone: ${TELEFONE_FIXO}`,
      "",
      "Nossas motos são:",
      "",
      "Motos revisadas.",
      "Perícia cautelar aprovada.",
      "Com garantia total de 3 meses.",
      "Documentação 100% em dia.",
      "",
      "Faça sua simulação personalizada via WhatsApp, 100% online.",
      "",
      "Chame no WhatsApp:",
      TELEFONE_FIXO,
      TELEFONE_CELULAR,
      "",
      /*
       * O site vai junto: quem está na OLX vê uma moto e
       * pode querer ver o resto do pátio. Fica depois do
       * telefone porque contato é o que a OLX quer primeiro.
       */
      "Veja todo o estoque no nosso site:",
      "blackoutmotos.com.br",
      "",
      "Financiamos em até 48x.",
      "Cartão de crédito até 24x.",
      "",
      "Aceitamos seu veículo de menor valor como entrada ou na troca.",
      "",
      "Sujeito a avaliação."
    );

    return Response.json({
      legenda: bloco.join(QUEBRA),
    });
  }

  if (estilo === "story") {
    const bloco = [
      sortear(ganchos(moto, nome), anterior),
      `${nome}${ano ? ` ${ano}` : ""}`,
    ];

    /* Km só entra quando é argumento de venda. */
    if (kmCurto && Number(moto.quilometragem) < 30000) {
      bloco.push(`Só ${kmCurto}`);
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

    if (kmCurto) itens.push(`🛣️ ${kmCurto}`);
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
      `🏍️ ${sortear(ganchos(moto, nome), anterior)}`,
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
    linhas.push(sortear(ganchos(moto, nome), anterior));
    linhas.push(`${nome}${ano ? ` ${ano}` : ""}.`);

    /* Km baixa é argumento; km alta não precisa virar manchete. */
    const destaque = [
      kmCurto && Number(moto.quilometragem) < 30000
        ? `Só ${kmCurto}`
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

    linhas.push(sortear(FECHOS, anterior));
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
    linhas.push(sortear(FECHOS, anterior));
  }

  const corpoTexto = linhas
    .filter((linha, indice) => linha || indice > 0)
    .join(QUEBRA);

  return Response.json({
    legenda: `${corpoTexto}${QUEBRA}${QUEBRA}${hashtags}`,
  });
}
