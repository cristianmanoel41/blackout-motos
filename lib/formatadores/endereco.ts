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

/*
 * O tipo e o nome do logradouro separados, para a procuração
 * escrever "residente na Rua:  Francisco Ricci" (modelo da loja,
 * 14/11/2026). Sem tipo no cadastro, o tipo é "Rua".
 *
 *   "Rua Francisco Ricci"  -> { tipo: "Rua", nome: "Francisco Ricci" }
 *   "av. andrômeda"        -> { tipo: "Av.", nome: "andrômeda" }
 *   "Francisco Ricci"      -> { tipo: "Rua", nome: "Francisco Ricci" }
 */
export function separarLogradouro(valor: unknown) {
  const endereco = String(valor || "").trim();
  const achado = endereco.match(LOGRADOUROS);

  if (!achado) return { tipo: endereco ? "Rua" : "", nome: endereco };

  /* "av." casa como "av" (o ponto não é letra): o ponto vai junto. */
  const comPonto = endereco.charAt(achado[0].length) === "." ? achado[0] + "." : achado[0];

  /* Abreviação vira o nome inteiro: "av." -> "Avenida". */
  const ABREVIACOES: Record<string, string> = {
    "r.": "Rua",
    av: "Avenida",
    "av.": "Avenida",
    "tv.": "Travessa",
    "al.": "Alameda",
    "rod.": "Rodovia",
    praca: "Praça",
  };

  const chave = comPonto.toLocaleLowerCase("pt-BR");
  const tipo =
    ABREVIACOES[chave] ||
    chave.charAt(0).toLocaleUpperCase("pt-BR") + chave.slice(1);

  return {
    tipo,
    nome: endereco.slice(comPonto.length).trim(),
  };
}

export function comLogradouro(valor: unknown) {
  const endereco = String(valor || "").trim();

  if (!endereco) return "";

  return LOGRADOUROS.test(endereco)
    ? endereco
    : `Rua ${endereco}`;
}
