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

/*
 * Máscara de digitação. Os números entram pela direita e as
 * duas últimas casas viram os centavos - digitar 2087 mostra
 * 20,87. Assim ninguém precisa lembrar da vírgula.
 */
export function mascaraMoeda(texto: string) {
  const digitos = String(texto ?? "").replace(/\D/g, "");

  if (!digitos) return "";

  /* Zeros à esquerda só atrapalham: 0045 é 0,45. */
  const centavos = Number(digitos);

  return (centavos / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* Desfaz a máscara: "1.234,56" vira 1234.56. */
export function valorDaMascara(texto: string) {
  const digitos = String(texto ?? "").replace(/\D/g, "");

  return digitos ? Number(digitos) / 100 : 0;
}
