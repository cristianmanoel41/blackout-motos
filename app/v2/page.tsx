import { estoqueDoSite } from "@/lib/dados/estoque-site";
import { anoDaMoto, nomeDaMoto } from "@/lib/dados/moto-site";
import Cabecalho from "@/components/v2/Cabecalho";
import Hero from "@/components/v2/Hero";
import FaixaMarcas from "@/components/v2/FaixaMarcas";
import FaixaFrases from "@/components/v2/FaixaFrases";
import Estoque from "@/components/v2/Estoque";
import Financiamento from "@/components/v2/Financiamento";
import Diferenciais from "@/components/v2/Diferenciais";
import UltimasEntradas from "@/components/v2/UltimasEntradas";
import CompramosSuaMoto from "@/components/v2/CompramosSuaMoto";
import Avaliacoes from "@/components/v2/Avaliacoes";
import VisiteALoja from "@/components/v2/VisiteALoja";
import Rodape from "@/components/v2/Rodape";

/*
 * A versão 2 do site, em provas.
 *
 * O estoque é o mesmo do sistema: sai da função pública do
 * banco, que devolve só coluna de vitrine e só moto
 * disponível. Vendeu, some daqui sozinha - nada aqui tem
 * cadastro próprio nem cópia de dado.
 *
 * A capa mostra a moto marcada na ficha; sem marcação, a
 * última que entrou. Assim a primeira foto do site nunca é
 * sorteada nem fica vazia por esquecimento.
 */

export const dynamic = "force-dynamic";

export default async function V2Page() {
  const { motos, fotos, slugs } = await estoqueDoSite();

  const escolhidas = motos.filter((moto) => moto.na_capa);

  const daCapa = escolhidas[0] || motos[0];

  /* A segunda moto ilustra o financiamento - nunca a da capa. */
  const doFinanciamento =
    motos.find((moto) => moto.id !== daCapa?.id) || daCapa;

  const paraBusca = motos.map((moto) => ({
    nome: nomeDaMoto(moto),
    slug: slugs[moto.id],
    ano: anoDaMoto(moto),
  }));

  return (
    <>
      <Cabecalho motos={paraBusca} />

      <main>
        <Hero
          moto={daCapa}
          foto={daCapa ? fotos.capas[daCapa.id] : undefined}
          slug={daCapa ? slugs[daCapa.id] : undefined}
          quantas={motos.length}
        />

        <FaixaMarcas />

        <Estoque
          motos={motos}
          slugs={slugs}
          capas={fotos.capas}
        />

        <Financiamento
          foto={
            doFinanciamento
              ? fotos.capas[doFinanciamento.id]
              : undefined
          }
        />

        <Diferenciais />

        <FaixaFrases />

        <UltimasEntradas
          motos={motos.slice(0, 8)}
          slugs={slugs}
          capas={fotos.capas}
        />

        <CompramosSuaMoto />

        <Avaliacoes />

        <VisiteALoja />
      </main>

      <Rodape />
    </>
  );
}
