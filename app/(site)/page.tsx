import { estoqueDoSite } from "@/lib/dados/estoque-site";
import { modelosDoEstoque } from "@/lib/dados/moto-site";
import Hero from "@/components/v2/Hero";
import FaixaMarcas from "@/components/v2/FaixaMarcas";
import Estoque from "@/components/v2/Estoque";
import Financiamento from "@/components/v2/Financiamento";
import Diferenciais from "@/components/v2/Diferenciais";
import FaixaFrases from "@/components/v2/FaixaFrases";
import UltimasEntradas from "@/components/v2/UltimasEntradas";
import CompramosSuaMoto from "@/components/v2/CompramosSuaMoto";
import AvisarNovidades from "@/components/site/AvisarNovidades";
import Avaliacoes from "@/components/v2/Avaliacoes";
import VisiteALoja from "@/components/v2/VisiteALoja";

/*
 * A capa do site.
 *
 * O estoque é o mesmo do sistema: sai da função pública do
 * banco, que devolve só coluna de vitrine e só moto
 * disponível. Vendeu, some daqui sozinha - nada nesta página
 * tem cadastro próprio nem cópia de dado.
 *
 * A capa mostra a moto marcada na ficha; sem marcação, a
 * última que entrou. Assim a primeira foto do site nunca é
 * sorteada nem fica vazia por esquecimento.
 *
 * Cabeçalho, rodapé, contador de acessos e aviso de cookies
 * vêm da moldura, em layout.tsx - esta página é só o miolo.
 */

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { motos, fotos, slugs } = await estoqueDoSite();

  /*
   * A moto que ilustra o financiamento é a marcada na ficha;
   * sem marcação, a última que entrou. É a única foto de moto
   * fora do estoque, e ela não leva nome nem preço - está ali
   * como imagem, não como oferta.
   */
  const escolhidas = motos.filter((moto) => moto.na_capa);

  const doFinanciamento = escolhidas[0] || motos[0];

  return (
    <main>
      <Hero quantas={motos.length} />

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

      {/*
        * O único lugar da capa onde o visitante deixa contato.
        * Sem ele, quem não quer falar agora vai embora sem
        * deixar rastro - e a loja perde o aviso de moto nova.
        */}
      <AvisarNovidades
        origem="home"
        sugestoes={modelosDoEstoque(motos)}
      />

      <Avaliacoes />

      <VisiteALoja />
    </main>
  );
}
