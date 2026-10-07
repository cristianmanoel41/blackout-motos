"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/*
 * O carrossel da versão 2.
 *
 * Quem rola é o próprio navegador: a lista tem overflow com
 * encaixe (scroll-snap), então no celular o dedo arrasta de
 * verdade, com inércia, e o teclado e o leitor de tela andam
 * pela lista sem precisar de nada nosso. As setas, os
 * pontinhos e a troca automática só mandam rolar até o card
 * certo.
 *
 * Carrossel feito na mão com transform é o caminho contrário:
 * ganha controle e perde tudo o que o navegador já faz bem.
 *
 * A troca automática é lenta de propósito e para sozinha
 * quando o mouse está em cima, quando alguém arrasta ou quando
 * a aba sai da frente - mexer na tela enquanto a pessoa lê é o
 * que faz carrossel ser odiado.
 *
 * A pausa do mouse olha o pointerType: no celular o navegador
 * finge um "mouseenter" quando o dedo encosta e não manda o
 * "mouseleave" depois, porque ali o mouse não sai de lugar
 * nenhum - e o carrossel ficava parado para sempre.
 */

const TEMPO = 5200;

export default function Carrossel({
  children,
  rotulo,
  tempo = TEMPO,
  voltaSeca = false,
}: {
  children: React.ReactNode;
  rotulo: string;
  tempo?: number;
  /*
   * Como o laço volta ao começo.
   *
   * Rolada, a volta passa despercebida numa fila de três ou
   * quatro cards. Na vitrine da capa, com um card ocupando
   * a tela inteira, a mesma volta vira uma varrida longa
   * para trás bem no alto da página, e parece defeito.
   * Seca, ela é uma piscada: lê-se como recomeço.
   */
  voltaSeca?: boolean;
}) {
  const trilho = useRef<HTMLDivElement>(null);
  const parado = useRef(false);

  const [pagina, setPagina] = useState(0);
  const [paginas, setPaginas] = useState(1);
  const [temSobra, setTemSobra] = useState(false);

  /* Largura de um card mais o espaço até o próximo. */
  const passo = useCallback(() => {
    const lista = trilho.current;
    if (!lista) return 0;

    const primeiro = lista.firstElementChild as HTMLElement | null;
    if (!primeiro) return 0;

    const segundo = primeiro.nextElementSibling as HTMLElement | null;

    return segundo
      ? segundo.offsetLeft - primeiro.offsetLeft
      : primeiro.offsetWidth;
  }, []);

  const medir = useCallback(() => {
    const lista = trilho.current;
    if (!lista) return;

    const largura = passo();
    if (!largura) return;

    const cabem = Math.max(
      1,
      Math.round(lista.clientWidth / largura)
    );

    const quantos = lista.children.length;

    setPaginas(Math.max(1, Math.ceil(quantos / cabem)));
    setTemSobra(lista.scrollWidth - lista.clientWidth > 8);
    setPagina(
      Math.round(lista.scrollLeft / (largura * cabem))
    );
  }, [passo]);

  useEffect(() => {
    medir();

    const lista = trilho.current;
    if (!lista) return;

    /* O card muda de largura junto com a tela. */
    const olho = new ResizeObserver(medir);
    olho.observe(lista);

    return () => olho.disconnect();
  }, [medir]);

  function irPara(indice: number) {
    const lista = trilho.current;
    if (!lista) return;

    const largura = passo();
    if (!largura) return;

    const cabem = Math.max(
      1,
      Math.round(lista.clientWidth / largura)
    );

    const alvo = indice * largura * cabem;

    /* Passou do fim: volta ao começo, que é o "loop". */
    lista.scrollTo({
      left: alvo > lista.scrollWidth - lista.clientWidth + 8 ? 0 : alvo,
    });
  }

  /* A troca automática. */
  useEffect(() => {
    if (paginas < 2) return;

    const menosMovimento = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (menosMovimento) return;

    const relogio = window.setInterval(() => {
      if (parado.current) return;
      if (document.hidden) return;

      const lista = trilho.current;
      if (!lista) return;

      const fim =
        lista.scrollLeft >=
        lista.scrollWidth - lista.clientWidth - 8;

      if (fim) {
        if (voltaSeca) {
          /* O `scroll-behavior: smooth` mora no CSS, então
             a volta instantânea precisa desligá-lo na mão. */
          const antes = lista.style.scrollBehavior;

          lista.style.scrollBehavior = "auto";
          lista.scrollLeft = 0;
          lista.style.scrollBehavior = antes;
        } else {
          lista.scrollTo({ left: 0 });
        }

        return;
      }

      const largura = passo();
      if (!largura) return;

      lista.scrollBy({ left: largura });
    }, tempo);

    return () => window.clearInterval(relogio);
  }, [paginas, passo, tempo, voltaSeca]);

  return (
    <div
      className="relative"
      onPointerEnter={(evento) => {
        if (evento.pointerType === "mouse") parado.current = true;
      }}
      onPointerLeave={(evento) => {
        if (evento.pointerType === "mouse") parado.current = false;
      }}
      onPointerDown={() => (parado.current = true)}
      onPointerUp={() => (parado.current = false)}
      onPointerCancel={() => (parado.current = false)}
    >
      <div
        ref={trilho}
        role="region"
        aria-label={rotulo}
        tabIndex={0}
        onScroll={medir}
        className="trilho"
      >
        {children}
      </div>

      {temSobra && (
        <>
          {/* As setas só no computador: no celular o dedo faz melhor. */}
          <button
            type="button"
            onClick={() => irPara(Math.max(0, pagina - 1))}
            aria-label={`${rotulo}: anterior`}
            className="vidro absolute left-0 top-1/2 hidden h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-white/80 hover:text-[#e0b129] lg:flex"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            type="button"
            onClick={() => irPara(pagina + 1)}
            aria-label={`${rotulo}: próximo`}
            className="vidro absolute right-0 top-1/2 hidden h-11 w-11 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full text-white/80 hover:text-[#e0b129] lg:flex"
          >
            <ChevronRight size={20} />
          </button>

          <div className="mt-6 flex items-center justify-center gap-2">
            {Array.from({ length: paginas }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => irPara(i)}
                aria-label={`${rotulo}: página ${i + 1}`}
                aria-current={i === pagina}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === pagina
                    ? "w-7 bg-[#e0b129]"
                    : "w-2.5 bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
