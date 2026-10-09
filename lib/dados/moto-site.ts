/*
 * O que o site mostra de uma moto.
 *
 * Só texto e conta: este arquivo é lido também pelo navegador,
 * nos filtros do estoque, então nada de servidor entra nele.
 * As fotos, que precisam do banco, ficam em fotos-site.ts.
 */

import { formatarMoeda } from "@/lib/formatadores/moeda";

/*
 * Número pode chegar como texto: as funções do banco devolvem
 * as colunas com cast, e o PostgREST entrega numeric ora como
 * número, ora como string. Aceitar os dois evita NaN na tela.
 */
type Numerico = number | string | null;

export type MotoSite = {
  id: string;
  marca: string | null;
  modelo: string | null;
  versao: string | null;
  cor: string | null;
  ano_fabricacao: Numerico;
  ano_modelo: Numerico;
  quilometragem: Numerico;
  cilindrada: Numerico;
  preco_anunciado: Numerico;
  possui_manual: boolean | null;
  possui_chave_reserva: boolean | null;
  unico_dono: boolean | null;
  data_entrada: string | null;
  /* Marcada na ficha para aparecer na capa do site. */
  na_capa?: boolean | null;
};

export function numero(valor: Numerico) {
  if (valor === null || valor === undefined) return null;

  const convertido = Number(valor);

  return Number.isFinite(convertido) ? convertido : null;
}

/*
 * SIGLAS QUE FICAM EM CAIXA ALTA
 *
 * Aqui entram so as que tem vogal, porque essas o computador
 * nao tem como adivinhar: ABS parece palavra, XTZ nao.
 */
const SIGLAS = new Set([
  "ABS",
  "CBS",
  "ADV",
  "DLX",
  "ED",
  "SE",
  "EX",
  "FI",
  "GP",
  "LTD",
  "STD",
  "CBF",
  "CRF",
  "XRE",
  "NMAX",
  /* Codigo de versao da NXR Bros, nao palavra. */
  "ESDD",
]);

/*
 * O NOME DA MOTO, ESCRITO SEMPRE IGUAL
 *
 * O cadastro foi preenchido por gente em dias diferentes, e o
 * site mostrava o que estava la: "Honda CG 160 Fan CBS" ao
 * lado de "HONDA CB300F TWISTER CBS" e "YAMAHA XTZ 250 LANDER
 * ABS". Tres padroes na mesma fileira - e isso num site de
 * loja le-se como desleixo, nao como variedade.
 *
 * A regra, por palavra:
 *
 *   tem numero          -> caixa alta (CB300F, 160, FZ25),
 *                          menos o "i" de 125i, que e minusculo
 *                          no nome de fabrica
 *   nao tem vogal       -> sigla (XTZ, YBR, PCX, CG, CB)
 *   esta na lista acima -> sigla com vogal (ABS, CBS, DLX)
 *   o resto             -> Primeira Maiuscula (Honda, Twister,
 *                          Fan, Lander, Factor)
 *
 * Nada disso toca o banco: e so como o site escreve. Quem
 * cadastrar em caixa alta amanha continua podendo.
 */
function palavraDoNome(palavra: string) {
  const limpa = palavra.trim();

  if (!limpa) return "";

  if (/\d/.test(limpa)) {
    return limpa.toUpperCase().replace(/(\d)I\b/g, "$1i");
  }

  const alta = limpa.toUpperCase();

  if (SIGLAS.has(alta)) return alta;
  if (!/[AEIOU]/.test(alta)) return alta;

  return alta.charAt(0) + limpa.slice(1).toLowerCase();
}

export function tituloDaMoto(texto: string) {
  return texto.split(/\s+/).map(palavraDoNome).filter(Boolean).join(" ");
}

export function nomeDaMoto(moto: MotoSite) {
  return (
    tituloDaMoto(
      [moto.marca, moto.modelo, moto.versao].filter(Boolean).join(" ")
    ) || "Moto"
  );
}

export function anoDaMoto(moto: MotoSite) {
  const fab = numero(moto.ano_fabricacao);
  const mod = numero(moto.ano_modelo);

  if (fab && mod && fab !== mod) return `${fab}/${mod}`;

  return String(fab || mod || "—");
}

