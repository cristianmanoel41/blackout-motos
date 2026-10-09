/*
 * A TABELA DA MAQUININHA
 *
 * Lida do simulador da própria máquina da loja, em 09/10/2026,
 * sobre uma venda de R$ 18.900,00 — 3x de R$ 6.639,18 fecha
 * R$ 19.917,55, que é o total daquela linha. Com R$ 18.900 no
 * site, a tabela sai centavo por centavo igual à da máquina.
 *
 * POR QUE A TABELA INTEIRA, E NÃO UMA TAXA
 *
 * A tentação é dizer "o cartão cobra 2,5% ao mês" e calcular.
 * Não funciona: o juro embutido não é constante. Ele cai de
 * muito de um prazo para o outro, e não segue fórmula nenhuma.
 *
 * E tem coisa pior para quem simplifica: a tabela NÃO é
 * crescente. Em 12x o cliente paga R$ 21.316,93, menos do que
 * os R$ 21.369,92 do 11x. É parcela promocional da maquininha, e uma fórmula única
 * passaria por cima delas — o site prometeria um número e a
 * máquina cobraria outro.
 *
 * Então aqui ficam os números medidos, não uma aproximação.
 * Quando a loja trocar de maquininha ou a taxa mudar, é esta
 * lista que se atualiza, e a tela inteira acompanha.
 */

/* Sobre quanto o simulador da máquina fez as contas. */
const BASE_DA_SIMULACAO = 18900;

/*
 * [parcelas, valor da parcela, total pago] — como está no visor.
 *
 * Parcela e total vêm os dois copiados, nenhum calculado do
 * outro: a máquina arredonda cada um do seu jeito (no 6x o
 * total dividido por 6 dá R$ 3.398,36, e ela mostra 3.398,35).
 * Calcular um a partir do outro erra centavos, e centavo a
 * mais numa tela de preço é promessa quebrada.
 */
const LIDO_DO_VISOR: [number, number, number][] = [
  [1, 19542.41, 19542.41],
  [2, 9883.19, 19766.38],
  [3, 6639.18, 19917.55],
  [4, 5018.15, 20072.61],
  [5, 4046.34, 20231.72],
  [6, 3398.35, 20390.13],
  [7, 2950.30, 20652.08],
  [8, 2603.16, 20825.31],
  [9, 2333.64, 21002.76],
  [10, 2118.42, 21184.23],
  [11, 1942.72, 21369.92],
  [12, 1776.41, 21316.93],
  [13, 1673.34, 21753.36],
  [14, 1567.90, 21950.57],
  [15, 1476.82, 22152.33],
  [16, 1397.39, 22358.21],
  [17, 1327.54, 22568.15],
  [18, 1265.70, 22782.68],
  [19, 1210.63, 23001.94],
  [20, 1161.31, 23226.22],
  [21, 1116.94, 23455.67],
  [22, 1076.84, 23690.54],
  [23, 1040.47, 23930.84],
  [24, 1007.38, 24177.12],
];

export type LinhaDoCartao = {
  parcelas: number;
  /* Quanto o cliente paga no total, por real da venda. */
  totalPorReal: number;
  /* Quanto é cada parcela, por real da venda. */
  parcelaPorReal: number;
  /* O acréscimo em cima do preço, de 0,034 a 0,279. */
  acrescimo: number;
  /*
   * Esta linha custa menos que a de cima?
   *
   * Sai de comparação, não escrito à mão: quando a maquininha
   * mudar a promoção, a marca muda junto. Marcar à mão seria
   * apontar 12x para sempre, inclusive depois de deixar de ser
   * vantagem.
   */
  promocional: boolean;
};

export const CARTAO: LinhaDoCartao[] = LIDO_DO_VISOR.map(
  ([parcelas, parcela, total], posicao) => {
    const anterior = LIDO_DO_VISOR[posicao - 1];

    return {
      parcelas,
      totalPorReal: total / BASE_DA_SIMULACAO,
      parcelaPorReal: parcela / BASE_DA_SIMULACAO,
      acrescimo: total / BASE_DA_SIMULACAO - 1,
      promocional: anterior ? total < anterior[2] : false,
    };
  }
);

export const MAXIMO_DE_PARCELAS =
  CARTAO[CARTAO.length - 1].parcelas;

/*
 * A conta de uma venda no cartão.
 *
 * Parcela e total saem cada um da sua coluna da tabela, como
 * a máquina mostra.
 */
export function noCartao(valor: number, parcelas: number) {
  const linha =
    CARTAO.find((item) => item.parcelas === parcelas) || CARTAO[0];

  const total = valor * linha.totalPorReal;

  return {
    parcelas: linha.parcelas,
    parcela: valor * linha.parcelaPorReal,
    total,
    acrescimo: linha.acrescimo,
    juros: total - valor,
    promocional: linha.promocional,
  };
}
