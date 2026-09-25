import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ClipboardCheck,
  FileCheck2,
  Handshake,
  KeyRound,
  MapPin,
  Repeat2,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { IconeWhatsApp } from "@/components/site/IconeWhatsApp";
import {
  IconeGoogleMaps,
  IconeWaze,
} from "@/components/site/IconeMapa";
import {
  CONVITE_GERAL,
  ENDERECO_COMPLETO,
  HORARIOS,
  linkWhatsApp,
  LOJA,
  MAPA,
  WAZE,
} from "@/lib/dados/loja";

/*
 * Página "Sobre nós".
 *
 * Fala do jeito de trabalhar da loja - perícia cautelar,
 * revisão, documentação, troca, garantia -, que é o que o
 * Cristian conta ao cliente no balcão e o que a loja já
 * anuncia na OLX.
 *
 * Sem número de anos de mercado, quantidade de clientes ou
 * prêmio: nada aqui é inventado. O que dá confiança é o
 * processo descrito com clareza, não superlativo.
 */

export const metadata: Metadata = {
  title: "Sobre nós",
  description: `Conheça a ${LOJA.nome.toUpperCase()}, loja de motos seminovas em ${LOJA.cidade}. Perícia cautelar aprovada, revisão, garantia de 3 meses e documentação resolvida pela loja.`,
};

/* O caminho que toda moto percorre antes de ser anunciada. */
const ETAPAS = [
  {
    Icone: ClipboardCheck,
    titulo: "Perícia cautelar",
    texto:
      "Toda moto passa por perícia cautelar e só entra no pátio com o laudo aprovado. Chassi, numeração e histórico conferidos antes de qualquer conversa de venda.",
  },
  {
    Icone: Wrench,
    titulo: "Revisão mecânica",
    texto:
      "Depois do laudo, a moto vai para o mecânico. O que precisa de reparo é resolvido antes de ser anunciada — e não depois que você reclama.",
  },
  {
    Icone: FileCheck2,
    titulo: "Documentação conferida",
    texto:
      "Conferimos débitos, multas e restrições. A transferência sai pela loja, e você recebe a moto com a documentação em ordem.",
  },
  {
    Icone: KeyRound,
    titulo: "Pronta para rodar",
    texto:
      "Só então ela é fotografada e anunciada. O que você vê no site é o que está no pátio, com o preço na tela.",
  },
];

const COMPROMISSOS = [
  {
    Icone: ShieldCheck,
    titulo: "Garantia de 3 meses",
    texto: "Garantia total, dada pela loja.",
  },
  {
    Icone: BadgeCheck,
    titulo: "Laudo aprovado",
    texto: "Perícia cautelar 100% aprovada.",
  },
  {
    Icone: Repeat2,
    titulo: "Sua moto na troca",
    texto: "Avaliação justa, feita na hora.",
  },
  {
    Icone: Handshake,
    titulo: "Preço na tela",
    texto: "Sem taxa que aparece no fim.",
  },
];

