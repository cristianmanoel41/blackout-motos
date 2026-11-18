/*
 * O CALENDÁRIO DO LICENCIAMENTO EM SÃO PAULO
 *
 * O licenciamento anual (a taxa que libera o CRLV-e do ano)
 * vence conforme o último número da placa. Na placa Mercosul
 * (ABC1D23) o último caractere também é número, então a regra
 * é a mesma: vale o último dígito.
 *
 * Calendário de 2026 do Detran-SP (carros, motos, ônibus e
 * reboques - caminhão tem outro calendário), conferido em
 * 18/11/2026 em AutoPapo, VRUM e ABC do ABC:
 *
 *   final 1 e 2  até 31/07
 *   final 3 e 4  até 31/08
 *   final 5 e 6  até 30/09
 *   final 7 e 8  até 31/10
 *   final 9      até 30/11
 *   final 0      até 31/12
 *
 * O de 2027 ainda não saiu (só o do IPVA). O de SP repete esse
 * desenho há anos, então os anos sem tabela própria usam ele.
 * Quando o Detran publicar um calendário diferente, é só pôr o
 * ano em CALENDARIOS com as datas novas.
 */

type Vencimento = { mes: number; dia: number };

/* Mês de 1 a 12. A chave é o último dígito da placa. */
const PADRAO: Record<number, Vencimento> = {
  1: { mes: 7, dia: 31 },
  2: { mes: 7, dia: 31 },
  3: { mes: 8, dia: 31 },
  4: { mes: 8, dia: 31 },
  5: { mes: 9, dia: 30 },
  6: { mes: 9, dia: 30 },
  7: { mes: 10, dia: 31 },
  8: { mes: 10, dia: 31 },
  9: { mes: 11, dia: 30 },
  0: { mes: 12, dia: 31 },
};

const CALENDARIOS: Record<number, Record<number, Vencimento>> = {
  2026: PADRAO,
};

/* O último número da placa: "ABC-1D23" -> 3, "ABC-1234" -> 4. */
export function finalDaPlaca(placa: unknown): number | null {
  const achado = String(placa || "").match(/(\d)[^\d]*$/);
  return achado ? Number(achado[1]) : null;
}

/* Data de vencimento de um ano (exercício) para um final. */
export function vencimentoDoAno(final: number, ano: number) {
  const tabela = CALENDARIOS[ano] || PADRAO;
  const { mes, dia } = tabela[final];
  return new Date(ano, mes - 1, dia, 23, 59, 59);
}

/* O primeiro dia do mês do vencimento: é quando o aviso começa. */
function inicioDoMes(final: number, ano: number) {
  const tabela = CALENDARIOS[ano] || PADRAO;
  return new Date(ano, tabela[final].mes - 1, 1);
}

export type SituacaoLicenciamento =
  | { tipo: "sem-placa" }
  | { tipo: "ok"; ano: number }
  | {
      tipo: "vencido" | "vence-este-mes" | "vence-mes-que-vem";
      ano: number;
      vencimento: Date;
      final: number;
    };

/*
 * O que a loja precisa conferir nesta moto hoje.
 *
 *   - O ano exigido é o último cujo mês de vencimento já
 *     começou. Em janeiro de 2027 ainda vale o de 2026, porque
 *     o de 2027 só vence a partir de julho.
 *   - Se esse ano já foi conferido, está ok - a não ser que o
 *     próximo vença no mês que vem, aí aparece como aviso de
 *     antecedência.
 *   - Sem conferência, ou já venceu (moto que entrou no pátio
 *     depois do prazo, por exemplo) ou vence neste mês.
 */
export function situacaoDoLicenciamento(
  placa: unknown,
  conferidoAno: number | null,
  hoje = new Date()
): SituacaoLicenciamento {
  const final = finalDaPlaca(placa);
  if (final === null) return { tipo: "sem-placa" };

  const anoAtual = hoje.getFullYear();
  const exigido = hoje >= inicioDoMes(final, anoAtual) ? anoAtual : anoAtual - 1;
  const conferido = conferidoAno || 0;

  if (conferido < exigido) {
    const vencimento = vencimentoDoAno(final, exigido);
    return {
      tipo: hoje > vencimento ? "vencido" : "vence-este-mes",
      ano: exigido,
      vencimento,
      final,
    };
  }

  /* Aviso de antecedência: o próximo ano vence no mês que vem. */
  const proximo = exigido + 1;
  if (conferido < proximo) {
    const inicio = inicioDoMes(final, proximo);
    const umMesAntes = new Date(inicio.getFullYear(), inicio.getMonth() - 1, 1);
    if (hoje >= umMesAntes) {
      return {
        tipo: "vence-mes-que-vem",
        ano: proximo,
        vencimento: vencimentoDoAno(final, proximo),
        final,
      };
    }
  }

  return { tipo: "ok", ano: conferido };
}

/* O ano que o botão "Conferido" grava: o que está sendo cobrado agora. */
export function anoParaConferir(situacao: SituacaoLicenciamento) {
  return "vencimento" in situacao ? situacao.ano : null;
}

export function dataCurta(data: Date) {
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
