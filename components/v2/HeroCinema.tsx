"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import {
  anoDaMoto,
  categoriaDaMoto,
  convitePelaMoto,
  kmDaMoto,
  linkDaFicha,
  nomeDaCategoria,
  numero,
  precoDaMoto,
  tituloDaMoto,
  type MotoSite,
} from "@/lib/dados/moto-site";
import { linkWhatsApp } from "@/lib/dados/loja";
import { IconeWhatsApp } from "@/components/site/IconeWhatsApp";

/*
 * A capa de cinema.
 *
 * Uma moto de verdade do pátio por vez, grande, com a marca em
 * letra enorme e o modelo embaixo - o jeito das concessionárias
 * de moto premium apresentarem lançamento. As motos são as
 * marcadas com estrela na ficha (na_capa); sem marcação, as
 * últimas que entraram. Nada aqui é foto de banco de imagem.
 *
 * AS FOTOS DA LOJA SÃO EM PÉ
 *
 * As referências usam moto recortada em estúdio. As nossas são
 * fotos reais, quase sempre 720x1280 em pé. Esticar uma foto
 * dessas numa faixa deitada cortaria guidão e roda. Então a
 * moto fica inteira numa moldura, e a MESMA foto, desfocada e
 * escura, preenche o fundo - o clima de cinema vem dela, sem
 * cortar a moto e sem inventar cenário.
 *
 * A troca é sozinha, a cada sete segundos, e para quando o
 * mouse está em cima, quando a aba está escondida e para quem
 * pediu menos movimento. No celular, arrastar troca a moto.
 */

const TEMPO = 7000;

