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
 *
 * O LINK ABRE AS FOTOS
 *
 * Com `foto`, o link leva "?fotos=N": quem recebe cai direto
 * nas fotos em tela cheia, na foto N - a mesma que estava na
 * tela de quem mandou. Fechando, está na página da moto, com
 * preço e botão do WhatsApp. Quem lê o "?fotos" é a
 * GaleriaMoto.
 */

export default function Compartilhar({
  titulo,
  texto,
  foto,
  compacto = false,
  rotulo = "Compartilhar",
  className = "",
}: {
  titulo: string;
  texto: string;
  /* Número da foto que o link abre (1 = a primeira). */
  foto?: number;
  /* Só o ícone redondo, para a tela cheia das fotos. */
  compacto?: boolean;
  rotulo?: string;
  className?: string;
}) {
  const [copiou, setCopiou] = useState(false);

  async function compartilhar() {
    const url = `${window.location.origin}${window.location.pathname}${
      foto ? `?fotos=${foto}` : ""
    }`;

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

  if (compacto) {
    return (
      <button
        type="button"
        onClick={compartilhar}
        aria-label={copiou ? "Link copiado" : "Compartilhar estas fotos"}
        title={copiou ? "Link copiado" : "Compartilhar estas fotos"}
        className={`flex h-11 items-center justify-center gap-2 rounded-full bg-white/10 px-3.5 text-sm font-semibold text-white ring-1 ring-white/20 ${className}`}
      >
        {copiou ? <Check size={18} className="ouro" /> : <Share2 size={18} />}
        <span className="hidden sm:inline">
          {copiou ? "Link copiado" : "Compartilhar"}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={compartilhar}
      className={`botao-vidro flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold ${className}`}
    >
      {copiou ? (
        <Check size={16} className="ouro shrink-0" />
      ) : (
        <Share2 size={16} className="shrink-0" />
      )}
      {copiou ? "Link copiado" : rotulo}
    </button>
  );
}
