import fs from "node:fs/promises";
import path from "node:path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function moedaSemSimbolo(valor: unknown) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(valor) || 0);
}

const UNIDADES = [
  "",
  "UM",
  "DOIS",
  "TRÊS",
  "QUATRO",
  "CINCO",
  "SEIS",
  "SETE",
  "OITO",
  "NOVE",
];

const DEZ_A_DEZENOVE = [
  "DEZ",
  "ONZE",
  "DOZE",
  "TREZE",
  "QUATORZE",
  "QUINZE",
  "DEZESSEIS",
  "DEZESSETE",
  "DEZOITO",
  "DEZENOVE",
];

const DEZENAS = [
  "",
  "",
  "VINTE",
  "TRINTA",
  "QUARENTA",
  "CINQUENTA",
  "SESSENTA",
  "SETENTA",
  "OITENTA",
  "NOVENTA",
];

const CENTENAS = [
  "",
  "CENTO",
  "DUZENTOS",
  "TREZENTOS",
  "QUATROCENTOS",
  "QUINHENTOS",
  "SEISCENTOS",
  "SETECENTOS",
  "OITOCENTOS",
  "NOVECENTOS",
];

function ate999(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "CEM";

  const partes: string[] = [];

  const centena = Math.floor(n / 100);
  const resto100 = n % 100;

  if (centena > 0) {
    partes.push(CENTENAS[centena]);
  }

  if (resto100 > 0) {
    if (partes.length) partes.push("E");

    if (resto100 < 10) {
      partes.push(UNIDADES[resto100]);
    } else if (resto100 < 20) {
      partes.push(DEZ_A_DEZENOVE[resto100 - 10]);
    } else {
      const dezena = Math.floor(resto100 / 10);
      const unidade = resto100 % 10;

      partes.push(DEZENAS[dezena]);

      if (unidade > 0) {
        partes.push("E");
        partes.push(UNIDADES[unidade]);
      }
    }
  }

  return partes.join(" ");
}

function numeroExtenso(valor: number): string {
  const inteiro = Math.floor(valor);

  if (inteiro === 0) {
    return "ZERO REAIS";
  }

  const partes: string[] = [];

  const milhoes = Math.floor(inteiro / 1_000_000);
  const milhares = Math.floor((inteiro % 1_000_000) / 1_000);
  const resto = inteiro % 1_000;

  if (milhoes > 0) {
    partes.push(
      milhoes === 1
        ? "UM MILHÃO"
        : `${ate999(milhoes)} MILHÕES`
    );
  }

  if (milhares > 0) {
    if (partes.length) partes.push("E");

    partes.push(
      milhares === 1
        ? "MIL"
        : `${ate999(milhares)} MIL`
    );
  }

  if (resto > 0) {
    if (partes.length) partes.push("E");
    partes.push(ate999(resto));
  }

  partes.push(inteiro === 1 ? "REAL" : "REAIS");

  return partes.join(" ");
}

function dataExtenso(data: string | null | undefined) {
  if (!data) return "";

  const [ano, mes, dia] = data.split("-");

  const meses = [
    "JANEIRO",
    "FEVEREIRO",
    "MARÇO",
    "ABRIL",
    "MAIO",
    "JUNHO",
    "JULHO",
    "AGOSTO",
    "SETEMBRO",
    "OUTUBRO",
    "NOVEMBRO",
    "DEZEMBRO",
  ];

  return `${String(Number(dia)).padStart(2, "0")} de ${
    meses[Number(mes) - 1]
  } de ${ano}`;
}

function horaDocumento(hora: string | null | undefined) {
  if (hora) {
    return hora.slice(0, 5);
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
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
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();

    const {
      data: moto,
      error: motoError,
    } = await supabase
      .from("motorcycles")
      .select("*")
      .eq("id", id)
      .single();

    if (motoError || !moto) {
      return Response.json(
        {
          error:
            motoError?.message ||
            "Moto não encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    if (!moto.fornecedor_nome) {
      return Response.json(
        {
          error:
            "Esta moto não possui os dados de quem vendeu para a loja.",
        },
        {
          status: 400,
        }
      );
    }

    const templatePath = path.join(
      process.cwd(),
      "public",
      "templates",
      "contrato-compra.docx"
    );

    const template = await fs.readFile(templatePath);

    const zip = new PizZip(template);

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => "",
    });

    const valorCompra =
      Number(moto.valor_compra) || 0;

    doc.render({
      fornecedor_nome:
        moto.fornecedor_nome || "",

      fornecedor_rg:
        moto.fornecedor_rg || "",

      fornecedor_cpf:
        moto.fornecedor_cpf || "",

      fornecedor_rua:
        moto.fornecedor_rua || "",

      fornecedor_numero:
        moto.fornecedor_numero || "",

      fornecedor_bairro:
        moto.fornecedor_bairro || "",

      fornecedor_cidade:
        moto.fornecedor_cidade || "",

      fornecedor_estado:
        moto.fornecedor_estado || "",

      fornecedor_cep:
        moto.fornecedor_cep || "",

      fornecedor_telefone:
        moto.fornecedor_telefone || "",

      valor_compra:
        moedaSemSimbolo(valorCompra),

      valor_compra_extenso:
        numeroExtenso(valorCompra),

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
        moto.ano_fabricacao || "",

      moto_ano_modelo:
        moto.ano_modelo || "",

      moto_km:
        new Intl.NumberFormat(
          "pt-BR"
        ).format(
          Number(
            moto.quilometragem
          ) || 0
        ),

      observacoes:
        moto.observacoes || "",

      data_extenso:
        dataExtenso(
          moto.data_entrada
        ),

      hora_documento:
        horaDocumento(
          moto.hora_entrada
        ),
    });

    const buffer = doc
      .getZip()
      .generate({
        type: "nodebuffer",
        compression: "DEFLATE",
      });

    const nome =
      nomeArquivoSeguro(
        moto.fornecedor_nome ||
          "vendedor"
      );

    return new Response(
      new Uint8Array(buffer),
      {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

          "Content-Disposition":
            `attachment; filename="contrato-compra-${nome}.docx"`,

          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error: any) {
    console.error(error);

    return Response.json(
      {
        error:
          error?.message ||
          "Não foi possível gerar o contrato de compra.",
      },
      {
        status: 500,
      }
    );
  }
}