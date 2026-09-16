import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { IconeWhatsApp } from "@/components/site/IconeWhatsApp";
import {
  CONVITE_GERAL,
  linkWhatsApp,
  LOJA,
  MAPA,
} from "@/lib/dados/loja";

/*
 * Página de contato.
 *
 * Sem formulário: mensagem enviada por formulário cai numa
 * caixa que ninguém abre no meio do expediente. Aqui os
 * caminhos são os que a loja realmente atende - WhatsApp,
 * telefone e a porta da rua.
 */

export const metadata: Metadata = {
  title: "Contato",
  description: `Fale com a ${LOJA.nome.toUpperCase()}: WhatsApp ${LOJA.whatsappExibicao}, ${LOJA.endereco}, ${LOJA.cidade}/${LOJA.estado}.`,
};

export default function ContatoPage() {
  const canais = [
    {
      Icone: MapPin,
      titulo: "Venha na loja",
      linhas: [
        LOJA.endereco,
        LOJA.bairro,
        `${LOJA.cidade} - ${LOJA.estado}`,
        `CEP ${LOJA.cep}`,
      ],
      acao: { nome: "Abrir no mapa", href: MAPA },
    },
    {
      Icone: Phone,
      titulo: "Telefone e WhatsApp",
      linhas: [
        `WhatsApp ${LOJA.whatsappExibicao}`,
        `Loja ${LOJA.telefone}`,
      ],
      acao: {
        nome: "Chamar no WhatsApp",
        href: linkWhatsApp(CONVITE_GERAL),
      },
    },
    {
      Icone: Mail,
      titulo: "E-mail",
      linhas: [LOJA.email],
      acao: {
        nome: "Escrever",
        href: `mailto:${LOJA.email}`,
      },
    },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <header className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] texto-ouro">
          Contato
        </p>

        <h1 className="mt-3 text-3xl font-black uppercase leading-tight texto-claro sm:text-4xl">
          Fale com a{" "}
          <span className="texto-ouro">gente</span>
        </h1>

        <p className="mx-auto mt-4 max-w-lg text-sm leading-7 texto-suave">
          Dúvida sobre uma moto, avaliação da sua usada ou
          financiamento: chame no WhatsApp que respondemos
          rápido.
        </p>
      </header>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        {canais.map(({ Icone, titulo, linhas, acao }) => (
          <article
            key={titulo}
            className="cartao-3d flex flex-col rounded-2xl p-5"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e0b129]/10 ring-1 ring-[#e0b129]/25">
              <Icone size={20} className="texto-ouro" />
            </span>

            <h2 className="mt-4 text-base font-bold texto-claro">
              {titulo}
            </h2>

            <div className="mt-2 flex-1 space-y-0.5">
              {linhas.map((linha) => (
                <p
                  key={linha}
                  className="break-words text-sm leading-6 texto-suave"
                >
                  {linha}
                </p>
              ))}
            </div>

            <a
              href={acao.href}
              target="_blank"
              rel="noopener noreferrer"
              className="botao-vidro mt-5 flex items-center justify-center rounded-xl px-4 py-3 text-sm font-bold"
            >
              {acao.nome}
            </a>
          </article>
        ))}
      </section>

      <section className="cartao-3d mt-8 rounded-2xl p-6 text-center sm:p-9">
        <h2 className="text-xl font-black texto-claro sm:text-2xl">
          Prefere resolver agora?
        </h2>

        <p className="mx-auto mt-3 max-w-md text-sm leading-6 texto-suave">
          O WhatsApp é onde a gente responde mais rápido, e
          por lá dá para mandar foto da sua moto para a
          avaliação da troca.
        </p>

        <a
          href={linkWhatsApp(CONVITE_GERAL)}
          target="_blank"
          rel="noopener noreferrer"
          className="botao-ouro mt-7 inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-bold"
        >
          <IconeWhatsApp className="h-4 w-4" />
          Falar no WhatsApp
        </a>
      </section>
    </main>
  );
}
