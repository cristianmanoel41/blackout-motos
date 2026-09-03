/*
 * VALORES FIXOS DA DOCUMENTAÇÃO
 *
 * São os custos que aparecem em toda negociação, sempre pelo
 * mesmo preço. Ficam aqui para não serem digitados de novo a
 * cada moto - e para que, quando a tabela mudar, mude num
 * lugar só.
 *
 * O valor continua editável na tela: o que está aqui é a
 * sugestão, não uma trava.
 */

export const CUSTO_VISTORIA_TRANSFERENCIA = 80;
export const CUSTO_ENTRADA_DOCUMENTACAO = 60;
export const CUSTO_RECIBO_COMPRA_VENDA = 30;

/*
 * O que a Cris cobra por moto: a entrada na documentação mais
 * a emissão do recibo. Vai como uma linha só, porque a conta
 * dela vem assim - e o valor certo só se sabe quando ela manda.
 */
export const CUSTO_DOCUMENTACAO_PREVISTO =
  CUSTO_ENTRADA_DOCUMENTACAO + CUSTO_RECIBO_COMPRA_VENDA;
export const CUSTO_VISTORIA_CAUTELAR = 80;

/*
 * O que sai em toda venda. A vistoria de transferência é paga
 * com o dinheiro que o cliente entrega para a documentação;
 * mesmo assim ela é um custo, porque sai do caixa da loja para
 * o despachante. O que sobra daquele valor é que vira lucro.
 */
export const CUSTOS_PADRAO_VENDA = [
  {
    tipo: "vistoria",
    descricao: "Vistoria de transferência",
    valor: CUSTO_VISTORIA_TRANSFERENCIA,
  },
  {
    tipo: "taxas",
    descricao: "Emissão de recibo",
    valor: CUSTO_RECIBO_COMPRA_VENDA,
  },
  {
    tipo: "despachante",
    descricao: "Entrada na documentação",
    valor: CUSTO_ENTRADA_DOCUMENTACAO,
  },
] as const;

/*
 * O que a loja paga ao comprar uma moto: só a vistoria
 * cautelar, feita antes de fechar negócio.
 */
export const CUSTOS_PADRAO_COMPRA = [
  {
    categoria: "Vistoria",
    descricao: "Vistoria cautelar",
    valor: CUSTO_VISTORIA_CAUTELAR,
  },
] as const;

export const TOTAL_PADRAO_VENDA = CUSTOS_PADRAO_VENDA.reduce(
  (soma, item) => soma + item.valor,
  0
);

export const TOTAL_PADRAO_COMPRA = CUSTOS_PADRAO_COMPRA.reduce(
  (soma, item) => soma + item.valor,
  0
);

/* Valor sugerido ao escolher o tipo de custo na venda. */
export function valorPadraoDoTipo(tipo: string) {
  switch (tipo) {
    case "vistoria":
      return CUSTO_VISTORIA_TRANSFERENCIA;
    case "despachante":
      return CUSTO_ENTRADA_DOCUMENTACAO;
    case "taxas":
      return CUSTO_RECIBO_COMPRA_VENDA;
    case "detran":
      /* Só se sabe quando o despachante manda. */
      return 0;
    default:
      return 0;
  }
}

/*
 * A vistoria é feita por uma empresa terceirizada, que junta
 * todas as cautelares e vistorias de transferência da loja e
 * manda a conta por quinzena. O pagamento acontece entre o dia
 * 15 e o fim do mês.
 *
 * Entao a conta nasce prevista para o fechamento da quinzena
 * em que a vistoria foi feita: ate o dia 15, vence no dia 15;
 * depois disso, vence no ultimo dia do mes.
 */
export function fechamentoDaQuinzena(base: string) {
  const data = new Date(`${base}T12:00:00`);

  if (Number.isNaN(data.getTime())) return base;

  const ano = data.getFullYear();
  const mes = data.getMonth();

  const vencimento =
    data.getDate() <= 15
      ? new Date(ano, mes, 15)
      : /* dia zero do mês seguinte é o último deste */
        new Date(ano, mes + 1, 0);

  const mesTexto = String(
    vencimento.getMonth() + 1
  ).padStart(2, "0");

  const diaTexto = String(
    vencimento.getDate()
  ).padStart(2, "0");

  return `${vencimento.getFullYear()}-${mesTexto}-${diaTexto}`;
}

/*
 * As duas empresas que cobram da loja. Ficam aqui para trocar
 * num lugar so se um dia mudar de prestador.
 */
export const EMPRESA_VISTORIA = "Alvo Vistoria";
export const EMPRESA_DESPACHANTE = "Cris";

/*
 * Quem cobra cada custo. Sao duas empresas diferentes, com
 * contas e datas de pagamento separadas.
 */
export function empresaDoTipo(tipo: string) {
  return tipo === "vistoria"
    ? EMPRESA_VISTORIA
    : tipo === "outros"
      ? "Outros"
      : EMPRESA_DESPACHANTE;
}
