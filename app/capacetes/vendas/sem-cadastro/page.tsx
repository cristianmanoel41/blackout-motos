"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";

type Lancamento = {
  id: string;
  data_venda: string;
  valor_recebido: number | string;
  forma_pagamento: string;
  observacoes?: string | null;
  criado_em?: string | null;
};

const FORMAS_PAGAMENTO = [
  "Pix",
  "Dinheiro",
  "Transferência",
  "Cartão",
  "Outro",
];

function hoje() {
  const agora = new Date();

  const ano = agora.getFullYear();
  const mes = String(
    agora.getMonth() + 1
  ).padStart(2, "0");
  const dia = String(
    agora.getDate()
  ).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function mesAtual() {
  return hoje().slice(0, 7);
}

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
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

export default function VendaCapaceteSemCadastroPage() {
  const [dataVenda, setDataVenda] =
    useState(hoje());

  const [valorRecebido, setValorRecebido] =
    useState("");

  const [
    formaPagamento,
    setFormaPagamento,
  ] = useState("Pix");

  const [observacoes, setObservacoes] =
    useState("");

  const [lancamentos, setLancamentos] =
    useState<Lancamento[]>([]);

  const [carregando, setCarregando] =
    useState(true);

  const [salvando, setSalvando] =
    useState(false);

  const [excluindoId, setExcluindoId] =
    useState<string | null>(null);

  const [mensagem, setMensagem] =
    useState("");

  const [erro, setErro] =
    useState("");

  async function carregar() {
    setCarregando(true);
    setErro("");

    try {
      const resposta = await fetch(
        "/api/capacetes/vendas/sem-cadastro",
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
            "Não foi possível carregar os lançamentos."
        );
      }

      setLancamentos(
        Array.isArray(dados?.lancamentos)
          ? dados.lancamentos
          : []
      );
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os lançamentos."
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const totalGeral = useMemo(
    () =>
      lancamentos.reduce(
        (soma, item) =>
          soma +
          Number(
            item.valor_recebido || 0
          ),
        0
      ),
    [lancamentos]
  );

  const totalMes = useMemo(() => {
    const chaveMes = mesAtual();

    return lancamentos
      .filter((item) =>
        String(
          item.data_venda || ""
        ).startsWith(chaveMes)
      )
      .reduce(
        (soma, item) =>
          soma +
          Number(
            item.valor_recebido || 0
          ),
        0
      );
  }, [lancamentos]);

  async function salvar(
    event: FormEvent
  ) {
    event.preventDefault();

    setErro("");
    setMensagem("");

    const valor = Number(
      valorRecebido
    );

    if (!dataVenda) {
      setErro(
        "Informe a data do recebimento."
      );
      return;
    }

    if (
      !Number.isFinite(valor) ||
      valor <= 0
    ) {
      setErro(
        "Informe um valor recebido maior que zero."
      );
      return;
    }

    if (!formaPagamento) {
      setErro(
        "Informe a forma de pagamento."
      );
      return;
    }

    setSalvando(true);

    try {
      const resposta = await fetch(
        "/api/capacetes/vendas/sem-cadastro",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            data_venda: dataVenda,
            valor_recebido: valor,
            forma_pagamento:
              formaPagamento,
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
            "Não foi possível registrar o recebimento."
        );
      }

      setValorRecebido("");
      setObservacoes("");
      setFormaPagamento("Pix");
      setDataVenda(hoje());

      setMensagem(
        "Recebimento registrado e lançado no caixa."
      );

      await carregar();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar o recebimento."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(
    lancamento: Lancamento
  ) {
    setMensagem("");
    setErro("");

    const confirmou =
      window.confirm(
        `Remover este recebimento de ${moeda(
          Number(
            lancamento.valor_recebido ||
              0
          )
        )}?\n\n` +
          "A entrada correspondente também será removida do caixa.\n\n" +
          "Use esta opção somente para corrigir um lançamento errado."
      );

    if (!confirmou) {
      return;
    }

    setExcluindoId(
      lancamento.id
    );

    try {
      const resposta = await fetch(
        `/api/capacetes/vendas/sem-cadastro?id=${encodeURIComponent(
          lancamento.id
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
            "Não foi possível remover o lançamento."
        );
      }

      setMensagem(
        "Lançamento removido do controle e do caixa."
      );

      await carregar();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível remover o lançamento."
      );
    } finally {
      setExcluindoId(null);
    }
  }

  return (
    <main className="min-h-screen bg-preto text-texto">
      <div className="mx-auto w-full max-w-6xl p-4 md:p-8">
        <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-dourado">
              BLACKOUT MOTOS
            </p>

            <h1 className="mt-2 text-3xl font-bold text-white">
              Venda de capacete sem cadastro
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-texto-suave">
              Use esta tela para capacetes antigos
              que ainda não foram cadastrados no
              estoque. O valor recebido entra no
              caixa, mas não baixa estoque e não é
              tratado como lucro de capacete enquanto
              o custo não estiver conhecido.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/capacetes"
              className="rounded-xl border border-grafite-claro px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-dourado hover:text-dourado"
            >
              Voltar para Capacetes
            </Link>

            <Link
              href="/capacetes/vendas"
              className="rounded-xl border border-grafite-claro px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-dourado hover:text-dourado"
            >
              Vendas de Capacetes
            </Link>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-yellow-800/60 bg-yellow-950/20 p-4 text-sm leading-6 text-yellow-200">
          <strong>
            Controle temporário:
          </strong>{" "}
          esta tela serve somente para registrar o
          dinheiro recebido pelos capacetes antigos.
          Quando você organizar o estoque e localizar
          as notas, os capacetes restantes podem ser
          cadastrados normalmente sem repetir estas
          vendas.
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

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-grafite-claro bg-grafite p-5">
            <p className="text-xs uppercase tracking-wide text-texto-suave">
              Recebido neste mês
            </p>

            <p className="mt-2 text-3xl font-bold text-dourado">
              {moeda(totalMes)}
            </p>

            <p className="mt-1 text-xs text-texto-suave">
              Apenas capacetes sem cadastro
            </p>
          </div>

          <div className="rounded-2xl border border-grafite-claro bg-grafite p-5">
            <p className="text-xs uppercase tracking-wide text-texto-suave">
              Total registrado nesta tela
            </p>

            <p className="mt-2 text-3xl font-bold text-white">
              {moeda(totalGeral)}
            </p>

            <p className="mt-1 text-xs text-texto-suave">
              {lancamentos.length} lançamento
              {lancamentos.length === 1
                ? ""
                : "s"}
            </p>
          </div>
        </div>

        <form
          onSubmit={salvar}
          className="mb-7 rounded-2xl border border-grafite-claro bg-grafite p-5 md:p-7"
        >
          <h2 className="mb-5 border-b border-grafite-claro pb-3 text-lg font-semibold text-dourado">
            Novo recebimento
          </h2>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm text-texto-suave">
                Data *
              </label>

              <input
                type="date"
                value={dataVenda}
                onChange={(event) =>
                  setDataVenda(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-grafite-claro bg-preto px-4 py-3 text-white outline-none focus:border-dourado"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-texto-suave">
                Valor recebido *
              </label>

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={valorRecebido}
                onChange={(event) =>
                  setValorRecebido(
                    event.target.value
                  )
                }
                placeholder="0,00"
                className="w-full rounded-xl border border-grafite-claro bg-preto px-4 py-3 text-white outline-none focus:border-dourado"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-texto-suave">
                Forma de pagamento *
              </label>

              <select
                value={formaPagamento}
                onChange={(event) =>
                  setFormaPagamento(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-grafite-claro bg-preto px-4 py-3 text-white outline-none focus:border-dourado"
              >
                {FORMAS_PAGAMENTO.map(
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

            <div className="md:col-span-2 lg:col-span-3">
              <label className="mb-2 block text-sm text-texto-suave">
                Observação
              </label>

              <textarea
                value={observacoes}
                onChange={(event) =>
                  setObservacoes(
                    event.target.value
                  )
                }
                rows={3}
                placeholder="Ex.: capacete antigo da loja, marca/modelo ainda não cadastrados."
                className="w-full resize-none rounded-xl border border-grafite-claro bg-preto px-4 py-3 text-white outline-none focus:border-dourado"
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              disabled={salvando}
              className="rounded-xl bg-dourado px-6 py-3 font-bold text-preto transition hover:bg-dourado-claro disabled:cursor-not-allowed disabled:opacity-60"
            >
              {salvando
                ? "Salvando..."
                : "Lançar recebimento"}
            </button>
          </div>
        </form>

        <section className="overflow-hidden rounded-2xl border border-grafite-claro bg-grafite">
          <div className="border-b border-grafite-claro px-5 py-4">
            <h2 className="font-semibold text-white">
              Histórico
            </h2>

            <p className="mt-1 text-xs text-texto-suave">
              Valores desta tela entram no caixa como
              recebimento de capacete do estoque antigo.
            </p>
          </div>

          {carregando ? (
            <div className="p-8 text-center text-texto-suave">
              Carregando...
            </div>
          ) : lancamentos.length === 0 ? (
            <div className="p-8 text-center text-texto-suave">
              Nenhum recebimento registrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b border-grafite-claro bg-preto text-left text-xs uppercase tracking-wide text-texto-suave">
                  <tr>
                    <th className="px-5 py-3">
                      Data
                    </th>
                    <th className="px-5 py-3">
                      Pagamento
                    </th>
                    <th className="px-5 py-3">
                      Observação
                    </th>
                    <th className="px-5 py-3 text-right">
                      Valor
                    </th>
                    <th className="px-5 py-3 text-right">
                      Ação
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {lancamentos.map(
                    (item) => (
                      <tr
                        key={item.id}
                        className="border-b border-grafite-claro/70 last:border-b-0"
                      >
                        <td className="whitespace-nowrap px-5 py-4">
                          {dataBr(
                            item.data_venda
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {
                            item.forma_pagamento
                          }
                        </td>

                        <td className="max-w-[380px] px-5 py-4 text-texto-suave">
                          {item.observacoes ||
                            "Capacete antigo sem cadastro"}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right font-bold text-dourado">
                          {moeda(
                            Number(
                              item.valor_recebido ||
                                0
                            )
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              excluir(item)
                            }
                            disabled={
                              excluindoId ===
                              item.id
                            }
                            className="font-semibold text-red-400 transition hover:text-red-300 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {excluindoId ===
                            item.id
                              ? "Removendo..."
                              : "Excluir"}
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
