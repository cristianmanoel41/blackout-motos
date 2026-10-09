"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Play, X } from "lucide-react";

/*
 * O VÍDEO "COMO SIMULAR"
 *
 * Um botão discreto acima do simulador, e o vídeo só abre se a
 * pessoa pedir. Quem já sabe usar segue direto para a conta;
 * quem travou tem a ajuda a um toque.
 *
 * O arquivo não baixa junto com a página (preload="none"): são
 * 4 MB que só fazem sentido para quem vai assistir. No celular,
 * com dado móvel, baixar o vídeo de todo mundo que abre a
 * página seria cobrar de quem nem tocou nele.
 *
 * Abre por cima da tela, em pé, do jeito que foi gravado - é o
 * formato do celular de quem assiste.
 */

const VIDEO = "/videos/como-simular.mp4";
const CAPA = "/videos/como-simular.jpg";

export default function VideoComoSimular() {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!aberto) return;

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAberto(false);
    }

    /* A página de trás não rola enquanto o vídeo está aberto. */
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", aoTeclar);

    return () => {
      document.body.style.overflow = antes;
      window.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="sim-metodo mx-auto !w-auto max-w-full !gap-3 !py-2.5 !pl-2.5 !pr-5"
      >
        <span className="sim-icone h-10 w-10 shrink-0">
          <Play size={18} aria-hidden="true" />
        </span>

        <span className="min-w-0 text-left">
          <span className="block text-[14px] font-black leading-5 texto-claro">
            Ver como funciona
          </span>

          <span className="block text-xs texto-suave">
            Vídeo de 1 minuto
          </span>
        </span>
      </button>

      {/*
        * Vai direto para o <body>: dentro do cabeçalho da página
        * a janela ficava presa atrás do simulador e do topo do
        * site, que têm camada própria.
        */}
      {aberto && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Vídeo: como simular no site"
          onClick={() => setAberto(false)}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(evento) => evento.stopPropagation()}
            className="relative w-full"
            style={{
              aspectRatio: "9 / 16",
              /* Cabe na altura no computador e na largura no celular. */
              maxWidth: "calc(86vh * 9 / 16)",
            }}
          >
            <video
              src={VIDEO}
              poster={CAPA}
              controls
              autoPlay
              playsInline
              preload="none"
              className="h-full w-full rounded-2xl border border-[#e0b129]/40 bg-black object-contain shadow-2xl"
            />

            <button
              type="button"
              onClick={() => setAberto(false)}
              aria-label="Fechar o vídeo"
              className="absolute -right-2 -top-2 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-[#111] text-white shadow-lg sm:-right-12 sm:top-0"
            >
              <X size={20} />
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
