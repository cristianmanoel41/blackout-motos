"use client";

import { useRef } from "react";

/*
 * O card que acompanha o mouse.
 *
 * Inclina poucos graus na direção do ponteiro e acende um
 * reflexo onde a luz bateria - é o que dá a sensação de peça
 * física, de vitrine, sem virar brinquedo. Quatro graus no
 * máximo: mais que isso o texto do card começa a entortar.
 *
 * Só com mouse de verdade. No celular o dedo não "passa por
 * cima" de nada, e inclinar no toque faria o card pular na
 * hora de rolar a página. Quem pediu menos movimento no
 * aparelho também recebe o card parado.
 *
 * A conta acontece fora do React, direto no estilo: re-render
 * a cada movimento do mouse travaria a lista inteira.
 */

const GRAUS = 4;

export default function Inclinar({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const caixa = useRef<HTMLDivElement>(null);

  function mover(evento: React.PointerEvent<HTMLDivElement>) {
    if (evento.pointerType !== "mouse") return;

    const elemento = caixa.current;
    if (!elemento) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const area = elemento.getBoundingClientRect();
    const x = (evento.clientX - area.left) / area.width;
    const y = (evento.clientY - area.top) / area.height;

    elemento.style.setProperty("--giro-x", `${(0.5 - y) * GRAUS}deg`);
    elemento.style.setProperty("--giro-y", `${(x - 0.5) * GRAUS}deg`);
    elemento.style.setProperty("--luz-x", `${x * 100}%`);
    elemento.style.setProperty("--luz-y", `${y * 100}%`);
    elemento.dataset.inclinado = "sim";
  }

  function soltar() {
    const elemento = caixa.current;
    if (!elemento) return;

    elemento.style.setProperty("--giro-x", "0deg");
    elemento.style.setProperty("--giro-y", "0deg");
    delete elemento.dataset.inclinado;
  }

  return (
    <div
      ref={caixa}
      onPointerMove={mover}
      onPointerLeave={soltar}
      className={`inclinar ${className}`}
    >
      {children}
    </div>
  );
}
