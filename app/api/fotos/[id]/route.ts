import { createClient } from "@/lib/supabase/server";

/*
 * Entrega a foto da moto pelo dominio da loja.
 *
 * O TikTok so aceita foto puxada de um endereco, e so de um
 * dominio verificado como seu. As fotos moram no Supabase, que
 * nao e um dominio da loja - entao nao dava para verificar.
 *
 * Esta rota resolve: a foto continua guardada no Supabase, mas
 * chega ao mundo por um endereco do proprio site. Serve para o
 * TikTok e para qualquer lugar que precise de um link nosso.
 *
 * E aberta de proposito: foto de moto e feita para ser vista, e
 * quem tem o link da vitrine ja ve as mesmas imagens.
 */

export const dynamic = "force-dynamic";

const BUCKET = "fotos-motos";

export async function GET(
  _requisicao: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: foto, error } = await supabase
    .from("motorcycle_photos")
    .select("arquivo_path, arquivo_tipo")
    .eq("id", id)
    .maybeSingle();

  if (error || !foto?.arquivo_path) {
    return new Response("Foto não encontrada", {
      status: 404,
    });
  }

  const { data: arquivo, error: erroArquivo } =
    await supabase.storage
      .from(BUCKET)
      .download(foto.arquivo_path);

  if (erroArquivo || !arquivo) {
    return new Response("Foto não encontrada", {
      status: 404,
    });
  }

  return new Response(arquivo, {
    headers: {
      "Content-Type":
        foto.arquivo_tipo || "image/jpeg",
      /*
       * A imagem nunca muda: o caminho no balde carrega a hora
       * do envio, entao trocar a foto gera outro endereco.
       */
      "Cache-Control":
        "public, max-age=31536000, immutable",
    },
  });
}
