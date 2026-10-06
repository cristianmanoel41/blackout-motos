/*
 * O nome de quem está usando o sistema.
 *
 * O painel dizia "Olá, Cristian" escrito à mão. Quando o Murilo
 * entrava com a conta dele, o sistema o chamava de Cristian -
 * e num sistema que registra quem lançou cada venda, isso não é
 * detalhe de estética.
 *
 * O nome vem de duas fontes, nesta ordem:
 *
 *   1. A tabela `profiles`, que é onde o nome completo é
 *      cadastrado. Hoje só as contas do Cristian têm linha lá.
 *   2. O próprio e-mail: `murilo@admin.com` vira "Murilo".
 *
 * A segunda existe para ninguém ser chamado pelo nome errado só
 * porque o perfil ainda não foi preenchido.
 */

export function nomeAPartirDoEmail(email?: string | null) {
  const usuario = String(email || "")
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .trim();

  if (!usuario) return "";

  return usuario
    .split(/\s+/)
    .map(
      (parte) =>
        parte.charAt(0).toUpperCase() +
        parte.slice(1).toLowerCase()
    )
    .join(" ");
}

/*
 * Só o primeiro nome, para cumprimentar.
 *
 * "Olá, Cristian Manoel" soa como carta de banco. Quem está
 * abrindo o próprio sistema de manhã é chamado pelo primeiro
 * nome, como a loja se chama entre si.
 */
export function primeiroNome(nomeCompleto?: string | null) {
  return String(nomeCompleto || "").trim().split(/\s+/)[0] || "";
}
