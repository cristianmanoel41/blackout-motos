"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

export default function EditarVendaPage() {
  const params = useParams();
  const router = useRouter();

  const id = params.id as string;

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const [dataVenda, setDataVenda] = useState("");
  const [cliente, setCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [vendedor, setVendedor] = useState("");

  const [valorVenda, setValorVenda] = useState("");
  const [entrada, setEntrada] = useState("");
  const [banco, setBanco] = useState("");

  const [transferenciaCliente, setTransferenciaCliente] =
    useState("");

  const [transferenciaLoja, setTransferenciaLoja] =
    useState("");

  const [observacoes, setObservacoes] = useState("");

  const [motoNome, setMotoNome] = useState("");

  const valorFinanciado = useMemo(() => {
    const venda = Number(valorVenda) || 0;
    const valorEntrada = Number(entrada) || 0;

    return Math.max(venda - valorEntrada, 0);
  }, [valorVenda, entrada]);

  useEffect(() => {
    carregarVenda();
  }, [id]);

  async function carregarVenda() {
    setCarregando(true);
    setErro("");

    const { data, error } = await supabase
      .from("sales")
      .select(`
        *,
        motorcycles (
          codigo,
          marca,
          modelo,
          versao,
          ano_modelo,
          placa
        )
      `)
      .eq("id", id)
      .single();

    if (error || !data) {
      console.error(error);

      setErro(
        error?.message ||
          "Não foi possível carregar os dados da venda."
      );

      setCarregando(false);
      return;
    }

    setDataVenda(data.data_venda || "");
    setCliente(data.cliente || "");
    setTelefone(data.telefone || "");
    setVendedor(data.vendedor || "");

    setValorVenda(
      String(
        data.valor_total_venda ??
          data.valor_venda ??
          ""
      )
    );

    setEntrada(String(data.entrada ?? ""));
    setBanco(data.banco || "");

    setTransferenciaCliente(
      String(data.transferencia_cliente ?? "")
    );

    setTransferenciaLoja(
      String(data.transferencia_loja ?? "")
    );

    setObservacoes(data.observacoes || "");

    const moto = data.motorcycles;

    if (moto) {
      const nome = [
        moto.codigo,
        moto.marca,
        moto.modelo,
        moto.versao,
        moto.ano_modelo,
        moto.placa,
      ]
        .filter(Boolean)
        .join(" · ");

      setMotoNome(nome);
    } else {
      setMotoNome("Moto não encontrada");
    }

    setCarregando(false);
  }

  async function salvarAlteracoes() {
    setErro("");
    setMensagem("");

    if (!dataVenda) {
      setErro("Informe a data da venda.");
      return;
    }

    if (!cliente.trim()) {
      setErro("Informe o nome do cliente.");
      return;
    }

    if (!vendedor) {
      setErro("Selecione o vendedor.");
      return;
    }

    if (!valorVenda || Number(valorVenda) <= 0) {
      setErro("Informe o valor da venda.");
      return;
    }

    const confirmar = window.confirm(
      "Deseja salvar as alterações desta venda?"
    );

    if (!confirmar) return;

    setSalvando(true);

    const { error } = await supabase
      .from("sales")
      .update({
        data_venda: dataVenda,

        cliente: cliente.trim(),
        telefone: telefone.trim(),

        vendedor,

        valor_venda: Number(valorVenda) || 0,

        valor_total_venda:
          Number(valorVenda) || 0,

        entrada: Number(entrada) || 0,

        valor_financiado: valorFinanciado,

        banco: banco.trim(),

        transferencia_cliente:
          Number(transferenciaCliente) || 0,

        transferencia_loja:
          Number(transferenciaLoja) || 0,

        observacoes: observacoes.trim(),
      })
      .eq("id", id);

    if (error) {
      console.error(error);

      setErro(
        `Não foi possível salvar: ${error.message}`
      );

      setSalvando(false);
      return;
    }

    setMensagem("Venda atualizada com sucesso!");
    setSalvando(false);

    setTimeout(() => {
      router.push("/vendas/historico");
      router.refresh();
    }, 1000);
  }

  if (carregando) {
    return (
      <div className="p-6 text-zinc-400">
        Carregando venda...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-5xl">

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-1 text-sm font-semibold uppercase tracking-[0.25em] text-yellow-500">
              Blackout Motos
            </p>

            <h1 className="text-3xl font-bold">
              Editar Venda
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Corrija os dados da venda registrada.
            </p>
          </div>

          <Link
            href="/vendas/historico"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-yellow-500 hover:text-yellow-500"
          >
            Voltar ao Histórico
          </Link>
        </div>

        {mensagem && (
          <div className="mb-6 rounded-xl border border-green-700 bg-green-950/40 p-4 text-green-300">
            {mensagem}
          </div>
        )}

        {erro && (
          <div className="mb-6 rounded-xl border border-red-700 bg-red-950/40 p-4 text-red-300">
            {erro}
          </div>
        )}

        <div className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl md:p-8">

          <section>
            <h2 className="mb-4 border-b border-zinc-800 pb-3 text-lg font-semibold text-yellow-500">
              Dados da Venda
            </h2>

            <div className="grid gap-4 md:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Data da venda
                </label>

                <input
                  type="date"
                  value={dataVenda}
                  onChange={(e) =>
                    setDataVenda(e.target.value)
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Moto
                </label>

                <div className="min-h-[50px] rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-300">
                  {motoNome}
                </div>

                <p className="mt-2 text-xs text-zinc-500">
                  A moto da venda não é alterada nesta tela.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Vendedor *
                </label>

                <select
                  value={vendedor}
                  onChange={(e) =>
                    setVendedor(e.target.value)
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                >
                  <option value="">
                    Selecione o vendedor
                  </option>

                  <option value="Cristian">
                    Cristian
                  </option>

                  <option value="Bruno">
                    Bruno
                  </option>
                </select>
              </div>

            </div>
          </section>

          <section>
            <h2 className="mb-4 border-b border-zinc-800 pb-3 text-lg font-semibold text-yellow-500">
              Cliente
            </h2>

            <div className="grid gap-4 md:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Nome do cliente *
                </label>

                <input
                  type="text"
                  value={cliente}
                  onChange={(e) =>
                    setCliente(e.target.value)
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Telefone
                </label>

                <input
                  type="text"
                  value={telefone}
                  onChange={(e) =>
                    setTelefone(e.target.value)
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                />
              </div>

            </div>
          </section>

          <section>
            <h2 className="mb-4 border-b border-zinc-800 pb-3 text-lg font-semibold text-yellow-500">
              Valores
            </h2>

            <div className="grid gap-4 md:grid-cols-3">

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Valor da venda *
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorVenda}
                  onChange={(e) =>
                    setValorVenda(e.target.value)
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Entrada
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={entrada}
                  onChange={(e) =>
                    setEntrada(e.target.value)
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Valor financiado
                </label>

                <div className="flex min-h-[50px] items-center rounded-xl border border-yellow-600/50 bg-yellow-500/10 px-4 py-3 text-lg font-bold text-yellow-500">
                  {moeda(valorFinanciado)}
                </div>
              </div>

            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm text-zinc-300">
                Banco / Financeira
              </label>

              <input
                type="text"
                value={banco}
                onChange={(e) =>
                  setBanco(e.target.value)
                }
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
              />
            </div>
          </section>

          <section>
            <h2 className="mb-4 border-b border-zinc-800 pb-3 text-lg font-semibold text-yellow-500">
              Transferência
            </h2>

            <div className="grid gap-4 md:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Transferência paga pelo cliente
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={transferenciaCliente}
                  onChange={(e) =>
                    setTransferenciaCliente(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Transferência paga pela loja
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={transferenciaLoja}
                  onChange={(e) =>
                    setTransferenciaLoja(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                />
              </div>

            </div>
          </section>

          <section>
            <label className="mb-2 block text-sm text-zinc-300">
              Observações
            </label>

            <textarea
              value={observacoes}
              onChange={(e) =>
                setObservacoes(e.target.value)
              }
              rows={4}
              className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
            />
          </section>

          <section className="rounded-xl border border-zinc-800 bg-black p-5">
            <h3 className="mb-4 font-semibold text-yellow-500">
              Resumo atualizado
            </h3>

            <div className="grid gap-3 text-sm md:grid-cols-3">

              <div>
                <p className="text-zinc-500">
                  Valor da venda
                </p>

                <p className="mt-1 text-lg font-semibold">
                  {moeda(Number(valorVenda))}
                </p>
              </div>

              <div>
                <p className="text-zinc-500">
                  Entrada
                </p>

                <p className="mt-1 text-lg font-semibold">
                  {moeda(Number(entrada))}
                </p>
              </div>

              <div>
                <p className="text-zinc-500">
                  Financiamento
                </p>

                <p className="mt-1 text-lg font-semibold text-yellow-500">
                  {moeda(valorFinanciado)}
                </p>
              </div>

            </div>
          </section>

          <div className="flex flex-col gap-3 md:flex-row">

            <button
              type="button"
              onClick={salvarAlteracoes}
              disabled={salvando}
              className="flex-1 rounded-xl bg-yellow-500 px-6 py-4 font-bold text-black transition hover:bg-yellow-400 disabled:opacity-50"
            >
              {salvando
                ? "Salvando..."
                : "Salvar Alterações"}
            </button>

            <Link
              href="/vendas/historico"
              className="rounded-xl border border-zinc-700 px-6 py-4 text-center font-semibold text-zinc-300 transition hover:border-yellow-500 hover:text-yellow-500"
            >
              Cancelar
            </Link>

          </div>

        </div>
      </div>
    </main>
  );
}