"use client";

import { useRef, useState } from "react";
import { Bike } from "lucide-react";

/*
 * Galeria da página da moto.
 *
 * Uma foto grande com as miniaturas embaixo, e a tela cheia ao
 * clicar. No celular ninguém procura seta: passa a foto
 * arrastando, como em qualquer galeria - as setas ficam para
 * quem está no computador.
 */

export default function GaleriaMoto({
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
    toqueX.current =
      evento.touches[0]?.clientX ?? null;
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

  if (fotos.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl border border-black/10 bg-black/[.03]">
        <Bike size={48} className="text-black/20" />
      </div>
    );
  }

  return (
    <>
      <div
        onTouchStart={comecouToque}
        onTouchEnd={terminouToque}
        className="relative overflow-hidden rounded-2xl border border-black/10 bg-white"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fotos[indice]}
          alt={nome}
          onClick={() => setAmpliada(true)}
          className="aspect-[4/3] w-full cursor-zoom-in object-cover"
        />

        {fotos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => passar(-1)}
              aria-label="Foto anterior"
              className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-2xl font-bold text-black shadow-lg transition hover:bg-white/90"
            >
              ‹
            </button>

            <button
              type="button"
              onClick={() => passar(1)}
              aria-label="Próxima foto"
              className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-2xl font-bold text-black shadow-lg transition hover:bg-white/90"
            >
              ›
            </button>

            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-xs text-white ring-1 ring-white/20">
              {indice + 1} de {fotos.length} · arraste para o
              lado
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
              className="shrink-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={endereco}
                alt=""
                className={`h-20 w-28 rounded-lg border object-cover transition ${
                  posicao === indice
                    ? "border-[#bd8700]"
                    : "border-black/10 opacity-70 hover:opacity-100"
                }`}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        >
          <button
            type="button"
            onClick={() => setAmpliada(false)}
            aria-label="Fechar"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-lg font-bold text-black shadow-lg"
          >
            ✕
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fotos[indice]}
            alt=""
            onClick={(evento) => evento.stopPropagation()}
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </>
  );
}
