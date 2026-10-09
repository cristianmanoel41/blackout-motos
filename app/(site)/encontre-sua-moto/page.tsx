import type { Metadata } from "next";
import { estoqueDoSite } from "@/lib/dados/estoque-site";
import EncontreSuaMoto from "@/components/v2/EncontreSuaMoto";
import { LOJA } from "@/lib/dados/loja";

/*
 * A página da ferramenta "Encontre sua moto ideal".
 *
 * Existe sozinha, além da seção na capa, para o anúncio poder
 * mandar direto para ela: "não sabe qual moto comprar?" é uma
 * campanha que cabe em quem ainda não escolheu modelo.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Encontre sua moto ideal",
  description: `Responda quatro perguntas rápidas e veja as motos do estoque da ${LOJA.nome.toUpperCase()} que combinam com seu orçamento e com o seu uso, em ${LOJA.cidade}.`,
  alternates: { canonical: "/encontre-sua-moto" },
};

export default async function EncontrePage() {
  const { motos, fotos, slugs, falhou } = await estoqueDoSite();

  const totalFotos: Record<string, number> = {};
  const totalVideos: Record<string, number> = {};

  motos.forEach((moto) => {
    totalFotos[moto.id] = (fotos.galerias[moto.id] || []).length;
    totalVideos[moto.id] = (fotos.videos[moto.id] || []).length;
  });

  return (
    <main className="grao relative mx-auto max-w-[1400px] px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8 max-w-2xl">
        <p className="rotulo">Ferramenta</p>

        <h1 className="titulo mt-3 text-[clamp(2rem,5vw,3.2rem)] claro">
          Encontre sua <span className="ouro">moto ideal</span>
        </h1>

        <p className="mt-3 text-sm suave sm:text-base">
          Quatro toques e a gente mostra as motos do nosso pátio que
          cabem no seu bolso e no seu dia a dia.
        </p>
      </header>

      {motos.length === 0 ? (
        <article className="vidro p-10 text-center text-sm suave">
          {falhou
            ? "Não conseguimos carregar o estoque agora. Tente de novo em instantes, ou chame no WhatsApp."
            : "Estamos renovando o estoque. Fale com a gente no WhatsApp: chega moto nova toda semana."}
        </article>
      ) : (
        <EncontreSuaMoto
          motos={motos}
          slugs={slugs}
          capas={fotos.capas}
          totalFotos={totalFotos}
          totalVideos={totalVideos}
          quantos={9}
        />
      )}
    </main>
  );
}
