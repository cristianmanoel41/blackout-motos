"use client";

import { useEffect, useRef, useState } from "react";
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

  /*
   * Com a foto aberta, Esc fecha e a rolagem da pagina
   * trava - sem isso a pagina corre atras da foto quando se
   * arrasta no celular.
   */
  useEffect(() => {
    if (!ampliada) return;

    function noTeclado(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAmpliada(false);
      if (evento.key === "ArrowRight") passar(1);
      if (evento.key === "ArrowLeft") passar(-1);
    }

    const rolagem = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    /*
     * O menu do site fica grudado no topo. Com a foto
     * aberta ele nao serve para nada e ainda aparece por
     * tras do fundo escuro, entao some enquanto isso.
     */
    document.body.classList.add("foto-aberta");

    window.addEventListener("keydown", noTeclado);

    return () => {
      document.body.style.overflow = rolagem;
      document.body.classList.remove("foto-aberta");
      window.removeEventListener("keydown", noTeclado);
    };
  }, [ampliada]);

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
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-black shadow-lg backdrop-blur transition hover:bg-white"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              type="button"
              onClick={() => passar(1)}
              aria-label="Próxima foto"
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-black shadow-lg backdrop-blur transition hover:bg-white"
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
          className="fixed inset-0 z-[70] grid place-items-center bg-black p-4"
        >
          {/*
            * O X acompanha a foto, nao o canto da tela: numa
            * tela larga a foto fica no meio, e um botao la no
            * canto da janela parece de outra coisa.
            */}
          <div
            onClick={(evento) => evento.stopPropagation()}
            className="relative"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fotos[indice]}
              alt=""
              className="block max-h-[85vh] max-w-[calc(100vw-2rem)] rounded-xl object-contain"
            />

            <button
              type="button"
              onClick={() => setAmpliada(false)}
              aria-label="Fechar foto"
              className="absolute right-3 top-3 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-xl transition hover:bg-white/90"
            >
              <X size={24} strokeWidth={2.5} />
            </button>

            {/*
              * No computador nao da para arrastar: sem as
              * setas aqui dentro, a unica saida era fechar a
              * foto para trocar de imagem.
              */}
            {fotos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => passar(-1)}
                  aria-label="Foto anterior"
                  className="absolute left-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-black shadow-lg transition hover:bg-white"
                >
                  <ChevronLeft size={24} strokeWidth={2.5} />
                </button>

                <button
                  type="button"
                  onClick={() => passar(1)}
                  aria-label="Próxima foto"
                  className="absolute right-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-black shadow-lg transition hover:bg-white"
                >
                  <ChevronRight size={24} strokeWidth={2.5} />
                </button>
              </>
            )}

            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/70 px-4 py-2 text-xs text-white ring-1 ring-white/15">
              {fotos.length > 1
                ? `${indice + 1} de ${fotos.length} · use as setas ou arraste`
                : "Toque no X para voltar"}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
