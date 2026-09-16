import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { estoqueDoSite } from "@/lib/dados/estoque-site";
import Capa from "@/components/site/Capa";
import Beneficios from "@/components/site/Beneficios";
import CardMoto from "@/components/site/CardMoto";
import Institucional from "@/components/site/Institucional";
import Marcas from "@/components/site/Marcas";
import { nomeDaMoto } from "@/lib/dados/moto-site";

/*
 * A home.
 *
 * As motos em destaque são as quatro que entraram por último -
 * o estoque gira, então "destaque" aqui é novidade, não uma
 * escolha a mão que alguém teria de manter.
 */

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { motos, fotos, slugs } = await estoqueDoSite();

  const destaques = motos.slice(0, 4);
  const primeira = motos[0];

  return (
    <>
      <Capa
        foto={primeira ? fotos.capas[primeira.id] : undefined}
        nome={primeira ? nomeDaMoto(primeira) : undefined}
        motos={motos.length}
      />

      <Beneficios />

      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black texto-claro sm:text-3xl">
              Motos em{" "}
              <span className="texto-ouro">destaque</span>
            </h2>

            <p className="mt-1.5 text-sm texto-suave">
              As melhores motos, prontas para rodar.
            </p>
          </div>

          <Link
            href="/estoque"
            className="botao-ouro inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold"
          >
            Ver todo o estoque
            <ArrowRight size={15} />
          </Link>
        </div>

        {destaques.length === 0 ? (
          <article className="cartao-3d rounded-2xl p-10 text-center text-sm texto-suave">
            Estamos renovando o estoque. Fale com a gente no
            WhatsApp: chega moto nova toda semana.
          </article>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {destaques.map((moto, posicao) => (
              <CardMoto
                key={moto.id}
                moto={moto}
                slug={slugs[moto.id]}
                capa={fotos.capas[moto.id]}
                fotos={
                  (fotos.galerias[moto.id] || []).length
                }
                destaque={posicao === 0}
                prioridade={posicao < 2}
              />
            ))}
          </div>
        )}
      </section>

      <Institucional />

      <Marcas />
    </>
  );
}
