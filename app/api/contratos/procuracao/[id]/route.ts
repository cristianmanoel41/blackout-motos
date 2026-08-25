import fs from "node:fs/promises";
import path from "node:path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function dataExtenso(data: string | null | undefined) {
  if (!data) {
    const hoje = new Date();
    const yyyy = hoje.getFullYear();
    const mm = String(hoje.getMonth() + 1).padStart(2, "0");
    const dd = String(hoje.getDate()).padStart(2, "0");
    data = `${yyyy}-${mm}-${dd}`;
  }

  const [ano, mes, dia] = data.split("-");
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril",
    "Maio", "Junho", "Julho", "Agosto",
    "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  return `${Number(dia)} de ${meses[Number(mes) - 1]} de ${ano}`;
}

function horaDocumento(
  hora: string | null | undefined
) {
  if (hora) {
    return hora.slice(0, 5);
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      timeZone:
        "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  ).format(new Date());
}

function nomeArquivoSeguro(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: moto, error } = await supabase
      .from("motorcycles")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !moto) {
      return Response.json(
        { error: error?.message || "Moto não encontrada." },
        { status: 404 }
      );
    }

    const camposObrigatorios = [
      ["Nome de quem vendeu a moto", moto.fornecedor_nome],
      ["CPF de quem vendeu a moto", moto.fornecedor_cpf],
      ["Rua", moto.fornecedor_rua],
      ["Número", moto.fornecedor_numero],
      ["Bairro", moto.fornecedor_bairro],
      ["Cidade", moto.fornecedor_cidade],
      ["Estado", moto.fornecedor_estado],
      ["CEP", moto.fornecedor_cep],
      ["Placa", moto.placa],
      ["Renavam", moto.renavam],
      ["Chassi", moto.chassi],
    ] as const;

    const faltando = camposObrigatorios
      .filter(([, valor]) => !String(valor || "").trim())
      .map(([nome]) => nome);

    if (faltando.length > 0) {
      return Response.json(
        {
          error:
            "Não foi possível gerar a procuração porque faltam dados.",
          campos_faltando: faltando,
        },
        { status: 400 }
      );
    }

    const templatePath = path.join(
      process.cwd(),
      "public",
      "templates",
      "procuracao.docx"
    );

    const template = await fs.readFile(templatePath);
    const zip = new PizZip(template);

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => "",
    });

    doc.render({
      outorgante_nome: moto.fornecedor_nome || "",
      outorgante_cpf: moto.fornecedor_cpf || "",
      outorgante_rua: moto.fornecedor_rua || "",
      outorgante_numero: moto.fornecedor_numero || "",
      outorgante_bairro: moto.fornecedor_bairro || "",
      outorgante_cidade: moto.fornecedor_cidade || "",
      outorgante_estado: moto.fornecedor_estado || "",
      outorgante_cep: moto.fornecedor_cep || "",

      moto_placa: moto.placa || "",
      moto_marca_modelo: `${moto.marca || ""} / ${moto.modelo || ""}${moto.versao ? ` ${moto.versao}` : ""}`.trim(),
      moto_ano_fabricacao: moto.ano_fabricacao || moto.ano || "",
      moto_ano_modelo: moto.ano_modelo || "",
      moto_cor: moto.cor || "",
      moto_renavam: moto.renavam || "",
      moto_chassi: moto.chassi || "",

      data_extenso: dataExtenso(moto.data_entrada),
      hora_documento: horaDocumento(moto.hora_entrada),
    });

    const buffer = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    const nome = nomeArquivoSeguro(
      `${moto.marca || "moto"}-${moto.modelo || ""}-${moto.placa || ""}`
    );

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="procuracao-${nome}.docx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error(error);
    return Response.json(
      { error: error?.message || "Não foi possível gerar a procuração." },
      { status: 500 }
    );
  }
}
