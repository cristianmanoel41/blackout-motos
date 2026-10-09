"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  PlayCircle,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

/*
 * A galeria da ficha da moto.
 *
 * Substitui a de components/site/Galeria, aproveitando o que
 * ela já fazia bem - arrastar no celular, setas no computador,
 * as vizinhas pré-carregadas - e somando o que faltava:
 *
 *   - o VÍDEO da moto, quando a loja subiu um na ficha. É o
 *     mesmo arquivo da galeria do sistema; nada de vídeo de
 *     banco de imagem representando moto do pátio;
 *   - ZOOM na tela cheia: um toque ou clique amplia onde se
 *     tocou, arrastar passeia pela foto, e o gesto de pinça do
 *     próprio navegador também vale;
 *   - miniaturas com a atual marcada e rolando junto.
 *
 * As fotos chegam pelo leitor do Supabase (lib/imagem-loader),
 * na largura da tela - inclusive na tela cheia, em que se pede
 * 1600px: é o máximo que vale a pena para foto de 720 de
 * largura, sem gastar dado do cliente à toa.
 */

export type Midia = { tipo: "foto" | "video"; url: string };

const ZOOM = 2.2;

export default function GaleriaMoto({
  midias,
  nome,
}: {
  midias: Midia[];
  nome: string;
}) {
  const [indice, setIndice] = useState(0);
  const [cheia, setCheia] = useState(false);
  const [ampliada, setAmpliada] = useState(false);
  const [origem, setOrigem] = useState("50% 50%");
  const [principalPronta, setPrincipalPronta] = useState(false);

  const toqueX = useRef<number | null>(null);
  const trilhoMini = useRef<HTMLDivElement>(null);

  const total = midias.length;
  const atual = midias[indice];

  const passar = useCallback(
    (quanto: number) => {
      if (total === 0) return;
      setAmpliada(false);
      setIndice((agora) => (agora + quanto + total) % total);
    },
    [total]
  );

  /* A miniatura da foto aberta fica sempre à vista. */
  useEffect(() => {
    const mini = trilhoMini.current?.children[indice] as HTMLElement | undefined;
    mini?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [indice]);

  /*
   * Tela cheia: Esc fecha, setas trocam, e a página de trás não
   * rola - sem a trava ela corre junto quando se arrasta a foto.
   */
  useEffect(() => {
    if (!cheia) return;

    function teclado(evento: KeyboardEvent) {
      if (evento.key === "Escape") setCheia(false);
      if (evento.key === "ArrowRight") passar(1);
      if (evento.key === "ArrowLeft") passar(-1);
    }

    const antes = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    document.body.classList.add("foto-aberta");
    window.addEventListener("keydown", teclado);

    return () => {
      document.body.style.overflow = antes;
      document.body.classList.remove("foto-aberta");
      window.removeEventListener("keydown", teclado);
      setAmpliada(false);
    };
  }, [cheia, passar]);

  function comecou(evento: React.TouchEvent) {
    /* Dois dedos é pinça, não arrasto. */
    toqueX.current = evento.touches.length === 1 ? evento.touches[0].clientX : null;
  }

  function terminou(evento: React.TouchEvent) {
    const inicio = toqueX.current;
    const fim = evento.changedTouches[0]?.clientX;

    toqueX.current = null;

    if (ampliada || inicio === null || fim === undefined) return;
    if (Math.abs(fim - inicio) < 50) return;

    passar(fim < inicio ? 1 : -1);
  }

  /* Amplia no ponto tocado; tocar de novo volta ao tamanho. */
  function alternarZoom(evento: React.MouseEvent<HTMLElement>) {
    const area = evento.currentTarget.getBoundingClientRect();
    const x = ((evento.clientX - area.left) / area.width) * 100;
    const y = ((evento.clientY - area.top) / area.height) * 100;

    setOrigem(`${x}% ${y}%`);
    setAmpliada((estava) => !estava);
  }

  /* Com zoom ligado, o mouse passeia pela foto. */
  function passear(evento: React.MouseEvent<HTMLElement>) {
    if (!ampliada) return;

    const area = evento.currentTarget.getBoundingClientRect();
    const x = ((evento.clientX - area.left) / area.width) * 100;
    const y = ((evento.clientY - area.top) / area.height) * 100;

    setOrigem(`${x}% ${y}%`);
  }

  if (total === 0) return null;

  return (
    <>
      <div
        onTouchStart={comecou}
        onTouchEnd={terminou}
        className="vidro relative overflow-hidden"
      >
        <div className="relative aspect-[4/3] w-full bg-black">
          {midias.map((midia, posicao) => {
            const distancia = Math.abs(posicao - indice);
            const vizinha = distancia <= 1 || distancia === total - 1;

            /*
             * Só a atual e as duas vizinhas ficam montadas, e as
             * vizinhas esperam a principal: três fotos pesadas
             * pedidas juntas no 4G faziam a principal demorar.
             */
            if (!vizinha) return null;
            if (posicao !== indice && !principalPronta) return null;

            const esta = posicao === indice;

            if (midia.tipo === "video") {
              return esta ? (
                <video
                  key={midia.url}
                  src={midia.url}
                  controls
                  playsInline
                  preload="metadata"
                  className="absolute inset-0 h-full w-full bg-black object-contain"
                >
                  Seu navegador não toca este vídeo.
                </video>
              ) : null;
            }

            return (
              <button
                key={midia.url}
                type="button"
                tabIndex={esta ? 0 : -1}
                aria-hidden={!esta}
                onClick={() => setCheia(true)}
                aria-label="Abrir foto em tela cheia"
                className={`absolute inset-0 cursor-zoom-in transition-opacity duration-500 ease-out ${
                  esta ? "z-[1] opacity-100" : "opacity-0"
                }`}
              >
                {/* Fundo desfocado: foto em pé não deixa faixa preta. */}
                <Image
                  src={midia.url}
                  alt=""
                  fill
                  sizes="40vw"
                  quality={30}
                  className="scale-110 object-cover opacity-40 blur-2xl"
                />
                <Image
                  src={midia.url}
                  alt={esta ? `${nome} - foto ${posicao + 1} de ${total}` : ""}
                  fill
                  priority={posicao === 0}
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  quality={80}
                  onLoad={() => {
                    if (esta) setPrincipalPronta(true);
                  }}
                  className="object-contain"
                />
              </button>
            );
          })}
        </div>

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => passar(-1)}
              aria-label="Foto anterior"
              className="absolute left-3 top-1/2 z-[2] hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-black/80 sm:flex"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              type="button"
              onClick={() => passar(1)}
              aria-label="Próxima foto"
              className="absolute right-3 top-1/2 z-[2] hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-black/80 sm:flex"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[2] flex items-center justify-between gap-2">
          <span className="rounded-full bg-black/70 px-3.5 py-1.5 text-xs text-white ring-1 ring-white/15">
            {indice + 1} / {total}
            {atual.tipo === "video" ? " · vídeo" : ""}
          </span>

          {atual.tipo === "foto" && (
            <button
              type="button"
              onClick={() => setCheia(true)}
              className="pointer-events-auto flex min-h-10 items-center gap-1.5 rounded-full bg-black/70 px-3.5 py-1.5 text-xs font-semibold text-white ring-1 ring-white/15"
            >
              <Expand size={13} />
              Tela cheia
            </button>
          )}
        </div>
      </div>

      {total > 1 && (
        <div
          ref={trilhoMini}
          className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]"
        >
          {midias.map((midia, posicao) => (
            <button
              key={midia.url}
              type="button"
              onClick={() => {
                setAmpliada(false);
                setIndice(posicao);
              }}
              aria-label={
                midia.tipo === "video" ? "Ver vídeo da moto" : `Ver foto ${posicao + 1}`
              }
              aria-current={posicao === indice}
              className={`relative h-[4.5rem] w-24 shrink-0 overflow-hidden rounded-xl border bg-black transition-all duration-300 sm:h-20 sm:w-28 ${
                posicao === indice
                  ? "miniatura-ligada"
                  : "border-white/10 opacity-60 hover:opacity-100"
              }`}
            >
              {midia.tipo === "video" ? (
                <span className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-[#1c1c22] to-black text-[11px] font-bold ouro">
                  <PlayCircle size={22} />
                  Vídeo
                </span>
              ) : (
                <Image
                  src={midia.url}
                  alt=""
                  fill
                  sizes="112px"
                  quality={60}
                  className="object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}

      {cheia && atual && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Fotos da ${nome}`}
          className="fixed inset-0 z-[70] flex flex-col bg-black"
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="truncate text-sm font-semibold text-white">
              {nome} · {indice + 1} / {total}
            </span>

            <div className="flex shrink-0 items-center gap-2">
              {atual.tipo === "foto" && (
                <button
                  type="button"
                  onClick={() => {
                    setOrigem("50% 50%");
                    setAmpliada((estava) => !estava);
                  }}
                  aria-label={ampliada ? "Diminuir" : "Ampliar"}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20"
                >
                  {ampliada ? <ZoomOut size={20} /> : <ZoomIn size={20} />}
                </button>
              )}

              <button
                type="button"
                onClick={() => setCheia(false)}
                aria-label="Fechar"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black"
              >
                <X size={22} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <div
            onTouchStart={comecou}
            onTouchEnd={terminou}
            className="foto-livre relative flex-1 overflow-hidden"
          >
            {atual.tipo === "video" ? (
              <video
                key={atual.url}
                src={atual.url}
                controls
                autoPlay
                playsInline
                className="h-full w-full object-contain"
              />
            ) : (
              <div
                onClick={alternarZoom}
                onMouseMove={passear}
                className={`relative h-full w-full ${ampliada ? "cursor-zoom-out" : "cursor-zoom-in"}`}
              >
                <Image
                  key={atual.url}
                  src={atual.url}
                  alt={`${nome} - foto ${indice + 1}`}
                  fill
                  sizes="100vw"
                  quality={80}
                  className="object-contain transition-transform duration-300 ease-out"
                  style={{
                    transform: ampliada ? `scale(${ZOOM})` : "none",
                    transformOrigin: origem,
                  }}
                />
              </div>
            )}

            {total > 1 && !ampliada && (
              <>
                <button
                  type="button"
                  onClick={() => passar(-1)}
                  aria-label="Anterior"
                  className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow-lg"
                >
                  <ChevronLeft size={24} strokeWidth={2.5} />
                </button>

                <button
                  type="button"
                  onClick={() => passar(1)}
                  aria-label="Próxima"
                  className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow-lg"
                >
                  <ChevronRight size={24} strokeWidth={2.5} />
                </button>
              </>
            )}
          </div>

          <p className="px-4 py-3 text-center text-xs text-white/60">
            {atual.tipo === "foto"
              ? "Toque na foto ou use dois dedos para ampliar · arraste para trocar"
              : "Arraste para o lado para voltar às fotos"}
          </p>
        </div>
      )}
    </>
  );
}
