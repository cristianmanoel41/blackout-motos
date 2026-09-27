"use client";

import { useEffect } from "react";

/*
 * Avisa a página que alguém rolou.
 *
 * Põe data-rolou="sim" no <html> depois dos primeiros 40
 * pixels e tira quando volta ao topo. Quem reage é o CSS - o
 * cabeçalho encolhe, a sombra aparece -, então não há nada
 * sendo redesenhado por JavaScript a cada quadro.
 *
 * O ouvinte é passivo: sem isso o navegador precisa esperar a
 * função terminar antes de rolar a tela, e no celular isso
 * aparece como rolagem travando.
 */

export default function AoRolar() {
  useEffect(() => {
    const raiz = document.documentElement;
    let pedido = 0;

    function olhar() {
      if (pedido) return;

      pedido = window.requestAnimationFrame(() => {
        pedido = 0;

        if (window.scrollY > 40) {
          raiz.dataset.rolou = "sim";
        } else {
          delete raiz.dataset.rolou;
        }
      });
    }

    olhar();
    window.addEventListener("scroll", olhar, { passive: true });

    return () => {
      window.removeEventListener("scroll", olhar);
      window.cancelAnimationFrame(pedido);
      delete raiz.dataset.rolou;
    };
  }, []);

  return null;
}
