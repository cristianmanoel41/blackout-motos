import type { Metadata } from "next";
import {
  BadgeCheck,
  Building2,
  FileText,
  Repeat2,
  Wallet,
  Calculator,
} from "lucide-react";
import SimuladorDePagamento from "@/components/site/SimuladorDePagamento";
import VideoComoSimular from "@/components/site/VideoComoSimular";
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
 * para desistir. Como funciona fica logo abaixo.
 *
 * A conta usa a taxa de base da loja, que vive numa constante
 * só, e a tela diz que é ilustrativa: taxa e aprovação dependem
 * do banco e do perfil de cada cliente, e número que depois não
 * se confirma queima a loja.
 *
 * Quem quer a condição de verdade manda a própria simulação no
 * WhatsApp, com a mensagem pedindo as condições reais do banco.
 * Por isso a página não convida mais para o formulário de
 * dados: seriam duas portas para o mesmo pedido.
 *
 * Quando a pessoa vem de um anúncio, a moto chega pela URL
 * (?moto=...) e o campo já aparece preenchido.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Financiamento de motos",
  description: `Financie sua moto na ${LOJA.nome.toUpperCase()} em ${LOJA.cidade}. Aprovação com os principais bancos, entrada facilitada e sua moto usada na troca.`,
};

/* As três coisas que a pessoa precisa saber antes de simular,
   tiradas do que a loja já promete no resto do site. */
const GARANTIAS = [
  { Icone: Building2, texto: "Principais bancos do mercado" },
  { Icone: Repeat2, texto: "Sua moto usada na troca" },
  { Icone: Calculator, texto: "Simulação sem cadastro" },
];

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
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      {/*
        * O topo à esquerda, como página de banco: título,
        * a frase do que a loja faz e as três garantias numa
        * linha. Centralizado e em caixa alta parecia cartaz.
        */}
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] texto-ouro">
            Financiamento e cartão
          </p>

          <h1 className="mt-3 text-3xl font-black leading-tight texto-claro sm:text-[2.6rem]">
            Saia de moto <span className="texto-ouro">nova</span>{" "}
            sem complicação
          </h1>

          <p className="mt-3 text-sm leading-7 texto-suave sm:text-[15px]">
            Trabalhamos com os principais bancos do mercado.
            Cuidamos da análise, da documentação e da
            transferência — você só escolhe a moto.
          </p>

          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-semibold texto-claro">
            {GARANTIAS.map(({ Icone, texto }) => (
              <li key={texto} className="flex items-center gap-2">
                <Icone size={16} className="shrink-0 texto-ouro" aria-hidden="true" />
                {texto}
              </li>
            ))}
          </ul>
        </div>

        <div className="shrink-0">
          <VideoComoSimular />
        </div>
      </header>

      <section className="mt-8 sm:mt-10">
        <SimuladorDePagamento
          estoque={doEstoque}
          motoInicial={moto}
        />
      </section>

      {/*
        * Como funciona, aberto. Escondido numa sanfona ninguém
        * abria - e é justamente o que tira o medo de quem nunca
        * financiou: são quatro passos e a loja faz a parte chata.
        */}
      <section className="mt-14 sm:mt-16">
        <h2 className="text-xl font-black texto-claro sm:text-2xl">
          Como funciona o <span className="texto-ouro">financiamento</span>
        </h2>

        <ol className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PASSOS.map(({ Icone, titulo, texto }) => (
            <li key={titulo} className="border-t border-white/[.08] pt-5">
              <span className="sim-icone h-10 w-10">
                <Icone size={18} aria-hidden="true" />
              </span>

              <h3 className="mt-4 text-[15px] font-bold texto-claro">
                {titulo}
              </h3>

              <p className="mt-1.5 text-sm leading-6 texto-suave">
                {texto}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
