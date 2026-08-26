import fs from "node:fs/promises";
import path from "node:path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function moeda(valor: unknown) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor) || 0);
}

function dataAtualExtenso() {
  const agora = new Date();

  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).formatToParts(agora);

  const dia =
    partes.find(
      (parte) => parte.type === "day"
    )?.value || "";

  const mes =
    partes.find(
      (parte) => parte.type === "month"
    )?.value || "";

  const ano =
    partes.find(
      (parte) => parte.type === "year"
    )?.value || "";

  return `${dia} de ${mes.toUpperCase()} de ${ano}`;
}

function horaAtual() {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function descricaoPagamentos(
  venda: any,
  componentes: any[]
) {
  const partes: string[] = [];

  for (const item of componentes || []) {
    if (item.tipo === "Cartão") {
      const parcelas =
        Number(item.parcelas) || 1;

      const valorParcela =
        Number(item.valor_parcela) ||
        Number(item.valor) / parcelas;

      partes.push(
        `cartão no valor de ${moeda(
          item.valor
        )}, em ${parcelas}x de ${moeda(
          valorParcela
        )}`
      );
    } else if (
      item.tipo === "Moto na troca"
    ) {
      partes.push(
        `moto na troca considerada pelo valor de ${moeda(
          item.valor
        )}`
      );
    } else {
      partes.push(
        `${item.tipo} no valor de ${moeda(
          item.valor
        )}`
      );
    }
  }

  const financiado =
    Number(venda.valor_financiado) || 0;

  if (financiado > 0) {
    const parcelas =
      Number(
        venda.parcelas_financiamento
      ) || 0;

    partes.push(
      `financiamento de ${moeda(
        financiado
      )}${
        venda.banco
          ? ` pelo banco/financeira ${venda.banco}`
          : ""
      }${
        parcelas > 0
          ? `, em ${parcelas}x`
          : ""
      }`
    );
  }

  if (partes.length === 0) {
    return (
      venda.forma_pagamento ||
      "forma de pagamento não informada"
    );
  }

  return partes.join("; ");
}

function transferenciaDescricao(
  venda: any
) {
  const cliente =
    Number(
      venda.transferencia_cliente
    ) || 0;

  const loja =
    Number(
      venda.transferencia_loja
    ) || 0;

  if (
    cliente > 0 &&
    loja > 0
  ) {
    return `cliente no valor de ${moeda(
      cliente
    )} e loja no valor de ${moeda(
      loja
    )}`;
  }

  if (cliente > 0) {
    return `cliente no valor de ${moeda(
      cliente
    )}`;
  }

  if (loja > 0) {
    return `loja no valor de ${moeda(
      loja
    )}`;
  }

  return "não informado";
}

function nomeArquivoSeguro(
  valor: string
) {
  return valor
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-zA-Z0-9-_ ]/g,
      ""
    )
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
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
  try {
    const { id } =
      await params;

    const supabase =
      await createClient();

    // =====================================================
    // 1. CARREGA A VENDA
    // =====================================================

    const {
      data: venda,
      error: vendaError,
    } = await supabase
      .from("sales")
      .select("*")
      .eq("id", id)
      .single();

    if (
      vendaError ||
      !venda
    ) {
      return Response.json(
        {
          error:
            vendaError?.message ||
            "Venda não encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    // =====================================================
    // 2. CARREGA O CLIENTE
    // =====================================================

    let cliente: any =
      null;

    if (
      venda.customer_id
    ) {
      const {
        data: clienteData,
        error: clienteError,
      } = await supabase
        .from("customers")
        .select("*")
        .eq(
          "id",
          venda.customer_id
        )
        .single();

      if (clienteError) {
        console.error(
          "Erro ao carregar cliente:",
          clienteError
        );
      } else {
        cliente =
          clienteData;
      }
    }

    // =====================================================
    // 3. CARREGA A MOTO
    // =====================================================

    let moto: any =
      null;

    if (
      venda.motorcycle_id
    ) {
      const {
        data: motoData,
        error: motoError,
      } = await supabase
        .from("motorcycles")
        .select("*")
        .eq(
          "id",
          venda.motorcycle_id
        )
        .single();

      if (motoError) {
        console.error(
          "Erro ao carregar moto:",
          motoError
        );
      } else {
        moto =
          motoData;
      }
    }

    // =====================================================
    // 4. COMPONENTES DO PAGAMENTO
    // =====================================================

    const {
      data: componentes,
      error:
        componentesError,
    } = await supabase
      .from(
        "sale_payment_components"
      )
      .select("*")
      .eq(
        "sale_id",
        id
      )
      .order(
        "criado_em",
        {
          ascending: true,
        }
      );

    if (
      componentesError
    ) {
      console.error(
        "Erro ao carregar componentes:",
        componentesError
      );
    }

    // =====================================================
    // 5. VALIDAÇÕES
    // =====================================================

    if (!moto) {
      return Response.json(
        {
          error:
            "A venda não possui uma moto válida vinculada.",
        },
        {
          status: 400,
        }
      );
    }

    const nomeCliente =
      cliente?.nome ||
      venda.cliente ||
      "";

    if (!nomeCliente) {
      return Response.json(
        {
          error:
            "A venda não possui cliente vinculado.",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // 6. CARREGA O MODELO WORD
    // =====================================================

    const templatePath =
      path.join(
        process.cwd(),
        "public",
        "templates",
        "contrato-venda.docx"
      );

    const template =
      await fs.readFile(
        templatePath
      );

    const zip =
      new PizZip(template);

    const doc =
      new Docxtemplater(
        zip,
        {
          paragraphLoop:
            true,

          linebreaks:
            true,

          nullGetter:
            () => "",
        }
      );

    const valorVenda =
      Number(
        venda.valor_total_venda ??
          venda.valor_venda
      ) || 0;

    // =====================================================
    // 7. PREENCHE O CONTRATO
    // =====================================================

    doc.render({
      cliente_nome:
        nomeCliente,

      cliente_rg:
        cliente?.rg || "",

      cliente_cpf:
        cliente?.cpf || "",

      cliente_rua:
        cliente?.rua || "",

      cliente_numero:
        cliente?.numero || "",

      cliente_bairro:
        cliente?.bairro || "",

      cliente_cidade:
        cliente?.cidade || "",

      cliente_estado:
        cliente?.estado || "",

      cliente_cep:
        cliente?.cep || "",

      cliente_telefone:
        cliente?.telefone ||
        venda.telefone ||
        "",

      valor_venda:
        moeda(
          valorVenda
        ),

      valor_venda_extenso:
        `valor total de ${moeda(
          valorVenda
        )}`,

      forma_pagamento_descricao:
        descricaoPagamentos(
          venda,
          componentes || []
        ),

      financiamento_banco:
        venda.banco || "",

      financiamento_valor:
        Number(
          venda.valor_financiado
        ) > 0
          ? moeda(
              venda.valor_financiado
            )
          : "",

      financiamento_parcelas:
        Number(
          venda.parcelas_financiamento
        ) > 0
          ? `${Number(
              venda.parcelas_financiamento
            )}x`
          : "",

      financiamento_valor_parcela:
        Number(
          venda.valor_parcela_financiamento
        ) > 0
          ? moeda(
              venda.valor_parcela_financiamento
            )
          : "",

      transferencia_descricao:
        transferenciaDescricao(
          venda
        ),

      moto_marca_modelo:
        `${moto.marca || ""} / ${
          moto.modelo || ""
        }${
          moto.versao
            ? ` ${moto.versao}`
            : ""
        }`.trim(),

      moto_placa:
        moto.placa || "",

      moto_cor:
        moto.cor || "",

      moto_renavam:
        moto.renavam || "",

      moto_chassi:
        moto.chassi || "",

      moto_ano_fabricacao:
        moto.ano_fabricacao ||
        moto.ano ||
        "",

      moto_ano_modelo:
        moto.ano_modelo ||
        "",

      moto_km:
        new Intl.NumberFormat(
          "pt-BR"
        ).format(
          Number(
            moto.quilometragem
          ) || 0
        ),

      // DATA E HORA DO MOMENTO DA EMISSÃO
      data_extenso:
        dataAtualExtenso(),

      hora_documento:
        horaAtual(),
    });

    // =====================================================
    // 8. GERA O WORD
    // =====================================================

    const buffer =
      doc
        .getZip()
        .generate({
          type:
            "nodebuffer",

          compression:
            "DEFLATE",
        });

    const nome =
      nomeArquivoSeguro(
        nomeCliente ||
          "cliente"
      );

    return new Response(
      new Uint8Array(
        buffer
      ),
      {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

          "Content-Disposition":
            `attachment; filename="contrato-venda-${nome}.docx"`,

          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (
    error: any
  ) {
    console.error(
      error
    );

    return Response.json(
      {
        error:
          error?.message ||
          "Não foi possível gerar o contrato.",
      },
      {
        status: 500,
      }
    );
  }
}