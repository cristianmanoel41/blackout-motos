import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import { FAIXAS_DE_PRECO } from "@/lib/dados/moto-site";

/*
 * A busca da capa, à vista, logo abaixo da vitrine.
 *
 * No celular a busca do cabeçalho mora dentro do menu, e quem
 * chega do Instagram não abre menu. Esta fica no caminho do
 * polegar: escreve o modelo, ou toca numa faixa de preço.
 *
 * É formulário comum, de propósito: envia para /estoque?busca=
 * mesmo se o JavaScript ainda não carregou - que é justamente o
 * primeiro segundo de quem abre o site no 4G.
 */

export default function BuscaRapida({ quantas }: { quantas: number }) {
  return (
    <section className="relative border-b border-white/[.07] bg-[#0b0b0e]">
      <div className="mx-auto max-w-[1400px] px-4 py-7 sm:px-6">
        <form action="/estoque" method="get" role="search" className="flex gap-2">
          <label htmlFor="busca-capa" className="sr-only">
            Procurar moto no estoque
          </label>

          <div className="relative flex-1">
            <Search
              size={19}
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
            />
            <input
              id="busca-capa"
              name="busca"
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              placeholder={`Procure entre ${quantas} motos: CG, Biz, Fazer...`}
              className="min-h-14 w-full rounded-2xl py-3 pl-12 pr-4 text-[15px]"
            />
          </div>

          <button
            type="submit"
            className="botao-ouro flex min-h-14 shrink-0 items-center justify-center rounded-2xl px-5 text-sm sm:px-8"
          >
            Buscar
          </button>
        </form>

        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 [scrollbar-width:none]">
          {FAIXAS_DE_PRECO.map((faixa) => (
            <Link
              key={faixa.chave}
              href={`/estoque?preco=${faixa.chave}`}
              className="pilula flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full px-4 text-[13px]"
            >
              {faixa.nome}
            </Link>
          ))}

          <Link
            href="/encontre-sua-moto"
            className="pilula flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[13px] ouro"
          >
            <Sparkles size={14} />
            Encontre sua moto ideal
          </Link>
        </div>
      </div>
    </section>
  );
}
