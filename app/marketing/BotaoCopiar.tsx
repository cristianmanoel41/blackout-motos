"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/*
 * Copia a legenda inteira para a área de transferência.
 *
 * É o botão mais importante da tela: quem posta está com o
 * celular na mão e o Instagram aberto. Selecionar cinco
 * parágrafos com o dedo, sem pegar o parágrafo de cima, é o
 * tipo de atrito que faz a pessoa desistir e escrever qualquer
 * coisa na hora.
 *
 * O aviso de "copiado" dura dois segundos: sem ele, não há como
 * saber se o toque pegou, e a pessoa toca de novo.
 */
export default function BotaoCopiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      /* Navegador sem permissão de área de transferência: o
         texto está na tela de qualquer jeito, dá para
         selecionar na mão. Melhor não fingir que copiou. */
      return;
    }

    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition ${
        copiado
          ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-400"
          : "border-[#e0b129]/40 text-[#f0c640] hover:bg-[#e0b129]/10"
      }`}
    >
      {copiado ? <Check size={13} /> : <Copy size={13} />}
      {copiado ? "copiado" : "copiar legenda"}
    </button>
  );
}
