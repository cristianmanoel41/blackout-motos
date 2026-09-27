import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  CONVITE_GERAL,
  linkWhatsApp,
  LOJA,
} from "@/lib/dados/loja";
import { IconeWhatsApp } from "@/components/site/IconeWhatsApp";
import AoEntrar from "@/components/v2/AoEntrar";

/*
 * A capa.
 *
 * Sem foto de moto aqui. A primeira moto que o cliente vê é a
 * do estoque, logo abaixo, e ali ela vem com preço, ano e km.
 * Uma foto solta em cima disputava com essa fileira e ainda
 * dava destaque a uma moto que ninguém escolheu - a capa
 * pegava a última que tinha entrado.
 *
 * O que fica é o convite, os dois caminhos de contato e os
 * três selos. Eles não inventam nada: dizem o que a loja faz
 * em toda moto antes de anunciar.
 */

const SELOS = [
  {
    Icone: BadgeCheck,
    titulo: "Qualidade",
    texto: "Motos revisadas",
  },
  {
    Icone: ShieldCheck,
    titulo: "Procedência",
    texto: "Cautelar antes de comprar",
  },
  {
    Icone: Sparkles,
    titulo: "Confiança",
    texto: "Atendimento especializado",
  },
];

export default function Hero({ quantas }: { quantas: number }) {
  return (
    <section className="grao relative overflow-hidden border-b border-white/[.07]">
      <span
        className="brasa h-[40rem] w-[40rem]"
        style={{ top: "-16rem", right: "-8rem" }}
      />

      <div className="relative mx-auto grid max-w-[1400px] items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12 lg:py-24">
        <AoEntrar className="relative z-10">
          <p className="rotulo">{LOJA.nome}</p>

          <h1 className="titulo mt-5 text-[clamp(2.7rem,8vw,4.8rem)]">
            <span className="ouro">Liberdade</span>
            <br />
            <span className="claro">sobre duas rodas</span>
          </h1>

          <p className="mt-5 max-w-lg text-base leading-8 suave">
            Motos seminovas com procedência, garantia e as
            melhores condições de {LOJA.cidade}.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/estoque"
              className="botao-ouro flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm"
            >
              Ver motos em estoque
              <ArrowRight size={16} />
            </Link>

            <a
              href={linkWhatsApp(CONVITE_GERAL)}
              target="_blank"
              rel="noopener noreferrer"
              className="botao-vidro flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm"
            >
              <IconeWhatsApp className="h-4 w-4" />
              Falar no WhatsApp
            </a>
          </div>

          {quantas > 0 && (
            <p className="mt-6 text-[13px] suave">
              <span className="font-bold ouro">{quantas}</span>{" "}
              moto{quantas === 1 ? "" : "s"} à pronta entrega
              agora
            </p>
          )}
        </AoEntrar>

        {/*
          * No computador os selos ficam em coluna, ao lado do
          * texto; no celular viram três faixas, uma embaixo da
          * outra, que é como se lê com o polegar.
          */}
        <AoEntrar atraso={120}>
          <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {SELOS.map(({ Icone, titulo, texto }) => (
              <li
                key={titulo}
                className="vidro flex items-center gap-3.5 px-5 py-4"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e0b129]/10 ring-1 ring-[#e0b129]/25">
                  <Icone size={19} className="ouro" />
                </span>

                <span className="min-w-0">
                  <span className="block text-[12px] font-bold uppercase tracking-wider claro">
                    {titulo}
                  </span>
                  <span className="block text-[12px] leading-snug suave">
                    {texto}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </AoEntrar>
      </div>
    </section>
  );
}
