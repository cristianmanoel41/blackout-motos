import type { Metadata } from "next";
import "./novo.css";
import {
  fonteSite,
  fonteTitulo,
} from "@/lib/fonte-site";

/*
 * Moldura da versão nova - só no localhost, em /novo.
 *
 * Fora do buscador de propósito: enquanto ela é campo de
 * provas, não pode competir com o site de verdade nos
 * resultados de busca nem aparecer para cliente.
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
      className={`${fonteSite.variable} ${fonteTitulo.variable} novo min-h-screen`}
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
