import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      {
        error:
          "Lançamento de gasto não informado.",
      },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const {
    data: {
      user,
    },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        error:
          "Sua sessão expirou. Entre novamente no sistema.",
      },
      { status: 401 }
    );
  }

  const {
    data: gasto,
    error: gastoBuscaError,
  } = await supabase
    .from("motorcycle_expenses")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (gastoBuscaError) {
    return NextResponse.json(
      {
        error:
          gastoBuscaError.message ||
          "Não foi possível localizar o gasto.",
      },
      { status: 500 }
    );
  }

  if (!gasto) {
    return NextResponse.json(
      {
        error:
          "Esse lançamento não existe mais.",
      },
      { status: 404 }
    );
  }

  /*
   * Guarda uma cópia das saídas de caixa vinculadas
   * ao gasto antes da exclusão. Isso permite restaurar
   * o caixa se, por algum motivo, a exclusão do gasto
   * falhar depois.
   */
  const {
    data: transacoesCaixa,
    error: caixaBuscaError,
  } = await supabase
    .from("cash_transactions")
    .select(
      "id, data, tipo, origem, origem_id, valor, descricao, criado_em"
    )
    .eq("origem", "outro")
    .eq("origem_id", id);

  if (caixaBuscaError) {
    return NextResponse.json(
      {
        error:
          caixaBuscaError.message ||
          "Não foi possível verificar o lançamento no caixa.",
      },
      { status: 500 }
    );
  }

  if (
    transacoesCaixa &&
    transacoesCaixa.length > 0
  ) {
    const {
      error: caixaDeleteError,
    } = await supabase
      .from("cash_transactions")
      .delete()
      .eq("origem", "outro")
      .eq("origem_id", id);

    if (caixaDeleteError) {
      return NextResponse.json(
        {
          error:
            caixaDeleteError.message ||
            "Não foi possível remover a saída vinculada do caixa.",
        },
        { status: 500 }
      );
    }
  }

  const {
    error: gastoDeleteError,
  } = await supabase
    .from("motorcycle_expenses")
    .delete()
    .eq("id", id);

  if (gastoDeleteError) {
    /*
     * Se o gasto não puder ser removido,
     * restaura qualquer saída de caixa que
     * já tenha sido apagada nesta tentativa.
     */
    if (
      transacoesCaixa &&
      transacoesCaixa.length > 0
    ) {
      const {
        error: restauracaoError,
      } = await supabase
        .from("cash_transactions")
        .insert(transacoesCaixa);

      if (restauracaoError) {
        console.error(
          "Falha crítica ao restaurar caixa após erro na exclusão do gasto:",
          restauracaoError
        );

        return NextResponse.json(
          {
            error:
              "O gasto não foi removido e ocorreu um problema ao restaurar o caixa. Verifique o caixa antes de tentar novamente.",
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        error:
          gastoDeleteError.message ||
          "Não foi possível remover o gasto.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    caixaRemovido:
      transacoesCaixa?.length ?? 0,
  });
}
