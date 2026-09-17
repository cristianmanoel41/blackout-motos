import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  CONVITE_GERAL,
  linkWhatsApp,
} from "@/lib/dados/loja";
import { IconeWhatsApp } from "@/components/site/IconeWhatsApp";

/*
 * A capa do site.
 *
 * Fundo preto, sem foto. A moto de fundo competia com os
 * cards logo abaixo, que são o que interessa - e foto atrás
 * de texto sempre custa legibilidade.
 *
 * Fica só o brilho dourado suave, que dá profundidade sem
 * disputar atenção.
 */

export default function Capa({
  motos,
}: {
  motos: number;
}) {
  return (
    <section className="brilho-capa relative isolate overflow-hidden border-b border-white/[.07] bg-[#0a0a0c]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24 lg:py-32">
        <div className="max-w-xl">
          <h1 className="text-4xl font-black uppercase leading-[1.05] tracking-tight texto-claro sm:text-6xl">
            Sua próxima
            <br />
            <span className="texto-ouro">moto</span> está
            aqui
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
      </div>
    </section>
  );
}
