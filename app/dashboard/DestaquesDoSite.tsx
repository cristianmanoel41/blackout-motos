import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Dobravel from "@/components/Dobravel";
import TrocarDestaques, { type MotoDaCapa } from "./TrocarDestaques";

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
 * A leitura e feita no servidor, como o resto do painel: a
 * regra do projeto nao deixa buscar dado dentro de efeito, e
 * aqui nao ha motivo para fugir dela. O cliente cuida so do
 * clique.
 */

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

  return (
    <Dobravel
      titulo="Motos na capa do site"
      subtitulo="As três que aparecem na página inicial"
      nome="destaques-do-site"
      padrao
      icone={<Star size={17} />}
    >
      <TrocarDestaques motos={motos} />
    </Dobravel>
  );
}
