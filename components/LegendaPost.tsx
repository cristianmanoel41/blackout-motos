"use client";

import { useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";

/*
 * Legenda do post.
 *
 * Escrever texto de anuncio no meio do atendimento trava. Aqui
 * sai pronto a partir da ficha da moto: "chamada" para o dia a
 * dia e "detalhada" para quando o cliente quer a ficha toda.
 *
 * O texto vem num campo editavel de proposito - quem conhece a
 * moto e a loja, nao o computador.
 */

export default function LegendaPost({
  motorcycleId,
}: {
  motorcycleId: string;
}) {
  const [legenda, setLegenda] = useState("");
  const [gerando, setGerando] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState("");

  async function gerar(
    estilo:
      | "chamada"
      | "detalhada"
      | "feed"
      | "story"
      | "pedido"
  ) {
    setErro("");
    setCopiado(false);
    setGerando(estilo);

    try {
      const resposta = await fetch("/api/legenda", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          motorcycleId,
          estilo,
        }),
      });

      const dados = await resposta
        .json()
        .catch(() => null);

      if (!resposta.ok) {
        setErro(
          dados?.error ||
            "Não foi possível gerar a legenda."
        );

        return;
      }

      setLegenda(dados.legenda || "");
    } catch {
      setErro("Não foi possível falar com o servidor.");
    } finally {
      setGerando("");
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(legenda);

      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErro(
        "O navegador não deixou copiar. Selecione o texto e use Ctrl+C."
      );
    }
  }

  const botaoClass =
    "inline-flex items-center gap-2 rounded-lg border border-grafite-claro px-3 py-2 text-xs font-semibold text-texto-suave transition hover:border-dourado hover:text-dourado disabled:opacity-50";

  return (
    <div className="rounded-xl border border-grafite-claro bg-grafite p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-dourado">
            <Sparkles size={18} />
            Legenda para o post
          </h2>

          <p className="mt-1 text-xs text-texto-suave">
            Sai pronta para copiar e colar no TikTok. Edite
            antes, se quiser.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={Boolean(gerando)}
            onClick={() => gerar("feed")}
            className="inline-flex items-center gap-2 rounded-lg bg-dourado px-3 py-2 text-xs font-bold text-preto transition hover:opacity-90 disabled:opacity-50"
          >
            {gerando === "feed"
              ? "Montando..."
              : "Post do feed"}
          </button>

          <button
            type="button"
            disabled={Boolean(gerando)}
            onClick={() => gerar("story")}
            title="Texto curto, para ir junto com a foto de capa"
            className={botaoClass}
          >
            {gerando === "story" ? "Montando..." : "Story"}
          </button>

          <button
            type="button"
            disabled={Boolean(gerando)}
            onClick={() => gerar("chamada")}
            className={botaoClass}
          >
            {gerando === "chamada"
              ? "Escrevendo..."
              : "Chamada curta"}
          </button>

          <button
            type="button"
            disabled={Boolean(gerando)}
            onClick={() => gerar("detalhada")}
            className={botaoClass}
          >
            {gerando === "detalhada"
              ? "Escrevendo..."
              : "Detalhada"}
          </button>

        </div>
      </div>

      {erro && (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {erro}
        </div>
      )}

      <textarea
        value={legenda}
        onChange={(evento) =>
          setLegenda(evento.target.value)
        }
        rows={10}
        placeholder="Escolha um dos dois botões acima, ou escreva aqui."
        className="w-full rounded-lg border border-grafite-claro bg-preto px-4 py-3 text-sm text-white outline-none transition placeholder:text-texto-suave focus:border-dourado"
      />

      <div className="mt-3 border-t border-grafite-claro pt-3">
        <button
          type="button"
          disabled={Boolean(gerando)}
          onClick={() => gerar("pedido")}
          className="text-xs text-texto-suave underline underline-offset-4 transition hover:text-dourado disabled:opacity-50"
        >
          {gerando === "pedido"
            ? "Montando..."
            : "Quero um texto mais solto — montar pedido para colar no ChatGPT"}
        </button>

        <p className="mt-1 text-[11px] text-texto-suave">
          Esse não é a legenda: é o pedido que você cola no
          ChatGPT, e ele devolve as opções.
        </p>
      </div>

      {legenda && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-texto-suave">
            {legenda.length} caracteres
          </span>

          <button
            type="button"
            onClick={copiar}
            className="inline-flex items-center gap-2 rounded-lg bg-dourado px-4 py-2 text-sm font-bold text-preto transition hover:opacity-90"
          >
            {copiado ? (
              <>
                <Check size={15} />
                Copiado
              </>
            ) : (
              <>
                <Copy size={15} />
                Copiar
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
