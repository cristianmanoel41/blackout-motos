"use client";

import { useCallback, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

/*
 * O PASSO A PASSO DAS TELAS DE COMPRA E DE VENDA
 *
 * As duas telas eram uma página comprida só, e cada pessoa
 * preenchia numa ordem. Aqui elas viram etapas, com Voltar e
 * Avançar, para a loja seguir sempre o mesmo caminho.
 *
 * É só apresentação: as etapas escondem as partes do mesmo
 * formulário, que continuam montadas. Nenhum campo, conta ou
 * gravação muda - o que estava preenchido continua lá ao
 * voltar, e o botão de salvar é o mesmo de antes, na última
 * etapa.
 *
 * Avançar confere os campos obrigatórios da etapa (os que têm
 * `required`) e o que a tela pedir em `conferir` - que mostra
 * o erro do jeito dela e devolve false para segurar a etapa. A
 * conferência completa continua onde sempre esteve, na hora de
 * salvar.
 */

export function usePassoAPasso(
  total: number,
  conferir?: (etapa: number) => boolean
) {
  const [etapa, setEtapa] = useState(0);
  const caixas = useRef<Array<HTMLDivElement | null>>([]);

  const irPara = useCallback(
    (destino: number) => {
      setEtapa(Math.max(0, Math.min(total - 1, destino)));
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [total]
  );

  /* Confere os obrigatórios da etapa aberta antes de sair dela. */
  const avancar = useCallback(() => {
    const caixa = caixas.current[etapa];
    const campos = caixa
      ? Array.from(
          caixa.querySelectorAll<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
          >("input, select, textarea")
        )
      : [];

    const invalido = campos.find((campo) => !campo.checkValidity());

    if (invalido) {
      invalido.reportValidity();
      return;
    }

    /* O erro da tela fica no topo: sobe até ele. */
    if (conferir && !conferir(etapa)) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    irPara(etapa + 1);
  }, [etapa, irPara, conferir]);

  const registrar = useCallback(
    (indice: number) => (elemento: HTMLDivElement | null) => {
      caixas.current[indice] = elemento;
    },
    []
  );

  return {
    etapa,
    ultima: etapa === total - 1,
    irPara,
    avancar,
    voltar: () => irPara(etapa - 1),
    reiniciar: () => setEtapa(0),
    registrar,
  };
}

/* Uma etapa: fica no formulário o tempo todo, só aparece quando é a vez. */
export function Passo({
  ativo,
  caixa,
  children,
}: {
  ativo: boolean;
  caixa: (elemento: HTMLDivElement | null) => void;
  children: React.ReactNode;
}) {
  return (
    <div ref={caixa} className={ativo ? "space-y-6" : "hidden"}>
      {children}
    </div>
  );
}

/*
 * A barra das etapas, no topo. Dá para voltar clicando numa
 * etapa já feita; para frente, só pelo Avançar, que confere.
 */
export function BarraDePassos({
  passos,
  etapa,
  aoIr,
}: {
  passos: string[];
  etapa: number;
  aoIr: (destino: number) => void;
}) {
  return (
    <nav aria-label="Etapas" className="mb-2">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500">
        Etapa {etapa + 1} de {passos.length}
      </p>

      <ol className="flex flex-wrap gap-2">
        {passos.map((nome, indice) => {
          const feita = indice < etapa;
          const atual = indice === etapa;

          return (
            <li key={nome}>
              <button
                type="button"
                disabled={!feita}
                onClick={() => aoIr(indice)}
                aria-current={atual ? "step" : undefined}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  atual
                    ? "border-yellow-500 bg-yellow-500 text-black"
                    : feita
                      ? "border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
                      : "cursor-default border-zinc-800 text-zinc-500"
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                    atual ? "bg-black/15" : feita ? "bg-yellow-500/15" : "bg-zinc-800"
                  }`}
                >
                  {feita ? <Check size={12} /> : indice + 1}
                </span>
                {nome}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* Voltar e Avançar, no pé de cada etapa. Na última, o botão de salvar da tela. */
export function BotoesDosPassos({
  etapa,
  ultima,
  aoVoltar,
  aoAvancar,
  salvar,
}: {
  etapa: number;
  ultima: boolean;
  aoVoltar: () => void;
  aoAvancar: () => void;
  /* O que vai no lugar do Avançar na última etapa. */
  salvar?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
      {etapa > 0 ? (
        <button
          type="button"
          onClick={aoVoltar}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-5 py-3 font-semibold text-zinc-300 transition hover:border-yellow-500 hover:text-yellow-500"
        >
          <ChevronLeft size={18} />
          Voltar
        </button>
      ) : (
        <span />
      )}

      {ultima ? (
        salvar
      ) : (
        <button
          type="button"
          onClick={aoAvancar}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-500 px-6 py-3 font-bold text-black transition hover:bg-yellow-400"
        >
          Avançar
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
}
