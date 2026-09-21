"use client";

import { useEffect, useState } from "react";

/*
 * A segunda linha da capa, escrita letra por letra.
 *
 * O texto vem inteiro do servidor: quem chega sem o JS pronto
 * - buscador, celular em rede ruim - lê a frase completa, e
 * não uma linha vazia. Quando o JS assume, ele apaga e
 * escreve de novo, agora devagar.
 *
 * Para não piscar a frase pronta antes disso, o site.css
 * esconde esta linha assim que a página descobre que tem JS,
 * e ela volta no primeiro quadro da animação. Como é
 * `visibility`, a linha continua ocupando o lugar dela: nada
 * pula quando o texto começa a aparecer.
 *
 * Quem pediu menos animação no sistema não vê nada disso - a
 * frase fica escrita e pronto.
 */

const PARTES = [
  { texto: "moto", ouro: true },
  { texto: " está aqui", ouro: false },
];

const COMPLETO = PARTES.map((parte) => parte.texto).join("");

/* Rápido o bastante para não cansar quem já conhece o site. */
const PASSO = 55;

export default function TituloAnimado() {
  const [escritas, setEscritas] = useState(COMPLETO.length);
  const [pronto, setPronto] = useState(false);
  const [escrevendo, setEscrevendo] = useState(false);

  useEffect(() => {
    setPronto(true);

    const parado = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (parado) return;

    setEscritas(0);
    setEscrevendo(true);

    let quantas = 0;

    const relogio = window.setInterval(() => {
      quantas += 1;
      setEscritas(quantas);

      if (quantas >= COMPLETO.length) {
        window.clearInterval(relogio);
        setEscrevendo(false);
      }
    }, PASSO);

    return () => window.clearInterval(relogio);
  }, []);

  /* Quantas letras cada pedaço já mostra. */
  let gastas = 0;

  return (
    <span
      className={`titulo-escreve ${pronto ? "pronto" : ""}`}
    >
      {PARTES.map((parte) => {
        const cabe = Math.max(
          0,
          Math.min(parte.texto.length, escritas - gastas)
        );

        gastas += parte.texto.length;

        return (
          <span
            key={parte.texto}
            className={parte.ouro ? "texto-ouro" : ""}
          >
            {parte.texto.slice(0, cabe)}
          </span>
        );
      })}

      <span
        aria-hidden="true"
        className={`cursor-escrita ${
          escrevendo ? "" : "piscando"
        }`}
      />
    </span>
  );
}
