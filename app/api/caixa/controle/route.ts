import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DESCRICAO_SALDO =
  "Saldo inicial do caixa";

const DESCRICAO_AJUSTE =
  "Ajuste técnico de corte financeiro";

const DATA_TECNICA =
  "1900-01-01";

function numero(valor: unknown) {
  const n = Number(valor);
  return Number.isFinite(n)
    ? n
    : 0;
}

async function contexto() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    supabase,
    user,
  };
}

async function calcularSaldoAtual(
  supabase: any
) {
  const {
    data,
    error,
  } = await supabase
    .from("cash_transactions")
    .select(
      "tipo, valor, descricao, origem, criado_em"
    )
    .eq("confirmado", true);

  if (error) {
    throw error;
  }

  const transacoes =
    data || [];

  const entradas =
    transacoes
      .filter(
        (item: any) =>
          item.tipo === "entrada"
      )
      .reduce(
        (soma: number, item: any) =>
          soma +
          numero(item.valor),
        0
      );

  const saidas =
    transacoes
      .filter(
        (item: any) =>
          item.tipo === "saida"
      )
      .reduce(
        (soma: number, item: any) =>
          soma +
          numero(item.valor),
        0
      );

  return {
    saldo: entradas - saidas,
    transacoes,
  };
}

async function carregarResumo(
  supabase: any
) {
  const {
    data: configuracao,
    error: configError,
  } = await supabase
    .from(
      "cash_control_settings"
    )
    .select(
      "id, data_inicio, inicio_em, saldo_banco_inicial, saldo_dinheiro_inicial, saldo_outros_inicial, saldo_inicial, atualizado_em"
    )
    .eq("id", "principal")
    .maybeSingle();

  if (configError) {
    throw configError;
  }

  const {
    saldo,
    transacoes,
  } =
    await calcularSaldoAtual(
      supabase
    );

  let entradasDesdeInicio = 0;
  let saidasDesdeInicio = 0;

  if (
    configuracao?.inicio_em
  ) {
    for (
      const item of transacoes
    ) {
      if (
        item.descricao ===
          DESCRICAO_SALDO ||
        item.descricao ===
          DESCRICAO_AJUSTE
      ) {
        continue;
      }

      const criadoEm =
        String(
          item.criado_em || ""
        );

      if (
        !criadoEm ||
        criadoEm <=
          configuracao.inicio_em
      ) {
        continue;
      }

      if (
        item.tipo === "entrada"
      ) {
        entradasDesdeInicio +=
          numero(item.valor);
      } else if (
        item.tipo === "saida"
      ) {
        saidasDesdeInicio +=
          numero(item.valor);
      }
    }
  }

  const {
    data: conciliacoes,
    error: conciliacoesError,
  } = await supabase
    .from(
      "cash_reconciliations"
    )
    .select(
      "id, data_conciliacao, saldo_banco, saldo_dinheiro, saldo_outros, saldo_real, saldo_sistema, diferenca, observacoes, criado_em"
    )
    .order(
      "data_conciliacao",
      {
        ascending: false,
      }
    )
    .order(
      "criado_em",
      {
        ascending: false,
      }
    )
    .limit(20);

  if (conciliacoesError) {
    throw conciliacoesError;
  }

  return {
    configuracao:
      configuracao || null,
    saldoCalculado: saldo,
    entradasDesdeInicio,
    saidasDesdeInicio,
    conciliacoes:
      conciliacoes || [],
  };
}

