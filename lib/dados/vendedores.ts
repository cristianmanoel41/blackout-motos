/*
 * Vendedores da loja.
 *
 * Arquivo sem "use client" de propósito: é usado tanto nas
 * telas quanto nos relatórios, que rodam no servidor.
 */

export const VENDEDORES = ['Cristian', 'Bruno'] as const

function semAcento(valor?: string | null) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/*
 * Reduz o que estiver gravado ao primeiro nome do vendedor:
 * "Cristian Fonseca", "cristian" e "CRISTIAN" viram Cristian.
 *
 * O que não for de nenhum dos dois volta como veio - venda
 * antiga lançada em outro nome continua aparecendo com ele,
 * em vez de sumir do histórico.
 */
export function nomeCurtoVendedor(
  valor?: string | null
): string {
  const alvo = semAcento(valor)

  if (!alvo) return ''

  const encontrado = VENDEDORES.find((vendedor) => {
    const referencia = semAcento(vendedor)

    return (
      alvo === referencia ||
      alvo.startsWith(`${referencia} `) ||
      alvo.includes(referencia)
    )
  })

  return encontrado || String(valor || '').trim()
}

/*
 * Vendedor correspondente ao usuário logado, para preencher
 * o campo sozinho. Quem não é vendedor devolve vazio.
 */
export function vendedorDoUsuario(
  nome?: string | null
): string {
  const alvo = semAcento(nome)

  if (!alvo) return ''

  return (
    VENDEDORES.find((vendedor) => {
      const referencia = semAcento(vendedor)

      return (
        alvo === referencia ||
        alvo.startsWith(`${referencia} `)
      )
    }) || ''
  )
}
