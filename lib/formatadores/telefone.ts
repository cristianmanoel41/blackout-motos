/*
 * Telefone como se escreve em documento:
 *
 *   "12 988029889"     -> "(12) 98802-9889"
 *   "1239214567"       -> "(12) 3921-4567"
 *   "+55 12 98802-9889" -> "(12) 98802-9889"
 *
 * Pedido da loja em 13/11/2026, para o contrato de compra: o DDD
 * entre parênteses. Se o número não tiver 10 ou 11 dígitos (com ou
 * sem o 55 na frente), ele sai do jeito que foi digitado, porque
 * mudar um número que a gente não entendeu seria pior.
 */
export function formatarTelefone(valor: unknown) {
  const texto = String(valor ?? "").trim();
  let digitos = texto.replace(/\D/g, "");

  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) {
    digitos = digitos.slice(2);
  }

  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  }

  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }

  return texto;
}
