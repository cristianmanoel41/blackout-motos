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
 * perde a moto que estava olhando. Arrastar para o lado passa
 * a moto, como se faz em qualquer álbum de fotos - e o card
 * acompanha o dedo, senão a pessoa não sabe se pegou.
 *
 * Quem pediu menos animação no sistema vê a primeira e troca
 * no ponto, se quiser.
 */

const TEMPO = 5000;

/* Quanto o dedo precisa andar para valer como "passou". */
const LIMITE = 55;

/* O card não foge mais que isso, por mais que se arraste. */
const TETO = 110;

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

  /*
   * Celular com "reduzir animações" ligado - e muito celular
   * liga isso sozinho no modo economia de bateria. Antes a
   * vitrine simplesmente não andava nesses aparelhos. Agora
   * ela troca de moto do mesmo jeito; o que sai é a passagem
   * suave, que é a animação de fato.
   */
  const [semEfeito, setSemEfeito] = useState(false);

  useEffect(() => {
    setSemEfeito(
      window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches
    );
  }, []);

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

  /*
   * Arrastar para o lado.
   *
   * Vale para dedo e para mouse, porque é o mesmo evento de
   * ponteiro. O card anda junto enquanto se arrasta e volta
   * sozinho se o movimento foi curto demais - sem isso o dedo
   * some e nada acontece, e a pessoa acha que travou.
   */
  const partida = useRef<{ x: number; y: number } | null>(
    null
  );

  const andou = useRef(false);

  const [desvio, setDesvio] = useState(0);

  function aoPegar(evento: React.PointerEvent) {
    /* Botão do meio e da direita não arrastam nada. */
    if (evento.pointerType === "mouse" && evento.button !== 0) {
      return;
    }

    partida.current = {
      x: evento.clientX,
      y: evento.clientY,
    };

    andou.current = false;

    /*
     * Encostar não segura a vitrine. No celular, rolar a
     * página passa o dedo por cima do card o tempo todo - se
     * cada esbarrão pausasse, ela nunca mais trocaria de moto
     * sozinha. Quem segura é o arrasto de verdade, lá embaixo.
     */
  }

  function aoMover(evento: React.PointerEvent) {
    if (!partida.current) return;

    const dx = evento.clientX - partida.current.x;
    const dy = evento.clientY - partida.current.y;

    /*
     * Mais para cima ou para baixo que para o lado: a pessoa
     * está rolando a página, não passando moto. Larga o
     * arrasto para não trancar a rolagem no celular.
     */
    if (!andou.current && Math.abs(dy) > Math.abs(dx)) {
      partida.current = null;
      setDesvio(0);
      return;
    }

    if (Math.abs(dx) > 6 && !andou.current) {
      andou.current = true;

      /* Agora sim: a pessoa está passando moto na mão. */
      segurarUmPouco();

      /* Segura o ponteiro, senão o movimento se perde ao
         sair de cima do card. */
      evento.currentTarget.setPointerCapture(
        evento.pointerId
      );
    }

    setDesvio(Math.max(-TETO, Math.min(TETO, dx)));
  }

  function aoSoltar() {
    const andado = desvio;

    partida.current = null;
    setDesvio(0);

    if (Math.abs(andado) < LIMITE) return;

    /* Arrastou para a esquerda: a próxima moto entra. */
    irPara(andado < 0 ? atual + 1 : atual - 1);
  }

  useEffect(() => {
    if (motos.length < 2 || parado) return;

    const relogio = window.setInterval(() => {
      setAtual((posicao) => (posicao + 1) % motos.length);
    }, TEMPO);

    return () => window.clearInterval(relogio);
  }, [motos.length, parado]);

  if (motos.length === 0) return null;

  return (
    <div
      className="w-full select-none touch-pan-y"
      onMouseEnter={() => setParado(true)}
      onMouseLeave={() => setParado(false)}
      onFocusCapture={() => setParado(true)}
      onBlurCapture={() => setParado(false)}
      onPointerDown={aoPegar}
      onPointerMove={aoMover}
      onPointerUp={aoSoltar}
      onPointerCancel={aoSoltar}
      onDragStart={(evento) => evento.preventDefault()}
      /*
       * Quem arrastou não quis clicar: sem isto, soltar o dedo
       * em cima da foto abriria a ficha da moto.
       */
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
        style={{
          transform: `translateX(${desvio}px)`,
        }}
      >
        {motos.map((moto, posicao) => {
          const nome = nomeDaMoto(moto);
          const capa = capas[moto.id];
          const aberta = posicao === atual;

          return (
            <article
              key={moto.id}
              aria-hidden={!aberta}
              className={`cartao-3d col-start-1 row-start-1 overflow-hidden rounded-3xl ${
                semEfeito
                  ? ""
                  : "transition-opacity duration-700"
              } ${
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
