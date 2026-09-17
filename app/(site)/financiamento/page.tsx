import type { Metadata } from "next";
import {
  BadgeCheck,
  ChevronDown,
  FileText,
  Repeat2,
  Wallet,
} from "lucide-react";
import SimuladorFinanciamento from "@/components/site/SimuladorFinanciamento";
import { LOJA } from "@/lib/dados/loja";

/*
 * Página de financiamento.
 *
 * O formulário vem primeiro, antes de qualquer explicação:
 * quem abre esta tela já quer simular, e ler quatro passos
 * antes de achar o campo é o caminho mais curto para desistir.
 * Como funciona fica logo abaixo, recolhido, para quem quiser.
 *
 * A simulação recolhe os dados e monta a mensagem de WhatsApp -
 * não calcula parcela. Taxa e aprovação dependem do banco e do
 * perfil de cada cliente; número na tela que depois não se
 * confirma queima a loja.
 *
 * Quando a pessoa vem de um anúncio, a moto chega pela URL
 * (?moto=...) e o campo já aparece preenchido.
 */

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
      "RG, CPF e comprovante de renda. A análise sai rápido, sem você sair de casa.",
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

      <section className="mt-8">
        <SimuladorFinanciamento moto={moto} />
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
