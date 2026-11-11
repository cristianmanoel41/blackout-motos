import Link from "next/link";
import { ArrowRight, Camera, ClipboardCheck, Zap } from "lucide-react";
import { linkWhatsApp } from "@/lib/dados/loja";
import { IconeWhatsApp } from "@/components/site/IconeWhatsApp";
import AoEntrar from "@/components/v2/AoEntrar";

/*
 * Compramos sua moto.
 *
 * É a seção que traz moto para o pátio. Desde 11/11/2026 o
 * botão principal leva à página /compramos-sua-moto, onde a
 * pessoa preenche a ficha da moto e envia pelo WhatsApp - a
 * loja recebe tudo escrito. Quem não quer preencher tem o link
 * para só chamar no WhatsApp.
 *
 * "Pagamento no PIX" fica no título porque é o que diferencia:
 * a dúvida de quem vende moto é quando o dinheiro cai.
 */

const CONVITE =
  "Olá, gostaria de avaliar minha moto para venda na Blackout Motos.";

export default function CompramosSuaMoto() {
  return (
    <section className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      <AoEntrar>
        {/* v4: texto à esquerda, o caminho em três passos à
            direita - quem quer vender vê na hora como funciona. */}
        <div className="vidro relative grid gap-8 overflow-hidden px-5 py-9 sm:gap-10 sm:px-10 sm:py-12 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16 lg:px-14 lg:py-16">
          <div className="relative">
            <p className="rotulo">Avaliação sem compromisso</p>

            <h2 className="titulo mt-4 max-w-2xl text-[clamp(1.9rem,5vw,3rem)] claro">
              Compramos sua moto.{" "}
              <span className="ouro">Pagamento no PIX.</span>
            </h2>

            <p className="mt-4 max-w-lg text-sm leading-7 suave sm:text-base">
              Venda com segurança, avaliação justa e dinheiro na
              conta no mesmo dia.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/compramos-sua-moto"
                className="botao-ouro inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-sm"
              >
                Avaliar minha moto
                <ArrowRight size={16} />
              </Link>

              {/* Quem não quer preencher nada ainda pode só chamar. */}
              <a
                href={linkWhatsApp(CONVITE)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold suave hover:text-white"
              >
                <IconeWhatsApp className="h-4 w-4" />
                Prefiro chamar no WhatsApp
              </a>
            </div>
          </div>

          <ol className="relative space-y-3">
            {[
              { Icone: Camera, titulo: "Mande fotos no WhatsApp", texto: "Moto, painel com a km e o documento." },
              { Icone: ClipboardCheck, titulo: "Receba a avaliação", texto: "Proposta justa, sem compromisso." },
              { Icone: Zap, titulo: "Dinheiro no PIX", texto: "Fechou, cai na conta no mesmo dia." },
            ].map(({ Icone, titulo, texto }, i) => (
              <li
                key={titulo}
                className="flex items-start gap-4 rounded-2xl border border-white/[.08] bg-white/[.02] p-4 sm:p-5"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e0b129]/10">
                  <Icone size={20} className="ouro" />
                </span>
                <span>
                  <span className="block text-xs font-semibold suave">Passo {i + 1}</span>
                  <span className="block text-base font-semibold claro">{titulo}</span>
                  <span className="block text-sm suave">{texto}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </AoEntrar>
    </section>
  );
}
