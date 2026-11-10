/*
      : /\b(viag\w*|viajar|estrada|rodovia)\b/.test(t)
 *
        : /\b(passeio|passear|lazer|fim de semana)\b/.test(t)
 * "honda automática", "uma 160 pra trabalhar") e isto aqui tira
 * do texto o que dá para filtrar: preço, marca, tipo, motor,
 * ano e as palavras do modelo.
 *
 * Serve para duas coisas:
 *   - é a resposta inteira quando não há chave da OpenAI, ou
 *     quando ela falha ou demora - o chat nunca fica mudo;
 *   - quando a IA responde, a escolha dela passa por aqui de
 *     novo: só entra moto que existe no estoque de hoje.
 *
 * Só texto e conta, sem banco: quem chama já traz as motos.
 */

import {
  anoDaMoto,
  categoriaDaMoto,
  cilindradaDaMoto,
  nomeDaMoto,
  numero,
  serveParaUso,
  type Categoria,
  type Uso,
  type MotoSite,
} from "@/lib/dados/moto-site";

export type Pedido = {
  ate: number | null;
  de: number | null;
  marca: string | null;
  categoria: Categoria | null;
  cilindrada: string | null;
  anoMinimo: number | null;
  uso: Uso | null;
  palavras: string[];
  poucoKm: boolean;
  maisBarata: boolean;
};

