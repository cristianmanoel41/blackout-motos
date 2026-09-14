"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import { formatarData } from "@/lib/formatadores/data";
import { Megaphone, RefreshCcw } from "lucide-react";

/*
 * Situacao das motos na OLX.
 *
 * Agora que tudo e publicado pelo sistema, a pergunta do dia a
 * dia e "o que ja subiu e o que falta". Aqui as motos do
 * estoque aparecem com a situacao de cada uma, e o que ainda
 * nao foi anunciado fica no topo - que e o que pede acao.
 */

const supabase = createClient();

type Linha = {
  id: string;
  codigo: string | null;
  marca: string | null;
  modelo: string | null;
  placa: string | null;
  preco_anunciado: number | null;
  situacao: string;
  enviado_em: string | null;
  mensagem: string | null;
};

const CORES: Record<string, string> = {
  publicado:
    "border-green-700 bg-green-950/30 text-green-300",
  manual:
    "border-sky-700 bg-sky-950/30 text-sky-300",
  enviado:
    "border-yellow-700 bg-yellow-950/30 text-yellow-300",
  erro: "border-red-700 bg-red-950/40 text-red-300",
  removido:
    "border-grafite-claro bg-preto/40 text-texto-suave",
  nenhum:
    "border-grafite-claro bg-preto/40 text-texto-suave",
};

const NOMES: Record<string, string> = {
  publicado: "No ar",
  manual: "No ar (na mão)",
  enviado: "Enviado, aguardando",
  erro: "Deu erro",
  removido: "Tirado do ar",
  nenhum: "Não anunciada",
};

