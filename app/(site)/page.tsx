import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { estoqueDoSite } from "@/lib/dados/estoque-site";
import { modelosDoEstoque } from "@/lib/dados/moto-site";
import HeroCinema from "@/components/v2/HeroCinema";
import BuscaRapida from "@/components/v2/BuscaRapida";
import CardMoto from "@/components/v2/CardMoto";
import Carrossel from "@/components/v2/Carrossel";
import AoEntrar from "@/components/v2/AoEntrar";
import EncontreSuaMoto from "@/components/v2/EncontreSuaMoto";
import FaixaMarcas from "@/components/v2/FaixaMarcas";
import Financiamento from "@/components/v2/Financiamento";
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
 *   1. a vitrine de cinema - uma moto de verdade, grande;
 *   2. a busca e os atalhos de preço, no caminho do polegar;
 *   3. as últimas entradas, andando sozinhas;
 *   4. a seleção de motos em grade, com preço, ano e km;
 *   5. "Encontre sua moto ideal", para quem ainda não escolheu;
 *   6. financiamento, diferenciais, troca, avaliações e o mapa.
 *
 * O estoque é o mesmo do sistema: sai da função pública do
 * banco, que devolve só coluna de vitrine e só moto disponível.
 * Vendeu, some daqui sozinha - nada nesta página tem cadastro
 * próprio nem cópia de dado.
 *
 * A vitrine de cinema mostra as motos marcadas com estrela na
 * ficha; sem marcação, as quatro últimas que entraram. A
 * marcação MANDA, não sugere: marcou uma, aparece uma.
 *
 * Cabeçalho, rodapé, contador de acessos e aviso de cookies
 * vêm da moldura, em layout.tsx - esta página é só o miolo.
 */

export const dynamic = "force-dynamic";

const NA_GRADE = 8;

function Titulo({
  rotulo,
  antes,
  ouro,
  texto,
  link,
}: {
  rotulo: string;
  antes: string;
  ouro: string;
  texto: string;
  link?: { href: string; nome: string };
}) {
  return (
    <AoEntrar className="flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="rotulo">{rotulo}</p>
        <h2 className="titulo mt-3 text-[clamp(1.9rem,4.5vw,2.8rem)] claro">
          {antes} <span className="ouro">{ouro}</span>
        </h2>
        <p className="mt-2 max-w-xl text-sm suave sm:text-base">{texto}</p>
      </div>

      {link && (
        <Link
          href={link.href}
          className="botao-vidro inline-flex min-h-11 items-center gap-2 rounded-full px-6 py-3 text-sm"
        >
          {link.nome}
          <ArrowUpRight size={16} />
        </Link>
      )}
    </AoEntrar>
  );
}

export default async function HomePage() {
  const { motos, fotos, slugs } = await estoqueDoSite();

  const marcadas = motos.filter((m) => m.na_capa);
  const naCapa = marcadas.length > 0 ? marcadas.slice(0, 4) : motos.slice(0, 4);

  /* A lista já vem da entrada mais nova para a mais antiga. */
  const ultimas = motos.slice(0, 8);

  /*
   * A seleção da grade: primeiro as marcadas com estrela, depois
   * as que não estão na fileira de últimas entradas, e só então
   * o resto - para as duas seções não mostrarem as mesmas motos
   * quando o pátio tem moto suficiente para isso.
   */
  const jaNaFileira = new Set(ultimas.map((m) => m.id));
  const selecao = [
    ...marcadas,
    ...motos.filter((m) => !m.na_capa && !jaNaFileira.has(m.id)),
    ...motos.filter((m) => !m.na_capa && jaNaFileira.has(m.id)),
  ].slice(0, NA_GRADE);

  const totalFotos: Record<string, number> = {};
  const totalVideos: Record<string, number> = {};

  motos.forEach((moto) => {
    totalFotos[moto.id] = (fotos.galerias[moto.id] || []).length;
    totalVideos[moto.id] = (fotos.videos[moto.id] || []).length;
  });

  return (
    <main>
      <HeroCinema
        motos={naCapa}
        slugs={slugs}
        capas={fotos.capas}
        quantas={motos.length}
      />

      {motos.length > 0 && <BuscaRapida quantas={motos.length} />}

      {ultimas.length > 0 && (
        <section className="relative mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:py-20">
          <Titulo
            rotulo="Acabaram de chegar"
            antes="Últimas"
            ouro="entradas"
            texto="As motos mais recentes do nosso pátio, com fotos reais e preço na vitrine."
            link={{ href: "/estoque", nome: `Ver as ${motos.length} motos` }}
          />

          <div className="mt-8">
            <Carrossel rotulo="Últimas entradas">
              {ultimas.map((moto, posicao) => (
                <div
                  key={moto.id}
                  className="w-[80%] sm:w-[45%] lg:w-[31%] xl:w-[23.5%]"
                >
                  <CardMoto
                    moto={moto}
                    slug={slugs[moto.id]}
                    foto={fotos.capas[moto.id]}
                    fotos={totalFotos[moto.id]}
                    videos={totalVideos[moto.id]}
                    prioridade={posicao < 2}
                  />
                </div>
              ))}
            </Carrossel>
          </div>
        </section>
      )}

      <FaixaMarcas />

      {selecao.length > 0 && (
        <section className="relative mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:py-20">
          <Titulo
            rotulo="Seleção Blackout"
            antes="Motos em"
            ouro="destaque"
            texto="Revisadas, com procedência e prontas para sair. Toque para ver a galeria completa."
          />

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {selecao.map((moto) => (
              <AoEntrar key={moto.id} className="h-full">
                <CardMoto
                  moto={moto}
                  slug={slugs[moto.id]}
                  foto={fotos.capas[moto.id]}
                  fotos={totalFotos[moto.id]}
                  videos={totalVideos[moto.id]}
                />
              </AoEntrar>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <Link
              href="/estoque"
              className="botao-ouro inline-flex min-h-12 items-center gap-2 rounded-full px-8 py-3.5 text-sm"
            >
              Ver estoque completo
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </section>
      )}

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
            />
          </div>
        </section>
      )}

      <Financiamento />

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
