"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import { formatarData } from "@/lib/formatadores/data";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  Pencil,
  X,
} from "lucide-react";

const supabase = createClient();

const origemLabel: Record<string, string> = {
  venda: "Venda",
  compra_moto: "Compra de Moto",
  gasto_moto: "Gasto de Moto",
  despesa_loja: "Despesa da Loja",
  outro: "Outro",
};

const DESCRICAO_SALDO_INICIAL = "Saldo inicial do caixa";

function hoje() {
  const data = new Date();

  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

export default function CaixaPage() {
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [abrirSaldoInicial, setAbrirSaldoInicial] =
    useState(false);

  const [valorSaldoInicial, setValorSaldoInicial] =
    useState("");

  const [dataSaldoInicial, setDataSaldoInicial] =
    useState(hoje());

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    carregarCaixa();
  }, []);

  async function carregarCaixa() {
    setCarregando(true);
    setErro("");

    const { data, error } = await supabase
      .from("cash_transactions")
      .select("*")
      .order("data", { ascending: false });

    if (error) {
      console.error(error);
      setErro(`Erro ao carregar o caixa: ${error.message}`);
      setCarregando(false);
      return;
    }

    setTransacoes(data || []);

    const saldoInicialExistente = data?.find(
      (t) =>
        t.origem === "outro" &&
        t.descricao === DESCRICAO_SALDO_INICIAL
    );

    if (saldoInicialExistente) {
      setValorSaldoInicial(
        String(saldoInicialExistente.valor || "")
      );

      setDataSaldoInicial(
        saldoInicialExistente.data || hoje()
      );
    }

    setCarregando(false);
  }

  const transacaoSaldoInicial = transacoes.find(
    (t) =>
      t.origem === "outro" &&
      t.descricao === DESCRICAO_SALDO_INICIAL
  );

  const saldoInicial = transacaoSaldoInicial
    ? Number(transacaoSaldoInicial.valor || 0)
    : 0;

  const entradasOperacionais = transacoes
    .filter(
      (t) =>
        t.tipo === "entrada" &&
        !(
          t.origem === "outro" &&
          t.descricao === DESCRICAO_SALDO_INICIAL
        )
    )
    .reduce(
      (soma, transacao) =>
        soma + Number(transacao.valor || 0),
      0
    );

  const saidas = transacoes
    .filter((t) => t.tipo === "saida")
    .reduce(
      (soma, transacao) =>
        soma + Number(transacao.valor || 0),
      0
    );

  const saldoAtual =
    saldoInicial + entradasOperacionais - saidas;

  async function salvarSaldoInicial() {
    setErro("");
    setMensagem("");

    const valor = Number(valorSaldoInicial);

    if (!valorSaldoInicial || valor < 0) {
      setErro("Informe um valor válido para o saldo inicial.");
      return;
    }

    if (!dataSaldoInicial) {
      setErro("Informe a data do saldo inicial.");
      return;
    }

    const confirmar = window.confirm(
      transacaoSaldoInicial
        ? "Deseja alterar o saldo inicial do caixa?"
        : "Deseja definir este valor como saldo inicial do caixa?"
    );

    if (!confirmar) return;

    setSalvando(true);

    if (transacaoSaldoInicial) {
      const { error } = await supabase
        .from("cash_transactions")
        .update({
          data: dataSaldoInicial,
          tipo: "entrada",
          origem: "outro",
          valor,
          descricao: DESCRICAO_SALDO_INICIAL,
        })
        .eq("id", transacaoSaldoInicial.id);

      if (error) {
        console.error(error);

        setErro(
          `Erro ao alterar saldo inicial: ${error.message}`
        );

        setSalvando(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from("cash_transactions")
        .insert({
          data: dataSaldoInicial,
          tipo: "entrada",
          origem: "outro",
          valor,
          descricao: DESCRICAO_SALDO_INICIAL,
        });

      if (error) {
        console.error(error);

        setErro(
          `Erro ao registrar saldo inicial: ${error.message}`
        );

        setSalvando(false);
        return;
      }
    }

    await carregarCaixa();

    setMensagem(
      transacaoSaldoInicial
        ? "Saldo inicial alterado com sucesso."
        : "Saldo inicial definido com sucesso."
    );

    setAbrirSaldoInicial(false);
    setSalvando(false);

    setTimeout(() => {
      setMensagem("");
    }, 3000);
  }

  if (carregando) {
    return (
      <div className="p-6 text-texto-suave">
        Carregando caixa...
      </div>
    );
  }

  return (
    <div>
      {/* CABEÇALHO */}

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dourado">
            Caixa
          </h1>

          <p className="mt-1 text-sm text-texto-suave">
            Controle das entradas, saídas e saldo disponível.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setAbrirSaldoInicial(!abrirSaldoInicial)
          }
          className="flex items-center justify-center gap-2 rounded-lg bg-dourado px-4 py-3 font-semibold text-preto transition hover:bg-dourado-claro"
        >
          {transacaoSaldoInicial ? (
            <>
              <Pencil size={18} />
              Alterar Saldo Inicial
            </>
          ) : (
            <>
              <Wallet size={18} />
              Definir Saldo Inicial
            </>
          )}
        </button>
      </div>

      {/* MENSAGENS */}

      {erro && (
        <div className="mb-5 rounded-lg border border-red-700 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {erro}
        </div>
      )}

      {mensagem && (
        <div className="mb-5 rounded-lg border border-green-700 bg-green-950/40 px-4 py-3 text-sm text-green-300">
          {mensagem}
        </div>
      )}

      {/* FORMULÁRIO SALDO INICIAL */}

      {abrirSaldoInicial && (
        <div className="mb-6 rounded-xl border border-dourado/50 bg-grafite p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-dourado">
                {transacaoSaldoInicial
                  ? "Alterar Saldo Inicial"
                  : "Definir Saldo Inicial"}
              </h2>

              <p className="mt-1 text-xs text-texto-suave">
                Informe quanto dinheiro a loja possui no caixa
                no início do controle.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setAbrirSaldoInicial(false)
              }
              className="text-texto-suave hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-texto">
                Data inicial
              </label>

              <input
                type="date"
                value={dataSaldoInicial}
                onChange={(e) =>
                  setDataSaldoInicial(e.target.value)
                }
                className="w-full rounded-lg border border-grafite-claro bg-grafite-claro px-4 py-3 text-texto outline-none focus:border-dourado"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-texto">
                Valor atual do caixa (R$)
              </label>

              <input
                type="number"
                step="0.01"
                min="0"
                value={valorSaldoInicial}
                onChange={(e) =>
                  setValorSaldoInicial(e.target.value)
                }
                placeholder="Ex.: 25000.00"
                className="w-full rounded-lg border border-grafite-claro bg-grafite-claro px-4 py-3 text-texto outline-none focus:border-dourado"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={salvarSaldoInicial}
            disabled={salvando}
            className="mt-4 rounded-lg bg-dourado px-6 py-3 font-semibold text-preto transition hover:bg-dourado-claro disabled:opacity-60"
          >
            {salvando
              ? "Salvando..."
              : "Salvar Saldo Inicial"}
          </button>
        </div>
      )}

      {/* RESUMO */}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-grafite-claro bg-grafite p-5">
          <p className="text-xs text-texto-suave">
            Saldo Inicial
          </p>

          <p className="text-2xl font-bold text-white">
            {formatarMoeda(saldoInicial)}
          </p>
        </div>

        <div className="rounded-xl border border-grafite-claro bg-grafite p-5">
          <p className="text-xs text-texto-suave">
            Entradas
          </p>

          <p className="text-2xl font-bold text-green-400">
            {formatarMoeda(entradasOperacionais)}
          </p>
        </div>

        <div className="rounded-xl border border-grafite-claro bg-grafite p-5">
          <p className="text-xs text-texto-suave">
            Saídas
          </p>

          <p className="text-2xl font-bold text-red-400">
            {formatarMoeda(saidas)}
          </p>
        </div>

        <div className="rounded-xl border border-dourado bg-grafite p-5">
          <p className="text-xs text-texto-suave">
            Saldo Atual
          </p>

          <p
            className={`text-2xl font-bold ${
              saldoAtual >= 0
                ? "text-dourado"
                : "text-red-400"
            }`}
          >
            {formatarMoeda(saldoAtual)}
          </p>
        </div>
      </div>

      {/* EXTRATO */}

      <div className="overflow-hidden rounded-xl border border-grafite-claro bg-grafite">
        <div className="border-b border-grafite-claro px-5 py-3">
          <h2 className="font-semibold text-dourado">
            Extrato
          </h2>
        </div>

        {transacoes.length === 0 && (
          <div className="p-8 text-center text-texto-suave">
            Nenhuma movimentação registrada ainda.
          </div>
        )}

        <div className="divide-y divide-grafite-claro">
          {transacoes.map((t) => {
            const ehSaldoInicial =
              t.origem === "outro" &&
              t.descricao === DESCRICAO_SALDO_INICIAL;

            return (
              <div
                key={t.id}
                className="flex items-center justify-between gap-4 px-5 py-3"
              >
                <div className="flex items-center gap-3">
                  {t.tipo === "entrada" ? (
                    <ArrowUpCircle
                      className={
                        ehSaldoInicial
                          ? "text-dourado"
                          : "text-green-400"
                      }
                      size={20}
                    />
                  ) : (
                    <ArrowDownCircle
                      className="text-red-400"
                      size={20}
                    />
                  )}

                  <div>
                    <p className="text-sm text-texto">
                      {t.descricao ||
                        origemLabel[t.origem] ||
                        "Movimentação"}
                    </p>

                    <p className="text-xs text-texto-suave">
                      {ehSaldoInicial
                        ? "Saldo Inicial"
                        : origemLabel[t.origem] ||
                          "Outro"}{" "}
                      · {formatarData(t.data)}
                    </p>
                  </div>
                </div>

                <p
                  className={`whitespace-nowrap font-semibold ${
                    ehSaldoInicial
                      ? "text-dourado"
                      : t.tipo === "entrada"
                        ? "text-green-400"
                        : "text-red-400"
                  }`}
                >
                  {t.tipo === "entrada" ? "+" : "-"}{" "}
                  {formatarMoeda(t.valor)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}