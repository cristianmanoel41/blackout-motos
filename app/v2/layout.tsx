import type { Metadata } from "next";
import "./v2.css";
import {
  fonteSite,
  fonteTitulo,
} from "@/lib/fonte-site";
import {
  ENDERECO_COMPLETO,
  GOOGLE,
  HORARIOS,
  LOJA,
  REDES,
} from "@/lib/dados/loja";

/*
 * Moldura da versão 2 - por enquanto só em /v2.
 *
 * O site no ar continua como está: esta versão é para ser
 * vista e aprovada antes de trocar qualquer coisa.
 *
 * Fora do buscador de propósito: enquanto as duas existirem,
 * a versão em provas não pode disputar com a capa de verdade
 * nos resultados de busca nem chegar ao cliente por acaso.
 * Quando ela virar o site, é trocar o robots por index.
 */

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
      "https://blackoutmotos.com.br"
  ),
  title: `${LOJA.nome.toUpperCase()} | Motos Seminovas em ${LOJA.cidade}`,
  description: `Motos seminovas em ${LOJA.cidade} com procedência, financiamento e facilidade na troca. Confira o estoque da ${LOJA.nome.toUpperCase()}.`,
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
  robots: { index: false, follow: false },
};

/*
 * A ficha da loja em linguagem de buscador.
 *
 * Mesmos dados do site no ar - endereço, telefone e horário
 * saem de lib/dados/loja.ts. Nota e quantidade de avaliações
 * não entram aqui: o Google não aceita avaliação declarada
 * pela própria loja, e inventar número é propaganda enganosa.
 */
const FICHA_DA_LOJA = {
  "@context": "https://schema.org",
  "@type": "MotorcycleDealer",
  name: LOJA.nome,
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

export default function V2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${fonteSite.variable} ${fonteTitulo.variable} v2 min-h-screen`}
    >
      <style>{`
        html, body {
          background-color: #08080a;
          color-scheme: dark;
        }
      `}</style>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(FICHA_DA_LOJA),
        }}
      />

      {children}
    </div>
  );
}
