import type { Metadata } from "next";
import { estoqueDoSite } from "@/lib/dados/estoque-site";
import EstoqueFiltrado from "@/components/site/EstoqueFiltrado";
import { LOJA } from "@/lib/dados/loja";

/*
 * O estoque completo.
 *
 * A busca acontece no navegador, sobre a lista que já veio do
 * servidor: são poucas dezenas de motos, e assim o filtro
 * responde na hora, sem ida e volta ao banco a cada tecla.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Estoque de motos",
  description: `Motos seminovas revisadas em ${LOJA.cidade}. Veja fotos, preço e ficha de cada moto do estoque da ${LOJA.nome.toUpperCase()}.`,
};

export default async function EstoquePage() {
  const { motos, fotos, slugs } = await estoqueDoSite();

  const totalFotos: Record<string, number> = {};

  motos.forEach((moto) => {
    totalFotos[moto.id] = (
      fotos.galerias[moto.id] || []
    ).length;
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
      <header className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] texto-ouro">
          Estoque disponível
        </p>

        <h1 className="mt-2 text-3xl font-black texto-claro sm:text-4xl">
          {motos.length} moto
          {motos.length === 1 ? "" : "s"} à pronta entrega
        </h1>

        <p className="mt-2 text-sm texto-suave">
          Todas com foto, preço e ficha. Clique na moto para
          ver a galeria completa.
        </p>
      </header>

      {motos.length === 0 ? (
        <article className="cartao-3d rounded-2xl p-10 text-center text-sm texto-suave">
          Estamos renovando o estoque. Fale com a gente no
          WhatsApp: chega moto nova toda semana.
        </article>
      ) : (
        <EstoqueFiltrado
          motos={motos}
          slugs={slugs}
          capas={fotos.capas}
          totalFotos={totalFotos}
        />
      )}
    </main>
  );
}
