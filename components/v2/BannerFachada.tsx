import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CONVITE_GERAL, LOJA, linkWhatsApp } from "@/lib/dados/loja";
import { IconeWhatsApp } from "@/components/site/IconeWhatsApp";

/*
 * O topo da capa: a fachada da loja.
 *
 * Entrou no lugar da vitrine de cinema em 27/10/2026, a pedido
 * da loja. A placa da foto já diz o nome, os telefones e o
 * Instagram, então o texto aqui fica curto.
 *
 * No celular a foto aparece inteira e o texto vem embaixo: a
 * placa ocupa a largura toda e qualquer corte come as letras.
 * No computador a foto corta embaixo (o chão do estacionamento)
 * e o texto vai por cima, num degradê.
 */
export default function BannerFachada({ quantas }: { quantas: number }) {
  return (
    <section className="relative isolate border-b border-white/[.07]">
      <div className="relative aspect-[4/3] w-full lg:aspect-auto lg:h-[min(78vh,760px)]">
        <Image
          src="/site/fachada-blackout.jpg"
          alt={`Fachada da ${LOJA.nome} em ${LOJA.cidade}`}
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_20%]"
        />

        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 hidden h-2/3 bg-gradient-to-t from-[#09090b] via-[#09090b]/70 to-transparent lg:block"
        />
      </div>

      <div className="relative mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:absolute lg:inset-x-0 lg:bottom-0 lg:py-12">
        <h1 className="titulo text-[clamp(1.8rem,4.5vw,3.2rem)] claro">
          Motos seminovas em <span className="ouro">{LOJA.cidade}</span>
        </h1>

        <p className="mt-2 max-w-xl text-sm suave sm:text-base">
          Compra, venda, troca e financiamento. Todas as marcas e
          modelos.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/estoque"
            className="botao-ouro flex min-h-12 items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm"
          >
            {quantas > 0 ? `Ver as ${quantas} motos do estoque` : "Ver o estoque"}
            <ArrowRight size={16} />
          </Link>

          <a
            href={linkWhatsApp(CONVITE_GERAL)}
            target="_blank"
            rel="noopener noreferrer"
            className="botao-vidro flex min-h-12 items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm"
          >
            <IconeWhatsApp className="h-4 w-4" />
            Chamar no WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
