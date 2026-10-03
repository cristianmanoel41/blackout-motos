import { estoqueDoSite } from "@/lib/dados/estoque-site";
import { modelosDoEstoque } from "@/lib/dados/moto-site";
import Hero from "@/components/v2/Hero";
import FaixaMarcas from "@/components/v2/FaixaMarcas";
import Financiamento from "@/components/v2/Financiamento";
import Diferenciais from "@/components/v2/Diferenciais";
import FaixaFrases from "@/components/v2/FaixaFrases";
import CompramosSuaMoto from "@/components/v2/CompramosSuaMoto";
import AvisarNovidades from "@/components/site/AvisarNovidades";
import Avaliacoes from "@/components/v2/Avaliacoes";
import VisiteALoja from "@/components/v2/VisiteALoja";

/*
 * A capa do site.
 *
 * A vitrine é uma só: o card da capa, com as três últimas
 * motos trocando sozinhas. A fileira de cards com filtros que
 * ficava logo abaixo saiu - repetia o que a página de estoque
 * já faz melhor, com todas as motos e busca de verdade.
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
   * Foto de moto só no estoque: lá ela vem com preço, ano e
   * km, que é o que faz a pessoa clicar. Solta em outra seção,
   * vira enfeite e ainda parece a oferta da vez.
   */

  /*
   * As três motos da capa.
   *
   * Quem manda é a estrela da ficha, no sistema: o campo
   * na_capa já existia e já era gravado por ali, mas a capa
   * ignorava e mostrava sempre as três mais novas. Agora a loja
   * escolhe quem representa a vitrine sem precisar de código.
   *
   * Marcou uma, aparece uma - a marcação MANDA, não sugere.
   * A primeira versão completava com as mais novas, e aí marcar
   * uma moto não tirava as outras da capa: era o contrário do
   * que a loja queria ao marcar.
   *
   * Sem nenhuma marcada, valem as três mais novas - uma capa
   * vazia seria pior que uma capa automática.
   */
  const escolhidas = motos.filter((m) => m.na_capa)

  const naCapa =
    escolhidas.length > 0 ? escolhidas.slice(0, 3) : motos.slice(0, 3)

  return (
    <main>
      <Hero
        motos={naCapa}
        slugs={slugs}
        capas={fotos.capas}
        quantas={motos.length}
      />

      <FaixaMarcas />

      <Financiamento />

      <Diferenciais />

      <FaixaFrases />

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
