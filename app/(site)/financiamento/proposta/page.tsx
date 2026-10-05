import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import SimuladorFinanciamento from "@/components/site/SimuladorFinanciamento";
import { estoqueDoSite } from "@/lib/dados/estoque-site";
import {
  anoDaMoto,
  nomeDaMoto,
  precoDaMoto,
} from "@/lib/dados/moto-site";
import { LOJA } from "@/lib/dados/loja";

/*
 * A proposta, em tela própria.
 *
 * Ela morava junto com o simulador, e as duas coisas pedem
 * disposições diferentes: simular é curiosidade, e a pessoa faz
 * de pijama; mandar CPF e data de nascimento é decisão. Na mesma
 * tela, o formulário de dados pessoais aparecia para quem só
 * queria ver uma parcela - e formulário pedindo CPF à queima
 * roupa faz a pessoa fechar a aba.
 *
 * Aqui quem chega já decidiu: veio do botão depois de ver o
 * número, ou veio direto porque quer condição de banco. Em
 * qualquer dos casos sabe por que está dando o CPF.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Proposta de financiamento",
  description: `Mande seus dados e a ${LOJA.nome.toUpperCase()} consulta as condições com os principais bancos. Sem compromisso.`,
};

export default async function PropostaPage({
  searchParams,
}: {
  searchParams: Promise<{ moto?: string }>;
}) {
  const { moto } = await searchParams;

  const { motos, fotos } = await estoqueDoSite();

  const doEstoque = motos.map((item) => ({
    nome: `${nomeDaMoto(item)} ${anoDaMoto(item)}`,
    preco: precoDaMoto(item),
    capa: fotos.capas[item.id] || "",
  }));

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      {/*
        * A volta fica no topo e é um link de verdade.
        *
        * Quem chegou aqui pelo simulador pode querer mexer no
        * número de novo antes de mandar os dados, e o botão de
        * voltar do celular nem sempre está à mão de quem está
        * com uma das mãos no guidão.
        */}
      <Link
        href={
          moto
            ? `/financiamento?moto=${encodeURIComponent(moto)}`
            : "/financiamento"
        }
        className="inline-flex items-center gap-1 text-xs font-semibold texto-suave transition hover:text-white"
      >
        <ChevronLeft size={15} />
        Voltar para a simulação
      </Link>

      <header className="mt-6 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] texto-ouro">
          Proposta
        </p>

        <h1 className="mt-3 text-3xl font-black uppercase leading-tight texto-claro sm:text-4xl">
          Mande seus dados
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 texto-suave">
          A gente consulta as condições com os principais bancos
          e volta com a resposta. Sem compromisso — você decide
          depois de ver os números.
        </p>
      </header>

      <section className="mt-8">
        <SimuladorFinanciamento
          moto={moto}
          estoque={doEstoque}
        />
      </section>

    </main>
  );
}
