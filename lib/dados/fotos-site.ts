/*
 * As fotos das motos do site.
 *
 * Fica separado dos ajudantes de texto de propósito: aqui se
 * usa o cliente de servidor do Supabase, e os componentes de
 * lista e galeria são de cliente. Se as duas coisas morassem
 * no mesmo arquivo, o código de servidor iria parar no pacote
 * do navegador e a página nem carregaria.
 *
 * A tabela é a mesma galeria do sistema (motorcycle_photos),
 * que já libera leitura pública. Nada de foto é duplicado.
 */

import { createClient } from "@/lib/supabase/server";

/*
 * Vídeo é separado da foto, não descartado.
 *
 * Card e capa só usam foto: um arquivo de vídeo no lugar da
 * imagem apareceria como quadro preto. Mas a galeria da ficha
 * toca o vídeo que a loja subiu - o mesmo arquivo da galeria do
 * sistema, que já aceita vídeo desde a migração 0021 (TikTok).
 */
function ehVideo(foto: any) {
  return (
    (foto.arquivo_tipo || "").startsWith("video/") ||
    /\.(mp4|mov|webm)$/i.test(foto.arquivo_nome || "")
  );
}

export type Fotos = {
  /* A capa marcada na ficha; sem marcação, a primeira. */
  capas: Record<string, string>;
  galerias: Record<string, string[]>;
  /* Os vídeos de cada moto, na ordem da galeria. */
  videos: Record<string, string[]>;
  /*
   * A consulta falhou?
   *
   * Sem foto, a moto é filtrada fora do site. Então uma
   * falha aqui esvazia a vitrine do mesmo jeito que um
   * pátio vazio - e quem olha a tela não tem como saber a
   * diferença. Quem sabe é esta linha.
   */
  falhou?: boolean;
};

export async function fotosDasMotos(
  ids: string[]
): Promise<Fotos> {
  const capas: Record<string, string> = {};
  const galerias: Record<string, string[]> = {};
  const videos: Record<string, string[]> = {};

  if (ids.length === 0) return { capas, galerias, videos };

  const supabase = await createClient();

  const { data: fotos, error } = await supabase
    .from("motorcycle_photos")
    .select(
      "motorcycle_id, url, principal, arquivo_tipo, arquivo_nome"
    )
    .in("motorcycle_id", ids)
    .order("ordem", { ascending: true });

  (fotos || []).forEach((foto: any) => {
    if (!foto.url) return;

    const moto = String(foto.motorcycle_id);

    if (ehVideo(foto)) {
      videos[moto] = [...(videos[moto] || []), foto.url];
      return;
    }

    if (foto.principal) capas[moto] = foto.url;

    galerias[moto] = [
      ...(galerias[moto] || []),
      foto.url,
    ];
  });

  /* Sem capa marcada, a primeira da ordem serve. */
  Object.keys(galerias).forEach((moto) => {
    if (!capas[moto]) capas[moto] = galerias[moto][0];
  });

  if (error) {
    console.error(
      "[fotos do site] a consulta falhou:",
      error.message
    );
  }

  return { capas, galerias, videos, falhou: Boolean(error) };
}

/* A galeria com a capa na frente. */
export function galeriaOrdenada(
  fotos: Fotos,
  id: string
) {
  const todas = fotos.galerias[id] || [];
  const capa = fotos.capas[id];

  if (!capa) return todas;

  return [capa, ...todas.filter((f) => f !== capa)];
}
