import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  juntarPaginas,
  TIPOS_ACEITOS,
  type PaginaRecebida,
} from "@/lib/documentos/juntar-paginas";

export const dynamic = "force-dynamic";

/*
 * RECEBE O CONTRATO ASSINADO E GUARDA
 *
 * A loja imprime, as duas partes assinam à caneta, alguém
 * escaneia pelo celular e sobe aqui. As páginas viram um PDF só
 * e vão para um balde FECHADO - diferente do das fotos, este
 * ninguém lê sem estar logado.
 *
 * Quem sobe precisa estar logado. Não é formalidade: o arquivo
 * tem CPF, endereço e assinatura das duas partes.
 */

/* 25 MB. Scanner de celular faz umas 300 KB por folha; isso dá
   folga para um contrato longo fotografado em alta. */
const TETO = 25 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Entre no sistema para enviar o contrato." },
      { status: 401 }
    );
  }

  let formulario: FormData;

  try {
    formulario = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Não consegui ler o envio." },
      { status: 400 }
    );
  }

  const vendaId = String(formulario.get("venda") || "").trim();

  if (!vendaId) {
    return NextResponse.json(
      { error: "Faltou dizer de qual venda é o contrato." },
      { status: 400 }
    );
  }

  const arquivos = formulario
    .getAll("paginas")
    .filter((item): item is File => item instanceof File);

  if (arquivos.length === 0) {
    return NextResponse.json(
      { error: "Escolha pelo menos uma página escaneada." },
      { status: 400 }
    );
  }

  const peso = arquivos.reduce((soma, a) => soma + a.size, 0);

  if (peso > TETO) {
    return NextResponse.json(
      {
        error: `O envio tem ${Math.round(
          peso / 1024 / 1024
        )} MB e o limite é 25 MB. Escaneie em preto e branco, que fica bem menor.`,
      },
      { status: 413 }
    );
  }

  const recusado = arquivos.find(
    (a) => !TIPOS_ACEITOS.includes(a.type)
  );

  if (recusado) {
    return NextResponse.json(
      {
        error: `"${recusado.name}" não é foto nem PDF. Mande o escaneado ou a foto das folhas.`,
      },
      { status: 400 }
    );
  }

  /*
   * A venda precisa existir.
   *
   * Sem esta conferência um id errado criaria um contrato órfão,
   * que nunca apareceria em ficha nenhuma e ficaria ocupando
   * espaço sem dono.
   */
  const { data: venda } = await supabase
    .from("sales")
    .select("id")
    .eq("id", vendaId)
    .maybeSingle();

  if (!venda) {
    return NextResponse.json(
      { error: "Venda não encontrada." },
      { status: 404 }
    );
  }

  const paginas: PaginaRecebida[] = [];

  for (const arquivo of arquivos) {
    paginas.push({
      nome: arquivo.name,
      tipo: arquivo.type,
      bytes: new Uint8Array(await arquivo.arrayBuffer()),
    });
  }

  let juntado: { bytes: Uint8Array; paginas: number };

  try {
    juntado = await juntarPaginas(paginas);
  } catch (erro) {
    return NextResponse.json(
      {
        error:
          erro instanceof Error
            ? erro.message
            : "Não consegui juntar as páginas.",
      },
      { status: 400 }
    );
  }

  /*
   * O caminho leva a venda e um nome sorteado.
   *
   * A venda na frente para a loja achar o arquivo olhando a
   * pasta; o sorteio no fim para o endereço não ser adivinhável
   * nem por quem conhece o id da venda.
   */
  const caminho = `${vendaId}/${crypto.randomUUID()}.pdf`;

  const { error: erroSubida } = await supabase.storage
    .from("contratos-assinados")
    .upload(caminho, juntado.bytes, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (erroSubida) {
    return NextResponse.json(
      { error: "Não consegui guardar o arquivo: " + erroSubida.message },
      { status: 502 }
    );
  }

  const { data: criado, error: erroBanco } = await supabase
    .from("contratos_assinados")
    .insert({
      venda_id: vendaId,
      arquivo: caminho,
      paginas: juntado.paginas,
      created_by: user.id,
    })
    .select("token, paginas, criado_em")
    .single();

  if (erroBanco || !criado) {
    /*
     * Deu errado depois de subir: tira o arquivo.
     *
     * Sem isto sobraria um PDF no balde sem linha nenhuma
     * apontando para ele - invisível para a loja e impossível
     * de revogar, porque revogar passa pela tabela.
     */
    await supabase.storage
      .from("contratos-assinados")
      .remove([caminho]);

    return NextResponse.json(
      {
        error:
          "Não consegui registrar o contrato: " +
          (erroBanco?.message || "erro desconhecido"),
      },
      { status: 502 }
    );
  }

  return NextResponse.json(criado, {
    headers: { "Cache-Control": "no-store" },
  });
}

/*
 * REVOGAR
 *
 * Revogar apaga o arquivo de verdade, não só desliga o link.
 * Link desligado com o arquivo no lugar protege de quem usa o
 * site; não protege de quem salvou o endereço. Como o pedido da
 * loja foi "vale para sempre, com botão de revogar", revogar
 * precisa valer de verdade.
 *
 * A linha fica, marcada: a loja precisa saber que existiu,
 * quando foi e quem cortou.
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Entre no sistema para revogar." },
      { status: 401 }
    );
  }

  const id = new URL(request.url).searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Faltou dizer qual contrato." },
      { status: 400 }
    );
  }

  const { data: contrato } = await supabase
    .from("contratos_assinados")
    .select("id, arquivo")
    .eq("id", id)
    .maybeSingle();

  if (!contrato) {
    return NextResponse.json(
      { error: "Contrato não encontrado." },
      { status: 404 }
    );
  }

  await supabase.storage
    .from("contratos-assinados")
    .remove([contrato.arquivo]);

  const { error } = await supabase
    .from("contratos_assinados")
    .update({ ativo: false, revogado_em: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "Não consegui revogar: " + error.message },
      { status: 502 }
    );
  }

  return NextResponse.json(
    { revogado: true },
    { headers: { "Cache-Control": "no-store" } }
  );
}
