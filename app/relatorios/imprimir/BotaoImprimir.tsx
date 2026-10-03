"use client";

import { Printer } from "lucide-react";

/*
 * Abre a caixa de impressão do navegador.
 *
 * É o mesmo caminho para imprimir no papel e para salvar em
 * PDF - no Windows, "Microsoft Print to PDF" aparece como se
 * fosse uma impressora. Por isso o botão não promete "baixar
 * PDF": quem decide é a caixa que abre.
 */
export default function BotaoImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg border border-[#e0b129] bg-[#e0b129] px-5 py-2 text-sm font-black text-black transition hover:brightness-110"
    >
      <Printer size={16} />
      Imprimir ou salvar PDF
    </button>
  );
}
