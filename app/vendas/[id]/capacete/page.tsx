"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CircleDollarSign,
  HardHat,
  ReceiptText,
  Trash2,
} from "lucide-react";

type Venda = {
  id: string;
  data_venda: string;
  cliente?: string | null;
  valor_total_venda?:
    | number
    | string
    | null;
  valor_venda?:
    | number
    | string
    | null;
  forma_pagamento?: string | null;
  moto?: {
    codigo?: string | null;
    marca?: string | null;
    modelo?: string | null;
    versao?: string | null;
    placa?: string | null;
  } | null;
};

type Lancamento = {
  id: string;
  sale_id: string;
  data_venda: string;
  valor_recebido:
    | number
    | string;
  forma_pagamento: string;
  observacoes?: string | null;
  ja_incluido_na_venda: boolean;
  caixa_lancado: boolean;
  criado_em?: string | null;
};

const FORMAS = [
  "Pix",
  "Dinheiro",
  "Transferência",
  "Cartão",
  "Outro",
];

function hoje() {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(
    d.getMonth() + 1
  ).padStart(2, "0");
  const dia = String(
    d.getDate()
  ).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function moeda(valor: unknown) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  ).format(Number(valor) || 0);
}

function dataBr(valor: string) {
  if (!valor) return "—";

  const [ano, mes, dia] =
    valor.split("-");

  if (!ano || !mes || !dia) {
    return valor;
  }

  return `${dia}/${mes}/${ano}`;
}

