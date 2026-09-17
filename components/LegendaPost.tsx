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
  const [anunciando, setAnunciando] = useState(false);
  const [previa, setPrevia] = useState<any>(null);

  /*
   * Mostra o que seria enviado sem enviar. Passa pelo mesmo
   * caminho do envio de verdade, entao o que aparece aqui e o
   * que vai - inclusive como a OLX entendeu marca e modelo,
   * que e onde da para errar sem perceber.
   */
  async function verPrevia() {
    const texto = legenda.trim();

    if (!texto) {
      setErro(
        "Gere a descrição primeiro, no botão Descrição p/ OLX."
      );

      return;
    }

    setErro("");
    setAviso("");
    setPrevia(null);
    setAnunciando(true);

    try {
      const resposta = await fetch("/api/olx/anunciar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          motorcycleId,
          descricao: texto,
          acao: "previa",
        }),
      });

      const dados = await resposta
        .json()
        .catch(() => null);

      if (!resposta.ok) {
        setErro(
          dados?.error || "Não foi possível montar a prévia."
        );

        return;
      }

      setPrevia(dados);
    } catch {
      setErro("Não foi possível falar com o servidor.");
    } finally {
      setAnunciando(false);
    }
  }
  const [aviso, setAviso] = useState("");

  /*
   * Publica na OLX com o texto que esta na caixa - o mesmo que
   * voce leu e ajustou. Uma moto por vez, so no clique.
   */
  async function removerDaOlx() {
    const confirmar = window.confirm(
      "Tirar o anúncio desta moto do ar na OLX?"
    );

    if (!confirmar) return;

    setErro("");
    setAviso("");
    setAnunciando(true);

    try {
      const resposta = await fetch("/api/olx/anunciar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          motorcycleId,
          acao: "remover",
        }),
      });

      const dados = await resposta
        .json()
        .catch(() => null);

      if (!resposta.ok) {
        setErro(
          dados?.error || "Não foi possível remover."
        );

        return;
      }

      setAviso(
        "Pedido de remoção enviado. A OLX leva alguns minutos para tirar do ar."
      );
    } catch {
      setErro("Não foi possível falar com o servidor.");
    } finally {
      setAnunciando(false);
    }
  }

  async function anunciar() {
    const texto = legenda.trim();

    if (!texto) {
      setErro(
        "Gere a descrição primeiro, no botão Descrição p/ OLX."
      );

      return;
    }

    const confirmar = window.confirm(
      "Publicar esta moto na OLX com a descrição que está na caixa?"
    );

    if (!confirmar) return;

    setErro("");
    setAviso("");
    setAnunciando(true);

    try {
      const resposta = await fetch("/api/olx/anunciar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          motorcycleId,
          descricao: texto,
        }),
      });

      const dados = await resposta
        .json()
        .catch(() => null);

      if (!resposta.ok) {
        setErro(
          dados?.error || "Não foi possível anunciar."
        );

        return;
      }

      setAviso(
        `Enviado para a OLX como ${dados.anunciadoComo}, com ${
          dados.fotos
        } foto${dados.fotos === 1 ? "" : "s"}, como ${
          dados.anunciadoComo
        }. Confira se é essa a moto. A OLX leva alguns minutos para publicar.`
      );
    } catch {
      setErro("Não foi possível falar com o servidor.");
    } finally {
      setAnunciando(false);
    }
  }

  async function gerar(
    estilo:
      | "chamada"
      | "detalhada"
      | "feed"
      | "story"
      | "olx"
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
            Sai pronta para copiar e colar. Edite antes, se
            quiser.
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
            onClick={() => gerar("olx")}
            title="Sem hashtag e com o endereço da loja, para classificado"
            className="inline-flex items-center gap-2 rounded-lg bg-dourado px-3 py-2 text-xs font-bold text-preto transition hover:opacity-90 disabled:opacity-50"
          >
            {gerando === "olx"
              ? "Montando..."
              : "Descrição p/ OLX"}
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

      {aviso && (
        <div className="mb-4 rounded-lg border border-green-700 bg-green-950/30 px-4 py-3 text-sm text-green-300">
          {aviso}
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
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-texto-suave">
            {legenda.length} caracteres
          </span>

          <div className="flex flex-wrap gap-2">

          <button
            type="button"
            disabled={anunciando}
            onClick={verPrevia}
            className="rounded-lg border border-grafite-claro px-3 py-2 text-sm font-semibold text-texto transition hover:border-dourado hover:text-dourado disabled:opacity-50"
          >
            Ver prévia
          </button>

          <button
            type="button"
            disabled={anunciando}
            onClick={removerDaOlx}
            title="Tira da OLX o anúncio publicado pelo sistema"
            className="rounded-lg border border-grafite-claro px-3 py-2 text-sm font-semibold text-texto-suave transition hover:border-red-700 hover:text-red-300 disabled:opacity-50"
          >
            Tirar da OLX
          </button>

          <button
            type="button"
            disabled={anunciando}
            onClick={anunciar}
            className="inline-flex items-center gap-2 rounded-lg border border-dourado px-4 py-2 text-sm font-bold text-dourado transition hover:bg-dourado hover:text-preto disabled:opacity-50"
          >
            {anunciando
              ? "Enviando..."
              : "Publicar na OLX"}
          </button>

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
        </div>
      )}

      {previa && (
        <div className="mt-4 overflow-hidden rounded-xl border border-dourado/50 bg-preto/40">
          <div className="border-b border-grafite-claro px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-texto-suave">
              Como vai ficar na OLX
            </p>

            <p className="mt-1 font-bold text-white">
              {previa.titulo}
            </p>

            <p className="text-lg font-bold text-dourado">
              {previa.preco?.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
                minimumFractionDigits: 0,
              })}
            </p>
          </div>

          {previa.fotos?.length > 0 && (
            <p className="border-b border-grafite-claro px-3 pt-3 text-xs text-texto-suave">
              <strong className="text-dourado">
                {previa.fotos.length}
              </strong>{" "}
              foto{previa.fotos.length === 1 ? "" : "s"} 
              {previa.fotos.length === 1 ? "será" : "serão"} enviada
              {previa.fotos.length === 1 ? "" : "s"} · a primeira vira a
              principal do anúncio
            </p>
          )}

          {previa.fotos?.length > 0 && (
            <div className="flex gap-2 overflow-x-auto border-b border-grafite-claro p-3">
              {previa.fotos.map(
                (endereco: string, indice: number) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    key={endereco}
                    src={endereco}
                    alt={`Foto ${indice + 1}`}
                    className="h-20 w-28 shrink-0 rounded border border-grafite-claro object-cover"
                  />
                )
              )}
            </div>
          )}

          <div className="border-b border-grafite-claro px-4 py-3">
            <p className="mb-2 text-xs uppercase tracking-wide text-texto-suave">
              Como a OLX entendeu a moto
            </p>

            <div className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {[
                ["Marca", previa.entendido?.marca],
                ["Modelo", previa.entendido?.modelo],
                ["Versão", previa.entendido?.versao],
                [
                  "Cilindrada",
                  previa.entendido?.cilindrada,
                ],
                ["Ano", previa.entendido?.ano],
                [
                  "Km",
                  previa.entendido?.km?.toLocaleString(
                    "pt-BR"
                  ),
                ],
              ].map(([rotulo, valor]) => (
                <p key={String(rotulo)}>
                  <span className="text-texto-suave">
                    {rotulo}:{" "}
                  </span>
                  <span className="text-white">
                    {valor || "—"}
                  </span>
                </p>
              ))}
            </div>

            <p className="mt-3 text-xs text-texto-suave">
              Confira o modelo e a versão. Se a OLX entendeu
              outra moto, corrija o nome na ficha antes de
              publicar.
            </p>
          </div>

          <pre className="whitespace-pre-wrap px-4 py-3 text-sm text-texto">
            {previa.descricao}
          </pre>
        </div>
      )}
    </div>
  );
}
