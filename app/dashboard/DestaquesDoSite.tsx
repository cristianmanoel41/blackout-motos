import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Dobravel from "@/components/Dobravel";
import TrocarDestaques, {
  type MotoDaCapa,
  type FotoDaMoto,
} from "./TrocarDestaques";

/*
 * AS MOTOS DA CAPA DO SITE
 *
 * A capa mostra tres motos. Ate 02/10/2026 eram sempre as tres
 * mais novas, sem escolha; depois passou a obedecer o campo
 * na_capa, mas o unico jeito de mexer era abrir a ficha de cada
 * moto e achar o botao la dentro.
 *
 * Trocar a vitrine e coisa de fazer toda semana. Entao mora
 * aqui: as tres atuais com foto, e a busca para por outra no
 * lugar - sem sair do painel.
 *
 * E QUAL FOTO SOBE
 *
 * Escolher a moto nunca foi o problema inteiro: a foto que a
 * capa mostra e a marcada como principal, e marcar outra exigia
 * abrir a ficha da moto e descer ate a galeria. Quem troca a
 * vitrine quer as duas decisoes no mesmo lugar - qual moto, e
 * com qual foto. Entao as fotos das tres escolhidas vem junto.
 *
 * So das tres: as outras vinte nao tem foto nenhuma mostrada
 * aqui, e carregar a galeria inteira do patio para desenhar
 * tres cartoes seria pagar caro por nada.
 *
 * A leitura e feita no servidor, como o resto do painel: a
 * regra do projeto nao deixa buscar dado dentro de efeito, e
 * aqui nao ha motivo para fugir dela. O cliente cuida so do
 * clique.
 */

/*
 * Video fica de fora: capa de card e imagem, e um arquivo de
 * video ali apareceria como quadro preto.
 */
function ehVideo(foto: {
  arquivo_tipo?: string | null;
  arquivo_nome?: string | null;
}) {
  return (
    (foto.arquivo_tipo || "").startsWith("video/") ||
    /\.(mp4|mov|webm)$/i.test(foto.arquivo_nome || "")
  );
}

export default async function DestaquesDoSite() {
  const supabase = await createClient();

  const [estoque, fotos] = await Promise.all([
    supabase
      .from("motorcycles")
      .select("id, marca, modelo, versao, ano_modelo, preco_anunciado, na_capa")
      .eq("status", "disponivel")
      .order("data_entrada", { ascending: false, nullsFirst: false }),
    supabase
      .from("motorcycle_photos")
      .select("motorcycle_id, url")
      .eq("principal", true),
  ]);

  const capas: Record<string, string> = {};

  (fotos.data || []).forEach((foto) => {
    if (foto.url) capas[String(foto.motorcycle_id)] = String(foto.url);
  });

  const motos: MotoDaCapa[] = (estoque.data || []).map((moto) => ({
    id: String(moto.id),
    nome: [moto.marca, moto.modelo, moto.versao]
      .map((parte) => String(parte || "").trim())
      .filter(Boolean)
      .join(" "),
    ano: moto.ano_modelo ? String(moto.ano_modelo) : "",
    preco: Number(moto.preco_anunciado) || 0,
    naCapa: Boolean(moto.na_capa),
    capa: capas[String(moto.id)] || "",
  }));

  /* A galeria das que estao na capa, para escolher a foto. */
  const escolhidas = motos
    .filter((moto) => moto.naCapa)
    .map((moto) => moto.id);

  const galerias: Record<string, FotoDaMoto[]> = {};

  if (escolhidas.length > 0) {
    const { data: todas } = await supabase
      .from("motorcycle_photos")
      .select(
        "id, motorcycle_id, url, principal, arquivo_tipo, arquivo_nome"
      )
      .in("motorcycle_id", escolhidas)
      .order("ordem", { ascending: true });

    (todas || []).forEach((foto) => {
      if (!foto.url || ehVideo(foto)) return;

      const moto = String(foto.motorcycle_id);

      galerias[moto] = [
        ...(galerias[moto] || []),
        {
          id: String(foto.id),
          url: String(foto.url),
          principal: Boolean(foto.principal),
        },
      ];
    });
  }

  return (
    <Dobravel
      titulo="Motos na capa do site"
      subtitulo="As três que aparecem na página inicial"
      nome="destaques-do-site"
      padrao
      icone={<Star size={17} />}
    >
      <TrocarDestaques motos={motos} galerias={galerias} />
    </Dobravel>
  );
}
