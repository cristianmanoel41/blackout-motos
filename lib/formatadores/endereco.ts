/*
 * O endereço cadastrado quase sempre já traz o tipo do
 * logradouro: "Rua Frei Inocêncio", "Avenida Andrômeda".
 *
 * Os contratos e a procuração escrevem só "residente na" ou
 * "domiciliado à" - sem "rua" fixo na frase. Senão sai
 * "domiciliado à rua Avenida Andrômeda", que é o que acontecia.
 *
 * Quando o cadastro vem só com o nome, sem o tipo, aqui se
 * completa com "Rua" para a frase fechar.
 */

const LOGRADOUROS =
  /^(rua|r\.|av|av\.|avenida|travessa|tv\.|alameda|al\.|estrada|rodovia|rod\.|praca|praça|via|largo|viela|quadra)\b/i;

export function comLogradouro(valor: unknown) {
  const endereco = String(valor || "").trim();

  if (!endereco) return "";

  return LOGRADOUROS.test(endereco)
    ? endereco
    : `Rua ${endereco}`;
}
