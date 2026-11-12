/*
 * Nome de pessoa como se escreve em documento:
 *
 *   "JOAO DA SILVA"   -> "Joao da Silva"
 *   "maria dos santos" -> "Maria dos Santos"
 *   "ana-paula d'avila" -> "Ana-Paula D'Avila"
 *
 * Pedido da loja em 12/11/2026, para os contratos: o cadastro
 * guarda o nome do jeito que foi digitado (tudo maiúsculo, tudo
 * minúsculo...), e o documento sai sempre igual.
 *
 * Só mexe em maiúscula/minúscula e espaços: não troca letra nem
 * acento. "da, de, do, das, dos, e" ficam minúsculos, menos se
 * forem a primeira palavra.
 */

const LIGACOES = new Set(["da", "de", "do", "das", "dos", "e", "di", "du", "del", "van", "von"]);

function primeiraMaiuscula(parte: string) {
  return parte ? parte.charAt(0).toLocaleUpperCase("pt-BR") + parte.slice(1) : parte;
}

export function nomeProprio(valor: unknown) {
  const palavras = String(valor ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR")
    .split(" ")
    .filter(Boolean);

  return palavras
    .map((palavra, i) => {
      if (i > 0 && LIGACOES.has(palavra)) return palavra;

      /* Nome composto com hífen ou apóstrofo: cada pedaço maiúsculo. */
      return palavra
        .split(/([-'’])/)
        .map(primeiraMaiuscula)
        .join("");
    })
    .join(" ");
}
