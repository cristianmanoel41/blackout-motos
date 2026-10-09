import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { estoqueDoSite } from "@/lib/dados/estoque-site";
import EstoqueInterativo from "@/components/v2/EstoqueInterativo";
import { LOJA } from "@/lib/dados/loja";
import AvisarNovidades from "@/components/site/AvisarNovidades";
import { modelosDoEstoque } from "@/lib/dados/moto-site";

/*
 * O estoque completo.
 *
 * A busca acontece no navegador, sobre a lista que já veio do
 * servidor: são poucas dezenas de motos, e assim o filtro
 * responde na hora, sem ida e volta ao banco a cada tecla.
 *
 * Os filtros chegam pelo endereço (?preco=ate-20000&tipo=trail)
 * e a tela abre já filtrada - é o caminho do anúncio de faixa de
 * preço e da busca da capa.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Motos seminovas à venda em ${LOJA.cidade}`,
  description: `Estoque de motos seminovas em ${LOJA.cidade}/${LOJA.estado}: fotos reais, preço, ano e km de cada moto. Financiamento e sua moto na troca na ${LOJA.nome.toUpperCase()}.`,
  alternates: { canonical: "/estoque" },
};

function texto(valor: string | string[] | undefined) {
  return (Array.isArray(valor) ? valor[0] : valor)?.slice(0, 60) || "";
}

export default async function EstoquePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parametros = await searchParams;
  const { motos, fotos, slugs, falhou } = await estoqueDoSite();

  const totalFotos: Record<string, number> = {};
  const totalVideos: Record<string, number> = {};

  motos.forEach((moto) => {
    totalFotos[moto.id] = (fotos.galerias[moto.id] || []).length;
    totalVideos[moto.id] = (fotos.videos[moto.id] || []).length;
  });

  return (
    <>
      <main className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="rotulo">Estoque disponível</p>

            <h1 className="titulo mt-3 text-[clamp(2rem,5vw,3.2rem)] claro">
              {falhou ? (
                "Estoque indisponível agora"
              ) : (
                <>
                  {motos.length} moto{motos.length === 1 ? "" : "s"}{" "}
                  <span className="ouro">à pronta entrega</span>
                </>
              )}
            </h1>

            <p className="mt-3 max-w-xl text-sm suave">
              {falhou
                ? "Deu problema para carregar a lista. Recarregue em instantes — as motos continuam no pátio."
                : `Fotos reais do nosso pátio em ${LOJA.cidade}. Toque na moto para ver a galeria completa, a ficha e simular a parcela.`}
            </p>
          </div>

          {!falhou && motos.length > 0 && (
            <Link
              href="/encontre-sua-moto"
              className="botao-vidro inline-flex min-h-11 items-center gap-2 rounded-full px-5 py-3 text-sm"
            >
              <Sparkles size={16} className="ouro" />
              Não sabe qual escolher?
            </Link>
          )}
        </header>

        {motos.length === 0 ? (
          /*
           * Vazio e quebrado não são a mesma coisa.
           *
           * "Estamos renovando o estoque" é verdade quando o
           * pátio está vazio e mentira quando o banco caiu -
           * e a segunda custa venda, porque manda embora quem
           * ia comprar hoje.
           */
          <article className="vidro p-10 text-center text-sm suave">
            {falhou
              ? "Não conseguimos carregar o estoque agora. Tente de novo em instantes, ou chame no WhatsApp que a gente manda as fotos na hora."
              : "Estamos renovando o estoque. Fale com a gente no WhatsApp: chega moto nova toda semana."}
          </article>
        ) : (
          <EstoqueInterativo
            motos={motos}
            slugs={slugs}
            capas={fotos.capas}
            totalFotos={totalFotos}
            totalVideos={totalVideos}
            iniciais={{
              busca: texto(parametros.busca),
              preco: texto(parametros.preco),
              tipo: texto(parametros.tipo),
              marca: texto(parametros.marca),
            }}
          />
        )}
      </main>

      <AvisarNovidades
        origem="estoque"
        sugestoes={modelosDoEstoque(motos)}
      />
    </>
  );
}