export default function SobrePage() {
  return (
    <main>
      {/* ---------- ABERTURA ---------- */}

      <section className="border-b border-white/[.07] bg-[#0d0d10]">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:py-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] texto-ouro">
            {LOJA.cidade} · {LOJA.estado}
          </p>

          <h1 className="mt-4 text-3xl font-black uppercase leading-tight texto-claro sm:text-5xl">
            Mais que motos,
            <br />
            <span className="texto-ouro">
              realizamos sonhos.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 texto-suave sm:text-base">
            A {LOJA.nome} trabalha com motos seminovas
            selecionadas em {LOJA.cidade} e região. Cada uma
            passa por perícia cautelar e revisão mecânica
            antes de ser anunciada, e sai daqui com garantia e
            documentação resolvida pela loja.
          </p>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 texto-suave">
            Trabalhamos assim por um motivo simples: moto é
            um compromisso grande para a maioria das pessoas.
            Quem compra aqui precisa dormir tranquilo com a
            escolha — e voltar quando for trocar.
          </p>
        </div>
      </section>

      {/* ---------- COMPROMISSOS ---------- */}

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {COMPROMISSOS.map(({ Icone, titulo, texto }) => (
            <article
              key={titulo}
              className="cartao-3d rounded-2xl px-5 py-6 text-center"
            >
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#e0b129]/10 ring-1 ring-[#e0b129]/25">
                <Icone size={22} className="texto-ouro" />
              </span>

              <h2 className="mt-4 text-sm font-bold texto-claro">
                {titulo}
              </h2>

              <p className="mt-1 text-xs leading-5 texto-suave">
                {texto}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ---------- COMO A MOTO CHEGA ATÉ VOCÊ ---------- */}

      <section className="border-y border-white/[.07] bg-[#0d0d10]">
        <div className="mx-auto max-w-6xl px-4 py-14 lg:py-16">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] texto-ouro">
              Nosso processo
            </p>

            <h2 className="mt-3 text-2xl font-black uppercase leading-tight texto-claro sm:text-3xl">
              Como a moto chega até você
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 texto-suave">
              Nenhuma moto é anunciada antes de cumprir estas
              quatro etapas.
            </p>
          </div>

          <ol className="mt-10 grid gap-4 sm:grid-cols-2">
            {ETAPAS.map(
              ({ Icone, titulo, texto }, posicao) => (
                <li
                  key={titulo}
                  className="cartao-3d rounded-2xl p-6"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e0b129]/10 ring-1 ring-[#e0b129]/25">
                      <Icone
                        size={20}
                        className="texto-ouro"
                      />
                    </span>

                    <span>
                      <span className="block text-[11px] font-bold uppercase tracking-[0.2em] texto-ouro">
                        Etapa {posicao + 1}
                      </span>

                      <h3 className="text-base font-bold leading-tight texto-claro">
                        {titulo}
                      </h3>
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-6 texto-suave">
                    {texto}
                  </p>
                </li>
              )
            )}
          </ol>
        </div>
      </section>

      {/* ---------- A LOJA ---------- */}

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] texto-ouro">
              Atendimento
            </p>

            <h2 className="mt-3 text-2xl font-black uppercase leading-tight texto-claro sm:text-3xl">
              Uma relação que continua
              depois da entrega
            </h2>

            <p className="mt-5 text-sm leading-7 texto-suave">
              O atendimento não termina na entrega da chave.
              Seguimos à disposição para a revisão, para a
              documentação e para a próxima troca — e boa
              parte dos nossos clientes chega por indicação de
              quem já comprou aqui.
            </p>

            <p className="mt-4 text-sm leading-7 texto-suave">
              Orientamos com transparência. Se a moto não
              atende ao que você precisa, dizemos antes de
              fechar negócio; se ainda não temos o modelo
              certo no pátio, avisamos assim que ele chegar.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={linkWhatsApp(CONVITE_GERAL)}
                target="_blank"
                rel="noopener noreferrer"
                className="botao-ouro flex items-center gap-2 rounded-full px-7 py-4 text-sm font-bold"
              >
                <IconeWhatsApp className="h-4 w-4" />
                Falar com a loja
              </a>

              <Link
                href="/estoque"
                className="botao-vidro flex items-center gap-2 rounded-full px-7 py-4 text-sm font-bold"
              >
                Ver estoque
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>

          <article className="cartao-3d rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e0b129]/10 ring-1 ring-[#e0b129]/25">
                <MapPin size={20} className="texto-ouro" />
              </span>

              <h3 className="text-base font-bold texto-claro">
                Onde estamos
              </h3>
            </div>

            <p className="mt-4 text-sm leading-7 texto-suave">
              {ENDERECO_COMPLETO}
            </p>

            <div className="mt-6 border-t border-white/[.07] pt-5">
              <h3 className="text-sm font-bold texto-claro">
                Horário de atendimento
              </h3>

              <ul className="mt-3 space-y-1.5">
                {HORARIOS.map((item) => (
                  <li
                    key={item.texto}
                    className="flex justify-between gap-4 text-sm texto-suave"
                  >
                    <span>{item.texto}</span>
                    <span className="font-semibold texto-claro">
                      {item.horas}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <a
                href={MAPA}
                target="_blank"
                rel="noopener noreferrer"
                className="botao-vidro flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold"
              >
                <IconeGoogleMaps className="h-4 w-4" />
                Google Maps
              </a>

              <a
                href={WAZE}
                target="_blank"
                rel="noopener noreferrer"
                className="botao-vidro flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold"
              >
                <IconeWaze className="h-4 w-4" />
                Waze
              </a>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