function semAcento(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

const MARCAS: Record<string, string> = {
  honda: "honda",
  yamaha: "yamaha",
  yamaxa: "yamaha",
  suzuki: "suzuki",
  kawasaki: "kawasaki",
  bmw: "bmw",
  dafra: "dafra",
  shineray: "shineray",
  haojue: "haojue",
  triumph: "triumph",
  royal: "royal enfield",
  enfield: "royal enfield",
  harley: "harley",
  ktm: "ktm",
  kasinski: "kasinski",
  mottu: "mottu",
};

const CATEGORIAS: Array<[RegExp, Categoria]> = [
  [/\b(automatica|automatico|scooter|scooters|sem marcha|scuter)\b/, "scooter"],
  [/\b(trail|trilha|terra|estrada de chao|off ?road)\b/, "trail"],
  [/\b(esportiva|esportivas|esporte|carenada|pistinha)\b/, "esportiva"],
];

/* Palavras que não dizem nada sobre a moto. */
const VAZIAS = new Set(
  (
    "quero queria gostaria procuro procurando busco tem tenho uma um umas uns " +
    "moto motos motinha de da do das dos pra para por com sem ate e ou a o as os " +
    "mil reais real rs k valor preco barata barato baratas mais menos acima abaixo " +
    "partir entre que qual quais voces vcs voce me mostra mostrar ver algo alguma " +
    "algum boa bom bem ano km cilindrada cc no na nos nas em meu minha pouco pouca " +
    "rodada rodado baixa baixo kilometragem quilometragem novo nova nova seminova " +
    "usada usado oi ola bom dia tarde noite estoque loja financiar financiamento " +
    "entrada parcela parcelas trabalhar trabalho cidade dia todo"
  ).split(" ")
);

/*
 * Os números do texto, já em reais quando são dinheiro.
 * "20 mil", "20mil", "20k", "20.000", "R$ 20.000,00", "20000".
 */
function lerValor(bruto: string, sufixo: string | undefined) {
  const limpo = bruto.replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  let valor = Number(limpo);

  if (!Number.isFinite(valor)) return null;
  if (sufixo) valor *= 1000;

  return valor;
}

export function lerPedido(texto: string): Pedido {
  const t = semAcento(texto);

  const pedido: Pedido = {
    ate: null,
    de: null,
    marca: null,
    categoria: null,
    cilindrada: null,
    anoMinimo: null,
    uso: /\b(trabalh\w*|entrega\w*|ifood|app|aplicativo|motoboy|uber)\b/.test(t)
      ? "trabalho"
      : /\b(viag\w*|viajar|estrada|rodovia)\b/.test(t)
        ? "viagem"
        : /\b(passeio|passear|lazer|fim de semana)\b/.test(t)
          ? "lazer"
          : null,
    palavras: [],
    poucoKm: /\b(pouco|pouca|baixa|baixo)\s+(km|quilometragem|kilometragem|rodad[ao])\b/.test(t),
    maisBarata: /\b(mais barat[ao]s?|menor preco|mais em conta)\b/.test(t),
  };

  /* "entre 15 e 20 mil" */
  const entre = t.match(
    /entre\s+(?:r\$\s*)?(\d[\d.,]*)\s*(mil|k)?\s*(?:e|a)\s+(?:r\$\s*)?(\d[\d.,]*)\s*(mil|k)?/
  );

  if (entre) {
    const sufixo = entre[4] || entre[2];
    const a = lerValor(entre[1], entre[2] || sufixo);
    const b = lerValor(entre[3], sufixo);

    if (a && b && a >= 1000 && b >= 1000) {
      pedido.de = Math.min(a, b);
      pedido.ate = Math.max(a, b);
    }
  }

  /* Os outros números, um por um, com a palavra que vem antes. */
  const NUMERO =
    /(ate|menos de|abaixo de|no maximo|max|acima de|mais de|a partir de|partir de|apartir de|de|uns|por)?\s*(r\$\s*)?(\d[\d.,]*)\s*(mil|k|cc|cilindradas)?\b/g;

  for (const achado of t.matchAll(NUMERO)) {
    if (entre) break;

    const [, antes, cifrao, bruto, sufixo] = achado;
    const ehMil = sufixo === "mil" || sufixo === "k";

    if (sufixo === "cc" || sufixo === "cilindradas") {
      const cc = Number(bruto);
      if (cc >= 50 && cc <= 1500) pedido.cilindrada = String(cc);
      continue;
    }

    const valor = lerValor(bruto, ehMil ? sufixo : undefined);
    if (valor === null) continue;

    /* Ano: 2005 a 2030, escrito sem "mil" nem R$. */
    if (!ehMil && !cifrao && valor >= 2005 && valor <= 2030 && /^\d{4}$/.test(bruto)) {
      pedido.anoMinimo = valor;
      continue;
    }

    /* Motor: o número que a pessoa conhece pelo nome. */
    if (!ehMil && !cifrao && /^(100|110|125|150|155|160|190|200|250|300|400|500|600|650|700|750|800|900|1000)$/.test(bruto)) {
      pedido.cilindrada = bruto;
      continue;
    }

    /* "20 mil" chega aqui como 20000; "20" sozinho com R$, como 20. */
    const reais = valor < 300 && cifrao ? valor * 1000 : valor;
    if (reais < 3000 || reais > 500000) continue;

    if (antes && /acima|mais de|partir/.test(antes)) pedido.de = reais;
    else pedido.ate = reais;
  }

  for (const [palavra, marca] of Object.entries(MARCAS)) {
    if (new RegExp(`\\b${palavra}\\b`).test(t)) {
      pedido.marca = marca;
      break;
    }
  }

  for (const [regra, categoria] of CATEGORIAS) {
    if (regra.test(t)) {
      pedido.categoria = categoria;
      break;
    }
  }

  pedido.palavras = t
    .split(/[^a-z0-9]+/)
    .filter(
      (p) =>
        p.length > 1 &&
        !VAZIAS.has(p) &&
        !/^\d+$/.test(p) &&
        !MARCAS[p]
    );

  return pedido;
}

function nomeSemAcento(moto: MotoSite) {
  return semAcento(nomeDaMoto(moto));
}

/* A moto atende ao pedido, deixando o preço de fora? */
function combinaSemPreco(moto: MotoSite, pedido: Pedido, palavras: string[]) {
  const nome = nomeSemAcento(moto);

  if (pedido.marca && !nome.includes(pedido.marca.split(" ")[0])) return false;
  if (pedido.categoria && categoriaDaMoto(moto) !== pedido.categoria) return false;
  if (pedido.uso && !serveParaUso(moto, pedido.uso)) return false;

  if (pedido.cilindrada) {
    const daMoto = cilindradaDaMoto(moto);
    const cc = numero(moto.cilindrada);
    const alvo = Number(pedido.cilindrada);

    /*
     * A faixa do site (125/150/160/250/300) decide quando a moto
     * tem uma - assim "160" não traz a PCX 150. Fora dessas, vale
     * a cilindrada do cadastro com folga de 8%.
     */
    const bate = daMoto
      ? daMoto === pedido.cilindrada
      : nome.includes(pedido.cilindrada) ||
        (cc !== null && Math.abs(cc - alvo) <= alvo * 0.08);

    if (!bate) return false;
  }

  if (pedido.anoMinimo) {
    const ano = numero(moto.ano_modelo) || numero(moto.ano_fabricacao);
    if (!ano || ano < pedido.anoMinimo) return false;
  }

  return palavras.every((p) => nome.includes(p));
}

function cabeNoPreco(moto: MotoSite, pedido: Pedido) {
  const preco = numero(moto.preco_anunciado);

  if (pedido.ate === null && pedido.de === null) return true;
  if (preco === null) return false;
  if (pedido.ate !== null && preco > pedido.ate) return false;
  if (pedido.de !== null && preco < pedido.de) return false;

  return true;
}

export type Achado = {
  motos: MotoSite[];
  /* true quando nada bateu e a lista é das mais perto. */
  parecidas: boolean;
  resposta: string;
};

const brl = (valor: number) =>
  `R$ ${new Intl.NumberFormat("pt-BR").format(Math.round(valor))}`;

function descreverPedido(pedido: Pedido) {
  const partes: string[] = [];

  if (pedido.categoria === "scooter") partes.push("automática");
  if (pedido.categoria === "trail") partes.push("trail");
  if (pedido.categoria === "esportiva") partes.push("esportiva");
  if (pedido.marca) partes.push(pedido.marca[0].toUpperCase() + pedido.marca.slice(1));
  if (pedido.cilindrada) partes.push(`${pedido.cilindrada}cc`);
  if (pedido.uso === "trabalho") partes.push("boa para trabalhar");
  if (pedido.uso === "viagem") partes.push("boa para viajar");
  if (pedido.uso === "lazer") partes.push("boa para passeio");
  if (pedido.anoMinimo) partes.push(`de ${pedido.anoMinimo} para cima`);
  if (pedido.poucoKm) partes.push("com menos km primeiro");
  if (pedido.de !== null && pedido.ate !== null) partes.push(`entre ${brl(pedido.de)} e ${brl(pedido.ate)}`);
  else if (pedido.ate !== null) partes.push(`até ${brl(pedido.ate)}`);
  else if (pedido.de !== null) partes.push(`acima de ${brl(pedido.de)}`);

  return partes.join(", ");
}

export function procurarNoEstoque(
  texto: string,
  motos: MotoSite[],
  limite = 6
): Achado {
  const pedido = lerPedido(texto);

  /*
   * Palavra que não aparece em moto nenhuma ("vermelha",
   * "linda", "urgente") sai da busca: senão uma palavra solta
   * zeraria o resultado inteiro.
   */
  const palavras = pedido.palavras.filter((p) =>
    motos.some((m) => nomeSemAcento(m).includes(p))
  );

  const temFiltro =
    pedido.ate !== null ||
    pedido.de !== null ||
    pedido.marca !== null ||
    pedido.categoria !== null ||
    pedido.cilindrada !== null ||
    pedido.anoMinimo !== null ||
    pedido.uso !== null ||
    palavras.length > 0 ||
    pedido.poucoKm ||
    pedido.maisBarata;

  /*
   * Pediu um modelo pelo nome ("ninja", "fazer") e não tem:
   * dizer isso, em vez de pedir para a pessoa repetir.
   */
  if (!temFiltro && pedido.palavras.length > 0) {
    return {
      motos: [],
      parecidas: false,
      resposta: `Não achei "${pedido.palavras.join(" ")}" no estoque de hoje. Tenta por valor ("até 20 mil"), marca ou tipo, ou chama a gente no WhatsApp que a loja avisa quando chegar.`,
    };
  }

  if (!temFiltro) {
    return {
      motos: [],
      parecidas: false,
      resposta:
        "Me conta o que você procura: um valor (\"até 20 mil\"), um modelo (\"CG 160\", \"Bros\"), a marca ou o tipo (\"automática\"). Eu procuro no estoque de hoje.",
    };
  }

  const preco = (m: MotoSite) => numero(m.preco_anunciado) ?? Infinity;
  const km = (m: MotoSite) => numero(m.quilometragem) ?? Infinity;

  const ordenar = (lista: MotoSite[]) => {
    const copia = [...lista];

    if (pedido.poucoKm) copia.sort((a, b) => km(a) - km(b));
    else if (pedido.maisBarata || pedido.de !== null) copia.sort((a, b) => preco(a) - preco(b));
    /* "Até 20 mil": a mais perto dos 20 primeiro - é o que a pessoa pode pagar. */
    else if (pedido.ate !== null) copia.sort((a, b) => preco(b) - preco(a));

    return copia;
  };

  const certas = ordenar(
    motos.filter((m) => combinaSemPreco(m, pedido, palavras) && cabeNoPreco(m, pedido))
  );

  const descricao = descreverPedido(pedido);

  if (certas.length > 0) {
    const n = certas.length;
    return {
      motos: certas.slice(0, limite),
      parecidas: false,
      resposta:
        (n === 1 ? "Achei 1 moto" : `Achei ${n} motos`) +
        (descricao ? ` ${descricao}` : "") +
        (n > limite ? `. Mostro as ${limite} que mais combinam:` : ":"),
    };
  }

  /*
   * Nada bateu. Em vez de "não temos", as mais perto do que
   * a pessoa pediu: o mesmo tipo sem o teto de preço, ou o
   * mesmo preço sem o resto.
   */
  const semPreco = motos.filter((m) => combinaSemPreco(m, pedido, palavras));
  let perto: MotoSite[] = [];

  if (semPreco.length > 0 && (pedido.ate !== null || pedido.de !== null)) {
    const alvo = pedido.ate ?? pedido.de ?? 0;
    perto = [...semPreco].sort(
      (a, b) => Math.abs(preco(a) - alvo) - Math.abs(preco(b) - alvo)
    );
  } else {
    perto = ordenar(motos.filter((m) => cabeNoPreco(m, pedido)));
  }

  return {
    motos: perto.slice(0, 3),
    parecidas: perto.length > 0,
    resposta:
      perto.length > 0
        ? `Hoje não tenho${descricao ? ` ${descricao}` : " essa"}. Essas são as mais perto do que você pediu:`
        : `Hoje não tenho${descricao ? ` ${descricao}` : " essa moto"}. Chama a gente no WhatsApp que a loja avisa quando chegar.`,
  };
}

/* Uma linha por moto, para a IA ler o estoque. */
export function linhaParaIA(moto: MotoSite) {
  const preco = numero(moto.preco_anunciado);
  const km = numero(moto.quilometragem);
  const cc = numero(moto.cilindrada);

  return [
    moto.id,
    nomeDaMoto(moto),
    anoDaMoto(moto),
    preco ? `R$ ${preco}` : "preço a consultar",
    km !== null ? `${km} km` : null,
    cc ? `${cc}cc` : null,
    categoriaDaMoto(moto),
    moto.cor || null,
    moto.unico_dono ? "único dono" : null,
  ]
    .filter(Boolean)
    .join(" | ");
}
