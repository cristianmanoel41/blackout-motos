/*
 * Bancos e financeiras com quem a Blackout Motos trabalha.
 *
 * Usado nos selects de financiamento (nova venda e edição da
 * venda) e no relatório mensal por banco. Para incluir ou tirar
 * uma financeira, mexa só aqui.
 */

export const BANCOS_FINANCIAMENTO = [
  'Santander',
  'Bradesco',
  'BV',
  'Banco Pan',
  'Fontecred',
  'Omni',
] as const

/*
 * Operadora das maquininhas de cartão da loja.
 */
export const OPERADORA_CARTAO = 'Listofacil'

/*
 * Monta a lista do select mantendo o valor que já está salvo
 * na venda, mesmo que seja de um banco que a loja não usa mais.
 */
export function opcoesDeBanco(
  valorAtual?: string | null
): string[] {
  const lista: string[] = [...BANCOS_FINANCIAMENTO]

  const atual = (valorAtual || '').trim()

  if (
    atual &&
    !lista.some(
      (banco) =>
        banco.toLowerCase() === atual.toLowerCase()
    )
  ) {
    lista.push(atual)
  }

  return lista
}
