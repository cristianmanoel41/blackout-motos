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
 * Vídeo fica de fora: o site mostra galeria de imagem, e um
 * arquivo de vídeo na faixa apareceria como quadro preto.
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
};

export async function fotosDasMotos(
  ids: string[]
): Promise<Fotos> {
  const capas: Record<string, string> = {};
  const galerias: Record<string, string[]> = {};

  if (ids.length === 0) return { capas, galerias };

  const supabase = await createClient();

  const { data: fotos } = await supabase
    .from("motorcycle_photos")
    .select(
      "motorcycle_id, url, principal, arquivo_tipo, arquivo_nome"
    )
    .in("motorcycle_id", ids)
    .order("ordem", { ascending: true });

  (fotos || []).forEach((foto: any) => {
    if (!foto.url || ehVideo(foto)) return;

    const moto = String(foto.motorcycle_id);

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

  return { capas, galerias };
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
