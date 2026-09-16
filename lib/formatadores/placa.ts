/*
 * Placa sempre no mesmo formato: três letras, hífen, quatro
 * caracteres - CUI-3G48. Vale para o padrão antigo (ABC-1234)
 * e para o Mercosul (ABC-1D23), que têm o mesmo tamanho.
 *
 * O hífen é guardado junto com o valor, para o cadastro, os
 * contratos e a vitrine mostrarem a mesma coisa sem cada tela
 * precisar formatar por conta própria.
 */

export function limparPlaca(valor: unknown) {
  return String(valor || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 7);
}

export function formatarPlaca(valor: unknown) {
  const limpa = limparPlaca(valor);

  /* Enquanto se digita as três primeiras, ainda não há hífen. */
  if (limpa.length <= 3) return limpa;

  return `${limpa.slice(0, 3)}-${limpa.slice(3)}`;
}
