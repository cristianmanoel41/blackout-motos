"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import { formatarData } from "@/lib/formatadores/data";
import {
  Check,
  Pencil,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
} from "lucide-react";

/*
 * Lista de despesas da loja.
 *
 * Antes a tela somava tudo que já tinha sido lançado, desde
 * sempre - um número que só cresce e não diz nada. Aqui os
 * totais são do período escolhido, separados por pago e em
 * aberto, com o que está vencido em destaque.
 */

const supabase = createClient();

export type Despesa = {
  id: string;
  data: string;
  categoria: string | null;
  descricao: string | null;
  valor: number;
  forma_pagamento: string | null;
  pago: boolean;
  data_pagamento: string | null;
  observacoes: string | null;
};

/* As mesmas do cadastro de despesa. */
const categorias = [
  "Aluguel",
  "Água",
  "Energia",
  "Internet",
  "Funcionários",
  "Comissão",
  "Contador",
  "Impostos",
  "Anúncios",
  "Combustível",
  "Materiais",
  "Manutenção",
  "Alimentação",
  "Outros",
];

const nomesMeses = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function semAcento(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function hojeISO() {
  const data = new Date();
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

export default function DespesasLista({
  despesas,
}: {
  despesas: Despesa[];
}) {
  const router = useRouter();

  const hoje = new Date();

  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [periodoTodo, setPeriodoTodo] = useState(false);
  const [situacao, setSituacao] = useState<
    "todas" | "pagas" | "abertas"
  >("todas");
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState("");

  const [editandoId, setEditandoId] = useState("");

  const [formEdicao, setFormEdicao] = useState({
    data: "",
    categoria: "",
    descricao: "",
    valor: "",
    observacoes: "",
  });
  const [ocupado, setOcupado] = useState("");

  /* Despesas do período escolhido. */
  const doPeriodo = useMemo(() => {
    if (periodoTodo) return despesas;

    const prefixo = `${ano}-${String(mes).padStart(
      2,
      "0"
    )}`;

    return despesas.filter((despesa) =>
      (despesa.data || "").startsWith(prefixo)
    );
  }, [despesas, mes, ano, periodoTodo]);

  const filtradas = useMemo(() => {
    const termo = semAcento(busca);

    return doPeriodo.filter((despesa) => {
      if (situacao === "pagas" && !despesa.pago) {
        return false;
      }

      if (situacao === "abertas" && despesa.pago) {
        return false;
      }

      if (!termo) return true;

      return semAcento(
        [
          despesa.categoria,
          despesa.descricao,
          despesa.forma_pagamento,
          despesa.observacoes,
        ]
          .filter(Boolean)
          .join(" ")
      ).includes(termo);
    });
  }, [doPeriodo, situacao, busca]);

  const totais = useMemo(() => {
    const referencia = hojeISO();

    return doPeriodo.reduce(
      (resumo, despesa) => {
        const valor = Number(despesa.valor || 0);

        return {
          total: resumo.total + valor,
          pago: resumo.pago + (despesa.pago ? valor : 0),
          aberto:
            resumo.aberto + (despesa.pago ? 0 : valor),
          vencido:
            resumo.vencido +
            (!despesa.pago && despesa.data < referencia
              ? valor
              : 0),
        };
      },
      { total: 0, pago: 0, aberto: 0, vencido: 0 }
    );
  }, [doPeriodo]);

  /* Quanto foi gasto em cada categoria, do maior para o menor. */
  const porCategoria = useMemo(() => {
    const mapa = new Map<string, number>();

    doPeriodo.forEach((despesa) => {
      const nome = despesa.categoria || "Sem categoria";

      mapa.set(
        nome,
        (mapa.get(nome) || 0) + Number(despesa.valor || 0)
      );
    });

    return Array.from(mapa.entries())
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor);
  }, [doPeriodo]);

  const anos = Array.from(
    { length: 5 },
    (_, i) => hoje.getFullYear() - i
  );

  function abrirEdicao(despesa: Despesa) {
    setErro("");
    setEditandoId(despesa.id);

    setFormEdicao({
      data: (despesa.data || "").slice(0, 10),
      categoria: despesa.categoria || "Outros",
      descricao: despesa.descricao || "",
      valor: String(despesa.valor ?? ""),
      observacoes: despesa.observacoes || "",
    });
  }

  /*
   * Ao salvar, o lancamento do caixa acompanha: se o valor
   * da despesa muda e o caixa fica com o valor antigo, o
   * saldo passa a mentir.
   */
  async function salvarEdicao(despesa: Despesa) {
    setErro("");

    const valor = Number(formEdicao.valor);

    if (!formEdicao.valor || valor <= 0) {
      setErro("Informe um valor válido.");
      return;
    }

    if (!formEdicao.data) {
      setErro("Informe a data.");
      return;
    }

    setOcupado(despesa.id);

    const { error } = await supabase
      .from("store_expenses")
      .update({
        data: formEdicao.data,
        categoria: formEdicao.categoria,
        descricao: formEdicao.descricao.trim() || null,
        valor,
        observacoes:
          formEdicao.observacoes.trim() || null,
      })
      .eq("id", despesa.id);

    if (error) {
      setOcupado("");
      setErro(
        `Não foi possível salvar: ${error.message}`
      );
      return;
    }

    const descricaoCaixa = `${
      formEdicao.categoria || "Despesa"
    } - ${
      formEdicao.descricao.trim() || "Despesa da loja"
    }`;

    /*
     * A despesa em aberto ainda nao aconteceu, entao a data
     * do caixa acompanha o vencimento. A que ja foi paga
     * mantem o dia do pagamento.
     */
    const camposCaixa: Record<string, unknown> = {
      valor,
      descricao: descricaoCaixa,
    };

    if (!despesa.pago) {
      camposCaixa.data = formEdicao.data;
    }

    await supabase
      .from("cash_transactions")
      .update(camposCaixa)
      .eq("origem", "despesa_loja")
      .eq("origem_id", despesa.id);

    setOcupado("");
    setEditandoId("");
    router.refresh();
  }

  async function marcarComoPaga(despesa: Despesa) {
    setErro("");
    setOcupado(despesa.id);

    const dataPagamento = hojeISO();

    const { error } = await supabase
      .from("store_expenses")
      .update({
        pago: true,
        data_pagamento: dataPagamento,
      })
      .eq("id", despesa.id);

    if (error) {
      setErro(
        `Não foi possível marcar como paga: ${error.message}`
      );
      setOcupado("");
      return;
    }

    /*
     * A despesa em aberto já entra no caixa como pendente, então
     * aqui é só dar baixa nela. Despesa cadastrada antes disso
     * não tem lançamento nenhum - nesse caso, cria agora.
     */
    const { data: pendente } = await supabase
      .from("cash_transactions")
      .select("id")
      .eq("origem", "despesa_loja")
      .eq("origem_id", despesa.id)
      .limit(1);

    const lancamento = (pendente || [])[0];

    const { error: erroCaixa } = lancamento
      ? await supabase
          .from("cash_transactions")
          .update({
            confirmado: true,
            data_confirmacao: dataPagamento,
            data: dataPagamento,
          })
          .eq("id", lancamento.id)
      : await supabase
          .from("cash_transactions")
          .insert({
            data: dataPagamento,
            tipo: "saida",
            origem: "despesa_loja",
            origem_id: despesa.id,
            valor: Number(despesa.valor || 0),
            descricao: `${despesa.categoria || "Despesa"} - ${
              despesa.descricao || "Despesa da loja"
            }`,
            confirmado: true,
            data_confirmacao: dataPagamento,
          });

    setOcupado("");

    if (erroCaixa) {
      setErro(
        `Despesa marcada como paga, mas não entrou no caixa: ${erroCaixa.message}`
      );
    }

    router.refresh();
  }

  async function excluir(despesa: Despesa) {
    const confirmar = window.confirm(
      `Excluir a despesa de ${formatarMoeda(
        despesa.valor
      )}${
        despesa.pago
          ? "? O lançamento do caixa também é desfeito."
          : "?"
      }`
    );

    if (!confirmar) return;

    setErro("");
    setOcupado(despesa.id);

    await supabase
      .from("cash_transactions")
      .delete()
      .eq("origem", "despesa_loja")
      .eq("origem_id", despesa.id);

    /*
     * O .select() no fim devolve o que foi apagado. Sem ele, uma
     * exclusão barrada pela permissão do banco volta sem erro
     * nenhum e a despesa continua na tela, sem explicação.
     */
    const { data: apagadas, error } = await supabase
      .from("store_expenses")
      .delete()
      .eq("id", despesa.id)
      .select("id");

    setOcupado("");

    if (error) {
      setErro(
        `Não foi possível excluir: ${error.message}`
      );
      return;
    }

    if (!apagadas || apagadas.length === 0) {
      setErro(
        "A despesa não foi apagada: seu usuário não tem permissão de exclusão em despesas no banco. Fale comigo que eu te passo o SQL para liberar."
      );
      return;
    }

    router.refresh();
  }

  const campoClass =
    "w-full rounded-lg border border-grafite-claro bg-grafite px-3 py-2 text-sm text-texto outline-none transition focus:border-dourado";

  const seletorClass =
    "rounded-lg border border-grafite-claro bg-grafite px-3 py-2 text-sm text-texto outline-none transition focus:border-dourado";

  return (
    <div className="w-full">
      {/* PERÍODO */}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={mes}
          onChange={(e) => {
            setMes(Number(e.target.value));
            setPeriodoTodo(false);
          }}
          disabled={periodoTodo}
          className={`${seletorClass} disabled:opacity-50`}
        >
          {nomesMeses.map((nome, indice) => (
            <option key={nome} value={indice + 1}>
              {nome}
            </option>
          ))}
        </select>

        <select
          value={ano}
          onChange={(e) => {
            setAno(Number(e.target.value));
            setPeriodoTodo(false);
          }}
          disabled={periodoTodo}
          className={`${seletorClass} disabled:opacity-50`}
        >
          {anos.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() =>
            setPeriodoTodo((atual) => !atual)
          }
          className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
            periodoTodo
              ? "border-dourado bg-dourado text-preto"
              : "border-grafite-claro text-texto-suave hover:border-dourado hover:text-dourado"
          }`}
        >
          Tudo
        </button>
      </div>

      {/* TOTAIS */}

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-grafite-claro bg-grafite p-4">
          <p className="text-xs text-texto-suave">
            {periodoTodo
              ? "Total lançado"
              : `Total de ${nomesMeses[mes - 1]}`}
          </p>

          <p className="mt-1 text-2xl font-bold text-red-400">
            - {formatarMoeda(totais.total)}
          </p>

          <p className="mt-1 text-xs text-texto-suave">
            Dinheiro saindo ·{" "}
            {doPeriodo.length} lançamento
            {doPeriodo.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="rounded-xl border border-grafite-claro bg-grafite p-4">
          <p className="text-xs text-texto-suave">Pago</p>

          <p className="mt-1 text-2xl font-bold text-red-300">
            - {formatarMoeda(totais.pago)}
          </p>

          <p className="mt-1 text-xs text-texto-suave">
            Já saiu do caixa
          </p>
        </div>

        <div className="rounded-xl border border-grafite-claro bg-grafite p-4">
          <p className="text-xs text-texto-suave">
            Em aberto
          </p>

          <p className="mt-1 text-2xl font-bold text-texto">
            {formatarMoeda(totais.aberto)}
          </p>

          <p className="mt-1 text-xs text-texto-suave">
            Ainda a pagar
          </p>
        </div>

        <div
          className={`rounded-xl border p-4 ${
            totais.vencido > 0
              ? "border-red-800 bg-red-950/20"
              : "border-grafite-claro bg-grafite"
          }`}
        >
          <p className="flex items-center gap-1.5 text-xs text-texto-suave">
            {totais.vencido > 0 && (
              <TriangleAlert size={13} />
            )}
            Vencido
          </p>

          <p
            className={`mt-1 text-2xl font-bold ${
              totais.vencido > 0
                ? "text-red-400"
                : "text-texto"
            }`}
          >
            {formatarMoeda(totais.vencido)}
          </p>

          <p className="mt-1 text-xs text-texto-suave">
            Em aberto com data passada
          </p>
        </div>
      </div>

      {/* POR CATEGORIA */}

      {porCategoria.length > 0 && (
        <div className="mb-4 overflow-hidden rounded-xl border border-grafite-claro bg-grafite">
          <div className="border-b border-grafite-claro px-4 py-3">
            <p className="text-sm font-semibold text-texto">
              Por categoria
            </p>
          </div>

          <div className="divide-y divide-grafite-claro/60">
            {porCategoria.map((item) => {
              const fatia =
                totais.total > 0
                  ? (item.valor / totais.total) * 100
                  : 0;

              return (
                <div
                  key={item.nome}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <span className="w-40 shrink-0 truncate text-sm text-texto">
                    {item.nome}
                  </span>

                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-grafite-claro">
                    <span
                      className="block h-full rounded-full bg-red-400"
                      style={{ width: `${fatia}%` }}
                    />
                  </span>

                  <span className="w-14 shrink-0 text-right text-xs text-texto-suave">
                    {fatia.toFixed(0)}%
                  </span>

                  <span className="w-28 shrink-0 text-right text-sm font-semibold text-texto">
                    {formatarMoeda(item.valor)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FILTROS */}

      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { chave: "todas", nome: "Todas" },
              { chave: "abertas", nome: "Em aberto" },
              { chave: "pagas", nome: "Pagas" },
            ] as const
          ).map((opcao) => (
            <button
              key={opcao.chave}
              type="button"
              onClick={() => setSituacao(opcao.chave)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                situacao === opcao.chave
                  ? "bg-dourado text-preto"
                  : "border border-grafite-claro text-texto-suave hover:border-dourado hover:text-dourado"
              }`}
            >
              {opcao.nome}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:max-w-sm">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-texto-suave"
          />

          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por categoria, descrição ou pagamento"
            className="w-full rounded-lg border border-grafite-claro bg-grafite py-2.5 pl-10 pr-4 text-sm text-texto outline-none transition focus:border-dourado"
          />
        </div>
      </div>

      {erro && (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {erro}
        </div>
      )}

      {/* TABELA */}

      {filtradas.length === 0 ? (
        <div className="rounded-xl border border-grafite-claro bg-grafite p-10 text-center">
          <p className="text-sm text-texto-suave">
            {despesas.length === 0
              ? "Nenhuma despesa cadastrada ainda. Lance o aluguel, a energia, o contador - o que sai todo mês - para acompanhar aqui."
              : periodoTodo
              ? "Nenhuma despesa com esse filtro."
              : `Nenhuma despesa em ${
                  nomesMeses[mes - 1]
                } de ${ano} com esse filtro.`}
          </p>

          <Link
            href="/despesas/nova"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-dourado px-4 py-2 text-sm font-semibold text-preto transition hover:bg-dourado-claro"
          >
            <Plus size={16} />
            Nova Despesa
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-grafite-claro bg-grafite">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-grafite-claro text-left text-xs uppercase tracking-wide text-texto-suave">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Pagamento</th>
                <th className="px-4 py-3 text-right">
                  Valor
                </th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>

            <tbody>
              {filtradas.map((despesa) => {
                const vencida =
                  !despesa.pago &&
                  despesa.data < hojeISO();

                return (
                  <Fragment key={despesa.id}>
                  <tr className="border-b border-grafite-claro/60">
                    <td className="whitespace-nowrap px-4 py-2.5 text-texto-suave">
                      {formatarData(despesa.data)}
                    </td>

                    <td className="px-4 py-2.5 font-medium text-texto">
                      {despesa.categoria || "—"}
                    </td>

                    <td className="max-w-[240px] px-4 py-2.5 text-texto-suave">
                      <span className="block truncate">
                        {despesa.descricao || "—"}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-2.5 text-texto-suave">
                      {despesa.forma_pagamento || "—"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold text-red-300">
                      - {formatarMoeda(despesa.valor)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-2.5">
                      {despesa.pago ? (
                        <span className="text-xs font-semibold text-texto-suave">
                          Pago
                          {despesa.data_pagamento
                            ? ` · ${formatarData(
                                despesa.data_pagamento
                              )}`
                            : ""}
                        </span>
                      ) : (
                        <span
                          className={`text-xs font-semibold ${
                            vencida
                              ? "text-red-400"
                              : "text-texto"
                          }`}
                        >
                          {vencida
                            ? "Vencida"
                            : "Em aberto"}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            abrirEdicao(despesa)
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-grafite-claro px-3 py-1.5 text-xs font-semibold text-texto transition hover:border-dourado hover:text-dourado"
                        >
                          <Pencil size={13} />
                          Editar
                        </button>

                        {!despesa.pago && (
                          <button
                            type="button"
                            disabled={
                              ocupado === despesa.id
                            }
                            onClick={() =>
                              marcarComoPaga(despesa)
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-green-800 px-3 py-1.5 text-xs font-semibold text-green-300 transition hover:bg-green-950/40 disabled:opacity-50"
                          >
                            <Check size={13} />
                            Marcar paga
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={ocupado === despesa.id}
                          onClick={() => excluir(despesa)}
                          className="inline-flex items-center gap-1 rounded-lg border border-grafite-claro px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:border-red-700 hover:bg-red-950/40 disabled:opacity-50"
                        >
                          <Trash2 size={13} />
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>

                  {editandoId === despesa.id && (
                    <tr className="border-b border-grafite-claro/60">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="rounded-xl border border-dourado/30 bg-preto/20 p-4">
                          <div className="grid gap-3 md:grid-cols-4">
                            <div>
                              <label className="mb-1 block text-xs text-texto-suave">
                                {despesa.pago
                                  ? "Data"
                                  : "Vencimento"}
                              </label>

                              <input
                                type="date"
                                value={formEdicao.data}
                                onChange={(e) =>
                                  setFormEdicao({
                                    ...formEdicao,
                                    data: e.target.value,
                                  })
                                }
                                className={campoClass}
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-xs text-texto-suave">
                                Categoria
                              </label>

                              <select
                                value={formEdicao.categoria}
                                onChange={(e) =>
                                  setFormEdicao({
                                    ...formEdicao,
                                    categoria: e.target.value,
                                  })
                                }
                                className={campoClass}
                              >
                                {categorias.map((nome) => (
                                  <option key={nome} value={nome}>
                                    {nome}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="md:col-span-2">
                              <label className="mb-1 block text-xs text-texto-suave">
                                Descrição
                              </label>

                              <input
                                value={formEdicao.descricao}
                                onChange={(e) =>
                                  setFormEdicao({
                                    ...formEdicao,
                                    descricao: e.target.value,
                                  })
                                }
                                className={campoClass}
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-xs text-texto-suave">
                                Valor (R$)
                              </label>

                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formEdicao.valor}
                                onChange={(e) =>
                                  setFormEdicao({
                                    ...formEdicao,
                                    valor: e.target.value,
                                  })
                                }
                                className={campoClass}
                              />
                            </div>

                            <div className="md:col-span-3">
                              <label className="mb-1 block text-xs text-texto-suave">
                                Observações
                              </label>

                              <input
                                value={formEdicao.observacoes}
                                onChange={(e) =>
                                  setFormEdicao({
                                    ...formEdicao,
                                    observacoes: e.target.value,
                                  })
                                }
                                className={campoClass}
                              />
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={ocupado === despesa.id}
                              onClick={() => salvarEdicao(despesa)}
                              className="rounded-lg bg-dourado px-4 py-2 text-sm font-semibold text-preto transition hover:bg-dourado-claro disabled:opacity-50"
                            >
                              {ocupado === despesa.id
                                ? "Salvando..."
                                : "Salvar"}
                            </button>

                            <button
                              type="button"
                              onClick={() => setEditandoId("")}
                              className="rounded-lg border border-grafite-claro px-4 py-2 text-sm text-texto-suave transition hover:border-dourado hover:text-dourado"
                            >
                              Cancelar
                            </button>

                            <p className="ml-auto self-center text-xs text-texto-suave">
                              Pagamento em Pix
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
