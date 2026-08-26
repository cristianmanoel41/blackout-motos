import fs from "node:fs/promises";
import path from "node:path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { createClient } from "@/lib/supabase/server";
import { valorPorExtenso } from "@/lib/formatadores/extenso";

export const runtime = "nodejs";

/*
 * Recibo de venda de capacete.
 *
 * A data e a hora impressas são as do MOMENTO EM QUE O
 * RECIBO É GERADO (fuso America/Sao_Paulo), não as da venda.
 */

function numeroBr(valor: unknown) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(valor) || 0);
}

function dataAtualExtenso() {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).formatToParts(new Date());

  const dia =
    partes.find((parte) => parte.type === "day")?.value || "";

  const mes =
    partes.find((parte) => parte.type === "month")?.value || "";

  const ano =
    partes.find((parte) => parte.type === "year")?.value || "";

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

function nomeArquivoSeguro(texto: string) {
  return (
    texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "cliente"
  );
}

/*
 * Junta os valores distintos de um campo dos itens.
 * Venda de um item só (o caso normal) devolve o valor exato;
 * com mais de um item, devolve "Pro Tork / Texx".
 */
function juntarCampo(
  itens: any[],
  campo: string
) {
  const valores = Array.from(
    new Set(
      itens
        .map((item) => String(item?.[campo] ?? "").trim())
        .filter(Boolean)
    )
  );

  return valores.join(" / ");
}

function descricaoProdutos(itens: any[]) {
  if (itens.length === 1) {
    return String(itens[0].produto || "Capacete");
  }

  return itens
    .map((item) => {
      const detalhes = [item.marca, item.modelo, item.cor, item.tamanho]
        .map((parte) => String(parte ?? "").trim())
        .filter(Boolean)
        .join(" ");

      return `${item.quantidade}x ${item.produto || "Capacete"}${
        detalhes ? ` ${detalhes}` : ""
      }`;
    })
    .join("; ");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return Response.json(
        { error: "Venda não informada." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // =====================================================
    // 1. CARREGA A VENDA
    // =====================================================

    const { data: venda, error: vendaError } = await supabase
      .from("helmet_sales")
      .select("*")
      .eq("id", id)
      .single();

    if (vendaError || !venda) {
      console.error(vendaError);

      return Response.json(
        {
          error:
            vendaError?.message ||
            "Venda de capacete não encontrada.",
        },
        { status: 404 }
      );
    }

    // =====================================================
    // 2. CARREGA OS ITENS
    // =====================================================

    const { data: itens, error: itensError } = await supabase
      .from("helmet_sale_items")
      .select("*")
      .eq("helmet_sale_id", id)
      .order("criado_em", { ascending: true });

    if (itensError) {
      console.error(itensError);

      return Response.json(
        { error: itensError.message },
        { status: 500 }
      );
    }

    const listaItens = itens || [];

    if (listaItens.length === 0) {
      return Response.json(
        {
          error:
            "Esta venda não possui capacetes vinculados.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 3. COMPLETA OS DADOS DO CLIENTE
    // =====================================================

    let clienteNome = venda.cliente_nome || "";
    let clienteCpf = venda.cliente_cpf || "";
    let clienteTelefone = venda.cliente_telefone || "";

    if (venda.customer_id) {
      const { data: cliente } = await supabase
        .from("customers")
        .select("nome, cpf, telefone")
        .eq("id", venda.customer_id)
        .single();

      if (cliente) {
        clienteNome = clienteNome || cliente.nome || "";
        clienteCpf = clienteCpf || cliente.cpf || "";
        clienteTelefone =
          clienteTelefone || cliente.telefone || "";
      }
    }

    if (!clienteNome) {
      return Response.json(
        {
          error:
            "A venda não tem cliente informado. Edite a venda antes de gerar o recibo.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 4. TOTAIS
    // =====================================================

    const quantidadeTotal = listaItens.reduce(
      (soma, item) => soma + (Number(item.quantidade) || 0),
      0
    );

    const totalItens = listaItens.reduce(
      (soma, item) =>
        soma +
        (Number(item.quantidade) || 0) *
          (Number(item.valor_unitario) || 0),
      0
    );

    const valorTotal =
      Number(venda.valor_total) || totalItens;

    const valorUnitario =
      listaItens.length === 1
        ? Number(listaItens[0].valor_unitario) || 0
        : quantidadeTotal > 0
          ? valorTotal / quantidadeTotal
          : 0;

    const formaPagamento = [
      venda.forma_pagamento || "não informada",
      venda.forma_pagamento === "Cartão" &&
      Number(venda.parcelas) > 1
        ? `em ${Number(venda.parcelas)}x`
        : "",
    ]
      .filter(Boolean)
      .join(" ");

    // =====================================================
    // 5. CARREGA O MODELO WORD
    // =====================================================

    const templatePath = path.join(
      process.cwd(),
      "public",
      "templates",
      "recibo-capacete.docx"
    );

    const template = await fs.readFile(templatePath);

    const zip = new PizZip(template);

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => "",
    });

    // =====================================================
    // 6. PREENCHE O RECIBO
    // =====================================================

    doc.render({
      cliente_nome: clienteNome,
      cliente_cpf: clienteCpf || "não informado",
      cliente_telefone: clienteTelefone || "não informado",

      produto: descricaoProdutos(listaItens),
      marca: juntarCampo(listaItens, "marca") || "não informada",
      modelo: juntarCampo(listaItens, "modelo") || "não informado",
      cor: juntarCampo(listaItens, "cor") || "não informada",
      tamanho:
        juntarCampo(listaItens, "tamanho") || "não informado",
      quantidade: String(quantidadeTotal),

      valor_unitario: numeroBr(valorUnitario),
      valor_total: numeroBr(valorTotal),
      valor_extenso: valorPorExtenso(valorTotal),

      forma_pagamento: formaPagamento,
      vendedor: venda.vendedor || "não informado",

      data_extenso: dataAtualExtenso(),
      hora_documento: horaAtual(),
    });

    const buffer = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    const nome = nomeArquivoSeguro(clienteNome);

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

        "Content-Disposition": `attachment; filename="recibo-capacete-${nome}.docx"`,

        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error(error);

    return Response.json(
      {
        error:
          error?.message ||
          "Não foi possível gerar o recibo.",
      },
      { status: 500 }
    );
  }
}
