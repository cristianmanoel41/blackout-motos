import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  CONVITE_GERAL,
  linkWhatsApp,
} from "@/lib/dados/loja";
import { IconeWhatsApp } from "@/components/site/IconeWhatsApp";
import TituloAnimado from "@/components/site/TituloAnimado";
import VitrineAuto from "@/components/site/VitrineAuto";
import { type MotoSite } from "@/lib/dados/moto-site";

/*
 * A capa do site.
 *
 * Fundo preto, sem foto de banner. A moto de fundo competia
 * com o texto, e foto atrás de letra sempre custa leitura.
 * O que se mexe aqui é o estoque de verdade: à direita as
 * últimas motos que entraram, passando sozinhas.
 *
 * Fica só o brilho dourado suave, que dá profundidade sem
 * disputar atenção.
 */

export default function Capa({
  motos,
  destaques = [],
  slugs = {},
  capas = {},
}: {
  motos: number;
  destaques?: MotoSite[];
  slugs?: Record<string, string>;
  capas?: Record<string, string>;
}) {
  return (
    <section className="brilho-capa relative isolate overflow-hidden border-b border-white/[.07] bg-[#0a0a0c]">
      {/*
        * Avisa a página que tem JS antes do primeiro quadro,
        * para o título não aparecer escrito e sumir um
        * instante depois para ser digitado.
        */}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.dataset.js="sim"`,
        }}
      />

      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:py-28">
        <div className="max-w-xl">
          <h1 className="text-4xl font-black uppercase leading-[1.05] tracking-tight texto-claro sm:text-6xl">
            Sua próxima
            <br />
            <TituloAnimado />
          </h1>

          <p className="mt-5 max-w-md text-sm leading-7 texto-suave sm:text-base">
            Qualidade, procedência e o melhor atendimento.
            As melhores oportunidades em um só lugar.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/estoque"
              className="botao-ouro flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-bold"
            >
              Ver estoque
              <ArrowRight size={16} />
            </Link>

            <a
              href={linkWhatsApp(CONVITE_GERAL)}
              target="_blank"
              rel="noopener noreferrer"
              className="botao-vidro flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-bold"
            >
              <IconeWhatsApp className="h-4 w-4" />
              Falar no WhatsApp
            </a>
          </div>

          {motos > 0 && (
            <p className="mt-6 text-xs texto-suave">
              <span className="texto-ouro font-bold">
                {motos}
              </span>{" "}
              moto{motos === 1 ? "" : "s"} à pronta entrega
              agora
            </p>
          )}
        </div>

        {destaques.length > 0 ? (
          <div className="order-first lg:order-none">
            <VitrineAuto
              motos={destaques}
              slugs={slugs}
              capas={capas}
            />
          </div>
        ) : (
          /* Sem moto com foto, a capa nao fica com um buraco. */
          <article className="cartao-3d rounded-3xl p-10 text-center text-sm leading-7 texto-suave">
            Estamos renovando o estoque. Fale com a gente no
            WhatsApp: chega moto nova toda semana.
          </article>
        )}
      </div>
    </section>
  );
}
