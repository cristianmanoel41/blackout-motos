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
import Contador from "@/components/v2/Contador";
import CardRotativo from "@/components/v2/CardRotativo";
import { type MotoSite } from "@/lib/dados/moto-site";

/*
 * A capa.
 *
 * A vitrine é um card só, com as últimas motos trocando
 * sozinhas. Ele fica aqui em cima, na primeira tela, porque é
 * o que a pessoa veio ver - e no celular vem antes do texto,
 * que é onde o polegar chega primeiro.
 *
 * Não é foto de enfeite: o card leva preço, ano, km e os dois
 * caminhos - a ficha e o WhatsApp já com a moto escrita na
 * mensagem.
 *
 * Os três selos não inventam nada: dizem o que a loja faz em
 * toda moto antes de anunciar.
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

export default function Hero({
  motos,
  slugs,
  capas,
  quantas,
}: {
  motos: MotoSite[];
  slugs: Record<string, string>;
  capas: Record<string, string>;
  quantas: number;
}) {
  return (
    <section className="grao relative overflow-hidden border-b border-white/[.07]">
      <span
        className="brasa h-[40rem] w-[40rem]"
        style={{ top: "-16rem", right: "-8rem" }}
      />

      <div className="relative mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_25rem] lg:gap-16">
          <div className="entrada relative z-10">
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
                <Contador total={quantas} /> moto
                {quantas === 1 ? "" : "s"} à pronta entrega
                agora
              </p>
            )}
          </div>

          {/*
            * No celular a vitrine vem antes do texto: quem abre
            * site de loja quer ver moto, não ler.
            */}
          {motos.length > 0 && (
            <div className="order-first lg:order-none">
              <p className="rotulo mb-4 lg:hidden">
                Últimas entradas
              </p>

              <CardRotativo
                motos={motos}
                slugs={slugs}
                capas={capas}
              />
            </div>
          )}
        </div>

        <AoEntrar>
          <ul className="mt-12 grid gap-3 sm:grid-cols-3">
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
