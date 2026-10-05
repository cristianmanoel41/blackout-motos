"use client";

import { useEffect, useRef, useState } from "react";

/*
 * Uma luz dourada que segue o mouse.
 *
 * O efeito é discreto de propósito: 6% de opacidade. A graça é
 * a pessoa sentir que a página reage, não ver uma lanterna
 * passeando por cima das motos.
 *
 * TRÊS CUIDADOS QUE O EFEITO EXIGE
 *
 * 1. Só existe onde há mouse. No celular não há ponteiro, e um
 *    retângulo de 400px parado no canto seria peso de graça -
 *    camada que o navegador compõe, memória que o iPhone não
 *    tem sobrando. Aqui ele nem chega a ser criado.
 *
 * 2. Anda por transform, não por left/top. Mexer em left e top
 *    faz o navegador recalcular a posição do elemento a cada
 *    movimento do mouse, dezenas de vezes por segundo; o
 *    transform só reposiciona a camada já pronta.
 *
 * 3. Um movimento do mouse não vira um desenho. O mouse dispara
 *    muito mais eventos do que a tela consegue mostrar, então a
 *    posição é guardada e desenhada uma vez por quadro.
 *
 * Quem pediu menos animação no sistema operacional não recebe
 * nada: é preferência declarada, não palpite nosso.
 */

const TAMANHO = 400;

export default function LuzDoMouse() {
  const luz = useRef<HTMLDivElement>(null);
  const posicao = useRef({ x: 0, y: 0 });
  const quadro = useRef(0);

  /*
   * No celular o elemento nem nasce.
   *
   * Antes ele era sempre desenhado e só o mouse ficava de fora.
   * Isso deixava um quadrado de 400 por 400 preso no canto de
   * toda tela de celular: invisível e sem capturar toque, mas
   * uma camada que o navegador compõe à toa, e um suspeito a
   * mais quando alguma coisa não responde ao dedo.
   *
   * Começa falso dos dois lados - servidor e navegador - para o
   * React não encontrar HTML diferente do que esperava; só
   * depois, já no aparelho, a resposta vira verdadeira.
   */
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    /* Sem mouse de verdade, ou com animação recusada, o efeito
       simplesmente não acontece. */
    const temMouse = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    ).matches;

    const querMenos = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (!temMouse || querMenos) return;

    setMostrar(true);
  }, []);

  useEffect(() => {
    if (!mostrar) return;

    const elemento = luz.current;

    if (!elemento) return;

    function desenhar() {
      quadro.current = 0;

      const alvo = luz.current;

      if (!alvo) return;

      const { x, y } = posicao.current;

      alvo.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      alvo.style.opacity = "1";
    }

    function mexeu(evento: MouseEvent) {
      posicao.current = { x: evento.clientX, y: evento.clientY };

      /* Já há um desenho marcado para este quadro: não marca
         outro. É isso que segura o custo. */
      if (quadro.current) return;

      quadro.current = requestAnimationFrame(desenhar);
    }

    /*
     * Mouse que sai da janela apaga a luz.
     *
     * Sem isto ela fica acesa na borda, parada, enquanto a
     * pessoa está em outra aba - e aparece assim quando ela
     * volta, como se a página tivesse travado.
     */
    function saiu() {
      const alvo = luz.current;

      if (alvo) alvo.style.opacity = "0";
    }

    window.addEventListener("mousemove", mexeu, { passive: true });
    document.addEventListener("mouseleave", saiu);

    return () => {
      window.removeEventListener("mousemove", mexeu);
      document.removeEventListener("mouseleave", saiu);

      if (quadro.current) cancelAnimationFrame(quadro.current);
    };
  }, [mostrar]);

  /* Celular, tablet, ou quem pediu menos animação: nada. */
  if (!mostrar) return null;

  return (
    <div
      ref={luz}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[60] rounded-full opacity-0 transition-opacity duration-300"
      style={{
        width: TAMANHO,
        height: TAMANHO,
        background:
          "radial-gradient(circle, rgba(224, 177, 41, 0.06) 0%, transparent 70%)",
      }}
    />
  );
}
