import type { Metadata } from "next";
import "./novo.css";
import {
  fonteCartaz,
  fonteSite,
  fonteTitulo,
} from "@/lib/fonte-site";

/*
 * Moldura da versão nova, em /novo.
 *
 * Ela fica no ar junto com o site de sempre, mas fora do
 * buscador de propósito: enquanto as duas existirem, a versão
 * nova não pode disputar com a capa de verdade nos resultados
 * de busca nem chegar ao cliente por acaso. Quem entra aqui
 * entra pelo endereço, e ninguém mais.
 */

export const metadata: Metadata = {
  title: "Blackout Motos · versão nova",
  robots: { index: false, follow: false },
};

export default function NovoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${fonteSite.variable} ${fonteTitulo.variable} ${fonteCartaz.variable} novo min-h-screen`}
    >
      <style>{`
        html, body {
          background-color: #08080a;
          color-scheme: dark;
        }
      `}</style>

      {children}
    </div>
  );
}
