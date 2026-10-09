import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { extractText, getDocumentProxy } from "unpdf";
import { createClient } from "@/lib/supabase/server";
import {
  CAMPOS_DO_CRLV,
  leituraCompleta,
  lerTextoDoCrlv,
  type DadosDoCrlv,
  type LeituraDoCrlv,
} from "@/lib/documentos/crlv";

export const dynamic = "force-dynamic";

/* A leitura pela IA de um documento escaneado leva alguns segundos. */
export const maxDuration = 60;

/*
 * LÊ O CRLV ANEXADO NA FICHA DA MOTO
 *
 * Recebe o id do anexo (motorcycle_inspections), baixa o
 * arquivo e devolve os dados do documento. A comparação com o
 * cadastro é feita na tela, não aqui - assim ela continua
 * certa depois que alguém corrige a ficha.
 *
 * DUAS LEITURAS, NESTA ORDEM
 *
 * 1. CRLV-e em PDF (o que sai da Carteira Digital): o PDF tem
 *    texto, e o texto é lido aqui mesmo, sem custo.
 *
 * 2. Foto, PDF escaneado, ou um CRLV-e que a primeira leitura
 *    não entendeu inteiro: vai para a IA, que custa alguns
 *    centavos por documento. Só roda se a chave
 *    ANTHROPIC_API_KEY estiver configurada na Vercel.
 *
 * A leitura fica guardada no anexo. Abrir a ficha de novo não
 * lê de novo - o documento não mudou.
 */

const MODELO_IA = "claude-opus-5-5";

/*
 * O mesmo bucket de components/Vistorias.tsx. Não é importado
 * de lá porque aquele arquivo é de navegador ("use client"), e
 * o servidor receberia uma referência, não o texto.
 */
const BUCKET_VISTORIAS = "vistorias";

const TIPOS_DE_IMAGEM = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

type TipoDeImagem = (typeof TIPOS_DE_IMAGEM)[number];

function tipoDoArquivo(nome: string, tipo: string | null) {
  if (tipo) return tipo;

  const extensao = nome.split(".").pop()?.toLowerCase();

  if (extensao === "pdf") return "application/pdf";
  if (extensao === "png") return "image/png";
  if (extensao === "webp") return "image/webp";

  return "image/jpeg";
}

async function textoDoPdf(bytes: Uint8Array) {
  try {
    const pdf = await getDocumentProxy(bytes.slice());
    const { text } = await extractText(pdf, {
      mergePages: true,
    });

    return text;
  } catch {
    return "";
  }
}

/*
 * O formato que a IA devolve.
 *
 * Saída estruturada: a resposta vem garantida nesse formato,
 * sem texto em volta para limpar. Campo que não dá para ler
 * vem null - e null vira "não foi possível ler" na tela, em
 * vez de um palpite que pareceria dado conferido.
 */
const FORMATO_DA_LEITURA = {
  type: "object",
  additionalProperties: false,
  required: CAMPOS_DO_CRLV,
  properties: {
    placa: { type: ["string", "null"] },
    renavam: { type: ["string", "null"] },
    chassi: { type: ["string", "null"] },
    marca: { type: ["string", "null"] },
    modelo: { type: ["string", "null"] },
    ano_fabricacao: { type: ["integer", "null"] },
    ano_modelo: { type: ["integer", "null"] },
    cor: { type: ["string", "null"] },
  },
};

const PEDIDO_PARA_IA = `Este arquivo deveria ser um CRLV (Certificado de Registro e Licenciamento de Veículo) brasileiro, de uma moto. Uma loja de motos vai usar os dados para conferir o cadastro antes de emitir um contrato de compra e venda, então um dado errado é pior que um dado em branco.

Transcreva do documento, exatamente como estão escritos:
- placa: só letras e números, sem traço (ex.: ABC1D23)
- renavam: o CÓDIGO RENAVAM, só dígitos
- chassi: os 17 caracteres do chassi
- marca e modelo: o campo MARCA / MODELO / VERSÃO vem como "MARCA/MODELO VERSÃO" - a marca é o que vem antes da barra, o modelo é tudo o que vem depois (ignore um "I/" de importado no começo)
- ano_fabricacao e ano_modelo
- cor: a COR PREDOMINANTE

Se um campo estiver ilegível, cortado, ou você não tiver certeza de algum caractere, devolva null nesse campo em vez de adivinhar. Se o arquivo não for um CRLV, devolva todos os campos como null.`;

