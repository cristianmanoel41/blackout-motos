"use client";

import { useState } from "react";

/*
 * Rever a escolha de cookies.
 *
 * Consentimento que não pode ser retirado não é
 * consentimento. Este botão apaga a resposta guardada e
 * recarrega a página: a tarja volta a perguntar, e enquanto
 * ninguém responde, nada é medido.
 */

export default function EscolhaCookies() {
  const [limpando, setLimpando] = useState(false);

  function rever() {
    setLimpando(true);

    try {
      localStorage.removeItem("blackout-cookies");
    } catch {
      /* Sem armazenamento, não havia escolha guardada. */
    }

    window.location.reload();
  }

  return (
    <button
      type="button"
      onClick={rever}
      disabled={limpando}
      className="botao-vidro mt-4 rounded-full px-6 py-3 text-sm font-bold disabled:opacity-60"
    >
      {limpando ? "Atualizando..." : "Rever minha escolha de cookies"}
    </button>
  );
}
