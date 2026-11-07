/*
 * A CONTA DA PARCELA NO BANCO
 *
 * Usada pelo simulador da página de financiamento
 * (components/site/CalculadoraParcela) e pela "parcela na hora"
 * da página da moto. As duas precisam dar o mesmo número: o
 * cliente que vê R$ 480 na moto e R$ 510 no simulador desconfia
 * dos dois.
 */

/*
 * As taxas da simulação, que a loja define: a média mais baixa
 * e a média mais alta que os bancos têm cobrado.
 *
 * Uma taxa só prometia um número que metade dos clientes não
 * ia conseguir. A faixa mostra o melhor e o pior caso, e a
 * análise de crédito decide onde a pessoa cai.
 *
 * Ficam em constantes com nome porque são os números que mudam
 * quando o mercado muda - e quem for mexer precisa achar isso
 * em um lugar só, não espalhado pela conta.
 */
export const TAXA_MINIMA = 0.025;
export const TAXA_MAXIMA = 0.035;

/*
 * O mesmo número, escrito para a tela.
 *
 * Sai da constante de propósito. Escrito à mão em vários
 * lugares, bastava alguém trocar a taxa e esquecer um deles
 * para a tela prometer 2% e a conta cobrar 2,5%.
 */
export function taxaEscrita(taxa: number) {
  return (
    (taxa * 100).toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    }) + "%"
  );
}

export const MINIMA_ESCRITA = taxaEscrita(TAXA_MINIMA);
export const MAXIMA_ESCRITA = taxaEscrita(TAXA_MAXIMA);

export const PARCELAS = [12, 24, 36, 48];

/* O passo da barra. R$ 100 dá movimento fino sem virar loteria
   de centavo quando o dedo arrasta no celular. */
export const PASSO_DA_ENTRADA = 100;

/*
 * A parcela pela Tabela Price, que é como banco calcula.
 *
 * Parcelas iguais do começo ao fim: no início quase tudo é
 * juro, no fim quase tudo é a moto. É a conta que o cliente vai
 * encontrar na proposta do banco, então é a que deve aparecer
 * aqui - uma conta mais simples daria um número menor e
 * prometeria o que a loja não entrega.
 */
export function parcelaPrice(
  financiado: number,
  juros: number,
  meses: number
) {
  if (financiado <= 0 || meses <= 0) return 0;

  if (juros === 0) return financiado / meses;

  return (
    (financiado * juros) / (1 - Math.pow(1 + juros, -meses))
  );
}