export function kmDaMoto(valor: Numerico) {
  const km = numero(valor);

  if (km === null) return "—";

  return `${new Intl.NumberFormat("pt-BR").format(km)} km`;
}

export function precoDaMoto(moto: MotoSite) {
  const preco = numero(moto.preco_anunciado);

  return preco ? formatarMoeda(preco) : "Consultar";
}

/*
 * Endereço da moto no site.
 *
 * Vira /estoque/honda-cg-160-fan-2022. Duas motos iguais dariam
 * o mesmo endereço, então quem repete ganha um pedaço do id no
 * fim - só quem repete, para o endereço continuar limpo no caso
 * comum.
 */
function base(moto: MotoSite) {
  return [
    moto.marca,
    moto.modelo,
    moto.versao,
    numero(moto.ano_modelo) || numero(moto.ano_fabricacao),
  ]
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function slugsDoEstoque(motos: MotoSite[]) {
  const quantos: Record<string, number> = {};

  motos.forEach((moto) => {
    const chave = base(moto);
    quantos[chave] = (quantos[chave] || 0) + 1;
  });

  const slugs: Record<string, string> = {};

  motos.forEach((moto) => {
    const chave = base(moto);

    slugs[moto.id] =
      quantos[chave] > 1
        ? `${chave}-${moto.id.slice(0, 6)}`
        : chave;
  });

  return slugs;
}

/*
 * A mensagem que chega no WhatsApp da loja.
 *
 * Com o endereço da ficha no fim, quando quem chama sabe qual
 * é: a loja abre o link e vê na hora a moto, as fotos e o preço
 * que o cliente viu - sem "qual moto?" de volta, e sem dúvida
 * entre duas CG 160 do mesmo ano.
 */
export function convitePelaMoto(moto: MotoSite, endereco?: string) {
  const preco = numero(moto.preco_anunciado);

  return `Olá, tenho interesse na ${nomeDaMoto(
    moto
  )} ${anoDaMoto(moto)}${
    preco ? ` anunciada por ${formatarMoeda(preco)}` : ""
  }.${endereco ? `\n${endereco}` : ""}`;
}

/*
 * O endereço completo da ficha, para ir dentro da mensagem.
 *
 * O domínio vem da mesma variável do resto do site. No
 * navegador ela também existe, porque leva NEXT_PUBLIC_.
 */
export const ENDERECO_DO_SITE = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://blackoutmotos.com.br"
).replace(/\/+$/, "");

export function linkDaFicha(slug: string) {
  return `${ENDERECO_DO_SITE}/estoque/${slug}`;
}

/*
 * Os modelos que a loja tem hoje, sem repetir.
 *
 * Serve de sugestão para quem escreve a moto que procura: a
 * pessoa vê "Honda CG 160" e escreve o nome que a loja também
 * usa, em vez de "cg 160 preta" - assim a procura casa com a
 * moto quando ela chega.
 */
export function modelosDoEstoque(motos: MotoSite[]) {
  const nomes = motos
    .map((moto) =>
      [moto.marca, moto.modelo].filter(Boolean).join(" ")
    )
    .filter(Boolean);

  return Array.from(new Set(nomes)).sort();
}

