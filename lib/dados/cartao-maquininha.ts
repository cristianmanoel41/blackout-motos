/*
 * A TABELA DA MAQUININHA
 *
 * Lida do simulador da própria máquina da loja, em 07/10/2026,
 * sobre uma venda de R$ 100,00 — dá para conferir pelo print:
 * 3x de R$ 35,19 fecha R$ 105,56, que é o total daquela linha.
 *
 * POR QUE A TABELA INTEIRA, E NÃO UMA TAXA
 *
 * A tentação é dizer "o cartão cobra 2,5% ao mês" e calcular.
 * Não funciona: o juro embutido não é constante. Ele cai de
 * 3,17% ao mês no 2x até 1,90% no 12x, e volta a subir depois.
 *
 * E tem coisa pior para quem simplifica: a tabela NÃO é
 * crescente. Em 12x o cliente paga R$ 112,79, menos do que os
 * R$ 113,75 do 11x. O mesmo acontece no 21x contra o 20x. São
 * parcelas promocionais da maquininha, e uma fórmula única
 * passaria por cima delas — o site prometeria um número e a
 * máquina cobraria outro.
 *
 * Então aqui ficam os números medidos, não uma aproximação.
 * Quando a loja trocar de maquininha ou a taxa mudar, é esta
 * lista que se atualiza, e a tela inteira acompanha.
 */

/* Sobre quanto o simulador da máquina fez as contas. */
const BASE_DA_SIMULACAO = 100;

/*
 * [parcelas, valor da parcela, total pago] — como está no visor.
 *
 * O total vem copiado em vez de calculado porque é ele que a
 * máquina usa: ela aplica o acréscimo sobre a venda e só depois
 * divide. Multiplicar a parcela arredondada por N dá alguns
 * centavos a mais, e centavo a mais numa tela de preço é
 * promessa quebrada.
 */
const LIDO_DO_VISOR: [number, number, number][] = [
  [1, 103.4, 103.4],
  [2, 52.39, 104.78],
  [3, 35.19, 105.56],
  [4, 26.68, 106.72],
  [5, 21.5, 107.5],
  [6, 17.98, 107.88],
  [7, 15.64, 109.49],
  [8, 13.81, 110.51],
  [9, 12.38, 111.44],
  [10, 11.21, 112.1],
  [11, 10.34, 113.75],
  [12, 9.4, 112.79],
  [13, 8.91, 115.85],
  [14, 8.34, 116.74],
  [15, 7.86, 117.87],
  [16, 7.44, 119.05],
  [17, 7.07, 120.12],
  [18, 6.71, 120.8],
  [19, 6.62, 125.79],
  [20, 6.35, 127.09],
  [21, 6.0, 125.96],
  [22, 5.89, 129.56],
  [23, 5.7, 131.17],
  [24, 5.5, 131.98],
];

export type LinhaDoCartao = {
  parcelas: number;
  /* Quanto o cliente paga no total, por real da venda. */
  totalPorReal: number;
  /* O acréscimo em cima do preço, de 0,034 a 0,3198. */
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
  ([parcelas, , total], posicao) => {
    const anterior = LIDO_DO_VISOR[posicao - 1];

    return {
      parcelas,
      totalPorReal: total / BASE_DA_SIMULACAO,
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
 * O total vem primeiro e a parcela sai dele, na ordem em que a
 * máquina trabalha: ela acresce e depois divide.
 */
export function noCartao(valor: number, parcelas: number) {
  const linha =
    CARTAO.find((item) => item.parcelas === parcelas) || CARTAO[0];

  const total = valor * linha.totalPorReal;

  return {
    parcelas: linha.parcelas,
    parcela: total / linha.parcelas,
    total,
    acrescimo: linha.acrescimo,
    juros: total - valor,
    promocional: linha.promocional,
  };
}
