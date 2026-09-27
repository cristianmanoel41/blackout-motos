"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Carrossel from "@/components/v2/Carrossel";
import CardMoto from "@/components/v2/CardMoto";
import { type MotoSite } from "@/lib/dados/moto-site";

/*
 * As últimas entradas.
 *
 * A ordem vem do banco - a função pública já devolve o estoque
 * da mais nova para a mais velha -, então aqui é só cortar as
 * primeiras. Sem data inventada e sem "novidade" que ficou
 * novidade por seis meses.
 *
 * Os cards são os mesmos do estoque, na versão curta: quem
 * chega aqui já rolou meia página e não vai decidir nesta
 * seção - vai clicar para ver.
 */

export default function UltimasEntradas({
  motos,
  slugs,
  capas,
}: {
  motos: MotoSite[];
  slugs: Record<string, string>;
  capas: Record<string, string>;
}) {
  if (motos.length === 0) return null;

  return (
    <section className="relative mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:py-20">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h2 className="titulo text-[clamp(1.9rem,4.5vw,2.8rem)] claro">
            Últimas <span className="ouro">entradas</span>
          </h2>

          <p className="mt-2 text-sm suave sm:text-base">
            As motos que acabaram de chegar na loja.
          </p>
        </div>

        <Link
          href="/estoque"
          className="inline-flex items-center gap-1.5 border-b-2 border-[#e0b129] pb-1 text-sm font-bold claro transition hover:text-[#e0b129]"
        >
          Ver todas as motos
          <ArrowUpRight size={15} />
        </Link>
      </div>

      <div className="mt-8">
        <Carrossel rotulo="Últimas entradas" tempo={6200}>
          {motos.map((moto) => (
            <div
              key={moto.id}
              className="w-[62%] sm:w-[38%] lg:w-[24%] xl:w-[19%]"
            >
              <CardMoto
                moto={moto}
                slug={slugs[moto.id]}
                foto={capas[moto.id]}
                compacto
              />
            </div>
          ))}
        </Carrossel>
      </div>
    </section>
  );
}
