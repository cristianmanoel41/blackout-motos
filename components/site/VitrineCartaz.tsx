"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import {
  anoDaMoto,
  kmDaMoto,
  nomeDaMoto,
  numero,
  paraQueServe,
  precoDaMoto,
  type MotoSite,
} from "@/lib/dados/moto-site";

/*
 * A vitrine da capa: um card só, as motos passando sozinhas.
 *
 * Moldura dourada, letra de cartaz no nome e no preço, foto
 * de corte reto.
 *
 * Os cards ficam todos na mesma célula da grade, um por cima
 * do outro, e só muda quem está visível: assim a altura é a
 * do maior e nada pula quando a moto troca.
 *
 * Encostar não pausa - no celular, rolar a página já passa o
 * dedo por cima o tempo todo. Quem segura é o arrasto de
 * verdade, a seta e o pontinho.
 */

const TEMPO = 5000;
const LIMITE = 55;
const TETO = 110;

export default function VitrineCartaz({
  motos,
  slugs,
  capas,
}: {
  motos: MotoSite[];
  slugs: Record<string, string>;
  capas: Record<string, string>;
}) {
  const [atual, setAtual] = useState(0);
  const [parado, setParado] = useState(false);
  const [semEfeito, setSemEfeito] = useState(false);
  const [desvio, setDesvio] = useState(0);

  const voltaSozinho = useRef(0);
  const partida = useRef<{ x: number; y: number } | null>(null);
  const andou = useRef(false);

  useEffect(() => {
    setSemEfeito(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }, []);

  useEffect(
    () => () => window.clearTimeout(voltaSozinho.current),
    []
  );

  /* Mexeu na mão: a troca automática espera um pouco. */
  function segurarUmPouco() {
    setParado(true);
    window.clearTimeout(voltaSozinho.current);

    voltaSozinho.current = window.setTimeout(
      () => setParado(false),
      12000
    );
  }

  useEffect(() => {
    if (motos.length < 2 || parado) return;

    const relogio = window.setInterval(() => {
      setAtual((posicao) => (posicao + 1) % motos.length);
    }, TEMPO);

    return () => window.clearInterval(relogio);
  }, [motos.length, parado]);

  function irPara(posicao: number) {
    const quantas = motos.length;

    setAtual(((posicao % quantas) + quantas) % quantas);
    segurarUmPouco();
  }

  function aoPegar(evento: React.PointerEvent) {
    if (evento.pointerType === "mouse" && evento.button !== 0) return;

    partida.current = { x: evento.clientX, y: evento.clientY };
    andou.current = false;
  }

  function aoMover(evento: React.PointerEvent) {
    if (!partida.current) return;

    const dx = evento.clientX - partida.current.x;
    const dy = evento.clientY - partida.current.y;

    /* Mais vertical que horizontal: é rolagem, não arrasto. */
    if (!andou.current && Math.abs(dy) > Math.abs(dx)) {
      partida.current = null;
      setDesvio(0);
      return;
    }

    if (Math.abs(dx) > 6 && !andou.current) {
      andou.current = true;
      segurarUmPouco();
      evento.currentTarget.setPointerCapture(evento.pointerId);
    }

    setDesvio(Math.max(-TETO, Math.min(TETO, dx)));
  }

  function aoSoltar() {
    const andado = desvio;

    partida.current = null;
    setDesvio(0);

    if (Math.abs(andado) < LIMITE) return;

    irPara(andado < 0 ? atual + 1 : atual - 1);
  }

  if (motos.length === 0) return null;

  return (
    <div
      className="w-full select-none touch-pan-y"
      onPointerDown={aoPegar}
      onPointerMove={aoMover}
      onPointerUp={aoSoltar}
      onPointerCancel={aoSoltar}
      onDragStart={(evento) => evento.preventDefault()}
      onClickCapture={(evento) => {
        if (!andou.current) return;

        evento.preventDefault();
        evento.stopPropagation();
        andou.current = false;
      }}
    >
      <div
        className={`grid ${
          desvio === 0 ? "transition-transform duration-300" : ""
        }`}
        style={{ transform: `translateX(${desvio}px)` }}
      >
        {motos.map((moto, posicao) => {
          const aberta = posicao === atual;
          const cilindrada = numero(moto.cilindrada);
          const serve = paraQueServe(moto);

          return (
            <article
              key={moto.id}
              aria-hidden={!aberta}
              className={`moldura-ouro col-start-1 row-start-1 overflow-hidden ${
                semEfeito ? "" : "transition-opacity duration-700"
              } ${
                aberta ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <Link
                href={`/estoque/${slugs[moto.id]}`}
                tabIndex={aberta ? undefined : -1}
                className="sangra block"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-black">
                  {capas[moto.id] && (
                    <Image
                      src={capas[moto.id]}
                      alt={nomeDaMoto(moto)}
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      priority={posicao === 0}
                      className="object-cover"
                    />
                  )}
                </div>

                <div className="p-6">
                  <p className="rotulo">
                    {moto.marca || "Seminova"}
                  </p>

                  <p className="cartaz mt-2 text-[1.7rem] claro">
                    {nomeDaMoto(moto)}
                  </p>

                  <p className="mt-1 text-sm suave">
                    {anoDaMoto(moto)} ·{" "}
                    {kmDaMoto(moto.quilometragem)}
                    {cilindrada ? ` · ${cilindrada} cc` : ""}
                  </p>

                  {/*
                    * Para o que a moto é boa. É o que o
                    * cliente pergunta no WhatsApp antes de
                    * perguntar o preço.
                    */}
                  {serve && (
                    <p className="mt-4 border-l-2 border-[#e0b129] pl-3 text-sm leading-6 claro">
                      {serve}
                    </p>
                  )}

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                    <p className="cartaz text-[2.2rem] ouro">
                      {precoDaMoto(moto)}
                    </p>

                    <span className="botao-linha inline-flex items-center gap-1.5 pb-1 text-sm">
                      Ver detalhes
                      <ArrowUpRight size={15} />
                    </span>
                  </div>
                </div>
              </Link>
            </article>
          );
        })}
      </div>

      {motos.length > 1 && (
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => irPara(atual - 1)}
            aria-label="Moto anterior"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/80 transition hover:border-[#e0b129] hover:text-[#e0b129]"
          >
            <ChevronLeft size={18} />
          </button>

          {motos.map((moto, posicao) => (
            <button
              key={moto.id}
              type="button"
              onClick={() => irPara(posicao)}
              aria-label={`Ver ${nomeDaMoto(moto)}`}
              aria-current={posicao === atual}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                posicao === atual
                  ? "w-8 bg-[#e0b129]"
                  : "w-3 bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}

          <button
            type="button"
            onClick={() => irPara(atual + 1)}
            aria-label="Próxima moto"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/80 transition hover:border-[#e0b129] hover:text-[#e0b129]"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
