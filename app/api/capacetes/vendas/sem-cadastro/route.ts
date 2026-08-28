import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const FORMAS_VALIDAS = new Set([
  "Pix",
  "Dinheiro",
  "Transferência",
  "Cartão",
  "Outro",
]);

async function usuarioAutenticado() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    supabase,
    user,
  };
}

export async function GET() {
  const {
    supabase,
    user,
  } = await usuarioAutenticado();

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
    data,
    error,
  } = await supabase
    .from(
      "helmet_unregistered_sales"
    )
    .select(
      "id, data_venda, valor_recebido, forma_pagamento, observacoes, criado_em"
    )
    .order("data_venda", {
      ascending: false,
    })
    .order("criado_em", {
      ascending: false,
    })
    .limit(500);

  if (error) {
    return NextResponse.json(
      {
        error:
          error.message ||
          "Não foi possível carregar os lançamentos.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    lancamentos: data ?? [],
  });
}

export async function POST(
  request: Request
) {
  const {
    supabase,
    user,
  } = await usuarioAutenticado();

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
    corpo = await request.json();
  } catch {
    return NextResponse.json(
      {
        error:
          "Dados do lançamento inválidos.",
      },
      { status: 400 }
    );
  }

  const dataVenda = String(
    corpo?.data_venda || ""
  ).trim();

  const valorRecebido = Number(
    corpo?.valor_recebido
  );

  const formaPagamento = String(
    corpo?.forma_pagamento || ""
  ).trim();

  const observacoes = String(
    corpo?.observacoes || ""
  )
    .trim()
    .slice(0, 1000);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      dataVenda
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Informe uma data válida.",
      },
      { status: 400 }
    );
  }

  if (
    !Number.isFinite(
      valorRecebido
    ) ||
    valorRecebido <= 0
  ) {
    return NextResponse.json(
      {
        error:
          "Informe um valor recebido maior que zero.",
      },
      { status: 400 }
    );
  }

  if (
    !FORMAS_VALIDAS.has(
      formaPagamento
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Forma de pagamento inválida.",
      },
      { status: 400 }
    );
  }

  const {
    data: venda,
    error: vendaError,
  } = await supabase
    .from(
      "helmet_unregistered_sales"
    )
    .insert({
      data_venda: dataVenda,
      valor_recebido:
        valorRecebido,
      forma_pagamento:
        formaPagamento,
      observacoes:
        observacoes || null,
    })
    .select(
      "id, data_venda, valor_recebido, forma_pagamento, observacoes, criado_em"
    )
    .single();

  if (
    vendaError ||
    !venda
  ) {
    return NextResponse.json(
      {
        error:
          vendaError?.message ||
          "Não foi possível registrar o recebimento.",
      },
      { status: 500 }
    );
  }

  const descricaoBase =
    "Venda de capacete - estoque antigo sem cadastro";

  const {
    error: caixaError,
  } = await supabase
    .from(
      "cash_transactions"
    )
    .insert({
      data: dataVenda,
      tipo: "entrada",
      origem: "outro",
      origem_id: venda.id,
      valor: valorRecebido,
      descricao:
        `${descricaoBase} - ${formaPagamento}`,
    });

  if (caixaError) {
    await supabase
      .from(
        "helmet_unregistered_sales"
      )
      .delete()
      .eq("id", venda.id);

    return NextResponse.json(
      {
        error:
          caixaError.message ||
          "O recebimento não foi salvo porque não foi possível lançar a entrada no caixa.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      lancamento: venda,
    },
    { status: 201 }
  );
}

export async function DELETE(
  request: Request
) {
  const {
    supabase,
    user,
  } = await usuarioAutenticado();

  if (!user) {
    return NextResponse.json(
      {
        error:
          "Sua sessão expirou. Entre novamente no sistema.",
      },
      { status: 401 }
    );
  }

  const url = new URL(
    request.url
  );

  const id = String(
    url.searchParams.get("id") ||
      ""
  ).trim();

  if (!id) {
    return NextResponse.json(
      {
        error:
          "Lançamento não informado.",
      },
      { status: 400 }
    );
  }

  const {
    data: lancamento,
    error: buscaError,
  } = await supabase
    .from(
      "helmet_unregistered_sales"
    )
    .select(
      "id, data_venda, valor_recebido, forma_pagamento, observacoes, criado_em"
    )
    .eq("id", id)
    .maybeSingle();

  if (buscaError) {
    return NextResponse.json(
      {
        error:
          buscaError.message ||
          "Não foi possível localizar o lançamento.",
      },
      { status: 500 }
    );
  }

  if (!lancamento) {
    return NextResponse.json(
      {
        error:
          "Esse lançamento não existe mais.",
      },
      { status: 404 }
    );
  }

  const {
    data: transacoesCaixa,
    error: caixaBuscaError,
  } = await supabase
    .from(
      "cash_transactions"
    )
    .select(
      "id, data, tipo, origem, origem_id, valor, descricao, criado_em"
    )
    .eq("origem", "outro")
    .eq("origem_id", id)
    .like(
      "descricao",
      "Venda de capacete - estoque antigo sem cadastro%"
    );

  if (caixaBuscaError) {
    return NextResponse.json(
      {
        error:
          caixaBuscaError.message ||
          "Não foi possível verificar a entrada vinculada no caixa.",
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
      .from(
        "cash_transactions"
      )
      .delete()
      .eq("origem", "outro")
      .eq("origem_id", id)
      .like(
        "descricao",
        "Venda de capacete - estoque antigo sem cadastro%"
      );

    if (caixaDeleteError) {
      return NextResponse.json(
        {
          error:
            caixaDeleteError.message ||
            "Não foi possível remover a entrada vinculada do caixa.",
        },
        { status: 500 }
      );
    }
  }

  const {
    error: lancamentoDeleteError,
  } = await supabase
    .from(
      "helmet_unregistered_sales"
    )
    .delete()
    .eq("id", id);

  if (lancamentoDeleteError) {
    if (
      transacoesCaixa &&
      transacoesCaixa.length > 0
    ) {
      const {
        error: restauracaoError,
      } = await supabase
        .from(
          "cash_transactions"
        )
        .insert(
          transacoesCaixa
        );

      if (restauracaoError) {
        console.error(
          "Falha ao restaurar entrada do caixa:",
          restauracaoError
        );

        return NextResponse.json(
          {
            error:
              "O lançamento não foi removido e ocorreu um problema ao restaurar o caixa. Confira o caixa antes de tentar novamente.",
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        error:
          lancamentoDeleteError.message ||
          "Não foi possível remover o lançamento.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
  });
}
