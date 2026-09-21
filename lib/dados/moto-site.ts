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
};

export function numero(valor: Numerico) {
  if (valor === null || valor === undefined) return null;

  const convertido = Number(valor);

  return Number.isFinite(convertido) ? convertido : null;
}

export function nomeDaMoto(moto: MotoSite) {
  return (
    [moto.marca, moto.modelo, moto.versao]
      .filter(Boolean)
      .join(" ") || "Moto"
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

/* A mensagem que chega no WhatsApp da loja. */
export function convitePelaMoto(moto: MotoSite) {
  const preco = numero(moto.preco_anunciado);

  return `Olá, tenho interesse na ${nomeDaMoto(
    moto
  )} ${anoDaMoto(moto)}${
    preco ? ` anunciada por ${formatarMoeda(preco)}` : ""
  }.`;
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