export default function HeroCinema({
  motos,
  slugs,
  capas,
  quantas,
}: {
  motos: MotoSite[];
  slugs: Record<string, string>;
  capas: Record<string, string>;
  quantas: number;
}) {
  const [atual, setAtual] = useState(0);
  const parado = useRef(false);
  const toqueX = useRef<number | null>(null);

  const total = motos.length;

  useEffect(() => {
    if (total < 2) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const relogio = window.setInterval(() => {
      if (parado.current || document.hidden) return;
      setAtual((indice) => (indice + 1) % total);
    }, TEMPO);

    return () => window.clearInterval(relogio);
  }, [total]);

  if (total === 0) return null;

  function passar(quanto: number) {
    setAtual((indice) => (indice + quanto + total) % total);
  }

  const moto = motos[atual];
  const slug = slugs[moto.id];
  const marca = tituloDaMoto(moto.marca || "");
  const modelo = tituloDaMoto(
    [moto.modelo, moto.versao].filter(Boolean).join(" ")
  );
  const cilindrada = numero(moto.cilindrada);

  const ficha = [
    { rotulo: "Ano", valor: anoDaMoto(moto) },
    { rotulo: "Km", valor: kmDaMoto(moto.quilometragem) },
    cilindrada ? { rotulo: "Motor", valor: `${cilindrada} cc` } : null,
  ].filter(Boolean) as { rotulo: string; valor: string }[];

  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Motos em destaque"
      className="cinema relative isolate overflow-hidden border-b border-white/[.07]"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") parado.current = true;
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") parado.current = false;
      }}
      onTouchStart={(e) => {
        toqueX.current = e.touches[0]?.clientX ?? null;
        parado.current = true;
      }}
      onTouchEnd={(e) => {
        const inicio = toqueX.current;
        const fim = e.changedTouches[0]?.clientX;
        toqueX.current = null;
        parado.current = false;

        if (inicio === null || fim === undefined) return;
        if (Math.abs(fim - inicio) < 50) return;

        passar(fim < inicio ? 1 : -1);
      }}
    >
      {/* O fundo: a própria foto, desfocada e apagada. */}
      {motos.map((item, posicao) =>
        capas[item.id] ? (
          <div
            key={item.id}
            aria-hidden="true"
            className={`cinema-fundo ${posicao === atual ? "cinema-ligado" : ""}`}
          >
            <Image
              src={capas[item.id]}
              alt=""
              fill
              sizes="50vw"
              quality={40}
              priority={posicao === 0}
              className="object-cover"
            />
          </div>
        ) : null
      )}

      <span aria-hidden="true" className="cinema-veu" />

      {/* A palavra gigante, apagada, atrás de tudo. */}
      <span aria-hidden="true" className="cinema-palavra titulo">
        {nomeDaCategoria(categoriaDaMoto(moto)) || "Blackout"}
      </span>

      <div className="relative mx-auto grid max-w-[1400px] items-center gap-8 px-4 pb-10 pt-8 sm:px-6 lg:min-h-[640px] lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)_3rem] lg:gap-12 lg:py-16">
        {/* O texto. No celular vem depois da foto. */}
        <div key={`texto-${moto.id}`} className="cinema-texto order-2 min-w-0 lg:order-none">
          <p className="titulo text-[clamp(3rem,7vw,5.5rem)] leading-none text-white/90">
            {String(atual + 1).padStart(2, "0")}
          </p>

          <p className="mt-3 text-[13px] font-bold uppercase tracking-[0.25em] ouro">
            {moto.na_capa ? "Destaque da loja" : "Chegou no pátio"}
          </p>

          <h1 className="mt-3">
            <span className="titulo block text-[clamp(2.6rem,7.5vw,5.2rem)] claro">
              {marca || "Moto"}
            </span>

            <span className="mt-2 flex items-center gap-4">
              <span className="titulo text-[clamp(1.3rem,3vw,2rem)] text-white/85">
                {modelo}
              </span>
              <span aria-hidden="true" className="risco hidden w-32 sm:block" />
            </span>
          </h1>

          <dl className="mt-6 flex flex-wrap gap-2">
            {ficha.map((item) => (
              <div key={item.rotulo} className="ficha-ladrilho">
                <dt className="text-[11px] uppercase tracking-wider suave">
                  {item.rotulo}
                </dt>
                <dd className="text-[15px] font-bold claro">{item.valor}</dd>
              </div>
            ))}

            <div className="ficha-ladrilho ficha-ladrilho-ouro">
              <dt className="text-[11px] uppercase tracking-wider suave">
                À vista
              </dt>
              <dd className="titulo text-[1.25rem] ouro">{precoDaMoto(moto)}</dd>
            </div>
          </dl>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/estoque/${slug}`}
              className="botao-ouro flex min-h-12 items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm"
            >
              Ver esta moto
              <ArrowRight size={16} />
            </Link>

            <a
              href={linkWhatsApp(convitePelaMoto(moto, linkDaFicha(slug)))}
              target="_blank"
              rel="noopener noreferrer"
              data-moto-card={moto.id}
              className="botao-vidro flex min-h-12 items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm"
            >
              <IconeWhatsApp className="h-4 w-4" />
              Chamar no WhatsApp
            </a>
          </div>

          <p className="mt-6 text-[13px] suave">
            <Link href="/estoque" className="font-bold claro underline-offset-4 hover:underline">
              Ver as {quantas} motos do estoque
            </Link>{" "}
            · financiamento e sua moto na troca
          </p>
        </div>

        {/* A moto, inteira, na moldura. */}
        <div className="order-1 min-w-0 lg:order-none">
          <Link
            href={`/estoque/${slug}`}
            aria-label={`Ver ${marca} ${modelo}`}
            className="cinema-moldura relative mx-auto block aspect-[4/5] w-full max-w-[26rem] overflow-hidden lg:max-w-none"
          >
            {motos.map((item, posicao) =>
              capas[item.id] ? (
                <Image
                  key={item.id}
                  src={capas[item.id]}
                  alt={posicao === atual ? `${marca} ${modelo} ${anoDaMoto(item)}` : ""}
                  fill
                  sizes="(max-width: 1024px) 90vw, 30rem"
                  quality={80}
                  priority={posicao === 0}
                  className={`object-cover transition-[opacity,transform] duration-[900ms] ease-out ${
                    posicao === atual ? "scale-100 opacity-100" : "scale-[1.04] opacity-0"
                  }`}
                />
              ) : null
            )}

            <span aria-hidden="true" className="reflexo-fixo" />
          </Link>
        </div>

        {/* O índice de lado, como nas capas de lançamento. */}
        {total > 1 && (
          <div className="order-3 flex items-center justify-center gap-4 lg:order-none lg:flex-col">
            <button
              type="button"
              onClick={() => passar(-1)}
              aria-label="Moto anterior"
              className="botao-vidro flex h-11 w-11 items-center justify-center rounded-full lg:hidden"
            >
              <ChevronLeft size={18} />
            </button>

            <ol className="flex gap-3 lg:flex-col lg:gap-4">
              {motos.map((item, posicao) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setAtual(posicao)}
                    aria-label={`Mostrar moto ${posicao + 1}`}
                    aria-current={posicao === atual}
                    className={`cinema-indice titulo text-[13px] ${
                      posicao === atual ? "cinema-indice-ligado" : ""
                    }`}
                  >
                    {String(posicao + 1).padStart(2, "0")}
                  </button>
                </li>
              ))}
            </ol>

            <button
              type="button"
              onClick={() => passar(1)}
              aria-label="Próxima moto"
              className="botao-vidro flex h-11 w-11 items-center justify-center rounded-full lg:hidden"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
