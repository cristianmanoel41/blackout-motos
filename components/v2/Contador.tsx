"use client";

import { useEffect, useRef, useState } from "react";

/*
 * O número que sobe até o total.
 *
 * Só começa quando entra na tela, dura pouco mais de um
 * segundo e desacelera no fim - número subindo em velocidade
 * constante parece contador de posto, não de vitrine.
 *
 * Com "reduzir movimento" ligado, ou sem JavaScript, o número
 * final já está escrito no HTML: quem não vê a animação não
 * perde a informação.
 */

const DURACAO = 1100;

export default function Contador({ total }: { total: number }) {
  const alvo = useRef<HTMLSpanElement>(null);
  const [valor, setValor] = useState(total);

  useEffect(() => {
    const elemento = alvo.current;
    if (!elemento) return;

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches
    ) {
      return;
    }

    let quadro = 0;

    const olho = new IntersectionObserver(([entrada]) => {
      if (!entrada.isIntersecting) return;

      olho.disconnect();

      const comeco = performance.now();

      function passo(agora: number) {
        const andado = Math.min(
          1,
          (agora - comeco) / DURACAO
        );

        /* Desacelera no fim. */
        const suave = 1 - Math.pow(1 - andado, 3);

        setValor(Math.round(total * suave));

        if (andado < 1) {
          quadro = requestAnimationFrame(passo);
        }
      }

      setValor(0);
      quadro = requestAnimationFrame(passo);
    });

    olho.observe(elemento);

    return () => {
      olho.disconnect();
      cancelAnimationFrame(quadro);
    };
  }, [total]);

  return (
    <span ref={alvo} className="font-bold ouro">
      {valor}
    </span>
  );
}
