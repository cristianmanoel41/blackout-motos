"use client";

import { useEffect, useRef, useState } from "react";

/*
 * Aparece quando chega na tela.
 *
 * O bloco começa um pouco abaixo e apagado e sobe quando entra
 * no campo de visão. É um efeito só, usado em todas as seções:
 * cada seção com a sua animação é o que faz site parecer
 * enfeitado em vez de acabado.
 *
 * Observa uma vez e desliga: animar de novo a cada rolagem
 * cansa quem volta para reler.
 *
 * Sem JavaScript, ou com "reduzir movimento" ligado, o bloco
 * simplesmente já está no lugar - o conteúdo nunca depende do
 * efeito para existir.
 */

export default function AoEntrar({
  children,
  atraso = 0,
  className = "",
}: {
  children: React.ReactNode;
  atraso?: number;
  className?: string;
}) {
  const alvo = useRef<HTMLDivElement>(null);
  const [dentro, setDentro] = useState(false);

  useEffect(() => {
    const elemento = alvo.current;
    if (!elemento) return;

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches
    ) {
      setDentro(true);
      return;
    }

    const olho = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) return;

        setDentro(true);
        olho.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px" }
    );

    olho.observe(elemento);

    return () => olho.disconnect();
  }, []);

  return (
    <div
      ref={alvo}
      style={{ transitionDelay: `${atraso}ms` }}
      className={`surgir ${dentro ? "surgir-pronto" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
