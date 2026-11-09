"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  Hand,
  PlayCircle,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Compartilhar from "@/components/v2/Compartilhar";

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
  mosaico = false,
  textoCompartilhar,
}: {
  midias: Midia[];
  nome: string;
  /* Texto que acompanha o link ao compartilhar as fotos. */
  textoCompartilhar?: string;
  /*
   * No computador, troca a foto única por uma vitrine de
   * quatro fotos lado a lado. As fotos da loja são tiradas em
   * pé, no celular: uma sozinha numa caixa deitada sobrava
   * faixa dos lados; quatro em pé enchem a largura e mostram a
   * moto de vários ângulos de uma vez. No celular nada muda.
   */
  mosaico?: boolean;
}) {
  const [indice, setIndice] = useState(0);
  const [cheia, setCheia] = useState(false);
  const [ampliada, setAmpliada] = useState(false);
  const [origem, setOrigem] = useState("50% 50%");
  const [principalPronta, setPrincipalPronta] = useState(false);
  /* Some o aviso "arraste para o lado" depois da primeira troca. */
  const [jaTrocou, setJaTrocou] = useState(false);

  const toqueX = useRef<number | null>(null);
  const trilhoMini = useRef<HTMLDivElement>(null);

  const total = midias.length;
  const atual = midias[indice];

  const passar = useCallback(
    (quanto: number) => {
      if (total === 0) return;
      setAmpliada(false);
      setJaTrocou(true);
      setIndice((agora) => (agora + quanto + total) % total);
    },
    [total]
  );

  /*
   * Chegou pelo link compartilhado ("?fotos=3"): abre direto as
   * fotos em tela cheia, na foto que quem mandou estava vendo.
   *
   * O "?fotos" sai do endereço logo em seguida - senão, ao
   * recarregar a página, as fotos abririam de novo sozinhas.
   */
  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search);
    if (!parametros.has("fotos") || total === 0) return;

    const numero = Number(parametros.get("fotos"));
    const posicao =
      Number.isInteger(numero) && numero >= 1 && numero <= total
        ? numero - 1
        : 0;

    parametros.delete("fotos");
    const resto = parametros.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${resto ? `?${resto}` : ""}`
    );

    // Abrir a tela cheia ao chegar é o objetivo do link.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIndice(posicao);
    setCheia(true);
    // Só na chegada à página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  /* As quatro primeiras fotos da vitrine, com a posição de cada
     uma na galeria - é por ela que a tela cheia abre. */
  const vitrine = midias
    .map((midia, posicao) => ({ ...midia, posicao }))
    .filter((midia) => midia.tipo === "foto")
    .slice(0, 4);
  const posicaoDoVideo = midias.findIndex((midia) => midia.tipo === "video");

  function abrir(posicao: number) {
    setAmpliada(false);
    setIndice(posicao);
    setCheia(true);
  }

  return (
    <>
      {mosaico && vitrine.length > 0 && (
        <div
          className={`relative hidden h-[min(34rem,62vh)] gap-2 overflow-hidden rounded-[1.4rem] lg:grid ${
            vitrine.length >= 4
              ? "grid-cols-4"
              : vitrine.length === 3
                ? "grid-cols-3"
                : vitrine.length === 2
                  ? "grid-cols-2"
                  : "grid-cols-1"
          }`}
        >
          {vitrine.map((foto, ordem) => {
            const ultima = ordem === vitrine.length - 1;
            const restantes = total - vitrine.length;

            return (
              <button
                key={foto.url}
                type="button"
                onClick={() => abrir(foto.posicao)}
                aria-label={`Abrir foto ${foto.posicao + 1} em tela cheia`}
                className="group relative overflow-hidden bg-black"
              >
                <Image
                  src={foto.url}
                  alt={ordem === 0 ? `${nome} - foto 1` : ""}
                  fill
                  priority={ordem < 2}
                  sizes="25vw"
                  quality={80}
                  className="object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
                />

                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />

                {ultima && restantes > 0 && (
                  <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 text-white backdrop-blur-[2px] transition group-hover:bg-black/45">
                    <span className="titulo text-3xl">+{restantes}</span>
                    <span className="text-xs font-bold uppercase tracking-[0.2em]">
                      Ver todas
                    </span>
                  </span>
                )}
              </button>
            );
          })}

          <div className="pointer-events-none absolute bottom-4 left-4 z-[2] flex gap-2">
            <button
              type="button"
              onClick={() => abrir(vitrine[0].posicao)}
              className="pointer-events-auto flex min-h-10 items-center gap-1.5 rounded-full bg-black/70 px-4 py-2 text-xs font-semibold text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-black/85"
            >
              <Expand size={13} />
              {total} {total === 1 ? "foto" : "fotos"}
            </button>

            {posicaoDoVideo >= 0 && (
              <button
                type="button"
                onClick={() => abrir(posicaoDoVideo)}
                className="pointer-events-auto flex min-h-10 items-center gap-1.5 rounded-full bg-black/70 px-4 py-2 text-xs font-semibold text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-black/85"
              >
                <PlayCircle size={14} className="ouro" />
                Ver vídeo
              </button>
            )}
          </div>
        </div>
      )}

      {/*
        * Todas as fotos em miniatura, embaixo da vitrine: sem
        * elas, quem via só as quatro não sabia que havia mais.
        * Clicar abre a tela cheia naquela foto.
        */}
      {mosaico && vitrine.length > 0 && total > 1 && (
        <div className="mt-3 hidden gap-2 overflow-x-auto pb-1 [scrollbar-width:thin] lg:flex">
          {midias.map((midia, posicao) => (
            <button
              key={midia.url}
              type="button"
              onClick={() => abrir(posicao)}
              aria-label={
                midia.tipo === "video" ? "Ver vídeo da moto" : `Ver foto ${posicao + 1}`
              }
              className="group relative h-24 w-[4.5rem] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black transition duration-300 hover:border-[#e0b129]/70"
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
                  sizes="72px"
                  quality={60}
                  className="object-cover opacity-75 transition duration-300 group-hover:scale-105 group-hover:opacity-100"
                />
              )}
            </button>
          ))}
        </div>
      )}

      <div className={mosaico && vitrine.length > 0 ? "lg:hidden" : ""}>
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

            {/*
              * No celular não há setas, e quem chega na ficha não
              * sabe que dá para arrastar - via a primeira foto e
              * descia. O aviso fica no meio da foto até a pessoa
              * trocar a primeira vez. Não bloqueia o toque: tocar
              * nele ainda abre a tela cheia.
              */}
            {atual.tipo === "foto" && (
              <div
                aria-hidden="true"
                data-sumiu={jaTrocou ? "" : undefined}
                className="aviso-arraste pointer-events-none absolute inset-0 z-[2] flex items-center justify-center sm:hidden"
              >
                <span className="flex items-center gap-1.5 rounded-full bg-black/65 py-2 pl-2.5 pr-4 text-[13px] font-semibold text-white ring-1 ring-white/20 backdrop-blur">
                  <ChevronLeft size={16} className="text-white/70" />
                  <Hand size={18} className="aviso-arraste-mao ouro" />
                  <ChevronRight size={16} className="text-white/70" />
                  <span className="ml-1">Arraste para ver mais fotos</span>
                </span>
              </div>
            )}
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
                setJaTrocou(true);
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
      </div>

      {/*
        * A tela cheia vai para fora da página, como as outras
        * janelas do site: dentro dela algum efeito de entrada
        * prende o "fixed", e no computador a foto abria numa
        * faixa no meio da tela em vez de ocupar tudo.
        */}
      {cheia && atual && createPortal(
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
              <Compartilhar
                compacto
                titulo={nome}
                texto={textoCompartilhar || `Olha essa ${nome}`}
                foto={indice + 1}
              />

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
        </div>,
        document.querySelector(".site-blackout") || document.body
      )}
    </>
  );
}
