"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Carrossel from "@/components/v2/Carrossel";
import CardMoto from "@/components/v2/CardMoto";
import {
  CATEGORIAS,
  categoriaDaMoto,
  type Categoria,
  type MotoSite,
} from "@/lib/dados/moto-site";

/*
 * O estoque em tempo real.
 *
 * As motos são as mesmas do sistema: o que a loja marca como
 * vendida some daqui sozinho, sem ninguém mexer no site.
 *
 * O filtro é feito na tela, não no servidor: são poucas
 * dezenas de motos, e assim a troca de prateleira é instantânea
 * e não custa uma ida ao banco.
 *
 * O carrossel é refeito quando a prateleira muda (a chave no
 * componente): sem isso ele continuaria parado no meio da
 * lista antiga, mostrando um vão em vez de motos.
 */

export default function Estoque({
  motos,
  slugs,
  capas,
}: {
  motos: MotoSite[];
  slugs: Record<string, string>;
  capas: Record<string, string>;
}) {
  const [aberta, setAberta] = useState<Categoria>("todas");

  /* Prateleira vazia não vira botão: só aparece o que existe. */
  const prateleiras = CATEGORIAS.filter(
    (item) =>
      item.chave === "todas" ||
      motos.some((moto) => categoriaDaMoto(moto) === item.chave)
  );

  const lista =
    aberta === "todas"
      ? motos
      : motos.filter(
          (moto) => categoriaDaMoto(moto) === aberta
        );

  return (
    <section className="relative mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:py-20">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h2 className="titulo text-[clamp(1.9rem,4.5vw,2.8rem)] claro">
            Estoque em <span className="ouro">tempo real</span>
          </h2>

          <p className="mt-2 text-sm suave sm:text-base">
            Motos disponíveis, revisadas e com procedência.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Tipo de moto"
          className="flex flex-wrap gap-2"
        >
          {prateleiras.map((item) => (
            <button
              key={item.chave}
              type="button"
              role="tab"
              aria-selected={aberta === item.chave}
              onClick={() => setAberta(item.chave)}
              className={`rounded-full px-5 py-2 text-[13px] ${
                aberta === item.chave
                  ? "pilula pilula-ligada"
                  : "pilula"
              }`}
            >
              {item.nome}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        {lista.length > 0 ? (
          <Carrossel
            key={aberta}
            rotulo="Motos em estoque"
          >
            {lista.map((moto, posicao) => (
              <div
                key={moto.id}
                className="w-[78%] sm:w-[45%] lg:w-[31%] xl:w-[23.5%]"
              >
                <CardMoto
                  moto={moto}
                  slug={slugs[moto.id]}
                  foto={capas[moto.id]}
                  prioridade={posicao < 2}
                />
              </div>
            ))}
          </Carrossel>
        ) : (
          <p className="vidro px-5 py-10 text-center text-sm suave">
            Nenhuma moto desse tipo no pátio agora. Fale com a
            gente no WhatsApp: chega moto nova toda semana.
          </p>
        )}
      </div>

      <div className="mt-8 flex justify-center">
        <Link
          href="/estoque"
          className="botao-vidro inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm"
        >
          Ver todas as {motos.length} motos
          <ArrowUpRight size={16} />
        </Link>
      </div>
    </section>
  );
}
