"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { IconeWhatsApp } from "@/components/site/IconeWhatsApp";

/*
 * Leva o resumo para o celular.
 *
 * Abre o WhatsApp com o texto pronto - a pessoa escolhe para
 * quem mandar (a si mesma, ou o grupo da loja). Nada é enviado
 * sozinho: mandar automático exigiria a API paga do WhatsApp.
 */
export default function MandarResumo({ texto }: { texto: string }) {
  const [copiou, setCopiou] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiou(true);
      window.setTimeout(() => setCopiou(false), 2500);
    } catch {
      window.prompt("Copie o resumo:", texto);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={copiar}
        className="inline-flex items-center gap-2 rounded-xl border border-grafite-claro bg-preto px-4 py-3 text-sm font-semibold text-texto transition hover:border-dourado hover:text-dourado"
      >
        {copiou ? <Check size={16} /> : <Copy size={16} />}
        {copiou ? "Copiado" : "Copiar"}
      </button>

      <a
        href={`https://wa.me/?text=${encodeURIComponent(texto)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-black transition hover:bg-emerald-400"
      >
        <IconeWhatsApp className="h-4 w-4" />
        Mandar no WhatsApp
      </a>
    </div>
  );
}
