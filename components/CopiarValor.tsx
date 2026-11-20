"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/*
 * Botão pequeno de copiar, pra usar junto de um valor numa
 * célula de tabela ou lista (ex.: a placa, no Estoque, pra colar
 * na simulação do banco sem digitar errado).
 */
export default function CopiarValor({ valor, titulo }: { valor: string; titulo?: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor);
    } catch {
      return;
    }

    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <button
      type="button"
      title={titulo || "Copiar"}
      onClick={copiar}
      className={`inline-flex shrink-0 items-center justify-center rounded p-1 transition ${
        copiado ? "text-emerald-400" : "text-zinc-500 hover:text-dourado"
      }`}
    >
      {copiado ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}
