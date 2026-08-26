import fs from "node:fs/promises";
import path from "node:path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { createClient } from "@/lib/supabase/server";
import {
  montarDadosRecibo,
  nomeArquivoSeguro,
} from "@/lib/recibos/capacete";

export const runtime = "nodejs";

/*
 * Recibo de venda de capacete em Word.
 *
 * Os dados vêm de lib/recibos/capacete.ts, o mesmo lugar que
 * alimenta a tela de impressão, para os dois nunca saírem
 * diferentes. A data e a hora são as do momento da geração.
 */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();

    const { dados, erro, status } =
      await montarDadosRecibo(supabase, id);

    if (!dados) {
      return Response.json(
        { error: erro },
        { status: status || 400 }
      );
    }

    const templatePath = path.join(
      process.cwd(),
      "public",
      "templates",
      "recibo-capacete.docx"
    );

    const template = await fs.readFile(templatePath);

    const doc = new Docxtemplater(new PizZip(template), {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => "",
    });

    doc.render(dados);

    const buffer = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    const nome = nomeArquivoSeguro(dados.cliente_nome);

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
