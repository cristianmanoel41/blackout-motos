"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  formatarMoeda,
  mascaraMoeda,
  valorDaMascara,
} from "@/lib/formatadores/moeda";
import { formatarData } from "@/lib/formatadores/data";
import {
  Check,
  NotebookPen,
  Plus,
  Trash2,
} from "lucide-react";

/*
 * Anotações do dia.
 *
 * No meio do atendimento sai R$40 de almoço, R$80 de gasolina.
 * Parar para lançar direito não dá, e deixar para depois é
 * como o dinheiro some do controle.
 *
 * Aqui a linha é escrita na hora e fica numa fila. Depois, com
 * calma, vira despesa de verdade. Enquanto está na fila não
 * entra no caixa nem no lucro - é lembrete, não lançamento.
 */

const supabase = createClient();

const CATEGORIAS = ["Gastos do dia", "Funcionários"];

type Anotacao = {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  lancada: boolean;
  lancada_em: string | null;
  criado_em: string;
};

function hoje() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
}

export default function AnotacoesPage() {
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [data, setData] = useState(hoje());
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");

  /* Qual anotação está com o formulário de lançar aberto. */
  const [lancandoId, setLancandoId] = useState("");
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);

    const { data: linhas, error } = await supabase
      .from("anotacoes_diarias")
      .select("*")
      .order("data", { ascending: false })
      .order("criado_em", { ascending: false });

    if (error) {
      setErro(
        `Não foi possível carregar as anotações: ${error.message}`
      );

      setCarregando(false);
      return;
    }

    setAnotacoes((linhas as Anotacao[]) || []);
    setCarregando(false);
  }

  async function anotar() {
    setErro("");

    const texto = descricao.trim();
    const numero = valorDaMascara(valor);

    if (!texto) {
      setErro("Escreva o que foi gasto.");
      return;
    }

    if (!Number.isFinite(numero) || numero <= 0) {
      setErro("Informe o valor.");
      return;
    }

    setSalvando(true);

    const { error } = await supabase
      .from("anotacoes_diarias")
      .insert({
        data,
        descricao: texto,
        valor: numero,
      });

    setSalvando(false);

    if (error) {
      setErro(`Não foi possível anotar: ${error.message}`);
      return;
    }

    setDescricao("");
    setValor("");

    await carregar();
  }

  /*
   * Vira despesa da loja de verdade: cria a despesa, tira o
   * dinheiro do caixa e marca a anotação como lançada. Se o
   * caixa falhar, a despesa é desfeita para não sobrar metade.
   */
  async function lancar(anotacao: Anotacao) {
    setErro("");
    setSalvando(true);

    const { data: despesa, error: erroDespesa } =
      await supabase
        .from("store_expenses")
        .insert({
          data: anotacao.data,
          categoria,
          descricao: anotacao.descricao,
          valor: anotacao.valor,
          forma_pagamento: "Dinheiro",
          pago: true,
          data_pagamento: anotacao.data,
        })
        .select("id")
        .single();

    if (erroDespesa || !despesa) {
      setSalvando(false);

      setErro(
        `Não foi possível lançar: ${
          erroDespesa?.message || "despesa não criada"
        }`
      );

      return;
    }

    const { error: erroCaixa } = await supabase
      .from("cash_transactions")
      .insert({
        data: anotacao.data,
        tipo: "saida",
        origem: "despesa_loja",
        origem_id: despesa.id,
        valor: anotacao.valor,
        descricao: `${categoria} - ${anotacao.descricao}`,
        confirmado: true,
        data_confirmacao: anotacao.data,
      });

    if (erroCaixa) {
      await supabase
        .from("store_expenses")
        .delete()
        .eq("id", despesa.id);

      setSalvando(false);

      setErro(
        `Não foi possível lançar no caixa: ${erroCaixa.message}`
      );

      return;
    }

    const { error: erroMarca } = await supabase
      .from("anotacoes_diarias")
      .update({
        lancada: true,
        lancada_em: new Date().toISOString(),
        store_expense_id: despesa.id,
      })
      .eq("id", anotacao.id);

    setSalvando(false);

    if (erroMarca) {
      setErro(
        `A despesa entrou, mas a anotação não foi marcada: ${erroMarca.message}`
      );
    }

    setLancandoId("");
    await carregar();
  }

  /* Para o que foi lançado em outro lugar - um gasto de moto. */
  async function marcarLancada(anotacao: Anotacao) {
    setErro("");

    const { error } = await supabase
      .from("anotacoes_diarias")
      .update({
        lancada: true,
        lancada_em: new Date().toISOString(),
      })
      .eq("id", anotacao.id);

    if (error) {
      setErro(`Não foi possível marcar: ${error.message}`);
      return;
    }

    await carregar();
  }

  async function apagar(anotacao: Anotacao) {
    const confirmar = window.confirm(
      `Apagar a anotação "${anotacao.descricao}"?`
    );

    if (!confirmar) return;

    setErro("");

    const { data: apagadas, error } = await supabase
      .from("anotacoes_diarias")
      .delete()
      .eq("id", anotacao.id)
      .select("id");

    if (error || !apagadas?.length) {
      setErro(
        `Não foi possível apagar: ${
          error?.message || "sem permissão"
        }`
      );

      return;
    }

    await carregar();
  }

  const pendentes = useMemo(
    () => anotacoes.filter((item) => !item.lancada),
    [anotacoes]
  );

  const lancadas = useMemo(
    () => anotacoes.filter((item) => item.lancada),
    [anotacoes]
  );

  const totalPendente = pendentes.reduce(
    (soma, item) => soma + Number(item.valor || 0),
    0
  );

  /* Pendentes agrupadas por dia. */
  const porDia = useMemo(() => {
    const mapa = new Map<string, Anotacao[]>();

    pendentes.forEach((item) => {
      const lista = mapa.get(item.data) || [];

      lista.push(item);
      mapa.set(item.data, lista);
    });

    return Array.from(mapa.entries());
  }, [pendentes]);

  const campoClass =
    "w-full rounded-lg border border-grafite-claro bg-preto px-3 py-2.5 text-sm text-white outline-none transition focus:border-dourado";

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-dourado">
          <NotebookPen size={24} />
          Anotações do Dia
        </h1>

        <p className="mt-1 text-sm text-texto-suave">
          Escreva o gasto na hora. Depois, com calma, cada linha
          vira despesa. Enquanto está aqui, não entra no caixa
          nem no lucro.
        </p>
      </div>

      {erro && (
        <div className="mb-5 rounded-lg border border-red-700 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {erro}
        </div>
      )}

      {/* ANOTAR */}

      <div className="mb-6 rounded-xl border border-dourado/40 bg-grafite p-5">
        <div className="grid gap-3 md:grid-cols-[140px_1fr_150px_auto] md:items-end">
          <div>
            <label className="mb-1 block text-xs text-texto-suave">
              Data
            </label>

            <input
              type="date"
              value={data}
              onChange={(evento) =>
                setData(evento.target.value)
              }
              className={campoClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-texto-suave">
              O que foi
            </label>

            <input
              value={descricao}
              onChange={(evento) =>
                setDescricao(evento.target.value)
              }
              onKeyDown={(evento) => {
                if (evento.key === "Enter") anotar();
              }}
              placeholder="Ex.: almoço da equipe"
              className={campoClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-texto-suave">
              Valor
            </label>

            <input
              inputMode="numeric"
              value={valor}
              onChange={(evento) =>
                setValor(
                  mascaraMoeda(evento.target.value)
                )
              }
              onKeyDown={(evento) => {
                if (evento.key === "Enter") anotar();
              }}
              placeholder="0,00"
              className={campoClass}
            />
          </div>

          <button
            type="button"
            disabled={salvando}
            onClick={anotar}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-dourado px-5 py-2.5 text-sm font-bold text-preto transition hover:opacity-90 disabled:opacity-50"
          >
            <Plus size={16} />
            Anotar
          </button>
        </div>
      </div>

      {/* PENDENTES */}

      <div className="mb-6 overflow-hidden rounded-xl border border-grafite-claro bg-grafite">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-grafite-claro px-5 py-3">
          <h2 className="font-semibold text-dourado">
            Ainda não lançadas
          </h2>

          <span className="text-sm text-texto-suave">
            {pendentes.length}{" "}
            {pendentes.length === 1
              ? "anotação"
              : "anotações"}{" "}
            ·{" "}
            <strong className="text-white">
              {formatarMoeda(totalPendente)}
            </strong>
          </span>
        </div>

        {carregando ? (
          <p className="p-8 text-center text-texto-suave">
            Carregando...
          </p>
        ) : pendentes.length === 0 ? (
          <p className="p-8 text-center text-texto-suave">
            Nada esperando. Tudo que foi anotado já virou
            despesa.
          </p>
        ) : (
          <div className="divide-y divide-grafite-claro">
            {porDia.map(([dia, itens]) => (
              <div key={dia}>
                <div className="flex items-center justify-between bg-preto/40 px-5 py-2 text-xs">
                  <span className="font-semibold text-white">
                    {formatarData(dia)}
                  </span>

                  <span className="text-texto-suave">
                    {formatarMoeda(
                      itens.reduce(
                        (soma, item) =>
                          soma + Number(item.valor || 0),
                        0
                      )
                    )}
                  </span>
                </div>

                {itens.map((anotacao) => (
                  <div key={anotacao.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-sm text-white">
                        {anotacao.descricao}
                      </span>

                      <div className="flex items-center gap-3">
                        <strong className="text-sm text-white">
                          {formatarMoeda(anotacao.valor)}
                        </strong>

                        <button
                          type="button"
                          onClick={() =>
                            setLancandoId(
                              lancandoId === anotacao.id
                                ? ""
                                : anotacao.id
                            )
                          }
                          className="rounded-lg bg-dourado px-3 py-1.5 text-xs font-bold text-preto transition hover:opacity-90"
                        >
                          Lançar
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            marcarLancada(anotacao)
                          }
                          title="Já lancei em outro lugar"
                          className="rounded-lg border border-grafite-claro p-1.5 text-texto-suave transition hover:border-dourado hover:text-dourado"
                        >
                          <Check size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => apagar(anotacao)}
                          className="rounded-lg border border-grafite-claro p-1.5 text-red-300 transition hover:border-red-700 hover:bg-red-950/30"
                          aria-label="Apagar anotação"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {lancandoId === anotacao.id && (
                      <div className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-grafite-claro bg-preto/30 p-4">
                        <div>
                          <label className="mb-1 block text-xs text-texto-suave">
                            Categoria
                          </label>

                          <select
                            value={categoria}
                            onChange={(evento) =>
                              setCategoria(evento.target.value)
                            }
                            className={campoClass}
                          >
                            {CATEGORIAS.map((nome) => (
                              <option key={nome} value={nome}>
                                {nome}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="button"
                          disabled={salvando}
                          onClick={() => lancar(anotacao)}
                          className="rounded-lg bg-dourado px-4 py-2.5 text-sm font-bold text-preto transition hover:opacity-90 disabled:opacity-50"
                        >
                          {salvando
                            ? "Lançando..."
                            : "Lançar como despesa"}
                        </button>

                        <button
                          type="button"
                          onClick={() => setLancandoId("")}
                          className="rounded-lg border border-grafite-claro px-4 py-2.5 text-sm text-texto-suave transition hover:border-dourado hover:text-dourado"
                        >
                          Voltar
                        </button>

                        <p className="w-full text-xs text-texto-suave">
                          Sai do caixa em{" "}
                          {formatarData(anotacao.data)}, como
                          pago. Se for gasto de uma moto, lance
                          pela ficha dela e use o ✓ aqui.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* JÁ LANÇADAS */}

      {lancadas.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-grafite-claro bg-grafite">
          <div className="border-b border-grafite-claro px-5 py-3">
            <h2 className="font-semibold text-dourado">
              Já lançadas
            </h2>
          </div>

          <div className="divide-y divide-grafite-claro">
            {lancadas.slice(0, 40).map((anotacao) => (
              <div
                key={anotacao.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 text-sm"
              >
                <span className="text-texto-suave">
                  {formatarData(anotacao.data)} ·{" "}
                  {anotacao.descricao}
                </span>

                <span className="text-texto-suave">
                  {formatarMoeda(anotacao.valor)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
