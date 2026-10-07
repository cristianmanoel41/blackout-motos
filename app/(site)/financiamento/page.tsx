import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  FileText,
  Repeat2,
  Wallet,
} from "lucide-react";
import SimuladorDePagamento from "@/components/site/SimuladorDePagamento";
import { estoqueDoSite } from "@/lib/dados/estoque-site";
import {
  anoDaMoto,
  nomeDaMoto,
  precoDaMoto,
} from "@/lib/dados/moto-site";
import { LOJA } from "@/lib/dados/loja";

/*
 * Página de financiamento.
 *
 * O simulador vem primeiro, antes de qualquer explicação:
 * quem abre esta tela já quer saber se cabe no mês, e ler
 * quatro passos antes de achar o campo é o caminho mais curto
 * para desistir. Como funciona fica logo abaixo, recolhido.
 *
 * A conta usa a taxa de base da loja, que vive numa constante
 * só, e a tela diz que é ilustrativa: taxa e aprovação dependem
 * do banco e do perfil de cada cliente, e número que depois não
 * se confirma queima a loja.
 *
 * Quem quer condição de verdade vai para /financiamento/proposta,
 * que é onde ficam os dados pessoais - em tela separada, porque
 * pedir CPF para quem só queria ver uma parcela espanta.
 *
 * Quando a pessoa vem de um anúncio, a moto chega pela URL
 * (?moto=...) e o campo já aparece preenchido.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Financiamento de motos",
  description: `Financie sua moto na ${LOJA.nome.toUpperCase()} em ${LOJA.cidade}. Aprovação com os principais bancos, entrada facilitada e sua moto usada na troca.`,
};

const PASSOS = [
  {
    Icone: FileText,
    titulo: "1. Escolha a moto",
    texto:
      "Veja o estoque e diga qual chamou sua atenção. A gente separa ela para você.",
  },
  {
    Icone: BadgeCheck,
    titulo: "2. Mande seus dados",
    texto:
      "RG, CPF e o valor da sua renda. A análise sai rápido, sem você sair de casa.",
  },
  {
    Icone: Wallet,
    titulo: "3. Receba as condições",
    texto:
      "Consultamos os principais bancos e trazemos a melhor proposta para o seu caso.",
  },
  {
    Icone: Repeat2,
    titulo: "4. Sua moto na troca",
    texto:
      "Tem moto usada? Ela entra como entrada e diminui o valor financiado.",
  },
];

export default async function FinanciamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ moto?: string }>;
}) {
  const { moto } = await searchParams;

  /*
   * A lista sai do estoque de verdade. Escolher da lista
   * evita o que mais atrapalha na proposta: nome de moto
   * escrito pela metade ou modelo que a loja nao tem.
   */
  const { motos, fotos } = await estoqueDoSite();

  const doEstoque = motos.map((item) => ({
    nome: `${nomeDaMoto(item)} ${anoDaMoto(item)}`,
    preco: precoDaMoto(item),
    capa: fotos.capas[item.id] || "",
  }));

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <header className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] texto-ouro">
          Financiamento
        </p>

        <h1 className="mt-3 text-3xl font-black uppercase leading-tight texto-claro sm:text-4xl">
          Saia de moto <span className="texto-ouro">nova</span>
          <br />
          sem complicação
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 texto-suave">
          Trabalhamos com os principais bancos do mercado.
          Cuidamos da análise, da documentação e da
          transferência — você só escolhe a moto.
        </p>
      </header>

      {/*
        * A conta vem antes da proposta.
        *
        * Quem abre esta página quer saber se cabe no mês. O
        * formulário de baixo responde isso também, mas cobra
        * nome, CPF e data de nascimento antes - e quem está só
        * olhando fecha a aba em vez de digitar CPF. A
        * calculadora responde na hora e de graça; quem gostar
        * do número desce e manda a proposta.
        */}
      {/*
        * Um simulador só, com os dois caminhos dentro.
        *
        * Eram dois blocos empilhados, cada um pedindo moto e
        * valor de novo - a página parecia ter se repetido. A
        * primeira pergunta agora é banco ou cartão, e só depois
        * dela aparecem os campos daquele caminho.
        */}
      <section className="mt-8">
        <SimuladorDePagamento
          estoque={doEstoque}
          motoInicial={moto}
        />
      </section>

      {/*
        * O convite para a proposta, que agora mora em outra tela.
        *
        * Simular e curiosidade; mandar CPF e decisao. Juntas na
        * mesma tela, a segunda atrapalhava a primeira - quem so
        * queria ver uma parcela encontrava um formulario pedindo
        * documento e fechava a aba.
        */}
      <section className="mt-8">
        <Link
          href={
            moto
              ? `/financiamento/proposta?moto=${encodeURIComponent(moto)}`
              : "/financiamento/proposta"
          }
          className="cartao-3d flex items-center gap-4 rounded-2xl p-5 transition sm:p-6"
        >
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-black texto-claro sm:text-lg">
              Quer a condição real do banco?
            </h2>

            <p className="mt-1 text-sm leading-6 texto-suave">
              Mande seus dados e a gente consulta a taxa e a
              entrada com os principais bancos. Leva um minuto.
            </p>
          </div>

          <ChevronRight
            size={22}
            className="shrink-0 texto-ouro"
            aria-hidden="true"
          />
        </Link>
      </section>

      {/*
        * <details> abre e fecha sem script nenhum: a página
        * continua leve e funciona mesmo se o JavaScript
        * demorar a carregar no celular.
        */}
      <details className="cartao-3d group mt-6 rounded-2xl">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden">
          <span className="text-base font-bold texto-claro">
            Como funciona o financiamento
          </span>

          <ChevronDown
            size={20}
            className="shrink-0 texto-ouro transition group-open:rotate-180"
          />
        </summary>

        <div className="grid gap-4 border-t border-white/[.07] p-5 sm:grid-cols-2">
          {PASSOS.map(({ Icone, titulo, texto }) => (
            <article key={titulo}>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e0b129]/10 ring-1 ring-[#e0b129]/25">
                <Icone size={20} className="texto-ouro" />
              </span>

              <h2 className="mt-4 text-base font-bold texto-claro">
                {titulo}
              </h2>

              <p className="mt-1.5 text-sm leading-6 texto-suave">
                {texto}
              </p>
            </article>
          ))}
        </div>
      </details>
    </main>
  );
}
