import fs from "node:fs/promises";
import path from "node:path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { createClient } from "@/lib/supabase/server";
import { comLogradouro, separarLogradouro } from "@/lib/formatadores/endereco";
import { formatarPlaca } from "@/lib/formatadores/placa";
import { nomeProprio } from "@/lib/formatadores/nome";
import { outorganteDaMoto } from "@/lib/dados/proprietario";
import { recusarSemLogin } from "@/lib/supabase/exigir-login";

export const runtime = "nodejs";

function formatarCPF(valor: unknown) {
  const numeros = String(valor || "")
    .replace(/\D/g, "")
    .slice(0, 11);

  if (numeros.length !== 11) {
    return String(valor || "").trim();
  }

  return numeros.replace(
    /(\d{3})(\d{3})(\d{3})(\d{2})/,
    "$1.$2.$3-$4"
  );
}

function complementoEndereco(valor: unknown) {
  const complemento = String(valor || "").trim();

  return complemento
    ? `, complemento: ${complemento}`
    : "";
}


function dataAtualExtenso() {
  const agora = new Date();

  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(agora);

  const dia =
    partes.find((parte) => parte.type === "day")?.value || "";

  const mes =
    partes.find((parte) => parte.type === "month")?.value || "";

  const ano =
    partes.find((parte) => parte.type === "year")?.value || "";

  return `${dia} de ${mes} de ${ano}`;
}

function horaAtual() {
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
  { params }: { params: Promise<{ id: string }> }
) {
  const semLogin = await recusarSemLogin();
  if (semLogin) return semLogin;

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
        {
          error:
            error?.message ||
            "Moto não encontrada.",
        },
        { status: 404 }
      );
    }

    /*
     * Quem assina: o proprietário do documento quando a moto
     * está no nome de outra pessoa, senão quem vendeu.
     */
    const outorgante = outorganteDaMoto(moto);
    const quem = outorgante.doDono
      ? "do proprietário no documento"
      : "de quem vendeu a moto";

    const camposObrigatorios = [
      [`Nome ${quem}`, outorgante.nome],
      [`CPF ${quem}`, outorgante.cpf],
      [`Rua ${quem}`, outorgante.rua],
      [`Número ${quem}`, outorgante.numero],
      [`Bairro ${quem}`, outorgante.bairro],
      [`Cidade ${quem}`, outorgante.cidade],
      [`Estado ${quem}`, outorgante.estado],
      [`CEP ${quem}`, outorgante.cep],
      ["Placa", moto.placa],
      ["Renavam", moto.renavam],
      ["Chassi", moto.chassi],
    ] as const;

    const faltando = camposObrigatorios
      .filter(
        ([, valor]) =>
          !String(valor || "").trim()
      )
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

    const template =
      await fs.readFile(templatePath);

    const zip =
      new PizZip(template);

    const doc =
      new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => "",
      });

    doc.render({
      /*
       * Na procuração os nomes do OUTORGANTE e do OUTORGADO saem
       * em MAIÚSCULAS (pedido de 14/11/2026). Nos contratos
       * continua "Cristian Manoel da Silva Fonseca".
       */
      outorgante_nome:
        String(outorgante.nome || "")
          .trim()
          .replace(/\s+/g, " ")
          .toLocaleUpperCase("pt-BR"),

      outorgante_cpf:
        formatarCPF(outorgante.cpf),

      outorgante_rua:
        comLogradouro(outorgante.rua),

      outorgante_numero:
        String(outorgante.numero || ""),

      outorgante_complemento_texto:
        complementoEndereco(outorgante.complemento),

      /*
       * O bloco do OUTORGANTE em três linhas (modelo da loja,
       * 14/11/2026): "residente na Rua:  Francisco Ricci  nº 101
       * complemento: APTO 94  Bairro Vila Ema". O "complemento:"
       * só aparece quando existe.
       */
      outorgante_logradouro_tipo:
        separarLogradouro(outorgante.rua).tipo,

      outorgante_logradouro_nome:
        nomeProprio(separarLogradouro(outorgante.rua).nome),

      outorgante_complemento:
        String(outorgante.complemento || "").trim(),

      tem_complemento:
        Boolean(String(outorgante.complemento || "").trim()),

      /*
       * Maiúsculas e minúsculas como no modelo da loja (14/11/2026):
       * "Jardim Sul", "São José dos Campos", "SP". O cadastro
       * guarda como foi digitado ("JARDIM SUL", "sao jose...").
       */
      outorgante_bairro:
        nomeProprio(outorgante.bairro),

      outorgante_cidade:
        nomeProprio(outorgante.cidade),

      outorgante_estado:
        String(outorgante.estado || "").toLocaleUpperCase("pt-BR"),

      outorgante_cep:
        String(outorgante.cep || ""),

      moto_placa:
        formatarPlaca(moto.placa),

      /* Marca e modelo em maiúsculas: "HONDA / CG 160 FAN" (modelo da loja). */
      moto_marca_modelo:
        `${moto.marca || ""} / ${moto.modelo || ""}${
          moto.versao
            ? ` ${moto.versao}`
            : ""
        }`
          .trim()
          .toLocaleUpperCase("pt-BR"),

      moto_ano_fabricacao:
        moto.ano_fabricacao ||
        moto.ano ||
        "",

      moto_ano_modelo:
        moto.ano_modelo || "",

      /* Cor sempre maiúscula, como no CRLV (pedido de 13/11/2026). */
      moto_cor:
        String(moto.cor || "").toLocaleUpperCase("pt-BR"),

      moto_renavam:
        moto.renavam || "",

      moto_chassi:
        moto.chassi || "",

      data_extenso:
        dataAtualExtenso(),

      hora_documento:
        horaAtual(),
    });

    const buffer =
      doc.getZip().generate({
        type: "nodebuffer",
        compression: "DEFLATE",
      });

    const nome =
      nomeArquivoSeguro(
        `${moto.marca || "moto"}-${
          moto.modelo || ""
        }-${moto.placa || ""}`
      );

    return new Response(
      new Uint8Array(buffer),
      {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

          "Content-Disposition":
            `attachment; filename="procuracao-${nome}.docx"`,

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
          "Não foi possível gerar a procuração.",
      },
      { status: 500 }
    );
  }
}