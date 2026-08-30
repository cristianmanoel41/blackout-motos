"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

/*
 * Campo de texto com sugestões.
 *
 * Funciona como um campo comum: você digita o que quiser e o
 * que foi digitado é o valor, sem precisar escolher nada. À
 * medida que digita, aparecem as sugestões do catálogo, e a
 * seta abre a lista inteira.
 *
 * Nada aqui bloqueia um valor fora da lista - o catálogo não
 * tem todas as motos do mercado.
 */

function semAcento(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function CampoComBusca({
  label,
  value,
  onChange,
  opcoes,
  placeholder = "",
  aviso,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  opcoes: readonly string[];
  placeholder?: string;
  aviso?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [destaque, setDestaque] = useState(0);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function aoClicarFora(evento: MouseEvent) {
      if (
        caixa.current &&
        !caixa.current.contains(evento.target as Node)
      ) {
        setAberto(false);
      }
    }

    document.addEventListener("mousedown", aoClicarFora);

    return () =>
      document.removeEventListener(
        "mousedown",
        aoClicarFora
      );
  }, []);

  /*
   * Filtra pelo que já está escrito no campo. Quando o texto
   * é exatamente uma das opções, mostra a lista toda - senão
   * escolher uma sugestão faria a lista sumir para um item só.
   */
  const sugestoes = useMemo(() => {
    const termo = semAcento(value);

    if (!termo) return opcoes;

    const exata = opcoes.some(
      (opcao) => semAcento(opcao) === termo
    );

    if (exata) return opcoes;

    return opcoes.filter((opcao) =>
      semAcento(opcao).includes(termo)
    );
  }, [opcoes, value]);

  function escolher(opcao: string) {
    onChange(opcao);
    setAberto(false);
  }

  return (
    <div ref={caixa} className="relative">
      <label className="mb-2 block text-sm font-medium text-texto-suave">
        {label}
      </label>

      <div className="relative">
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setAberto(true);
            setDestaque(0);
          }}
          onFocus={() => setAberto(true)}
          onKeyDown={(e) => {
            if (!aberto && e.key === "ArrowDown") {
              setAberto(true);
              return;
            }

            if (e.key === "ArrowDown") {
              e.preventDefault();
              setDestaque((atual) =>
                Math.min(atual + 1, sugestoes.length - 1)
              );
            }

            if (e.key === "ArrowUp") {
              e.preventDefault();
              setDestaque((atual) =>
                Math.max(atual - 1, 0)
              );
            }

            if (e.key === "Enter" && aberto) {
              const escolhida = sugestoes[destaque];

              if (escolhida) {
                e.preventDefault();
                escolher(escolhida);
              }
            }

            if (e.key === "Escape") {
              setAberto(false);
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-lg border border-grafite-claro bg-grafite-claro py-3 pl-4 pr-10 text-texto outline-none transition focus:border-dourado"
        />

        <button
          type="button"
          tabIndex={-1}
          onClick={() => setAberto((atual) => !atual)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-texto-suave transition hover:text-dourado"
          aria-label="Ver a lista"
        >
          <ChevronDown size={17} />
        </button>
      </div>

      {aviso && (
        <p className="mt-1 text-xs text-texto-suave">
          {aviso}
        </p>
      )}

      {aberto && sugestoes.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-64 overflow-y-auto rounded-lg border border-grafite-claro bg-grafite shadow-2xl">
          {sugestoes.map((opcao, indice) => (
            <button
              key={opcao}
              type="button"
              onMouseEnter={() => setDestaque(indice)}
              onClick={() => escolher(opcao)}
              className={`block w-full px-4 py-2.5 text-left text-sm transition ${
                indice === destaque
                  ? "bg-grafite-claro text-dourado"
                  : "text-texto hover:bg-grafite-claro"
              }`}
            >
              {opcao}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
