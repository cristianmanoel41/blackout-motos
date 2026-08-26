/*
 * Formato de dinheiro do sistema.
 *
 *   formatarMoeda(29900)    -> "R$29.900,00"
 *   formatarMoeda(1234.5)   -> "R$1.234,50"
 *   formatarMoeda(-250)     -> "-R$250,00"
 *   formatarMoeda(null)     -> "R$0,00"
 *
 * O símbolo fica colado no número, sem o espaço que o
 * Intl coloca por padrão. Use SEMPRE esta função: é ela
 * que garante o mesmo formato em tela, relatório, recibo
 * e contrato.
 */

const numeroBR = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatarMoeda(
  valor: number | string | null | undefined
): string {
  const numero = Number(valor) || 0

  const negativo = numero < 0

  return `${negativo ? '-' : ''}R$${numeroBR.format(
    Math.abs(numero)
  )}`
}

/*
 * Só o número, sem o "R$". Para quando o símbolo já está
 * escrito ao lado (cabeçalho de tabela, texto de contrato).
 */
export function formatarNumero(
  valor: number | string | null | undefined
): string {
  return numeroBR.format(Number(valor) || 0)
}
