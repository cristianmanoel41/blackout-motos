import type { Metadata } from "next";
import "./site.css";
import { fonteSite } from "@/lib/fonte-site";
import { Analytics } from "@vercel/analytics/next";
import Cabecalho from "@/components/site/Cabecalho";
import Rodape from "@/components/site/Rodape";
import {
  ENDERECO_COMPLETO,
  GOOGLE,
  HORARIOS,
  LOJA,
  REDES,
} from "@/lib/dados/loja";

/*
 * Moldura do site público.
 *
 * O AppShell já deixa estas rotas passarem sem o menu do
 * sistema; aqui entra a moldura do site: cabeçalho fixo,
 * rodapé e o tema escuro.
 *
 * "only light" do painel não vale aqui - este é o único canto
 * escuro de propósito, e color-scheme dark evita que o
 * navegador clareie campo e barra de rolagem.
 */

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
      "https://blackoutmotos.com.br"
  ),
  title: {
    default: `${LOJA.nome.toUpperCase()} | Motos Seminovas em ${LOJA.cidade}`,
    template: `%s | ${LOJA.nome.toUpperCase()}`,
  },
  description: `Motos selecionadas, financiamento e troca em ${LOJA.cidade}. Confira o estoque da ${LOJA.nome.toUpperCase()}.`,
  keywords: [
    "motos seminovas",
    "moto usada",
    LOJA.cidade,
    "financiamento de moto",
    LOJA.nome,
  ],
  openGraph: {
    siteName: LOJA.nome,
    locale: "pt_BR",
    type: "website",
    title: `${LOJA.nome.toUpperCase()} | Motos Seminovas em ${LOJA.cidade}`,
    description: ENDERECO_COMPLETO,
    images: ["/logo-blackout-site.png"],
  },
  icons: {
    icon: "/logo-blackout-site.png",
    apple: "/logo-blackout-site.png",
  },
  robots: { index: true, follow: true },
};

/*
 * A ficha da loja em linguagem de buscador.
 *
 * É por aqui que o Google entende endereço, telefone e
 * horário de funcionamento - e pode mostrar "aberto agora"
 * direto no resultado da busca, sem a pessoa entrar no site.
 */
const FICHA_DA_LOJA = {
  "@context": "https://schema.org",
  "@type": "MotorcycleDealer",
  name: LOJA.nome,
  /*
   * O endereço do site e a ficha no Google, juntos: é assim
   * que o buscador entende que o site e a loja do mapa são
   * a mesma empresa, e não dois resultados concorrendo.
   */
  url:
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://blackoutmotos.com.br",
  image: "/logo-blackout-site.png",
  priceRange: "$",
  telephone: LOJA.whatsappExibicao,
  address: {
    "@type": "PostalAddress",
    streetAddress: LOJA.endereco,
    addressLocality: LOJA.cidade,
    addressRegion: LOJA.estado,
    postalCode: LOJA.cep,
    addressCountry: "BR",
  },
  openingHoursSpecification: HORARIOS.filter(
    (item) => item.dias.length > 0
  ).map((item) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: item.dias,
    opens: item.abre,
    closes: item.fecha,
  })),
  sameAs: REDES.filter((rede) => rede.url).map(
    (rede) => rede.url
  ),
  hasMap: GOOGLE.perfil,
};

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${fonteSite.variable} site-blackout min-h-screen`}
    >
      <style>{`
        html, body {
          background-color: #0a0a0c;
          color-scheme: dark;
        }
      `}</style>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(FICHA_DA_LOJA),
        }}
      />

      <Cabecalho />

      {children}

      <Rodape />

      {/*
        * A contagem de acessos, da propria Vercel.
        *
        * So no site: o sistema da loja fica de fora, senao o
        * dia inteiro de trabalho de voces entraria na conta e
        * o numero de visitante deixaria de valer.
        *
        * Nao usa cookie e nao segue ninguem de site em site,
        * entao nao pede aviso de cookies. Nada roda no
        * localhost - so no que esta publicado.
        */}
      <Analytics />
    </div>
  );
}
