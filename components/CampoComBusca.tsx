"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

/*
 * Campo de escolha com busca.
 *
 * Você digita e a lista filtra. Se o que precisa não estiver
 * na lista, o que foi digitado vale do mesmo jeito - por isso
 * ele não impede cadastrar uma moto que o catálogo não tem.
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
  const [busca, setBusca] = useState("");
  const caixa = useRef<HTMLDivElement>(null);

  /* fecha ao clicar fora */
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

  const filtradas = useMemo(() => {
    const termo = semAcento(busca);

    if (!termo) return opcoes;

    return opcoes.filter((opcao) =>
      semAcento(opcao).includes(termo)
    );
  }, [opcoes, busca]);

  const digitadoEhNovo =
    busca.trim().length > 0 &&
    !opcoes.some(
      (opcao) => semAcento(opcao) === semAcento(busca)
    );

  function escolher(valor: string) {
    onChange(valor);
    setBusca("");
    setAberto(false);
  }

  return (
    <div ref={caixa} className="relative">
      <label className="mb-2 block text-sm font-medium text-texto-suave">
        {label}
      </label>

      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-grafite-claro bg-grafite-claro px-4 py-3 text-left text-texto outline-none transition focus:border-dourado"
      >
        <span
          className={
            value ? "truncate" : "truncate text-texto-suave"
          }
        >
          {value || placeholder || "Selecione"}
        </span>

        <ChevronDown
          size={17}
          className="shrink-0 text-texto-suave"
        />
      </button>

      {aviso && (
        <p className="mt-1 text-xs text-texto-suave">
          {aviso}
        </p>
      )}

      {aberto && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-lg border border-grafite-claro bg-grafite shadow-2xl">
          <div className="relative border-b border-grafite-claro">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-texto-suave"
            />

            <input
              autoFocus
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();

                  if (filtradas.length > 0) {
                    escolher(filtradas[0]);
                  } else if (busca.trim()) {
                    escolher(busca.trim());
                  }
                }

                if (e.key === "Escape") {
                  setAberto(false);
                }
              }}
              placeholder="Digite para procurar"
              className="w-full bg-transparent py-3 pl-9 pr-3 text-sm text-texto outline-none"
            />
          </div>

          <div className="max-h-64 overflow-y-auto">
            {filtradas.map((opcao) => (
              <button
                key={opcao}
                type="button"
                onClick={() => escolher(opcao)}
                className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm text-texto transition hover:bg-grafite-claro"
              >
                <span className="truncate">{opcao}</span>

                {value === opcao && (
                  <Check
                    size={15}
                    className="shrink-0 text-dourado"
                  />
                )}
              </button>
            ))}

            {filtradas.length === 0 && !digitadoEhNovo && (
              <p className="px-4 py-3 text-sm text-texto-suave">
                Nada encontrado.
              </p>
            )}

            {/*
              Escape para o que o catálogo não tem: o que foi
              digitado pode ser usado como está.
            */}
            {digitadoEhNovo && (
              <button
                type="button"
                onClick={() => escolher(busca.trim())}
                className="flex w-full items-center gap-2 border-t border-grafite-claro px-4 py-3 text-left text-sm text-dourado transition hover:bg-grafite-claro"
              >
                Usar &quot;{busca.trim()}&quot;
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
