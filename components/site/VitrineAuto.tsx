"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  anoDaMoto,
  kmDaMoto,
  nomeDaMoto,
  precoDaMoto,
  type MotoSite,
} from "@/lib/dados/moto-site";

/*
 * A vitrine que troca sozinha, na capa.
 *
 * Mostra as motos que entraram por último, uma de cada vez. É
 * a primeira coisa que a pessoa vê: em vez de um banner
 * parado, o estoque de verdade passando na frente dela.
 *
 * Os cards ficam todos na mesma célula da grade, um por cima
 * do outro, e só muda quem está visível. Assim a altura é a
 * do maior card e nada pula quando a moto troca - com posição
 * absoluta seria preciso chutar uma altura fixa, e o nome de
 * moto comprido estouraria.
 *
 * Passar o dedo ou o mouse em cima segura a troca: ninguém
 * perde a moto que estava olhando. Quem pediu menos animação
 * no sistema vê a primeira e troca no ponto, se quiser.
 */

const TEMPO = 5000;

export default function VitrineAuto({
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

  const voltaSozinho = useRef(0);

  /*
   * No celular não existe tirar o mouse de cima: se o toque
   * parasse a vitrine, ela ficaria parada para sempre depois
   * do primeiro esbarrão. Então o toque só segura um pouco, o
   * tempo de a pessoa ler a moto que estava passando.
   */
  function segurarUmPouco() {
    setParado(true);

    window.clearTimeout(voltaSozinho.current);

    voltaSozinho.current = window.setTimeout(
      () => setParado(false),
      12000
    );
  }

  useEffect(
    () => () => window.clearTimeout(voltaSozinho.current),
    []
  );

  function irPara(posicao: number) {
    const quantas = motos.length;

    /* Passar da ultima volta para a primeira, e vice-versa. */
    setAtual(((posicao % quantas) + quantas) % quantas);

    segurarUmPouco();
  }

  useEffect(() => {
    if (motos.length < 2 || parado) return;

    const calmo = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (calmo) return;

    const relogio = window.setInterval(() => {
      setAtual((posicao) => (posicao + 1) % motos.length);
    }, TEMPO);

    return () => window.clearInterval(relogio);
  }, [motos.length, parado]);

  if (motos.length === 0) return null;

  return (
    <div
      className="w-full"
      onMouseEnter={() => setParado(true)}
      onMouseLeave={() => setParado(false)}
      onTouchStart={segurarUmPouco}
      onFocusCapture={() => setParado(true)}
      onBlurCapture={() => setParado(false)}
    >
      <div className="grid">
        {motos.map((moto, posicao) => {
          const nome = nomeDaMoto(moto);
          const capa = capas[moto.id];
          const aberta = posicao === atual;

          return (
            <article
              key={moto.id}
              aria-hidden={!aberta}
              className={`cartao-3d col-start-1 row-start-1 overflow-hidden rounded-3xl transition-opacity duration-700 ${
                aberta
                  ? "opacity-100"
                  : "pointer-events-none opacity-0"
              }`}
            >
              <Link
                href={`/estoque/${slugs[moto.id]}`}
                tabIndex={aberta ? undefined : -1}
                className="relative block aspect-[4/3] overflow-hidden bg-black"
              >
                {capa ? (
                  <Image
                    src={capa}
                    alt={nome}
                    fill
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    priority={posicao === 0}
                    className="object-cover"
                  />
                ) : null}

                <span className="absolute bottom-3 right-3 rounded-full bg-black/75 px-2.5 py-1 text-[11px] font-bold text-white ring-1 ring-white/15">
                  {anoDaMoto(moto)}
                </span>
              </Link>

              <div className="p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] texto-ouro">
                  {moto.marca || "Seminova"}
                </p>

                <h2 className="mt-1.5 text-xl font-black leading-tight texto-claro sm:text-2xl">
                  {nome}
                </h2>

                <p className="mt-1.5 text-xs texto-suave">
                  {anoDaMoto(moto)} ·{" "}
                  {kmDaMoto(moto.quilometragem)}
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-2xl font-black tracking-tight texto-ouro">
                    {precoDaMoto(moto)}
                  </p>

                  <Link
                    href={`/estoque/${slugs[moto.id]}`}
                    tabIndex={aberta ? undefined : -1}
                    className="botao-vidro inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold"
                  >
                    Ver detalhes
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {motos.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => irPara(atual - 1)}
            aria-label="Moto anterior"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/[.04] texto-claro transition hover:border-white/30 hover:bg-white/[.09]"
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
                  ? "w-7 bg-[#e0b129]"
                  : "w-3 bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}

          <button
            type="button"
            onClick={() => irPara(atual + 1)}
            aria-label="Próxima moto"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/[.04] texto-claro transition hover:border-white/30 hover:bg-white/[.09]"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