export default function SituacaoOlxPage() {
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);

    const { data: motos, error } = await supabase
      .from("motorcycles")
      .select(
        "id, codigo, marca, modelo, placa, preco_anunciado"
      )
      .neq("status", "vendida")
      .order("codigo", { ascending: false });

    if (error) {
      setErro(
        `Não foi possível carregar o estoque: ${error.message}`
      );

      setCarregando(false);
      return;
    }

    const { data: anuncios } = await supabase
      .from("olx_anuncios")
      .select(
        "motorcycle_id, situacao, enviado_em, mensagem"
      )
      .order("enviado_em", { ascending: false });

    /* O primeiro de cada moto é o mais recente. */
    const ultimo = new Map<string, any>();

    (anuncios || []).forEach((item: any) => {
      const chave = String(item.motorcycle_id);

      if (!ultimo.has(chave)) ultimo.set(chave, item);
    });

    setLinhas(
      (motos || []).map((moto: any) => {
        const anuncio = ultimo.get(String(moto.id));

        return {
          ...moto,
          situacao: anuncio?.situacao || "nenhum",
          enviado_em: anuncio?.enviado_em || null,
          mensagem: anuncio?.mensagem || null,
        };
      })
    );

    setCarregando(false);
  }

  async function marcarNaMao(linha: Linha) {
    setErro("");
    setAviso("");

    const { error } = await supabase
      .from("olx_anuncios")
      .insert({
        motorcycle_id: linha.id,
        situacao: "manual",
        mensagem: "Anunciada pelo site da OLX",
      });

    if (error) {
      setErro(
        `Não foi possível marcar: ${error.message}`
      );

      return;
    }

    await carregar();
  }

  /* Pergunta à OLX o que está no ar de verdade. */
  async function atualizar() {
    setErro("");
    setAviso("");
    setAtualizando(true);

    try {
      const resposta = await fetch("/api/olx/situacao", {
        method: "POST",
      });

      const dados = await resposta
        .json()
        .catch(() => null);

      if (!resposta.ok) {
        setErro(
          dados?.error ||
            "Não foi possível consultar a OLX."
        );

        return;
      }

      setAviso(
        `A OLX tem ${dados.naOlx} anúncio${
          dados.naOlx === 1 ? "" : "s"
        } no ar; ${dados.casadas} bate${
          dados.casadas === 1 ? "" : "m"
        } com motos do estoque.`
      );

      await carregar();
    } catch {
      setErro("Não foi possível falar com o servidor.");
    } finally {
      setAtualizando(false);
    }
  }

  /* Quem pede ação primeiro: não anunciada, erro, depois o resto. */
  const ordenadas = useMemo(() => {
    const peso: Record<string, number> = {
      nenhum: 0,
      erro: 1,
      enviado: 2,
      removido: 3,
      manual: 4,
      publicado: 5,
    };

    return [...linhas].sort(
      (a, b) =>
        (peso[a.situacao] ?? 9) - (peso[b.situacao] ?? 9)
    );
  }, [linhas]);

  const contagem = useMemo(() => {
    const mapa: Record<string, number> = {};

    linhas.forEach((linha) => {
      mapa[linha.situacao] =
        (mapa[linha.situacao] || 0) + 1;
    });

    return mapa;
  }, [linhas]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-dourado">
            <Megaphone size={24} />
            Anúncios na OLX
          </h1>

          <p className="mt-1 text-sm text-texto-suave">
            O que já subiu e o que ainda falta. Publicar é na
            ficha de cada moto.
          </p>
        </div>

        <button
          type="button"
          disabled={atualizando}
          onClick={atualizar}
          className="inline-flex items-center gap-2 rounded-lg bg-dourado px-4 py-2.5 text-sm font-bold text-preto transition hover:opacity-90 disabled:opacity-50"
        >
          <RefreshCcw size={16} />
          {atualizando
            ? "Consultando..."
            : "Conferir com a OLX"}
        </button>
      </div>

      {erro && (
        <div className="mb-5 rounded-lg border border-red-700 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {erro}
        </div>
      )}

      {aviso && (
        <div className="mb-5 rounded-lg border border-green-700 bg-green-950/30 px-4 py-3 text-sm text-green-300">
          {aviso}
        </div>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        {[
          "nenhum",
          "erro",
          "enviado",
          "manual",
          "publicado",
        ].map(
          (chave) =>
            contagem[chave] ? (
              <span
                key={chave}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${CORES[chave]}`}
              >
                {NOMES[chave]}: {contagem[chave]}
              </span>
            ) : null
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-grafite-claro bg-grafite">
        {carregando ? (
          <p className="p-8 text-center text-sm text-texto-suave">
            Carregando...
          </p>
        ) : ordenadas.length === 0 ? (
          <p className="p-8 text-center text-sm text-texto-suave">
            Nenhuma moto disponível no estoque.
          </p>
        ) : (
          <div className="divide-y divide-grafite-claro">
            {ordenadas.map((linha) => (
              <div
                key={linha.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-white">
                    {[linha.marca, linha.modelo]
                      .filter(Boolean)
                      .join(" ") || "Moto"}
                  </p>

                  <p className="text-xs text-texto-suave">
                    {[linha.codigo, linha.placa]
                      .filter(Boolean)
                      .join(" · ")}
                    {linha.preco_anunciado
                      ? ` · ${formatarMoeda(
                          linha.preco_anunciado
                        )}`
                      : ""}
                  </p>

                  {linha.mensagem &&
                    linha.situacao === "erro" && (
                      <p className="mt-1 text-xs text-red-300">
                        {linha.mensagem}
                      </p>
                    )}
                </div>

                <div className="flex items-center gap-3">
                  {linha.enviado_em && (
                    <span className="text-xs text-texto-suave">
                      {formatarData(linha.enviado_em)}
                    </span>
                  )}

                  <span
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                      CORES[linha.situacao] ||
                      CORES.nenhum
                    }`}
                  >
                    {NOMES[linha.situacao] ||
                      linha.situacao}
                  </span>

                  {linha.situacao === "nenhum" && (
                    <button
                      type="button"
                      onClick={() => marcarNaMao(linha)}
                      title="Registra que já está no ar, sem publicar nada"
                      className="rounded-lg border border-grafite-claro px-3 py-1.5 text-xs font-semibold text-texto-suave transition hover:border-sky-600 hover:text-sky-300"
                    >
                      Já está no ar
                    </button>
                  )}

                  <Link
                    href={`/motos/${linha.id}`}
                    className="rounded-lg border border-grafite-claro px-3 py-1.5 text-xs font-semibold text-texto-suave transition hover:border-dourado hover:text-dourado"
                  >
                    Abrir
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
