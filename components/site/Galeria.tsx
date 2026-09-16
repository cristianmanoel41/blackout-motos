"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

/*
 * A galeria da página da moto.
 *
 * Foto grande com miniaturas embaixo, e tela cheia ao clicar.
 * No celular ninguém procura seta: passa a foto arrastando,
 * como em qualquer galeria. As setas ficam para quem está no
 * computador.
 *
 * As fotos são as mesmas do sistema - a galeria da ficha da
 * moto. Nada é duplicado aqui.
 */

export default function Galeria({
  fotos,
  nome,
}: {
  fotos: string[];
  nome: string;
}) {
  const [indice, setIndice] = useState(0);
  const [ampliada, setAmpliada] = useState(false);

  const toqueX = useRef<number | null>(null);

  function comecouToque(evento: React.TouchEvent) {
    toqueX.current = evento.touches[0]?.clientX ?? null;
  }

  function terminouToque(evento: React.TouchEvent) {
    const inicio = toqueX.current;
    const fim = evento.changedTouches[0]?.clientX;

    toqueX.current = null;

    if (inicio === null || fim === undefined) return;

    const distancia = fim - inicio;

    /* Menos de 50px é toque, não arrasto. */
    if (Math.abs(distancia) < 50) return;

    passar(distancia < 0 ? 1 : -1);
  }

  function passar(quanto: number) {
    if (fotos.length === 0) return;

    setIndice(
      (atual) =>
        (atual + quanto + fotos.length) % fotos.length
    );
  }

  if (fotos.length === 0) return null;

  return (
    <>
      <div
        onTouchStart={comecouToque}
        onTouchEnd={terminouToque}
        className="cartao-3d relative overflow-hidden rounded-2xl"
      >
        <button
          type="button"
          onClick={() => setAmpliada(true)}
          aria-label="Ampliar foto"
          className="relative block aspect-[4/3] w-full cursor-zoom-in bg-black"
        >
          <Image
            src={fotos[indice]}
            alt={nome}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="object-cover"
          />
        </button>

        {fotos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => passar(-1)}
              aria-label="Foto anterior"
              className="botao-vidro absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full backdrop-blur"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              type="button"
              onClick={() => passar(1)}
              aria-label="Próxima foto"
              className="botao-vidro absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full backdrop-blur"
            >
              <ChevronRight size={20} />
            </button>

            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-1.5 text-xs text-white ring-1 ring-white/15">
              {indice + 1} de {fotos.length} · arraste para
              o lado
            </span>
          </>
        )}
      </div>

      {fotos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {fotos.map((endereco, posicao) => (
            <button
              key={endereco}
              type="button"
              onClick={() => setIndice(posicao)}
              aria-label={`Ver foto ${posicao + 1}`}
              className={`relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border transition ${
                posicao === indice
                  ? "border-[#e0b129]"
                  : "border-white/10 opacity-60 hover:opacity-100"
              }`}
            >
              <Image
                src={endereco}
                alt=""
                fill
                sizes="112px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {ampliada && (
        <div
          onClick={() => setAmpliada(false)}
          onTouchStart={comecouToque}
          onTouchEnd={terminouToque}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4"
        >
          <button
            type="button"
            onClick={() => setAmpliada(false)}
            aria-label="Fechar"
            className="botao-vidro absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full"
          >
            <X size={20} />
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fotos[indice]}
            alt=""
            onClick={(evento) => evento.stopPropagation()}
            className="max-h-[85vh] max-w-full rounded-xl object-contain"
          />

          {fotos.length > 1 && (
            <span className="absolute bottom-6 rounded-full bg-black/70 px-4 py-1.5 text-xs text-white ring-1 ring-white/15">
              {indice + 1} de {fotos.length}
            </span>
          )}
        </div>
      )}
    </>
  );
}
