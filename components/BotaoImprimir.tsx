"use client";

import { Printer } from "lucide-react";

export default function BotaoImprimir({
  rotulo = "Imprimir / Salvar PDF",
}: {
  rotulo?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg bg-dourado px-5 py-3 text-sm font-bold text-preto transition hover:bg-dourado-claro"
    >
      <Printer size={17} />
      {rotulo}
    </button>
  );
}
