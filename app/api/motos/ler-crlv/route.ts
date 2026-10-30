import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  lerArquivoDoCrlv,
  motivoDeNaoLer,
  tipoDoArquivo,
} from "@/lib/documentos/ler-crlv";

export const dynamic = "force-dynamic";

/* A leitura pela IA de um documento escaneado leva alguns segundos. */
export const maxDuration = 60;

/*
 * LÊ O CRLV ESCOLHIDO NO CADASTRO DA MOTO
 *
 * No "Comprar / Cadastrar Moto" a moto ainda não existe, e o
 * CRLV só é guardado depois de salvar. Esta rota lê o arquivo
 * na hora em que ele é escolhido, sem guardar nada, para a
 * tela preencher chassi, RENAVAM e o resto.
 *
 * A Vercel não aceita corpo maior que 4,5 MB: a tela reduz a
 * foto antes de mandar, e o PDF do CRLV-e tem poucos KB.
 */

const LIMITE = 4 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { erro: "Entre no sistema para ler o documento." },
      { status: 401 }
    );
  }

  const formulario = await request.formData().catch(() => null);
  const arquivo = formulario?.get("arquivo");

  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return NextResponse.json(
      { erro: "Arquivo não enviado." },
      { status: 400 }
    );
  }

  if (arquivo.size > LIMITE) {
    return NextResponse.json(
      { erro: "Arquivo grande demais para ler. Digite os dados à mão." },
      { status: 413 }
    );
  }

  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const tipo = tipoDoArquivo(arquivo.name, arquivo.type || null);

  try {
    const leitura = await lerArquivoDoCrlv(bytes, tipo);

    if (!leitura) {
      return NextResponse.json(
        { erro: motivoDeNaoLer() },
        { status: 422 }
      );
    }

    return NextResponse.json({ leitura });
  } catch (falha) {
    console.error("Leitura do CRLV no cadastro falhou", falha);

    return NextResponse.json(
      {
        erro: "A leitura do documento falhou. Tente de novo em instantes.",
      },
      { status: 502 }
    );
  }
}
