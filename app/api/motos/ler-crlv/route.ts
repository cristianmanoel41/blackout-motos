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
 * CRLV só é guardado de vez depois de salvar. Esta rota lê o
 * arquivo na hora em que ele é escolhido, para a tela
 * preencher chassi, RENAVAM e o resto.
 *
 * O ARQUIVO NÃO VEM NA REQUISIÇÃO
 *
 * A Vercel recusa corpo maior que 4,5 MB, e PDF escaneado
 * passa disso fácil - foi o "arquivo muito grande" de
 * 30/10/2026. Então a tela sobe o arquivo para o bucket das
 * vistorias, numa pasta de leitura, e manda só o caminho.
 * Aqui ele é baixado, lido e apagado.
 */

const BUCKET_VISTORIAS = "vistorias";
const PASTA_DE_LEITURA = "leitura-crlv/";

/* A IA aceita até 32 MB por pedido; o arquivo vai em base64,
   que cresce um terço. */
const LIMITE = 20 * 1024 * 1024;

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

  const corpo = await request.json().catch(() => ({}));
  const caminho = String(corpo?.caminho || "");
  const nome = String(corpo?.nome || caminho);

  /* Só a pasta de leitura: a rota apaga o que lê. */
  if (!caminho.startsWith(PASTA_DE_LEITURA) || caminho.includes("..")) {
    return NextResponse.json(
      { erro: "Arquivo não enviado." },
      { status: 400 }
    );
  }

  const apagar = () =>
    supabase.storage.from(BUCKET_VISTORIAS).remove([caminho]);

  try {
    const { data: arquivo, error } = await supabase.storage
      .from(BUCKET_VISTORIAS)
      .download(caminho);

    if (error || !arquivo) {
      return NextResponse.json(
        { erro: "Não foi possível abrir o arquivo enviado." },
        { status: 500 }
      );
    }

    if (arquivo.size > LIMITE) {
      return NextResponse.json(
        {
          erro: "Arquivo grande demais para ler (mais de 20 MB). Digite os dados à mão.",
        },
        { status: 413 }
      );
    }

    const bytes = new Uint8Array(await arquivo.arrayBuffer());
    const tipo = tipoDoArquivo(nome, arquivo.type || null);

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
  } finally {
    await apagar();
  }
}
