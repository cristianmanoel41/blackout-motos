import type { Metadata } from "next";

/*
 * O site da loja é claro; o painel interno é escuro.
 *
 * O tema do sistema pinta o fundo de preto e redefine
 * "text-white" como escuro, porque lá o card é claro. Aqui
 * branco é branco - sobre foto, sobre o verde do WhatsApp -
 * e o fundo da página precisa ser claro de verdade, inclusive
 * no efeito elástico de quando se puxa a tela no celular.
 *
 * "only light" também recusa o modo escuro forçado do
 * navegador, que inverteria as fotos e os cards.
 */

export const metadata: Metadata = {
  title: {
    default: "Blackout Motos · Motos em São José dos Campos",
    template: "%s · Blackout Motos",
  },
  description:
    "Motos seminovas revisadas em São José dos Campos. Entrada, troca e financiamento. Veja o estoque disponível com fotos e preço.",
  openGraph: {
    siteName: "Blackout Motos",
    locale: "pt_BR",
    type: "website",
  },
};

export default function LojaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        html, body {
          color-scheme: only light;
          background-color: #f5f6f8;
        }

        /*
         * Branco aqui e branco: sobre a capa escura, sobre
         * foto e sobre o verde do WhatsApp. O tema do painel
         * redefine text-white como escuro porque la o fundo e
         * claro.
         */
        .text-white {
          color: #ffffff !important;
        }
      `}</style>

      {children}
    </>
  );
}