export default function AdicionarCapaceteVendaPage() {
  const params = useParams();
  const vendaId = String(
    params.id || ""
  );

  const [venda, setVenda] =
    useState<Venda | null>(null);

  const [
    lancamentos,
    setLancamentos,
  ] = useState<Lancamento[]>([]);

  const [carregando, setCarregando] =
    useState(true);

  const [salvando, setSalvando] =
    useState(false);

  const [excluindoId, setExcluindoId] =
    useState<string | null>(null);

  const [valor, setValor] =
    useState("");

  const [data, setData] =
    useState(hoje());

  const [
    formaPagamento,
    setFormaPagamento,
  ] = useState("Pix");

  const [
    tipoLancamento,
    setTipoLancamento,
  ] = useState<
    "incluido" | "novo"
  >("incluido");

  const [
    observacoes,
    setObservacoes,
  ] = useState("");

  const [mensagem, setMensagem] =
    useState("");

  const [erro, setErro] =
    useState("");

  async function carregar() {
    if (!vendaId) return;

    setCarregando(true);
    setErro("");

    try {
      const resposta = await fetch(
        `/api/vendas/${encodeURIComponent(
          vendaId
        )}/capacetes`,
        {
          cache: "no-store",
        }
      );

      const dados = await resposta
        .json()
        .catch(() => null);

      if (!resposta.ok) {
        throw new Error(
          dados?.error ||
            "Não foi possível abrir a venda."
        );
      }

      setVenda(
        dados?.venda || null
      );

      setLancamentos(
        Array.isArray(
          dados?.lancamentos
        )
          ? dados.lancamentos
          : []
      );

      const dataVenda =
        String(
          dados?.venda?.data_venda ||
            ""
        );

      if (dataVenda) {
        setData(dataVenda);
      }

      const formaVenda =
        String(
          dados?.venda
            ?.forma_pagamento || ""
        );

      if (
        FORMAS.includes(
          formaVenda
        )
      ) {
        setFormaPagamento(
          formaVenda
        );
      }
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível abrir a venda."
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendaId]);

  const totalVinculado =
    useMemo(
      () =>
        lancamentos.reduce(
          (soma, item) =>
            soma +
            Number(
              item.valor_recebido ||
                0
            ),
          0
        ),
      [lancamentos]
    );

  const totalNovoCaixa =
    useMemo(
      () =>
        lancamentos
          .filter(
            (item) =>
              item.caixa_lancado
          )
          .reduce(
            (soma, item) =>
              soma +
              Number(
                item.valor_recebido ||
                  0
              ),
            0
          ),
      [lancamentos]
    );

  async function salvar(
    event: FormEvent
  ) {
    event.preventDefault();

    setErro("");
    setMensagem("");

    const valorNumero =
      Number(valor);

    if (
      !Number.isFinite(
        valorNumero
      ) ||
      valorNumero <= 0
    ) {
      setErro(
        "Informe o valor do capacete."
      );
      return;
    }

    if (!data) {
      setErro(
        "Informe a data."
      );
      return;
    }

    setSalvando(true);

    try {
      const resposta = await fetch(
        `/api/vendas/${encodeURIComponent(
          vendaId
        )}/capacetes`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            data,
            valor: valorNumero,
            forma_pagamento:
              formaPagamento,
            tipo: tipoLancamento,
            observacoes:
              observacoes.trim(),
          }),
        }
      );

      const dados = await resposta
        .json()
        .catch(() => null);

      if (!resposta.ok) {
        throw new Error(
          dados?.error ||
            "Não foi possível adicionar o capacete."
        );
      }

      setValor("");
      setObservacoes("");

      setMensagem(
        tipoLancamento ===
          "incluido"
          ? "Capacete vinculado à venda sem duplicar o caixa."
          : "Capacete vinculado à venda e novo recebimento lançado no caixa."
      );

      await carregar();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível adicionar o capacete."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(
    item: Lancamento
  ) {
    const confirmou =
      window.confirm(
        item.caixa_lancado
          ? "Excluir este capacete? A entrada criada no caixa também será removida."
          : "Excluir este capacete vinculado? Nenhum lançamento do caixa será alterado."
      );

    if (!confirmou) return;

    setExcluindoId(item.id);
    setErro("");
    setMensagem("");

    try {
      const resposta = await fetch(
        `/api/vendas/${encodeURIComponent(
          vendaId
        )}/capacetes?lancamento=${encodeURIComponent(
          item.id
        )}`,
        {
          method: "DELETE",
        }
      );

      const dados = await resposta
        .json()
        .catch(() => null);

      if (!resposta.ok) {
        throw new Error(
          dados?.error ||
            "Não foi possível excluir."
        );
      }

      setMensagem(
        "Lançamento removido."
      );

      await carregar();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir."
      );
    } finally {
      setExcluindoId(null);
    }
  }

  if (carregando) {
    return (
      <main className="min-h-screen bg-[#070707] p-6 text-zinc-400">
        Carregando venda...
      </main>
    );
  }

  if (!venda) {
    return (
      <main className="min-h-screen bg-[#070707] p-6 text-white">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-900 bg-red-950/30 p-6">
          <h1 className="text-xl font-bold text-red-300">
            Venda não encontrada
          </h1>

          <p className="mt-3 text-sm text-red-200">
            {erro ||
              "Não foi possível localizar esta venda."}
          </p>

          <Link
            href="/vendas/historico"
            className="mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold"
          >
            Voltar ao histórico
          </Link>
        </div>
      </main>
    );
  }

  const nomeMoto = [
    venda.moto?.codigo,
    venda.moto?.marca,
    venda.moto?.modelo,
    venda.moto?.versao,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-yellow-500">
              BLACKOUT MOTOS
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Adicionar capacete à venda
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Venda já concluída. O sistema
              separa o valor do capacete sem
              duplicar dinheiro no caixa.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/vendas/${vendaId}`}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 hover:border-yellow-500 hover:text-yellow-500"
            >
              Voltar para a venda
            </Link>

            <Link
              href="/vendas/historico"
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 hover:border-yellow-500 hover:text-yellow-500"
            >
              Histórico
            </Link>
          </div>
        </div>

        {mensagem && (
          <div className="mb-5 rounded-xl border border-green-800 bg-green-950/30 p-4 text-sm font-semibold text-green-300">
            {mensagem}
          </div>
        )}

        {erro && (
          <div className="mb-5 rounded-xl border border-red-800 bg-red-950/30 p-4 text-sm text-red-300">
            {erro}
          </div>
        )}

        <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Moto
              </p>
              <p className="mt-1 font-semibold">
                {nomeMoto ||
                  "Moto da venda"}
              </p>
              {venda.moto?.placa && (
                <p className="mt-1 text-xs text-zinc-500">
                  Placa:{" "}
                  {venda.moto.placa}
                </p>
              )}
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Cliente
              </p>
              <p className="mt-1 font-semibold">
                {venda.cliente ||
                  "Não informado"}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Valor registrado da venda
              </p>
              <p className="mt-1 font-bold text-yellow-500">
                {moeda(
                  venda.valor_total_venda ??
                    venda.valor_venda
                )}
              </p>
            </div>
          </div>
        </section>

        <form
          onSubmit={salvar}
          className="mb-7 space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 md:p-7"
        >
          <section>
            <div className="mb-4 flex items-center gap-2 border-b border-zinc-800 pb-3">
              <HardHat
                size={20}
                className="text-yellow-500"
              />
              <h2 className="text-lg font-semibold text-yellow-500">
                Valor do capacete
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Valor do capacete *
                </label>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={valor}
                  onChange={(e) =>
                    setValor(
                      e.target.value
                    )
                  }
                  placeholder="0,00"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Data *
                </label>

                <input
                  type="date"
                  value={data}
                  onChange={(e) =>
                    setData(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Forma de pagamento
                </label>

                <select
                  value={
                    formaPagamento
                  }
                  onChange={(e) =>
                    setFormaPagamento(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                >
                  {FORMAS.map(
                    (forma) => (
                      <option
                        key={forma}
                        value={forma}
                      >
                        {forma}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-zinc-200">
              Esse dinheiro já estava no valor
              da venda da moto?
            </h3>

            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  setTipoLancamento(
                    "incluido"
                  )
                }
                className={`rounded-xl border p-4 text-left transition ${
                  tipoLancamento ===
                  "incluido"
                    ? "border-green-600 bg-green-950/30"
                    : "border-zinc-800 bg-black/30"
                }`}
              >
                <p className="font-bold text-white">
                  Sim, já estava incluído
                </p>

                <p className="mt-2 text-xs leading-5 text-zinc-400">
                  Apenas separa e vincula o
                  valor ao capacete. Não cria
                  outra entrada no caixa e não
                  aumenta novamente o valor da
                  venda.
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  setTipoLancamento(
                    "novo"
                  )
                }
                className={`rounded-xl border p-4 text-left transition ${
                  tipoLancamento ===
                  "novo"
                    ? "border-yellow-500 bg-yellow-500/10"
                    : "border-zinc-800 bg-black/30"
                }`}
              >
                <p className="font-bold text-white">
                  Não, foi recebido depois
                </p>

                <p className="mt-2 text-xs leading-5 text-zinc-400">
                  Registra o capacete e cria
                  uma nova entrada no caixa,
                  porque esse dinheiro ainda
                  não tinha sido lançado.
                </p>
              </button>
            </div>
          </section>

          <section>
            <label className="mb-2 block text-sm text-zinc-300">
              Observação
            </label>

            <textarea
              value={observacoes}
              onChange={(e) =>
                setObservacoes(
                  e.target.value
                )
              }
              rows={3}
              placeholder="Ex.: capacete antigo da loja sem cadastro de estoque."
              className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
            />
          </section>

          <div className="rounded-xl border border-zinc-800 bg-black/40 p-4">
            {tipoLancamento ===
            "incluido" ? (
              <p className="text-sm text-green-300">
                <strong>
                  Caixa:
                </strong>{" "}
                nenhuma entrada nova será
                criada.
              </p>
            ) : (
              <p className="text-sm text-yellow-300">
                <strong>
                  Caixa:
                </strong>{" "}
                será criada uma entrada de{" "}
                <strong>
                  {moeda(valor)}
                </strong>
                .
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={salvando}
            className="w-full rounded-xl bg-yellow-500 px-6 py-4 font-bold text-black transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {salvando
              ? "Salvando..."
              : "Adicionar capacete à venda"}
          </button>
        </form>

        <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
          <div className="grid gap-3 border-b border-zinc-800 p-5 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Capacetes vinculados
              </p>
              <p className="mt-1 text-2xl font-bold text-yellow-500">
                {moeda(
                  totalVinculado
                )}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Novas entradas no caixa
              </p>
              <p className="mt-1 text-2xl font-bold text-green-400">
                {moeda(
                  totalNovoCaixa
                )}
              </p>
            </div>
          </div>

          {lancamentos.length ===
          0 ? (
            <div className="p-7 text-center text-sm text-zinc-500">
              Nenhum capacete vinculado a
              esta venda.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {lancamentos.map(
                (item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-white">
                          {moeda(
                            item.valor_recebido
                          )}
                        </span>

                        <span
                          className={`rounded-full px-2 py-1 text-xs font-bold ${
                            item.caixa_lancado
                              ? "bg-green-950 text-green-300"
                              : "bg-zinc-800 text-zinc-300"
                          }`}
                        >
                          {item.caixa_lancado
                            ? "Entrada nova no caixa"
                            : "Já estava na venda"}
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-zinc-500">
                        {dataBr(
                          item.data_venda
                        )}{" "}
                        ·{" "}
                        {
                          item.forma_pagamento
                        }
                      </p>

                      {item.observacoes && (
                        <p className="mt-2 text-sm text-zinc-400">
                          {
                            item.observacoes
                          }
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        excluir(item)
                      }
                      disabled={
                        excluindoId ===
                        item.id
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-900 px-3 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-950/30 disabled:opacity-50"
                    >
                      <Trash2
                        size={15}
                      />
                      {excluindoId ===
                      item.id
                        ? "Excluindo..."
                        : "Excluir"}
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
