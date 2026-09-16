import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  FileText,
  Repeat2,
  Wallet,
} from "lucide-react";
import { IconeWhatsApp } from "@/components/site/IconeWhatsApp";
import { linkWhatsApp, LOJA } from "@/lib/dados/loja";

/*
 * Página de financiamento.
 *
 * Sem simulador de parcela: taxa e aprovação dependem do banco
 * e do perfil de cada cliente, e mostrar um número na tela que
 * depois não se confirma queima a loja. O caminho aqui é levar
 * a conversa para o WhatsApp, onde a proposta é real.
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

export default function FinanciamentoPage() {
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

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        {PASSOS.map(({ Icone, titulo, texto }) => (
          <article
            key={titulo}
            className="cartao-3d rounded-2xl p-5"
          >
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
      </section>

      <section className="cartao-3d mt-8 rounded-2xl p-6 text-center sm:p-9">
        <h2 className="text-xl font-black texto-claro sm:text-2xl">
          Quer saber quanto fica a parcela?
        </h2>

        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 texto-suave">
          A taxa e o prazo dependem do banco e do seu perfil,
          então não colocamos número aqui na tela para depois
          não bater. Mande uma mensagem com a moto que você
          quer e a gente traz a condição real.
        </p>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <a
            href={linkWhatsApp(
              "Olá! Quero simular o financiamento de uma moto da Blackout Motos."
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="botao-ouro flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-bold"
          >
            <IconeWhatsApp className="h-4 w-4" />
            Simular no WhatsApp
          </a>

          <Link
            href="/estoque"
            className="botao-vidro flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-bold"
          >
            Ver estoque
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </main>
  );
}
