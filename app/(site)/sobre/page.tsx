import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  Handshake,
  MapPin,
  Wrench,
} from "lucide-react";
import { IconeWhatsApp } from "@/components/site/IconeWhatsApp";
import {
  CONVITE_GERAL,
  ENDERECO_COMPLETO,
  linkWhatsApp,
  LOJA,
  MAPA,
} from "@/lib/dados/loja";

/*
 * Página "Sobre nós".
 *
 * O texto fala do jeito de trabalhar da loja - revisão,
 * documentação, troca, atendimento -, que é o que o Cristian
 * conta para o cliente. Sem número de anos de mercado nem
 * quantidade de clientes: nada aqui é inventado.
 */

export const metadata: Metadata = {
  title: "Sobre nós",
  description: `Conheça a ${LOJA.nome.toUpperCase()}, loja de motos seminovas em ${LOJA.cidade}. Procedência, revisão, documentação resolvida e atendimento de verdade.`,
};

const VALORES = [
  {
    Icone: Wrench,
    titulo: "Moto revisada",
    texto:
      "Antes de entrar no pátio, cada moto passa pelo mecânico. O que precisa de reparo é resolvido antes de ser anunciada.",
  },
  {
    Icone: Award,
    titulo: "Procedência",
    texto:
      "Documentação conferida e transferência resolvida pela loja. Você sai daqui com a moto no seu nome, sem correr atrás.",
  },
  {
    Icone: Handshake,
    titulo: "Conversa honesta",
    texto:
      "Preço na tela, sem taxa escondida. Se a moto não serve para você, a gente diz — e procura outra que sirva.",
  },
  {
    Icone: MapPin,
    titulo: "Loja de porta aberta",
    texto: `Estamos no ${LOJA.bairro}, em ${LOJA.cidade}. Venha ver, ligar, ouvir o motor e andar na moto antes de decidir.`,
  },
];

export default function SobrePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <header className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] texto-ouro">
          {LOJA.nome}
        </p>

        <h1 className="mt-3 text-3xl font-black uppercase leading-tight texto-claro sm:text-4xl">
          Mais que motos,
          <br />
          <span className="texto-ouro">
            realizamos sonhos.
          </span>
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 texto-suave">
          A Blackout Motos nasceu de um gosto simples: moto
          boa, bem cuidada, entregue para quem vai aproveitar.
          Trabalhamos com seminovas selecionadas em{" "}
          {LOJA.cidade} e região — motos que a gente mesmo
          andaria. Cada uma passa pela revisão antes de ser
          anunciada, a documentação sai pela loja e a sua moto
          usada entra na troca com avaliação justa.
        </p>

        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 texto-suave">
          Não vendemos e sumimos. O cliente que compra aqui
          volta para revisar, trocar e indicar. É assim que a
          loja cresce, e é por isso que cuidamos de cada
          negociação do primeiro contato até a entrega da
          chave.
        </p>
      </header>

      <section className="mt-12 grid gap-4 sm:grid-cols-2">
        {VALORES.map(({ Icone, titulo, texto }) => (
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
          Venha nos visitar
        </h2>

        <p className="mt-3 text-sm leading-6 texto-suave">
          {ENDERECO_COMPLETO}
        </p>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <a
            href={linkWhatsApp(CONVITE_GERAL)}
            target="_blank"
            rel="noopener noreferrer"
            className="botao-ouro flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-bold"
          >
            <IconeWhatsApp className="h-4 w-4" />
            Falar no WhatsApp
          </a>

          <a
            href={MAPA}
            target="_blank"
            rel="noopener noreferrer"
            className="botao-vidro flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-bold"
          >
            Como chegar
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
