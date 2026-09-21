import type { Metadata } from "next";
import { Clock, MapPin, Phone } from "lucide-react";
import { IconeWhatsApp } from "@/components/site/IconeWhatsApp";
import { IconeGoogleMaps, IconeWaze } from "@/components/site/IconeMapa";
import Avaliacoes from "@/components/site/Avaliacoes";
import {
  CONVITE_GERAL,
  HORARIOS,
  linkWhatsApp,
  LOJA,
  MAPA,
  WAZE,
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
      acoes: [
        {
          nome: "Google Maps",
          href: MAPA,
          Icone: IconeGoogleMaps,
        },
        { nome: "Waze", href: WAZE, Icone: IconeWaze },
      ],
    },
    {
      Icone: Phone,
      titulo: "Telefone e WhatsApp",
      linhas: [`WhatsApp ${LOJA.whatsappExibicao}`, `Loja ${LOJA.telefone}`],
      acoes: [
        {
          nome: "Chamar no WhatsApp",
          href: linkWhatsApp(CONVITE_GERAL),
          Icone: IconeWhatsApp,
        },
      ],
    },
    {
      Icone: Clock,
      titulo: "Horário de atendimento",
      linhas: HORARIOS.map((item) => `${item.texto}: ${item.horas}`),
      /* Horário não tem para onde clicar. */
      acoes: [] as Array<{
        nome: string;
        href: string;
        Icone: (props: { className?: string }) => React.ReactElement;
      }>,
    },
  ];

  return (
    <>
      <main className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
        <header className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] texto-ouro">
            Contato
          </p>

          <h1 className="mt-3 text-3xl font-black uppercase leading-tight texto-claro sm:text-4xl">
            Fale com a <span className="texto-ouro">gente</span>
          </h1>

          <p className="mx-auto mt-4 max-w-lg text-sm leading-7 texto-suave">
            Dúvida sobre uma moto, avaliação da sua usada ou financiamento:
            chame no WhatsApp que respondemos rápido.
          </p>
        </header>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {canais.map(({ Icone, titulo, linhas, acoes }) => (
            <article
              key={titulo}
              /*
               * Cartão enxuto: o ícone fica na mesma linha do
               * título, e não acima dele. Poupa uma faixa de
               * altura e deixa a informação subir - o que
               * importa aqui é o endereço, não a moldura.
               */
              className="cartao-3d flex flex-col rounded-2xl p-5"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e0b129]/10 ring-1 ring-[#e0b129]/25">
                  <Icone size={18} className="texto-ouro" />
                </span>

                <h2 className="text-[15px] font-bold uppercase tracking-wide texto-claro">
                  {titulo}
                </h2>
              </div>

              {/*
               * A primeira linha é a que a pessoa procura -
               * a rua, o WhatsApp, o dia de semana -, então
               * vem maior e mais clara que o resto.
               */}
              <div className="mt-4 flex-1 space-y-1">
                {linhas.map((linha, ordem) => (
                  <p
                    key={linha}
                    className={`break-words leading-6 ${
                      ordem === 0
                        ? "text-[17px] font-semibold texto-claro"
                        : "text-[15px] texto-suave"
                    }`}
                  >
                    {linha}
                  </p>
                ))}
              </div>

              {acoes.length > 0 && (
                <div
                  className={`mt-5 grid gap-2 ${
                    acoes.length > 1 ? "grid-cols-2" : ""
                  }`}
                >
                  {acoes.map((item) => (
                    <a
                      key={item.nome}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="botao-vidro flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-bold"
                    >
                      <item.Icone className="h-4 w-4" />
                      {item.nome}
                    </a>
                  ))}
                </div>
              )}
            </article>
          ))}
        </section>

        <section className="cartao-3d mt-8 rounded-2xl p-6 text-center sm:p-9">
          <h2 className="text-xl font-black texto-claro sm:text-2xl">
            Prefere resolver agora?
          </h2>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 texto-suave">
            O WhatsApp é onde a gente responde mais rápido, e por lá dá para
            mandar foto da sua moto para a avaliação da troca.
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

      <Avaliacoes />
    </>
  );
}
