import { createClient } from "@/lib/supabase/server";
import { mandarParaORascunho } from "@/lib/tiktok";

/*
 * Manda o vídeo da ficha da moto para o rascunho do TikTok.
 *
 * O arquivo sai do balde do Supabase e vai direto para o
 * TikTok, em pedaços - nada é guardado aqui no caminho.
 *
 * O sistema não publica: o vídeo chega na caixa de entrada da
 * conta da loja e é lá, no aplicativo, que se escolhe som,
 * capa e texto. A legenda continua saindo do bloco "Legenda
 * para o post", para copiar e colar - o rascunho só leva o
 * arquivo, e é assim que o TikTok trabalha.
 *
 * Vídeo grande demora, e a função tem um minuto para dar
 * conta - é o teto do plano. Por isso o limite de tamanho
 * abaixo: acima dele, a loja posta aquele vídeo pelo celular,
 * e o erro diz isso com todas as letras em vez de estourar o
 * tempo sem explicação.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* Clipe de moto de 30 a 60 segundos fica bem abaixo disto. */
const TETO = 120 * 1024 * 1024;

export async function POST(pedido: Request) {
  const supabase = await createClient();

  /* A rota já está atrás do login; isto é o segundo portão. */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json(
      { error: "Faça login para mandar o vídeo." },
      { status: 401 }
    );
  }

  const corpo = await pedido.json().catch(() => null);

  const fotoId = String(corpo?.fotoId || "");

  if (!fotoId) {
    return Response.json(
      { error: "Não veio o vídeo." },
      { status: 400 }
    );
  }

  const { data: foto, error: erroFoto } = await supabase
    .from("motorcycle_photos")
    .select(
      "id, motorcycle_id, arquivo_path, arquivo_nome, arquivo_tipo, url"
    )
    .eq("id", fotoId)
    .maybeSingle();

  if (erroFoto || !foto) {
    return Response.json(
      { error: "Não achei esse vídeo na ficha." },
      { status: 404 }
    );
  }

  const ehVideo =
    String(foto.arquivo_tipo || "").startsWith("video/") ||
    /\.(mp4|mov|webm)$/i.test(foto.arquivo_nome || "");

  if (!ehVideo) {
    return Response.json(
      { error: "Só vídeo vai para o TikTok." },
      { status: 400 }
    );
  }

  const url =
    foto.url ||
    supabase.storage
      .from("fotos-motos")
      .getPublicUrl(foto.arquivo_path).data.publicUrl;

  /*
   * O tamanho vem do próprio arquivo guardado. Perguntar ao
   * balde é mais confiável que guardar o número no cadastro:
   * o TikTok recusa o envio se o tamanho anunciado não bater
   * com o que chega.
   */
  const cabecalho = await fetch(url, { method: "HEAD" });

  const tamanho = Number(
    cabecalho.headers.get("content-length") || 0
  );

  if (!cabecalho.ok || !tamanho) {
    return Response.json(
      {
        error:
          "Não deu para ler o vídeo guardado. Tente de novo em instantes.",
      },
      { status: 502 }
    );
  }

  if (tamanho > TETO) {
    return Response.json(
      {
        error:
          "Esse vídeo é grande demais para mandar por aqui. Poste ele direto pelo celular.",
      },
      { status: 413 }
    );
  }

  try {
    const { publishId } = await mandarParaORascunho({
      url,
      tamanho,
      tipo: foto.arquivo_tipo || "video/mp4",
    });

    await supabase.from("tiktok_posts").insert({
      motorcycle_id: foto.motorcycle_id,
      foto_id: foto.id,
      publish_id: publishId,
      situacao: "rascunho",
      tipo: "video",
      enviado_por: user.id,
    });

    return Response.json({ ok: true, publishId });
  } catch (erro: any) {
    const recado =
      erro?.message || "Não deu para mandar o vídeo.";

    console.error("TikTok: falhou o envio", erro);

    await supabase.from("tiktok_posts").insert({
      motorcycle_id: foto.motorcycle_id,
      foto_id: foto.id,
      situacao: "erro",
      tipo: "video",
      erro: recado.slice(0, 400),
      enviado_por: user.id,
    });

    return Response.json(
      { error: recado },
      { status: 502 }
    );
  }
}
