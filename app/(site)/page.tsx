import { estoqueDoSite } from "@/lib/dados/estoque-site";
import Capa from "@/components/site/Capa";
import Beneficios from "@/components/site/Beneficios";
import Institucional from "@/components/site/Institucional";
import Marcas from "@/components/site/Marcas";
import Avaliacoes from "@/components/site/Avaliacoes";
import AvisarNovidades from "@/components/site/AvisarNovidades";
import { modelosDoEstoque } from "@/lib/dados/moto-site";

/*
 * A home.
 *
 * Quem mostra moto aqui é a capa: as quatro que entraram por
 * último, passando sozinhas. O estoque gira, então "destaque"
 * é novidade, não uma escolha a mão que alguém teria de manter.
 *
 * A lista de cards que ficava logo abaixo saiu: repetia o que
 * a capa já mostra, e empurrava para baixo o resto da página.
 * Quem quer ver tudo tem o botão da capa e o menu.
 */

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { motos, fotos, slugs } = await estoqueDoSite();

  /*
   * Quem manda na capa é a marcação da ficha. Sem nenhuma
   * marcada, valem as quatro que entraram por último - assim
   * a capa nunca fica vazia por esquecimento.
   */
  const escolhidas = motos.filter((moto) => moto.na_capa);

  const destaques =
    escolhidas.length > 0
      ? escolhidas.slice(0, 6)
      : motos.slice(0, 4);

  return (
    <>
      <Capa
        motos={motos.length}
        destaques={destaques}
        slugs={slugs}
        capas={fotos.capas}
      />

      <Beneficios />

      <AvisarNovidades
        origem="home"
        sugestoes={modelosDoEstoque(motos)}
      />

      <Institucional />

      <Avaliacoes />

      <Marcas />
    </>
  );
}
