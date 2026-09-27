import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import CardMoto from "@/components/v2/CardMoto";
import { type MotoSite } from "@/lib/dados/moto-site";

/*
 * As últimas entradas, numa esteira que anda sozinha.
 *
 * Mesma mecânica da faixa de marcas: a fileira é escrita duas
 * vezes e a animação arrasta metade da largura, então o laço
 * fecha sem salto e sem JavaScript nenhum. Para quando o mouse
 * encosta, para quem quiser ler com calma.
 *
 * Aqui a esteira cabe porque esta seção é de passear o olho -
 * quem quer escolher usa o carrossel do estoque, logo acima,
 * que tem seta, pontinho e arrasto. Duas fileiras andando do
 * mesmo jeito na mesma página seria enjoativo; uma de cada
 * tipo dá ritmo.
 *
 * A ordem vem do banco: a função pública já devolve o estoque
 * da mais nova para a mais velha.
 */

function Fileira({
  motos,
  slugs,
  capas,
  escondida,
}: {
  motos: MotoSite[];
  slugs: Record<string, string>;
  capas: Record<string, string>;
  escondida?: boolean;
}) {
  return (
    <ul
      aria-hidden={escondida}
      inert={escondida}
      className="flex shrink-0 items-stretch"
    >
      {motos.map((moto) => (
        <li key={moto.id} className="w-[16rem] px-2.5">
          <CardMoto
            moto={moto}
            slug={slugs[moto.id]}
            foto={capas[moto.id]}
            compacto
          />
        </li>
      ))}
    </ul>
  );
}

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
    <section className="relative py-16 lg:py-20">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-end justify-between gap-5 px-4 sm:px-6">
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

      {/*
        * A esteira ocupa a largura inteira da tela, sem a
        * margem das outras seções: fileira que anda e para
        * numa borda invisível parece travada.
        */}
      <div className="mt-8 overflow-hidden">
        <div className="esteira-cards">
          <Fileira
            motos={motos}
            slugs={slugs}
            capas={capas}
          />
          <Fileira
            motos={motos}
            slugs={slugs}
            capas={capas}
            escondida
          />
        </div>
      </div>
    </section>
  );
}