function semAcento(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/*
 * Se a moto que a pessoa procura tem a ver com esta moto.
 *
 * Compara palavra a palavra, sem acento e sem caixa: "cg 160"
 * casa com "Honda CG 160 Fan". Letra solta fica de fora, senão
 * um "a" perdido casaria com o estoque inteiro.
 */
export function procuraCombina(
  procura: string | null,
  moto: MotoSite
) {
  const termos = semAcento(procura || "")
    .split(/[^a-z0-9]+/)
    .filter((palavra) => palavra.length > 1);

  if (termos.length === 0) return false;

  const nome = semAcento(nomeDaMoto(moto));

  return termos.every((palavra) => nome.includes(palavra));
}

/*
 * Para o que esta moto é boa.
 *
 * Quem compra moto usada quase nunca pergunta cilindrada:
 * pergunta se aguenta trabalhar, se gasta pouco, se vai para
 * a estrada. É essa a frase que falta no anúncio.
 *
 * Sai do modelo primeiro - scooter e trail se reconhecem pelo
 * nome, não pelo motor - e só depois do tamanho do motor.
 * Sem cilindrada e sem nome conhecido, devolve nada: melhor
 * calar do que prometer o que a moto não faz.
 */

const AUTOMATICAS =
  /\b(biz|pop|pcx|nmax|adv|sh|elite|burgman|lead|dafra|citycom|n-?max)\b/;

const TRILHA =
  /\b(bros|xre|lander|tenere|ténéré|xtz|crosser|dr|xr|himalayan|falcon|sahara)\b/;

export function paraQueServe(moto: MotoSite) {
  const nome = semAcento(
    [moto.modelo, moto.versao].filter(Boolean).join(" ")
  );

  if (AUTOMATICAS.test(nome)) {
    return "Automática: sem marcha, boa para ir e voltar do trabalho todo dia";
  }

  if (TRILHA.test(nome)) {
    return "Aguenta rua esburacada e estrada de terra sem reclamar";
  }

  const cc = numero(moto.cilindrada);

  if (cc === null) return null;

  if (cc <= 125) {
    return "Econômica: boa para a cidade e para quem está começando";
  }

  if (cc <= 180) {
    return "Boa para trabalhar o dia inteiro na cidade sem cansar";
  }

  if (cc <= 300) {
    return "Dá conta da cidade e ainda sobra fôlego para a estrada";
  }

  if (cc <= 500) {
    return "Feita para estrada e viagem de fim de semana";
  }

  return "Estrada e viagem longa, com motor sobrando";
}

/*
 * Em que prateleira a moto entra.
 *
 * O banco não guarda categoria - e criar a coluna obrigaria
 * alguém a preencher moto por moto, para sempre. O nome do
 * modelo já diz: quem procura scooter reconhece Biz e PCX,
 * quem procura trail reconhece Bros e XRE.
 *
 * Errar aqui não quebra nada: a moto aparece na prateleira
 * vizinha, e "Todas" continua mostrando o pátio inteiro.
 */

const ESPORTIVAS =
  /\b(r3|r15|ninja|cbr|yzf|gsx-?r|zx-?\d|rr|panigale|s1000|hayabusa|busa|speed\s?triple|daytona)\b/;

export type Categoria =
  | "todas"
  | "street"
  | "trail"
  | "scooter"
  | "esportiva";

export function categoriaDaMoto(moto: MotoSite): Categoria {
  const nome = semAcento(
    [moto.modelo, moto.versao].filter(Boolean).join(" ")
  );

  if (AUTOMATICAS.test(nome)) return "scooter";
  if (TRILHA.test(nome)) return "trail";
  if (ESPORTIVAS.test(nome)) return "esportiva";

  return "street";
}

export const CATEGORIAS: { chave: Categoria; nome: string }[] = [
  { chave: "todas", nome: "Todas" },
  { chave: "street", nome: "Street" },
  { chave: "trail", nome: "Trail" },
  { chave: "scooter", nome: "Scooter" },
  { chave: "esportiva", nome: "Esportivas" },
];

export function nomeDaCategoria(chave: Categoria) {
  return CATEGORIAS.find((item) => item.chave === chave)?.nome || "";
}

/*
 * OS ATALHOS DE PREÇO
 *
 * As quatro faixas que a loja pediu, nesta ordem, e com o nome
 * do jeito que o cliente fala. "ate" é teto; "acima", piso. A
 * chave vai para o endereço (/estoque?preco=ate-20000), então o
 * anúncio pode mandar a pessoa direto para a faixa certa.
 */
export const FAIXAS_DE_PRECO = [
  { chave: "ate-15000", nome: "Até R$ 15 mil", de: 0, ate: 15000 },
  { chave: "ate-20000", nome: "Até R$ 20 mil", de: 0, ate: 20000 },
  { chave: "ate-25000", nome: "Até R$ 25 mil", de: 0, ate: 25000 },
  { chave: "acima-25000", nome: "Acima de R$ 25 mil", de: 25000, ate: null },
] as const;

export function cabeNaFaixa(moto: MotoSite, chave: string) {
  const faixa = FAIXAS_DE_PRECO.find((item) => item.chave === chave);

  if (!faixa) return true;

  const preco = numero(moto.preco_anunciado);

  /* Moto sem preço não entra em faixa nenhuma: dizer que ela
     cabe em "até 15 mil" seria prometer o que não se sabe. */
  if (preco === null) return false;

  if (faixa.ate !== null) return preco <= faixa.ate;

  return preco > faixa.de;
}

/*
 * PARA QUE A PESSOA QUER A MOTO
 *
 * É a pergunta do "Encontre sua moto ideal". Cada uso diz que
 * prateleiras servem e a faixa de motor que faz sentido - e a
 * regra é a mesma de `paraQueServe`, acima, para a ficha e a
 * ferramenta nunca se contradizerem.
 *
 * Moto sem cilindrada no cadastro não é descartada pelo motor:
 * só pela prateleira. Descartar por falta de dado esconderia
 * moto boa por esquecimento de cadastro.
 */
export type Uso = "trabalho" | "cidade" | "viagem" | "lazer";

export const USOS: { chave: Uso; nome: string; texto: string }[] = [
  {
    chave: "trabalho",
    nome: "Trabalho",
    texto: "Entrega, app e o dia inteiro rodando",
  },
  {
    chave: "cidade",
    nome: "Cidade",
    texto: "Ir e voltar, trânsito e economia",
  },
  {
    chave: "viagem",
    nome: "Viagem",
    texto: "Estrada, conforto e motor sobrando",
  },
  {
    chave: "lazer",
    nome: "Lazer",
    texto: "Passeio, trilha e fim de semana",
  },
];

const PERFIL_DO_USO: Record<
  Uso,
  { categorias: Categoria[]; ccMin?: number; ccMax?: number }
> = {
  trabalho: { categorias: ["street", "scooter", "trail"], ccMax: 190 },
  cidade: { categorias: ["street", "scooter"], ccMax: 320 },
  viagem: { categorias: ["street", "trail", "esportiva"], ccMin: 250 },
  lazer: { categorias: ["trail", "esportiva", "street"], ccMin: 150 },
};

export function serveParaUso(moto: MotoSite, uso: Uso) {
  const perfil = PERFIL_DO_USO[uso];

  if (!perfil.categorias.includes(categoriaDaMoto(moto))) return false;

  const cc = numero(moto.cilindrada);

  if (cc === null) return true;
  if (perfil.ccMin && cc < perfil.ccMin) return false;
  if (perfil.ccMax && cc > perfil.ccMax) return false;

  return true;
}

/*
 * MOTOS PARECIDAS, PARA O FIM DA FICHA
 *
 * Quem abriu uma moto e não se decidiu quase sempre quer ver a
 * vizinha: mesma prateleira, preço perto. A nota abaixo junta
 * as duas coisas - e a moto mais nova vence o empate, porque é
 * a que tem mais chance de ainda não ter sido vista.
 */
export function motosParecidas(
  motos: MotoSite[],
  moto: MotoSite,
  quantas = 4
) {
  const preco = numero(moto.preco_anunciado);
  const categoria = categoriaDaMoto(moto);

  return motos
    .filter((outra) => outra.id !== moto.id)
    .map((outra, posicao) => {
      const dela = numero(outra.preco_anunciado);

      let nota = 0;

      if (categoriaDaMoto(outra) === categoria) nota += 3;
      if (outra.marca && outra.marca === moto.marca) nota += 1;

      if (preco && dela) {
        const diferenca = Math.abs(dela - preco) / preco;

        if (diferenca <= 0.15) nota += 3;
        else if (diferenca <= 0.35) nota += 1.5;
      }

      /* A lista já vem da mais nova para a mais velha. */
      return { outra, nota: nota - posicao * 0.01 };
    })
    .sort((a, b) => b.nota - a.nota)
    .slice(0, quantas)
    .map((item) => item.outra);
}

/* Entrou nos últimos dias? É o selo "Chegou agora" do card. */
export function chegouAgora(moto: MotoSite, dias = 10) {
  if (!moto.data_entrada) return false;

  const entrada = new Date(`${moto.data_entrada}T12:00:00`).getTime();

  if (!Number.isFinite(entrada)) return false;

  return Date.now() - entrada <= dias * 24 * 60 * 60 * 1000;
}

/* Os selos que saem do cadastro - nunca de texto fixo. */
export function selosDaMoto(moto: MotoSite) {
  return [
    moto.unico_dono ? "Único dono" : null,
    moto.possui_manual ? "Com manual" : null,
    moto.possui_chave_reserva ? "Chave reserva" : null,
  ].filter(Boolean) as string[];
}
