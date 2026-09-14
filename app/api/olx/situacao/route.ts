import { createClient } from "@/lib/supabase/server";
import {
  anunciosPublicados,
  tokenSalvo,
} from "@/lib/olx";

/*
 * Pergunta a OLX o que esta no ar e casa com as motos da loja.
 *
 * O anuncio sobe com o codigo da moto como identificador, e e
 * por ele que os dois lados se encontram - sem depender de a
 * loja anotar numero de anuncio em lugar nenhum.
 */

export const dynamic = "force-dynamic";

/* A resposta vem embrulhada, e o campo muda de nome. */
function listaDeAnuncios(resposta: any): any[] {
  for (const campo of ["ads", "data", "list", "result"]) {
    if (Array.isArray(resposta?.[campo])) {
      return resposta[campo];
    }
  }

  if (Array.isArray(resposta)) return resposta;

  return [];
}

export async function POST() {
  const supabase = await createClient();

  try {
    const token = await tokenSalvo();

    const resposta = await anunciosPublicados(token);
    const anuncios = listaDeAnuncios(resposta);

    /*
     * O identificador que mandamos na insercao volta aqui. O
     * nome do campo varia, entao aceita os tres que a OLX usa.
     */
    const publicados = new Map<string, any>();

    for (const anuncio of anuncios) {
      const nosso = String(
        anuncio?.id ??
          anuncio?.ad_id ??
          anuncio?.client_ad_id ??
          ""
      );

      if (nosso) publicados.set(nosso, anuncio);
    }

    const { data: motos } = await supabase
      .from("motorcycles")
      .select("id, codigo")
      .neq("status", "vendida");

    let encontradas = 0;

    for (const moto of motos || []) {
      const chave = String(moto.codigo || moto.id);
      const anuncio = publicados.get(chave);

      if (!anuncio) continue;

      encontradas++;

      const listId = String(
        anuncio?.list_id ?? anuncio?.listId ?? ""
      );

      /*
       * Marca o envio mais recente como publicado. Se a moto
       * nunca passou por aqui - foi anunciada na mao, por
       * exemplo - cria a linha para a tela mostrar.
       */
      const { data: ultimo } = await supabase
        .from("olx_anuncios")
        .select("id")
        .eq("motorcycle_id", moto.id)
        .order("enviado_em", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ultimo) {
        await supabase
          .from("olx_anuncios")
          .update({
            situacao: "publicado",
            list_id: listId || null,
            atualizado_em: new Date().toISOString(),
          })
          .eq("id", ultimo.id);
      } else {
        await supabase.from("olx_anuncios").insert({
          motorcycle_id: moto.id,
          situacao: "publicado",
          list_id: listId || null,
          mensagem: "Encontrado na OLX",
        });
      }
    }

    return Response.json({
      ok: true,
      naOlx: anuncios.length,
      casadas: encontradas,
    });
  } catch (falha) {
    return Response.json(
      {
        error:
          falha instanceof Error
            ? falha.message
            : "Não foi possível consultar a OLX.",
      },
      { status: 502 }
    );
  }
}
