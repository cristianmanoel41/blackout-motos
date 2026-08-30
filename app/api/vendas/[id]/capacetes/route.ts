import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const FORMAS_VALIDAS = new Set([
  "Pix",
  "Dinheiro",
  "Transferência",
  "Cartão",
  "Outro",
]);

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

async function buscarVenda(
  supabase: any,
  id: string
) {
  const {
    data: venda,
    error,
  } = await supabase
    .from("sales")
    .select(`
      id,
      data_venda,
      cliente,
      valor_total_venda,
      valor_venda,
      forma_pagamento,
      motorcycle_id
    `)
    .eq("id", id)
    .maybeSingle();

  if (
    error ||
    !venda
  ) {
    return {
      venda: null,
      error,
    };
  }

  let moto = null;

  if (venda.motorcycle_id) {
    const {
      data: motoData,
    } = await supabase
      .from("motorcycles")
      .select(`
        id,
        codigo,
        marca,
        modelo,
        versao,
        placa
      `)
      .eq(
        "id",
        venda.motorcycle_id
      )
      .maybeSingle();

    moto = motoData || null;
  }

  return {
    venda: {
      ...venda,
      moto,
    },
    error: null,
  };
}

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const { id } = await params;

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

  const {
    venda,
    error: vendaError,
  } = await buscarVenda(
    supabase,
    id
  );

  if (
    vendaError ||
    !venda
  ) {
    return NextResponse.json(
      {
        error:
          vendaError?.message ||
          "Venda não encontrada.",
      },
      { status: 404 }
    );
  }

  const {
    data: lancamentos,
    error: lancamentosError,
  } = await supabase
    .from(
      "helmet_unregistered_sales"
    )
    .select(`
      id,
      sale_id,
      data_venda,
      valor_recebido,
      forma_pagamento,
      observacoes,
      ja_incluido_na_venda,
      caixa_lancado,
      criado_em
    `)
    .eq("sale_id", id)
    .order("data_venda", {
      ascending: false,
    })
    .order("criado_em", {
      ascending: false,
    });

  if (lancamentosError) {
    return NextResponse.json(
      {
        error:
          lancamentosError.message ||
          "Não foi possível carregar os capacetes vinculados.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    venda,
    lancamentos:
      lancamentos ?? [],
  });
}

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const { id } = await params;

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

  const {
    venda,
    error: vendaError,
  } = await buscarVenda(
    supabase,
    id
  );

  if (
    vendaError ||
    !venda
  ) {
    return NextResponse.json(
      {
        error:
          vendaError?.message ||
          "Venda não encontrada.",
      },
      { status: 404 }
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

  const valor = Number(
    corpo?.valor
  );

  const data = String(
    corpo?.data || ""
  ).trim();

  const formaPagamento =
    String(
      corpo?.forma_pagamento ||
        ""
    ).trim();

  const tipo = String(
    corpo?.tipo || ""
  ).trim();

  const observacoes =
    String(
      corpo?.observacoes ||
        ""
    )
      .trim()
      .slice(0, 1000);

  if (
    !Number.isFinite(valor) ||
    valor <= 0
  ) {
    return NextResponse.json(
      {
        error:
          "Informe um valor maior que zero.",
      },
      { status: 400 }
    );
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      data
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

  if (
    tipo !== "incluido" &&
    tipo !== "novo"
  ) {
    return NextResponse.json(
      {
        error:
          "Informe se o valor já estava na venda ou se é um recebimento novo.",
      },
      { status: 400 }
    );
  }

  const jaIncluido =
    tipo === "incluido";

  const {
    data: lancamento,
    error: insertError,
  } = await supabase
    .from(
      "helmet_unregistered_sales"
    )
    .insert({
      sale_id: id,
      data_venda: data,
      valor_recebido: valor,
      forma_pagamento:
        formaPagamento,
      observacoes:
        observacoes || null,
      ja_incluido_na_venda:
        jaIncluido,
      caixa_lancado:
        !jaIncluido,
    })
    .select(`
      id,
      sale_id,
      data_venda,
      valor_recebido,
      forma_pagamento,
      observacoes,
      ja_incluido_na_venda,
      caixa_lancado,
      criado_em
    `)
    .single();

  if (
    insertError ||
    !lancamento
  ) {
    return NextResponse.json(
      {
        error:
          insertError?.message ||
          "Não foi possível vincular o capacete à venda.",
      },
      { status: 500 }
    );
  }

  if (!jaIncluido) {
    const descricaoMoto = [
      venda.moto?.marca,
      venda.moto?.modelo,
      venda.moto?.placa,
    ]
      .filter(Boolean)
      .join(" ");

    const {
      error: caixaError,
    } = await supabase
      .from(
        "cash_transactions"
      )
      .insert({
        data,
        tipo: "entrada",
        origem: "venda_capacete",
        origem_id:
          lancamento.id,
        valor,
        descricao:
          `Capacete recebido após venda - ${
            descricaoMoto ||
            "Venda"
          } - ${formaPagamento}`,
      });

    if (caixaError) {
      await supabase
        .from(
          "helmet_unregistered_sales"
        )
        .delete()
        .eq(
          "id",
          lancamento.id
        );

      return NextResponse.json(
        {
          error:
            caixaError.message ||
            "O capacete não foi salvo porque não foi possível lançar a entrada no caixa.",
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    {
      ok: true,
      lancamento,
    },
    { status: 201 }
  );
}

export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const { id } = await params;

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

  const url = new URL(
    request.url
  );

  const lancamentoId =
    String(
      url.searchParams.get(
        "lancamento"
      ) || ""
    ).trim();

  if (!lancamentoId) {
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
    .select(`
      id,
      sale_id,
      caixa_lancado
    `)
    .eq("id", lancamentoId)
    .eq("sale_id", id)
    .maybeSingle();

  if (
    buscaError ||
    !lancamento
  ) {
    return NextResponse.json(
      {
        error:
          buscaError?.message ||
          "Lançamento não encontrado.",
      },
      { status: 404 }
    );
  }

  let transacoesCaixa: any[] =
    [];

  if (
    lancamento.caixa_lancado
  ) {
    const {
      data: caixa,
      error: caixaBuscaError,
    } = await supabase
      .from(
        "cash_transactions"
      )
      .select(`
        id,
        data,
        tipo,
        origem,
        origem_id,
        valor,
        descricao,
        criado_em
      `)
      .in("origem", ["outro", "venda_capacete"])
      .eq(
        "origem_id",
        lancamentoId
      )
      .like(
        "descricao",
        "Capacete recebido após venda%"
      );

    if (caixaBuscaError) {
      return NextResponse.json(
        {
          error:
            caixaBuscaError.message ||
            "Não foi possível verificar o caixa.",
        },
        { status: 500 }
      );
    }

    transacoesCaixa =
      caixa ?? [];

    if (
      transacoesCaixa.length >
      0
    ) {
      const {
        error: caixaDeleteError,
      } = await supabase
        .from(
          "cash_transactions"
        )
        .delete()
        .eq(
          "origem",
          "outro"
        )
        .eq(
          "origem_id",
          lancamentoId
        )
        .like(
          "descricao",
          "Capacete recebido após venda%"
        );

      if (
        caixaDeleteError
      ) {
        return NextResponse.json(
          {
            error:
              caixaDeleteError.message ||
              "Não foi possível remover a entrada do caixa.",
          },
          { status: 500 }
        );
      }
    }
  }

  const {
    error: deleteError,
  } = await supabase
    .from(
      "helmet_unregistered_sales"
    )
    .delete()
    .eq(
      "id",
      lancamentoId
    )
    .eq("sale_id", id);

  if (deleteError) {
    if (
      transacoesCaixa.length >
      0
    ) {
      const {
        error:
          restauracaoError,
      } = await supabase
        .from(
          "cash_transactions"
        )
        .insert(
          transacoesCaixa
        );

      if (
        restauracaoError
      ) {
        console.error(
          "Falha ao restaurar caixa:",
          restauracaoError
        );

        return NextResponse.json(
          {
            error:
              "O capacete não foi removido e ocorreu um problema ao restaurar o caixa. Confira o caixa.",
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        error:
          deleteError.message ||
          "Não foi possível excluir o lançamento.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
  });
}