export async function GET() {
  const {
    supabase,
    user,
  } = await contexto();

  if (!user) {
    return NextResponse.json(
      {
        error:
          "Sua sessão expirou. Entre novamente no sistema.",
      },
      { status: 401 }
    );
  }

  try {
    const resumo =
      await carregarResumo(
        supabase
      );

    return NextResponse.json(
      resumo
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Não foi possível carregar o controle do caixa.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request
) {
  const {
    supabase,
    user,
  } = await contexto();

  if (!user) {
    return NextResponse.json(
      {
        error:
          "Sua sessão expirou. Entre novamente no sistema.",
      },
      { status: 401 }
    );
  }

  let corpo: any;

  try {
    corpo =
      await request.json();
  } catch {
    return NextResponse.json(
      {
        error:
          "Dados inválidos.",
      },
      { status: 400 }
    );
  }

  const acao =
    String(
      corpo?.acao || ""
    ).trim();

  if (acao === "configurar") {
    const dataInicio =
      String(
        corpo?.data_inicio ||
          ""
      ).trim();

    const saldoBanco =
      numero(
        corpo?.saldo_banco
      );

    const saldoDinheiro =
      numero(
        corpo?.saldo_dinheiro
      );

    const saldoOutros =
      numero(
        corpo?.saldo_outros
      );

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        dataInicio
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Informe uma data de início válida.",
        },
        { status: 400 }
      );
    }

    if (
      saldoBanco < 0 ||
      saldoDinheiro < 0 ||
      saldoOutros < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Os saldos não podem ser negativos.",
        },
        { status: 400 }
      );
    }

    const saldoInicial =
      saldoBanco +
      saldoDinheiro +
      saldoOutros;

    try {
      const {
        data: especiais,
        error: especiaisError,
      } = await supabase
        .from(
          "cash_transactions"
        )
        .select(
          "id, data, tipo, origem, origem_id, valor, descricao, criado_em"
        )
        .eq("origem", "outro")
        .in(
          "descricao",
          [
            DESCRICAO_SALDO,
            DESCRICAO_AJUSTE,
          ]
        );

      if (especiaisError) {
        throw especiaisError;
      }

      const {
        data: operacionais,
        error: operacionaisError,
      } = await supabase
        .from(
          "cash_transactions"
        )
        .select(
          "tipo, valor, descricao"
        )
        .not(
          "descricao",
          "in",
          `("${DESCRICAO_SALDO}","${DESCRICAO_AJUSTE}")`
        );

      if (operacionaisError) {
        throw operacionaisError;
      }

      const saldoHistorico =
        (operacionais || [])
          .reduce(
            (
              total: number,
              item: any
            ) =>
              total +
              (item.tipo ===
              "entrada"
                ? numero(
                    item.valor
                  )
                : -numero(
                    item.valor
                  )),
            0
          );

      if (
        especiais &&
        especiais.length > 0
      ) {
        const {
          error: deleteError,
        } = await supabase
          .from(
            "cash_transactions"
          )
          .delete()
          .eq("origem", "outro")
          .in(
            "descricao",
            [
              DESCRICAO_SALDO,
              DESCRICAO_AJUSTE,
            ]
          );

        if (deleteError) {
          throw deleteError;
        }
      }

      const novosEspeciais:
        any[] = [];

      if (
        Math.abs(
          saldoHistorico
        ) > 0.004
      ) {
        novosEspeciais.push({
          data: DATA_TECNICA,
          tipo:
            saldoHistorico > 0
              ? "saida"
              : "entrada",
          origem: "outro",
          origem_id: null,
          valor: Math.abs(
            saldoHistorico
          ),
          descricao:
            DESCRICAO_AJUSTE,
        });
      }

      if (
        saldoInicial > 0
      ) {
        novosEspeciais.push({
          data: DATA_TECNICA,
          tipo: "entrada",
          origem: "outro",
          origem_id: null,
          valor:
            saldoInicial,
          descricao:
            DESCRICAO_SALDO,
        });
      }

      if (
        novosEspeciais.length >
        0
      ) {
        const {
          error: insertError,
        } = await supabase
          .from(
            "cash_transactions"
          )
          .insert(
            novosEspeciais
          );

        if (insertError) {
          if (
            especiais &&
            especiais.length >
              0
          ) {
            await supabase
              .from(
                "cash_transactions"
              )
              .insert(
                especiais
              );
          }

          throw insertError;
        }
      }

      const inicioEm =
        new Date().toISOString();

      const {
        error: configError,
      } = await supabase
        .from(
          "cash_control_settings"
        )
        .upsert(
          {
            id: "principal",
            data_inicio:
              dataInicio,
            inicio_em:
              inicioEm,
            saldo_banco_inicial:
              saldoBanco,
            saldo_dinheiro_inicial:
              saldoDinheiro,
            saldo_outros_inicial:
              saldoOutros,
            saldo_inicial:
              saldoInicial,
            atualizado_em:
              inicioEm,
          },
          {
            onConflict: "id",
          }
        );

      if (configError) {
        await supabase
          .from(
            "cash_transactions"
          )
          .delete()
          .eq("origem", "outro")
          .in(
            "descricao",
            [
              DESCRICAO_SALDO,
              DESCRICAO_AJUSTE,
            ]
          );

        if (
          especiais &&
          especiais.length > 0
        ) {
          await supabase
            .from(
              "cash_transactions"
            )
            .insert(
              especiais
            );
        }

        throw configError;
      }

      const resumo =
        await carregarResumo(
          supabase
        );

      return NextResponse.json({
        ok: true,
        mensagem:
          "Saldo inicial configurado. O histórico anterior foi neutralizado tecnicamente sem apagar lançamentos.",
        ...resumo,
      });
    } catch (error: any) {
      return NextResponse.json(
        {
          error:
            error?.message ||
            "Não foi possível configurar o saldo inicial.",
        },
        { status: 500 }
      );
    }
  }

  if (
    acao ===
    "reconciliar"
  ) {
    const saldoBanco =
      numero(
        corpo?.saldo_banco
      );

    const saldoDinheiro =
      numero(
        corpo?.saldo_dinheiro
      );

    const saldoOutros =
      numero(
        corpo?.saldo_outros
      );

    const observacoes =
      String(
        corpo?.observacoes ||
          ""
      )
        .trim()
        .slice(0, 1000);

    if (
      saldoBanco < 0 ||
      saldoDinheiro < 0 ||
      saldoOutros < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Os saldos não podem ser negativos.",
        },
        { status: 400 }
      );
    }

    try {
      const {
        data: configuracao,
        error: configError,
      } = await supabase
        .from(
          "cash_control_settings"
        )
        .select("id")
        .eq("id", "principal")
        .maybeSingle();

      if (configError) {
        throw configError;
      }

      if (!configuracao) {
        return NextResponse.json(
          {
            error:
              "Configure o saldo inicial antes de fazer uma conciliação.",
          },
          { status: 400 }
        );
      }

      const {
        saldo,
      } =
        await calcularSaldoAtual(
          supabase
        );

      const saldoReal =
        saldoBanco +
        saldoDinheiro +
        saldoOutros;

      const diferenca =
        saldoReal - saldo;

      const {
        error: insertError,
      } = await supabase
        .from(
          "cash_reconciliations"
        )
        .insert({
          data_conciliacao:
            new Date().toISOString(),
          saldo_banco:
            saldoBanco,
          saldo_dinheiro:
            saldoDinheiro,
          saldo_outros:
            saldoOutros,
          saldo_real:
            saldoReal,
          saldo_sistema:
            saldo,
          diferenca,
          observacoes:
            observacoes || null,
        });

      if (insertError) {
        throw insertError;
      }

      const resumo =
        await carregarResumo(
          supabase
        );

      return NextResponse.json({
        ok: true,
        mensagem:
          Math.abs(diferenca) <
          0.01
            ? "Caixa conciliado: o sistema está batendo com o saldo real."
            : "Conciliação registrada. Existe diferença para conferir.",
        ...resumo,
      });
    } catch (error: any) {
      return NextResponse.json(
        {
          error:
            error?.message ||
            "Não foi possível registrar a conciliação.",
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    {
      error:
        "Ação não reconhecida.",
    },
    { status: 400 }
  );
}
