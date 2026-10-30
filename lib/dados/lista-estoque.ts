/*
 * A LISTA DO ESTOQUE, LINHA POR LINHA
 *
 * A mesma lista sai em dois lugares: no Word que a loja
 * imprime e manda (app/api/estoque/lista) e na janela que
 * abre na própria tela do estoque. As contas ficam aqui para
 * as duas mostrarem a moto escrita igual, na mesma ordem.
 */

export type MotoDaLista = {
  marca?: unknown;
  modelo?: unknown;
  versao?: unknown;
  cor?: unknown;
  placa?: unknown;
  ano_fabricacao?: unknown;
  ano_modelo?: unknown;
  quilometragem?: unknown;
  cilindrada?: unknown;
  preco_anunciado?: unknown;
};

/* "CG 160 FAN CBS - VERMELHA": a marca fica de fora, porque ela
   já está implícita no modelo e tomaria espaço da coluna. */
export function nomeDaMoto(moto: MotoDaLista) {
  const nome = [moto.modelo, moto.versao]
    .map((parte) => String(parte || "").trim())
    .filter(Boolean)
    .join(" ");

  const cor = String(moto.cor || "").trim();

  return (
    [nome, cor]
      .filter(Boolean)
      .join(" - ")
      .toUpperCase()
      /*
       * O "i" de injecao continua minusculo: a moto se chama
       * YBR 125i, e "125I" parece erro de digitacao para quem
       * conhece. Vale so quando vem colado no numero.
       */
      .replace(/(\d)I\b/g, "$1i")
  );
}

export function quilometros(valor: unknown) {
  const conta = Number(valor || 0);

  return Number.isFinite(conta) && conta > 0
    ? new Intl.NumberFormat("pt-BR").format(conta)
    : "";
}

export function valorDaLista(valor: unknown) {
  const conta = Number(valor || 0);

  if (!Number.isFinite(conta) || conta <= 0) return "A consultar";

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(conta);
}

/* "2024/2025", e só um ano quando os dois são iguais ou falta
   um deles - repetir o mesmo número duas vezes não informa. */
export function anosDaMoto(moto: MotoDaLista) {
  const fab = String(moto.ano_fabricacao || "").trim();
  const mod = String(moto.ano_modelo || "").trim();

  if (fab && mod) return `${fab}/${mod}`;

  return fab || mod || "";
}

/*
 * Por cilindrada, e dentro dela por marca e modelo.
 *
 * Cilindrada primeiro porque é assim que o cliente
 * pergunta - "o que vocês têm de 160?" -, e quem procura
 * uma 125 não quer ler a lista inteira.
 *
 * A marca é comparada em maiúsculas porque no banco ela
 * aparece escrita de jeitos diferentes - "Honda" e "HONDA"
 * são a mesma marca e não podem virar dois grupos.
 */
export function agruparPorCilindrada<T extends MotoDaLista>(motos: T[]) {
  const grupos = new Map<number, T[]>();

  for (const moto of motos) {
    const cc = Math.round(Number(moto.cilindrada || 0));

    const chave = Number.isFinite(cc) && cc > 0 ? cc : 0;

    if (!grupos.has(chave)) grupos.set(chave, []);

    grupos.get(chave)!.push(moto);
  }

  /* Cilindrada sem informar vai para o fim, e não no começo
     como o zero mandaria. */
  const cilindradas = [...grupos.keys()].sort(
    (a, b) => (a || Infinity) - (b || Infinity)
  );

  return cilindradas.map((cc) => ({
    cc,
    rotulo: cc > 0 ? `${cc} CC` : "OUTRAS CILINDRADAS",
    motos: (grupos.get(cc) || []).sort((a, b) => {
      const marcaA = String(a.marca || "").toUpperCase();
      const marcaB = String(b.marca || "").toUpperCase();

      if (marcaA !== marcaB) return marcaA.localeCompare(marcaB);

      return nomeDaMoto(a).localeCompare(nomeDaMoto(b));
    }),
  }));
}
