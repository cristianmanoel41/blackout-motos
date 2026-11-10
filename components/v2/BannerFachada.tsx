import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Banknote, Bike, Repeat } from "lucide-react";
import { CONVITE_GERAL, LOJA, linkWhatsApp } from "@/lib/dados/loja";
import { IconeWhatsApp } from "@/components/site/IconeWhatsApp";

/*
 * O topo da capa: a fachada da loja (v4).
 *
 * No computador a foto ocupa a tela toda e o texto fica à
 * esquerda, sobre um véu escuro que nasce do lado do texto -
 * a placa e as motos da direita continuam à vista. Manchete
 * grande, duas ações e, embaixo, três fatos curtos da loja.
 *
 * No celular a foto aparece inteira em cima (a placa ocupa a
 * largura toda e qualquer corte come as letras) e o texto vem
 * embaixo.
 */

export default function BannerFachada({ quantas }: { quantas: number }) {
  const FATOS = [
    {
      Icone: Bike,
      titulo: quantas > 0 ? `${quantas} motos` : "Estoque",
      texto: "prontas no pátio",
    },
    { Icone: Repeat, titulo: "Sua moto", texto: "entra na troca" },
    { Icone: Banknote, titulo: "Compramos", texto: "pagamento no PIX" },
  ];

  return (
    <section className="relative isolate">
      <div className="relative aspect-[3/2] w-full lg:aspect-auto lg:h-[max(720px,min(88vh,840px))]">
        <Image
          src="/site/fachada-loja.jpg"
          alt={`Fachada da ${LOJA.nome} em ${LOJA.cidade}`}
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_20%]"
        />

        {/* O véu: da esquerda (onde está o texto) e de baixo. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 hidden bg-[linear-gradient(90deg,#09090b_0%,rgba(9,9,11,.92)_28%,rgba(9,9,11,.5)_52%,rgba(9,9,11,.05)_80%)] lg:block"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#09090b] to-transparent"
        />
      </div>

      <div className="relative mx-auto max-w-[1400px] px-4 pb-10 pt-6 sm:px-6 lg:absolute lg:inset-0 lg:flex lg:flex-col lg:justify-end lg:pb-14 lg:pt-24">
        <div className="max-w-[660px]">
          <p className="v4-selo inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80]" />
            Loja física · venha ver de perto
          </p>

          <h1 className="titulo mt-5 text-[clamp(2.1rem,4.2vw,3.5rem)] claro">
            {/* O h1 leva a cidade: é o que o Google lê primeiro. */}
            Motos seminovas em{" "}
            <span className="ouro">{LOJA.cidade}</span>
          </h1>

          <p className="mt-4 max-w-lg text-base suave sm:text-lg">
            Compra, venda, troca e financiamento. Todas as marcas e
            modelos, com procedência conferida.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/estoque"
              className="botao-ouro flex min-h-[52px] items-center justify-center gap-2 rounded-full px-8 py-3.5 text-[15px]"
            >
              {quantas > 0 ? `Ver as ${quantas} motos` : "Ver o estoque"}
              <ArrowRight size={17} />
            </Link>

            <a
              href={linkWhatsApp(CONVITE_GERAL)}
              target="_blank"
              rel="noopener noreferrer"
              className="botao-vidro flex min-h-[52px] items-center justify-center gap-2 rounded-full px-8 py-3.5 text-[15px]"
            >
              <IconeWhatsApp className="h-4 w-4" />
              Chamar no WhatsApp
            </a>
          </div>

          <dl className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-white/10 pt-6">
            {FATOS.map(({ Icone, titulo, texto }) => (
              <div key={titulo}>
                <Icone size={18} className="ouro" />
                <dt className="mt-2 text-sm font-semibold claro sm:text-base">
                  {titulo}
                </dt>
                <dd className="text-xs suave sm:text-sm">{texto}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
