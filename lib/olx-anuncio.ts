/*
 * Traduz uma moto do sistema para o formato da OLX.
 *
 * A OLX nao aceita texto: cor, combustivel e cambio sao
 * codigos dela. Marca, modelo e versao vem da tabela baixada;
 * o resto sao listas curtas e fixas, que ficam aqui mesmo.
 *
 * Campo opcional sem valor NAO vai no envio - mandar vazio ou
 * zero faz a OLX recusar o anuncio inteiro.
 */

/* Onde a loja fica: entra em todo anuncio. */
export const CEP_DA_LOJA = "12233000";

/* Numero que aparece no anuncio, so digitos. */
export const TELEFONE_DA_LOJA = 12996626666;

const CORES: Record<string, string> = {
  preto: "1",
  preta: "1",
  branco: "2",
  branca: "2",
  prata: "3",
  prateado: "3",
  vermelho: "4",
  vermelha: "4",
  cinza: "5",
  azul: "6",
  amarelo: "7",
  amarela: "7",
  verde: "8",
  laranja: "9",
};

const COR_OUTRA = "10";

const COMBUSTIVEIS: Record<string, string> = {
  gasolina: "1",
  alcool: "2",
  etanol: "2",
  flex: "3",
  diesel: "4",
  hibrido: "5",
  eletrico: "6",
};

/* Tira acento, pontuacao e espaco. */
export function chave(valor: unknown) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

export function codigoDaCor(cor: unknown) {
  const nome = chave(cor);

  if (!nome) return null;

  const exata = CORES[nome];

  if (exata) return exata;

  /*
   * "Azul Perola" nao esta na lista, mas comeca com azul.
   * Melhor acertar a familia do que cair em "Outra".
   */
  for (const [base, codigo] of Object.entries(CORES)) {
    if (nome.startsWith(base)) return codigo;
  }

  return COR_OUTRA;
}

export function codigoDoCombustivel(valor: unknown) {
  /* Moto no Brasil e gasolina ou flex; gasolina cobre o caso. */
  return COMBUSTIVEIS[chave(valor)] || "1";
}

/*
 * A OLX so aceita anos ate 1980 um a um. Antes disso sao
 * faixas, e o ano tem que virar o inicio da faixa.
 */
export function anoParaOlx(ano: unknown) {
  const numero = Number(ano) || 0;

  if (!numero) return null;

  if (numero >= 1980) return String(numero);
  if (numero >= 1975) return "1975";
  if (numero >= 1970) return "1970";
  if (numero >= 1965) return "1965";
  if (numero >= 1960) return "1960";
  if (numero >= 1955) return "1955";

  return "1950";
}

/*
 * A cilindrada da OLX e uma lista de valores fechados. 300 tem
 * codigo proprio; 160 tambem. O que nao existe cai no mais
 * proximo para baixo, que e como o anuncio costuma ser lido.
 */
export function codigoDaCilindrada(
  cilindrada: unknown,
  tabela: Array<{ codigo: string; nome: string }>
) {
  const numero = Number(cilindrada) || 0;

  if (!numero || tabela.length === 0) return null;

  const exata = tabela.find(
    (item) => Number(item.nome) === numero
  );

  if (exata) return exata.codigo;

  if (numero > 1000) {
    const acima = tabela.find((item) =>
      chave(item.nome).includes("acimade")
    );

    if (acima) return acima.codigo;
  }

  /* "Acima de 1.000" nao vira numero, entao fica de fora. */
  const abaixo = tabela
    .map((item) => ({
      codigo: item.codigo,
      valor: Number(item.nome),
    }))
    .filter(
      (item) =>
        Number.isFinite(item.valor) &&
        item.valor <= numero
    )
    .sort((a, b) => b.valor - a.valor)[0];

  return abaixo?.codigo || null;
}

/*
 * Acha na tabela da OLX o item que corresponde ao nosso.
 *
 * "CB 300F Twister" vira "cb300ftwister"; a OLX pode ter
 * "CB 300F". Por isso tenta o igual, depois o que esta contido,
 * e so entao desiste - melhor nao anunciar do que anunciar a
 * moto errada.
 */
export function acharNaTabela(
  nosso: unknown,
  tabela: Array<{ codigo: string; nome: string }>
) {
  const alvo = chave(nosso);

  if (!alvo || tabela.length === 0) return null;

  const exato = tabela.find(
    (item) => chave(item.nome) === alvo
  );

  if (exato) return exato;

  /* O nome da OLX cabe dentro do nosso. */
  const contidos = tabela
    .filter((item) => alvo.startsWith(chave(item.nome)))
    .sort(
      (a, b) => chave(b.nome).length - chave(a.nome).length
    );

  if (contidos[0]) return contidos[0];

  /* O nosso cabe dentro do nome da OLX. */
  return (
    tabela.find((item) =>
      chave(item.nome).startsWith(alvo)
    ) || null
  );
}