async function lerComIa(
  bytes: Uint8Array,
  tipo: string
): Promise<DadosDoCrlv | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const client = new Anthropic();
  const base64 = Buffer.from(bytes).toString("base64");

  const arquivo: Anthropic.Beta.BetaContentBlockParam =
    tipo === "application/pdf"
      ? {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: base64,
          },
        }
      : {
          type: "image",
          source: {
            type: "base64",
            media_type: (TIPOS_DE_IMAGEM.includes(
              tipo as TipoDeImagem
            )
              ? tipo
              : "image/jpeg") as TipoDeImagem,
            data: base64,
          },
        };

  const resposta = await client.beta.messages.create({
    model: MODELO_IA,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "low",
      format: {
        type: "json_schema",
        schema: FORMATO_DA_LEITURA,
      },
    },
    messages: [
      {
        role: "user",
        content: [arquivo, { type: "text", text: PEDIDO_PARA_IA }],
      },
    ],
  });

  if (resposta.stop_reason === "refusal") return null;

  const bloco = resposta.content.find(
    (item) => item.type === "text"
  );

  if (!bloco || bloco.type !== "text") return null;

  try {
    const lido = JSON.parse(bloco.text) as DadosDoCrlv;

    return {
      ...lido,
      placa: lido.placa
        ? lido.placa.toUpperCase().replace(/[^A-Z0-9]/g, "")
        : null,
      renavam: lido.renavam
        ? lido.renavam.replace(/\D/g, "").padStart(11, "0")
        : null,
      chassi: lido.chassi
        ? lido.chassi.toUpperCase().replace(/[^A-Z0-9]/g, "")
        : null,
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { erro: "Entre no sistema para conferir o documento." },
      { status: 401 }
    );
  }

  const corpo = await request.json().catch(() => ({}));
  const anexoId = String(corpo?.anexoId || "");
  const deNovo = Boolean(corpo?.deNovo);

  if (!anexoId) {
    return NextResponse.json(
      { erro: "Anexo não informado." },
      { status: 400 }
    );
  }

  const { data: anexo, error: erroAnexo } = await supabase
    .from("motorcycle_inspections")
    .select(
      "id, tipo, arquivo_path, arquivo_nome, arquivo_tipo, leitura"
    )
    .eq("id", anexoId)
    .single();

  if (erroAnexo || !anexo) {
    return NextResponse.json(
      {
        erro: erroAnexo?.message?.includes("leitura")
          ? "Falta rodar a migração 0035_leitura_do_crlv.sql no Supabase."
          : "Anexo não encontrado.",
      },
      { status: 404 }
    );
  }

  if (anexo.leitura && !deNovo) {
    return NextResponse.json({
      leitura: anexo.leitura as LeituraDoCrlv,
    });
  }

  const { data: arquivo, error: erroArquivo } =
    await supabase.storage
      .from(BUCKET_VISTORIAS)
      .download(anexo.arquivo_path);

  if (erroArquivo || !arquivo) {
    return NextResponse.json(
      {
        erro: `Não foi possível baixar o CRLV: ${
          erroArquivo?.message || "arquivo vazio"
        }`,
      },
      { status: 500 }
    );
  }

  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const tipo = tipoDoArquivo(
    anexo.arquivo_nome,
    anexo.arquivo_tipo
  );

  let leitura: LeituraDoCrlv | null = null;

  if (tipo === "application/pdf") {
    const dados = lerTextoDoCrlv(await textoDoPdf(bytes));

    if (leituraCompleta(dados)) {
      leitura = { dados, fonte: "pdf" };
    }
  }

  if (!leitura) {
    try {
      const dados = await lerComIa(bytes, tipo);

      if (dados) leitura = { dados, fonte: "ia" };
    } catch (falha) {
      console.error("Leitura do CRLV pela IA falhou", falha);

      return NextResponse.json(
        {
          erro: "A leitura do documento falhou. Tente de novo em instantes.",
        },
        { status: 502 }
      );
    }
  }

  if (!leitura) {
    return NextResponse.json(
      {
        erro: process.env.ANTHROPIC_API_KEY
          ? "Não foi possível ler este documento."
          : "Este arquivo não é um CRLV-e em PDF digital. Para ler foto ou documento escaneado, falta configurar a chave ANTHROPIC_API_KEY na Vercel.",
      },
      { status: 422 }
    );
  }

  await supabase
    .from("motorcycle_inspections")
    .update({
      leitura,
      lido_em: new Date().toISOString(),
    })
    .eq("id", anexo.id);

  return NextResponse.json({ leitura });
}
