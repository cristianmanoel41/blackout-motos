import { Sparkles } from "lucide-react";
import { estoqueDoSite } from "@/lib/dados/estoque-site";
import {
  anoDaMoto,
  modelosDoEstoque,
  nomeDaMoto,
  precoDaMoto,
} from "@/lib/dados/moto-site";
import BannerFachada from "@/components/v2/BannerFachada";
import HeroCinema from "@/components/v2/HeroCinema";
import BuscaRapida from "@/components/v2/BuscaRapida";
import AoEntrar from "@/components/v2/AoEntrar";
import EncontreSuaMoto from "@/components/v2/EncontreSuaMoto";
import FaixaMarcas from "@/components/v2/FaixaMarcas";
import Financiamento from "@/components/v2/Financiamento";
import SimuladorDePagamento from "@/components/site/SimuladorDePagamento";
import Diferenciais from "@/components/v2/Diferenciais";
import CompramosSuaMoto from "@/components/v2/CompramosSuaMoto";
import AvisarNovidades from "@/components/site/AvisarNovidades";
import Avaliacoes from "@/components/v2/Avaliacoes";
import VisiteALoja from "@/components/v2/VisiteALoja";

/*
 * A capa do site.
 *
 * A ordem segue o caminho de quem chega pelo anúncio:
 *
 *   1. a fachada da loja, com o caminho para o estoque;
 *   1b. logo abaixo, a vitrine de cinema, trocando de moto sozinha;
 *   2. a busca e os atalhos de preço, no caminho do polegar;
 *   3. "Encontre sua moto ideal", para quem ainda não escolheu;
 *   4. financiamento e o simulador, o mesmo de /financiamento;
 *   5. diferenciais, troca, avaliações e o mapa.
 *
 * O estoque é o mesmo do sistema: sai da função pública do
 * banco, que devolve só coluna de vitrine e só moto disponível.
 * Vendeu, some daqui sozinha - nada nesta página tem cadastro
 * próprio nem cópia de dado.
 *
 * A grade "Motos em destaque" e o carrossel de "Últimas
 * entradas" saíram em 27/10/2026, a pedido da loja: as motos da
 * capa ficam só na vitrine de cinema; o resto, em /estoque.
 * Em 27/10/2026 a foto da fachada entrou no topo, e a vitrine
 * de cinema desceu para logo abaixo dela. O título principal
 * (h1) é o da fachada; o da vitrine é h2.
 *
 * A vitrine de cinema mostra as motos marcadas com estrela na
 * ficha; sem marcação, as quatro últimas que entraram. A
 * marcação MANDA, não sugere: marcou uma, aparece uma.
 *
 * Cabeçalho, rodapé, contador de acessos e aviso de cookies
 * vêm da moldura, em layout.tsx - esta página é só o miolo.
 */

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { motos, fotos, slugs } = await estoqueDoSite();

  const marcadas = motos.filter((m) => m.na_capa);
  const naCapa = marcadas.length > 0 ? marcadas.slice(0, 4) : motos.slice(0, 4);

  /* A lista do simulador, como em /financiamento. */
  const doEstoque = motos.map((item) => ({
    nome: `${nomeDaMoto(item)} ${anoDaMoto(item)}`,
    preco: precoDaMoto(item),
    capa: fotos.capas[item.id] || "",
  }));

  const totalFotos: Record<string, number> = {};
  const totalVideos: Record<string, number> = {};

  motos.forEach((moto) => {
    totalFotos[moto.id] = (fotos.galerias[moto.id] || []).length;
    totalVideos[moto.id] = (fotos.videos[moto.id] || []).length;
  });

  return (
    <main>
      <BannerFachada quantas={motos.length} />

      <HeroCinema
        motos={naCapa}
        slugs={slugs}
        capas={fotos.capas}
        quantas={motos.length}
      />

      {motos.length > 0 && <BuscaRapida quantas={motos.length} />}

      <FaixaMarcas />

      {motos.length > 0 && (
        <section className="grao relative border-y border-white/[.07] bg-[#0c0c10]">
          <div className="relative mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:py-20">
            <AoEntrar className="mb-8 max-w-2xl">
              <p className="rotulo flex items-center gap-2">
                <Sparkles size={14} /> Ferramenta
              </p>
              <h2 className="titulo mt-3 text-[clamp(1.9rem,4.5vw,2.8rem)] claro">
                Encontre sua <span className="ouro">moto ideal</span>
              </h2>
              <p className="mt-2 text-sm suave sm:text-base">
                Quatro toques: quanto quer investir, o tipo, o uso e se
                vai financiar. A resposta sai do nosso estoque de hoje.
              </p>
            </AoEntrar>

            <EncontreSuaMoto
              motos={motos}
              slugs={slugs}
              capas={fotos.capas}
              totalFotos={totalFotos}
              totalVideos={totalVideos}
              quantos={3}
              previa={false}
            />
          </div>
        </section>
      )}

      <Financiamento />

      <section
        id="simulador"
        className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-16 pt-8 sm:px-6"
      >
        <SimuladorDePagamento estoque={doEstoque} />
      </section>

      <Diferenciais />

      <CompramosSuaMoto />

      <Avaliacoes />

      {/*
        * O único lugar da capa onde o visitante deixa contato.
        * Sem ele, quem não quer falar agora vai embora sem
        * deixar rastro - e a loja perde o aviso de moto nova.
        */}
      <AvisarNovidades
        origem="home"
        sugestoes={modelosDoEstoque(motos)}
      />

      <VisiteALoja />
    </main>
  );
}
