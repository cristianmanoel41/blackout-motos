"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

/*
 * Mandar a moto para alguém.
 *
 * Moto raramente se compra sozinho: a pessoa manda para a
 * esposa, o pai, o amigo que entende. No celular abre a folha
 * de compartilhar do próprio aparelho (WhatsApp, Instagram,
 * o que a pessoa usar); no computador, copia o link.
 *
 * O link vai limpo, sem os rastros de anúncio que vieram no
 * endereço - quem recebe não entrou pelo anúncio.
 */

export default function Compartilhar({
  titulo,
  texto,
  className = "",
}: {
  titulo: string;
  texto: string;
  className?: string;
}) {
  const [copiou, setCopiou] = useState(false);

  async function compartilhar() {
    const url = `${window.location.origin}${window.location.pathname}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: titulo, text: texto, url });
        return;
      } catch {
        /* Cancelou a folha: não é erro, não faz nada. */
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopiou(true);
      window.setTimeout(() => setCopiou(false), 2500);
    } catch {
      window.prompt("Copie o link da moto:", url);
    }
  }

  return (
    <button
      type="button"
      onClick={compartilhar}
      className={`botao-vidro flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold ${className}`}
    >
      {copiou ? <Check size={16} className="ouro" /> : <Share2 size={16} />}
      {copiou ? "Link copiado" : "Compartilhar"}
    </button>
  );
}
