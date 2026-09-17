/*
 * Datas na tela, no formato brasileiro.
 *
 * Duas coisas diferentes chegam aqui:
 *
 * - data pura ("2026-09-17"), das colunas `date` do banco;
 * - momento com hora ("2026-09-17T21:18:20.501336+00:00"),
 *   das colunas `timestamptz`.
 *
 * A data pura NÃO passa por Date: o navegador a leria como
 * meia-noite em UTC e, no Brasil, mostraria o dia anterior.
 * Por isso ela é partida como texto mesmo.
 *
 * O momento com hora, ao contrário, precisa de Date - ele vem
 * em UTC e tem que ser mostrado no horário de São Paulo.
 */

function temHora(data: string) {
  return data.includes("T") || data.includes(" ");
}

export function formatarData(
  data: string | null | undefined
): string {
  if (!data) return "—";

  if (temHora(data)) {
    const momento = new Date(data);

    if (Number.isNaN(momento.getTime())) return "—";

    return momento.toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });
  }

  const [ano, mes, dia] = data.split("-");

  return `${dia}/${mes}/${ano}`;
}

/* Dia e hora, para quando o horário importa. */
export function formatarDataHora(
  data: string | null | undefined
): string {
  if (!data) return "—";

  if (!temHora(data)) return formatarData(data);

  const momento = new Date(data);

  if (Number.isNaN(momento.getTime())) return "—";

  return momento.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
