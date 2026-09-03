"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  Banknote,
  Building2,
  CircleDollarSign,
  RefreshCcw,
  Scale,
  WalletCards,
} from "lucide-react";

type Configuracao = {
  id: string;
  data_inicio: string;
  inicio_em: string;
  saldo_banco_inicial:
    | number
    | string;
  saldo_dinheiro_inicial:
    | number
    | string;
  saldo_outros_inicial:
    | number
    | string;
  saldo_inicial:
    | number
    | string;
};

type Conciliacao = {
  id: string;
  data_conciliacao: string;
  saldo_banco:
    | number
    | string;
  saldo_dinheiro:
    | number
    | string;
  saldo_outros:
    | number
    | string;
  saldo_real:
    | number
    | string;
  saldo_sistema:
    | number
    | string;
  diferenca:
    | number
    | string;
  observacoes?: string | null;
};

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

function dataHoraBr(
  valor: string
) {
  if (!valor) return "—";

  const data =
    new Date(valor);

  if (
    Number.isNaN(
      data.getTime()
    )
  ) {
    return valor;
  }

  return data.toLocaleString(
    "pt-BR"
  );
}

export default function ConciliacaoCaixaPage() {
  const [
    configuracao,
    setConfiguracao,
  ] =
    useState<Configuracao | null>(
      null
    );

  const [
    saldoCalculado,
    setSaldoCalculado,
  ] = useState(0);

  const [
    entradasDesdeInicio,
    setEntradasDesdeInicio,
  ] = useState(0);

  const [
    saidasDesdeInicio,
    setSaidasDesdeInicio,
  ] = useState(0);

  const [
    conciliacoes,
    setConciliacoes,
  ] =
    useState<Conciliacao[]>([]);

  const [carregando, setCarregando] =
    useState(true);

  const [salvando, setSalvando] =
    useState(false);

  const [erro, setErro] =
    useState("");

  const [mensagem, setMensagem] =
    useState("");

  const [
    dataInicio,
    setDataInicio,
  ] = useState(hoje());

  const [
    saldoBancoInicial,
    setSaldoBancoInicial,
  ] = useState("");

  const [
    saldoDinheiroInicial,
    setSaldoDinheiroInicial,
  ] = useState("");

  const [
    saldoOutrosInicial,
    setSaldoOutrosInicial,
  ] = useState("");

  const [
    saldoBancoHoje,
    setSaldoBancoHoje,
  ] = useState("");

  const [
    saldoDinheiroHoje,
    setSaldoDinheiroHoje,
  ] = useState("");

  const [
    saldoOutrosHoje,
    setSaldoOutrosHoje,
  ] = useState("");

  const [
    observacoes,
    setObservacoes,
  ] = useState("");

  function aplicarDados(
    dados: any
  ) {
    setConfiguracao(
      dados?.configuracao ||
        null
    );

    setSaldoCalculado(
      Number(
        dados?.saldoCalculado ||
          0
      )
    );

    setEntradasDesdeInicio(
      Number(
        dados
          ?.entradasDesdeInicio ||
          0
      )
    );

    setSaidasDesdeInicio(
      Number(
        dados
          ?.saidasDesdeInicio ||
          0
      )
    );

    setConciliacoes(
      Array.isArray(
        dados?.conciliacoes
      )
        ? dados.conciliacoes
        : []
    );

    if (
      dados?.configuracao
    ) {
      setDataInicio(
        dados.configuracao
          .data_inicio ||
          hoje()
      );

      setSaldoBancoInicial(
        String(
          dados.configuracao
            .saldo_banco_inicial ??
            ""
        )
      );

      setSaldoDinheiroInicial(
        String(
          dados.configuracao
            .saldo_dinheiro_inicial ??
            ""
        )
      );

      setSaldoOutrosInicial(
        String(
          dados.configuracao
            .saldo_outros_inicial ??
            ""
        )
      );
    }
  }

  async function carregar() {
    setCarregando(true);
    setErro("");

    try {
      const resposta =
        await fetch(
          "/api/caixa/controle",
          {
            cache:
              "no-store",
          }
        );

      const dados =
        await resposta
          .json()
          .catch(() => null);

      if (!resposta.ok) {
        throw new Error(
          dados?.error ||
            "Não foi possível carregar o caixa."
        );
      }

      aplicarDados(dados);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o caixa."
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const totalInicial =
    useMemo(
      () =>
        (Number(
          saldoBancoInicial
        ) || 0) +
        (Number(
          saldoDinheiroInicial
        ) || 0) +
        (Number(
          saldoOutrosInicial
        ) || 0),
      [
        saldoBancoInicial,
        saldoDinheiroInicial,
        saldoOutrosInicial,
      ]
    );

  const totalRealHoje =
    useMemo(
      () =>
        (Number(
          saldoBancoHoje
        ) || 0) +
        (Number(
          saldoDinheiroHoje
        ) || 0) +
        (Number(
          saldoOutrosHoje
        ) || 0),
      [
        saldoBancoHoje,
        saldoDinheiroHoje,
        saldoOutrosHoje,
      ]
    );

  const diferencaPrevista =
    totalRealHoje -
    saldoCalculado;

  async function configurar(
    event: FormEvent
  ) {
    event.preventDefault();

    const confirmar =
      window.confirm(
        configuracao
          ? "Reconfigurar o saldo inicial cria um novo ponto de partida do caixa com os valores informados agora. O histórico não será apagado. Deseja continuar?"
          : "O saldo informado deve ser exatamente o dinheiro disponível na loja neste momento. Deseja criar o ponto de partida do caixa?"
      );

    if (!confirmar) {
      return;
    }

    setSalvando(true);
    setErro("");
    setMensagem("");

    try {
      const resposta =
        await fetch(
          "/api/caixa/controle",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              acao:
                "configurar",
              data_inicio:
                dataInicio,
              saldo_banco:
                Number(
                  saldoBancoInicial
                ) || 0,
              saldo_dinheiro:
                Number(
                  saldoDinheiroInicial
                ) || 0,
              saldo_outros:
                Number(
                  saldoOutrosInicial
                ) || 0,
            }),
          }
        );

      const dados =
        await resposta
          .json()
          .catch(() => null);

      if (!resposta.ok) {
        throw new Error(
          dados?.error ||
            "Não foi possível configurar o caixa."
        );
      }

      aplicarDados(dados);

      setMensagem(
        dados?.mensagem ||
          "Saldo inicial configurado."
      );
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível configurar o caixa."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function reconciliar(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!configuracao) {
      setErro(
        "Configure o saldo inicial primeiro."
      );
      return;
    }

    setSalvando(true);
    setErro("");
    setMensagem("");

    try {
      const resposta =
        await fetch(
          "/api/caixa/controle",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              acao:
                "reconciliar",
              saldo_banco:
                Number(
                  saldoBancoHoje
                ) || 0,
              saldo_dinheiro:
                Number(
                  saldoDinheiroHoje
                ) || 0,
              saldo_outros:
                Number(
                  saldoOutrosHoje
                ) || 0,
              observacoes:
                observacoes.trim(),
            }),
          }
        );

      const dados =
        await resposta
          .json()
          .catch(() => null);

      if (!resposta.ok) {
        throw new Error(
          dados?.error ||
            "Não foi possível reconciliar o caixa."
        );
      }

      aplicarDados(dados);

      setMensagem(
        dados?.mensagem ||
          "Conciliação registrada."
      );

      setSaldoBancoHoje("");
      setSaldoDinheiroHoje("");
      setSaldoOutrosHoje("");
      setObservacoes("");
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível reconciliar o caixa."
      );
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <main className="min-h-screen bg-preto p-6 text-texto-suave">
        Carregando controle do caixa...
      </main>
    );
  }

  const inputClass =
    "w-full rounded-xl border border-grafite-claro bg-preto px-4 py-3 text-white outline-none focus:border-dourado";

  return (
    <main className="min-h-screen bg-preto text-texto">
      <div className="mx-auto w-full max-w-6xl p-4 md:p-8">
        <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-dourado">
              BLACKOUT MOTOS
            </p>

            <h1 className="mt-2 text-3xl font-bold text-white">
              Saldo Inicial e Conciliação de Caixa
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-texto-suave">
              Defina quanto dinheiro a loja realmente tem disponível e use esse valor como ponto de partida. O estoque antigo e os gastos históricos continuam servindo para custo e lucro, sem reduzir novamente o dinheiro atual.
            </p>
          </div>

          <Link
            href="/caixa"
            className="rounded-xl border border-grafite-claro px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-dourado hover:text-dourado"
          >
            Voltar ao Caixa
          </Link>
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

        {!configuracao && (
          <div className="mb-6 rounded-xl border border-yellow-800/60 bg-yellow-950/20 p-4 text-sm leading-6 text-yellow-200">
            <strong>
              Primeiro uso:
            </strong>{" "}
            informe abaixo o dinheiro que existe realmente agora no banco e no caixa físico. O sistema vai criar um ponto de partida sem apagar o histórico já registrado.
          </div>
        )}

        {configuracao && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-grafite-claro bg-grafite p-5">
              <p className="text-xs uppercase tracking-wide text-texto-suave">
                Saldo inicial
              </p>

              <p className="mt-2 text-2xl font-bold text-white">
                {moeda(
                  configuracao.saldo_inicial
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-grafite-claro bg-grafite p-5">
              <p className="text-xs uppercase tracking-wide text-texto-suave">
                Entradas após início
              </p>

              <p className="mt-2 text-2xl font-bold text-green-400">
                {moeda(
                  entradasDesdeInicio
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-grafite-claro bg-grafite p-5">
              <p className="text-xs uppercase tracking-wide text-texto-suave">
                Saídas após início
              </p>

              <p className="mt-2 text-2xl font-bold text-red-400">
                {moeda(
                  saidasDesdeInicio
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-dourado/50 bg-dourado/10 p-5">
              <p className="text-xs uppercase tracking-wide text-dourado-claro">
                Saldo calculado agora
              </p>

              <p className={`mt-2 text-2xl font-bold ${
                saldoCalculado >= 0
                  ? "text-dourado"
                  : "text-red-400"
              }`}>
                {moeda(
                  saldoCalculado
                )}
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-2">
          <form
            onSubmit={configurar}
            className="rounded-2xl border border-grafite-claro bg-grafite p-5 md:p-7"
          >
            <div className="mb-5 flex items-center gap-3 border-b border-grafite-claro pb-4">
              <CircleDollarSign
                size={22}
                className="text-dourado"
              />

              <div>
                <h2 className="font-semibold text-white">
                  {configuracao
                    ? "Ponto de partida atual"
                    : "Configurar saldo inicial"}
                </h2>

                <p className="mt-1 text-xs text-texto-suave">
                  Use o saldo real disponível no momento da configuração.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-texto-suave">
                  Data de início do controle *
                </label>

                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) =>
                    setDataInicio(
                      e.target.value
                    )
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm text-texto-suave">
                  <Building2 size={16} />
                  Saldo no banco
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    saldoBancoInicial
                  }
                  onChange={(e) =>
                    setSaldoBancoInicial(
                      e.target.value
                    )
                  }
                  placeholder="0,00"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm text-texto-suave">
                  <Banknote size={16} />
                  Dinheiro em espécie
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    saldoDinheiroInicial
                  }
                  onChange={(e) =>
                    setSaldoDinheiroInicial(
                      e.target.value
                    )
                  }
                  placeholder="0,00"
                  className={inputClass}
                />
              </div>

              <div className="rounded-xl border border-dourado/30 bg-preto p-4">
                <p className="text-xs text-texto-suave">
                  Total do saldo inicial
                </p>

                <p className="mt-1 text-2xl font-bold text-dourado">
                  {moeda(totalInicial)}
                </p>
              </div>

              <button
                type="submit"
                disabled={salvando}
                className="w-full rounded-xl bg-dourado px-5 py-3 font-bold text-preto transition hover:bg-dourado-claro disabled:cursor-not-allowed disabled:opacity-60"
              >
                {salvando
                  ? "Salvando..."
                  : configuracao
                  ? "Reconfigurar ponto de partida"
                  : "Criar ponto de partida"}
              </button>
            </div>
          </form>

          <form
            onSubmit={reconciliar}
            className="rounded-2xl border border-grafite-claro bg-grafite p-5 md:p-7"
          >
            <div className="mb-5 flex items-center gap-3 border-b border-grafite-claro pb-4">
              <Scale
                size={22}
                className="text-dourado"
              />

              <div>
                <h2 className="font-semibold text-white">
                  Conferir saldo real
                </h2>

                <p className="mt-1 text-xs text-texto-suave">
                  Compare o sistema com o dinheiro realmente disponível hoje.
                </p>
              </div>
            </div>

            {!configuracao ? (
              <div className="rounded-xl border border-grafite-claro bg-preto p-5 text-sm text-texto-suave">
                Configure o saldo inicial primeiro.
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-texto-suave">
                    Saldo no banco hoje
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      saldoBancoHoje
                    }
                    onChange={(e) =>
                      setSaldoBancoHoje(
                        e.target.value
                      )
                    }
                    placeholder="0,00"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-texto-suave">
                    Dinheiro em espécie hoje
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      saldoDinheiroHoje
                    }
                    onChange={(e) =>
                      setSaldoDinheiroHoje(
                        e.target.value
                      )
                    }
                    placeholder="0,00"
                    className={inputClass}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-grafite-claro bg-preto p-4">
                    <p className="text-xs text-texto-suave">
                      Sistema
                    </p>

                    <p className="mt-1 font-bold text-white">
                      {moeda(
                        saldoCalculado
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border border-grafite-claro bg-preto p-4">
                    <p className="text-xs text-texto-suave">
                      Real
                    </p>

                    <p className="mt-1 font-bold text-white">
                      {moeda(
                        totalRealHoje
                      )}
                    </p>
                  </div>

                  <div className={`rounded-xl border p-4 ${
                    Math.abs(
                      diferencaPrevista
                    ) < 0.01
                      ? "border-green-800 bg-green-950/20"
                      : "border-yellow-800 bg-yellow-950/20"
                  }`}>
                    <p className="text-xs text-texto-suave">
                      Diferença
                    </p>

                    <p className={`mt-1 font-bold ${
                      Math.abs(
                        diferencaPrevista
                      ) < 0.01
                        ? "text-green-400"
                        : "text-yellow-400"
                    }`}>
                      {moeda(
                        diferencaPrevista
                      )}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-texto-suave">
                    Observação
                  </label>

                  <textarea
                    rows={3}
                    value={observacoes}
                    onChange={(e) =>
                      setObservacoes(
                        e.target.value
                      )
                    }
                    placeholder="Ex.: cartão ainda não caiu, depósito pendente, diferença a conferir."
                    className={`${inputClass} resize-none`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={salvando}
                  className="w-full rounded-xl border border-dourado px-5 py-3 font-bold text-dourado transition hover:bg-dourado hover:text-preto disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {salvando
                    ? "Salvando..."
                    : "Registrar conferência"}
                </button>
              </div>
            )}
          </form>
        </div>

        {configuracao && (
          <div className="mt-6 rounded-xl border border-blue-900 bg-blue-950/20 p-4 text-sm leading-6 text-blue-200">
            <strong>
              Como o corte funciona:
            </strong>{" "}
            ao criar o ponto de partida, o sistema não apaga as movimentações antigas. Ele neutraliza tecnicamente o saldo anterior e passa a considerar o valor real informado como base. Gastos históricos cadastrados com data anterior ao início continuam no custo da moto, mas não criam nova saída de caixa.
          </div>
        )}

        <section className="mt-6 overflow-hidden rounded-2xl border border-grafite-claro bg-grafite">
          <div className="flex items-center justify-between border-b border-grafite-claro px-5 py-4">
            <div>
              <h2 className="font-semibold text-white">
                Histórico de conciliações
              </h2>

              <p className="mt-1 text-xs text-texto-suave">
                Últimas conferências entre sistema e saldo real.
              </p>
            </div>

            <button
              type="button"
              onClick={carregar}
              className="inline-flex items-center gap-2 rounded-lg border border-grafite-claro px-3 py-2 text-xs font-semibold text-texto-suave hover:border-dourado hover:text-dourado"
            >
              <RefreshCcw size={14} />
              Atualizar
            </button>
          </div>

          {conciliacoes.length === 0 ? (
            <div className="p-7 text-center text-sm text-texto-suave">
              Nenhuma conciliação registrada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-sm">
                <thead className="border-b border-grafite-claro bg-preto text-left text-xs uppercase tracking-wide text-texto-suave">
                  <tr>
                    <th className="px-5 py-3">
                      Data
                    </th>
                    <th className="px-5 py-3 text-right">
                      Sistema
                    </th>
                    <th className="px-5 py-3 text-right">
                      Real
                    </th>
                    <th className="px-5 py-3 text-right">
                      Diferença
                    </th>
                    <th className="px-5 py-3">
                      Observação
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {conciliacoes.map(
                    (item) => {
                      const diferenca =
                        Number(
                          item.diferenca ||
                            0
                        );

                      return (
                        <tr
                          key={item.id}
                          className="border-b border-grafite-claro/70 last:border-0"
                        >
                          <td className="whitespace-nowrap px-5 py-4">
                            {dataHoraBr(
                              item.data_conciliacao
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            {moeda(
                              item.saldo_sistema
                            )}
                          </td>

                          <td className="px-5 py-4 text-right font-semibold text-white">
                            {moeda(
                              item.saldo_real
                            )}
                          </td>

                          <td className={`px-5 py-4 text-right font-bold ${
                            Math.abs(
                              diferenca
                            ) < 0.01
                              ? "text-green-400"
                              : "text-yellow-400"
                          }`}>
                            {moeda(
                              diferenca
                            )}
                          </td>

                          <td className="max-w-[320px] px-5 py-4 text-texto-suave">
                            {item.observacoes ||
                              "—"}
                          </td>
                        </tr>
                      );
                    }
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
