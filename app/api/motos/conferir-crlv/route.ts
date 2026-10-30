import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { type LeituraDoCrlv } from "@/lib/documentos/crlv";
import {
  lerArquivoDoCrlv,
  motivoDeNaoLer,
  tipoDoArquivo,
} from "@/lib/documentos/ler-crlv";

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
 * A leitura em si (PDF primeiro, IA depois) fica em
 * lib/documentos/ler-crlv, junto da que o cadastro usa.
 *
 * A leitura fica guardada no anexo. Abrir a ficha de novo não
 * lê de novo - o documento não mudou.
 */

/*
 * O mesmo bucket de components/Vistorias.tsx. Não é importado
 * de lá porque aquele arquivo é de navegador ("use client"), e
 * o servidor receberia uma referência, não o texto.
 */
const BUCKET_VISTORIAS = "vistorias";

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

  try {
    leitura = await lerArquivoDoCrlv(bytes, tipo);
  } catch (falha) {
    console.error("Leitura do CRLV pela IA falhou", falha);

    return NextResponse.json(
      {
        erro: "A leitura do documento falhou. Tente de novo em instantes.",
      },
      { status: 502 }
    );
  }

  if (!leitura) {
    return NextResponse.json(
      { erro: motivoDeNaoLer() },
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
