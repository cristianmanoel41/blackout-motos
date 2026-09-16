import type { Metadata } from "next";
import "./site.css";
import Cabecalho from "@/components/site/Cabecalho";
import Rodape from "@/components/site/Rodape";
import { ENDERECO_COMPLETO, LOJA } from "@/lib/dados/loja";

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
      "https://blackout-motos-amber.vercel.app"
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

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="site-blackout min-h-screen">
      <style>{`
        html, body {
          background-color: #0a0a0c;
          color-scheme: dark;
        }
      `}</style>

      <Cabecalho />

      {children}

      <Rodape />
    </div>
  );
}
