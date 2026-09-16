import {
  BadgeCheck,
  CreditCard,
  Repeat,
  Wrench,
} from "lucide-react";
import { linkWhatsApp, LOJA } from "@/lib/dados/loja";

/*
 * A capa do site.
 *
 * Faixa escura com a marca, porque a loja se chama Blackout e
 * a logo é branca sobre preto - num fundo claro ela ficaria
 * flutuando num quadrado preto.
 *
 * Nada aqui usa div com borda e canto arredondado: o tema do
 * painel pinta esses de preto à força, e numa página clara
 * vira um bloco escuro no meio do branco.
 */

const GARANTIAS = [
  {
    Icone: Wrench,
    titulo: "Revisada",
    texto: "Passa pelo mecânico antes de ir para o pátio",
  },
  {
    Icone: BadgeCheck,
    titulo: "Documentação em dia",
    texto: "Transferência resolvida pela loja",
  },
  {
    Icone: Repeat,
    titulo: "Aceitamos troca",
    texto: "Sua moto na entrada, avaliada na hora",
  },
  {
    Icone: CreditCard,
    titulo: "Financiamento",
    texto: "Aprovação com os principais bancos",
  },
];

export function Capa({ motos }: { motos: number }) {
  return (
    <section className="bg-gradient-to-b from-[#0b0b0d] to-[#17171b] text-white">
      <div className="mx-auto max-w-5xl px-4 py-14 text-center sm:py-20">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#e0b129]">
          {LOJA.cidade} · {LOJA.estado}
        </p>

        <h1 className="mt-4 text-3xl font-black leading-tight text-white sm:text-5xl">
          Sua próxima moto está
          <br className="hidden sm:block" /> aqui no pátio
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-white/70 sm:text-base">
          {motos} moto{motos === 1 ? "" : "s"} seminova
          {motos === 1 ? "" : "s"} revisada
          {motos === 1 ? "" : "s"}, com preço na tela e
          documentação resolvida pela loja. Sem enrolação.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#estoque"
            className="rounded-xl bg-[#e0b129] px-7 py-3.5 text-sm font-bold text-[#0b0b0d] transition hover:bg-[#f0c649]"
          >
            Ver o estoque
          </a>

          <a
            href={linkWhatsApp(
              "Olá! Vi o site da Blackout Motos e quero falar sobre uma moto."
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-white/25 px-7 py-3.5 text-sm font-bold text-white transition hover:border-white/60"
          >
            Falar no WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

export function Garantias() {
  return (
    <section className="border-b border-black/10 bg-white">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-black/10 lg:grid-cols-4">
        {GARANTIAS.map(({ Icone, titulo, texto }) => (
          <article
            key={titulo}
            className="bg-white px-4 py-6 text-center"
          >
            <Icone
              size={22}
              className="mx-auto text-[#a97800]"
            />

            <p className="mt-2.5 text-sm font-bold text-[#0b0b0d]">
              {titulo}
            </p>

            <p className="mt-1 text-xs leading-5 text-black/55">
              {texto}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function OndeEstamos() {
  return (
    <section className="bg-white py-12">
      <div className="mx-auto max-w-6xl px-4 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#a97800]">
          Venha conhecer
        </p>

        <h2 className="mt-2 text-2xl font-bold text-[#0b0b0d]">
          Onde estamos
        </h2>

        <p className="mt-3 text-sm leading-6 text-black/60">
          {LOJA.endereco} · {LOJA.bairro}
          <br />
          {LOJA.cidade}/{LOJA.estado} · CEP {LOJA.cep}
        </p>

        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${LOJA.endereco}, ${LOJA.cidade} ${LOJA.estado}`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-block rounded-xl border border-black/15 px-6 py-3 text-sm font-bold text-[#0b0b0d] transition hover:border-black/40"
        >
          Abrir no mapa
        </a>
      </div>
    </section>
  );
}
