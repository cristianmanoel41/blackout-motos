/*
 * Telefone como se escreve no contrato:
 *
 *   "12 981470162"      -> "(12) 981470162"
 *   "1239214567"        -> "(12) 39214567"
 *   "+55 12 98147-0162" -> "(12) 981470162"
 *
 * Pedido da loja em 13/11/2026, para o contrato de compra: só o
 * DDD entre parênteses e o resto dos números juntos, sem hífen,
 * como no modelo que a loja aprovou. Se o número não tiver 10 ou
 * 11 dígitos (com ou sem o 55 na frente), sai do jeito que foi
 * digitado, porque mudar um número que a gente não entendeu seria
 * pior.
 */
export function formatarTelefone(valor: unknown) {
  const texto = String(valor ?? "").trim();
  let digitos = texto.replace(/\D/g, "");

  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) {
    digitos = digitos.slice(2);
  }

  if (digitos.length === 10 || digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  }

  return texto;
}
