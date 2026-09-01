"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import { formatarData } from "@/lib/formatadores/data";
import {
  EMPRESA_DESPACHANTE,
  EMPRESA_VISTORIA,
} from "@/lib/dados/documentacao";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  X,
  Check,
  Clock,
} from "lucide-react";

const supabase = createClient();

const origemLabel: Record<string, string> = {
  venda: "Venda",
  compra_moto: "Compra de Moto",
  gasto_moto: "Gasto de Moto",
  despesa_loja: "Despesa da Loja",
  venda_capacete: "Venda de Capacete",
  compra_capacete: "Compra de Capacetes",
  documentacao: EMPRESA_DESPACHANTE,
  vistoria: EMPRESA_VISTORIA,
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


  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  /* Lançamento que está sendo baixado e o dia do pagamento. */
  const [baixaId, setBaixaId] = useState("");
  const [dataBaixa, setDataBaixa] = useState(hoje());

  /*
   * O valor previsto e uma estimativa: o despachante so manda
   * a conta fechada depois. Na baixa da para corrigir para o
   * que foi pago de fato.
   */
  const [valorBaixa, setValorBaixa] = useState("");

  /*
   * Quando a moto tem várias taxas da mesma empresa, cada
   * uma pode ter vindo por um preço diferente do previsto.
   * Aqui cada taxa guarda o seu valor pago.
   */
  const [valoresDoGrupo, setValoresDoGrupo] = useState<
    Record<string, string>
  >({});

  /*
   * O repasse da vistoria é feito de quinze em quinze dias:
   * várias pendências são pagas de uma vez, no mesmo dia.
   * Dar baixa uma a uma seria trabalho repetido.
   */
  const [selecionados, setSelecionados] = useState<
    string[]
  >([]);

  const [dataLote, setDataLote] = useState(hoje());

  /*
   * As pendências se misturam: documentação, débito de moto,
   * despesa da loja, dinheiro do banco. Na hora de pagar o
   * despachante interessa ver só a documentação.
   */
  const [filtroPendente, setFiltroPendente] =
    useState("");

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

    setCarregando(false);
  }

  /*
   * O saldo só conta o que foi confirmado. O que está
   * pendente é dinheiro combinado, não dinheiro no caixa.
   */
  const confirmadas = transacoes.filter(
    (t) => t.confirmado !== false
  );

  const pendentes = transacoes.filter(
    (t) => t.confirmado === false
  );

  /* Quanto está pendente em cada tipo de lançamento. */
  const pendentesPorOrigem = pendentes.reduce(
    (mapa: Record<string, number>, t) => {
      const chave = t.origem || "outro";

      mapa[chave] =
        (mapa[chave] || 0) + Number(t.valor || 0);

      return mapa;
    },
    {}
  );

  const pendentesVisiveis = filtroPendente
    ? pendentes.filter(
        (t) => t.origem === filtroPendente
      )
    : pendentes;

  /*
   * Uma moto gera várias taxas da mesma empresa - vistoria,
   * entrada, recibo. No caixa isso vira três linhas para o
   * mesmo pagamento. Aqui elas viram uma só, com o total,
   * e a baixa vale para todas de uma vez.
   *
   * A descrição é "<taxa> - <moto>", entao o que vem depois
   * do primeiro " - " identifica a moto.
   */
  function chaveDoGrupo(t: any) {
    const descricao = String(t.descricao || "");
    const corte = descricao.indexOf(" - ");

    const moto =
      corte >= 0
        ? descricao.slice(corte + 3)
        : descricao;

    return `${t.origem}|${moto}`;
  }

  const gruposPendentes = pendentesVisiveis.reduce(
    (lista: any[], t) => {
      const chave = chaveDoGrupo(t);

      const grupo = lista.find(
        (item) => item.chave === chave
      );

      if (grupo) {
        grupo.itens.push(t);
        grupo.total += Number(t.valor || 0);
        return lista;
      }

      const descricao = String(t.descricao || "");
      const corte = descricao.indexOf(" - ");

      lista.push({
        chave,
        origem: t.origem,
        tipo: t.tipo,
        data: t.data,
        moto:
          corte >= 0
            ? descricao.slice(corte + 3)
            : descricao,
        itens: [t],
        total: Number(t.valor || 0),
      });

      return lista;
    },
    []
  );

  async function darBaixaNoGrupo(grupo: any) {
    setErro("");
    setMensagem("");

    if (!dataBaixa) {
      setErro("Informe a data do pagamento.");
      return;
    }

    setSalvando(true);

    /*
     * Uma atualização por taxa: o valor pago pode ser
     * diferente em cada uma, e a data é a mesma para todas.
     */
    let error = null as any;

    for (const item of grupo.itens) {
      const digitado = valoresDoGrupo[item.id];

      const valorFinal =
        digitado === undefined ||
        String(digitado).trim() === ""
          ? Number(item.valor || 0)
          : Number(digitado);

      if (!(valorFinal > 0)) {
        error = {
          message:
            "Informe um valor válido em todas as taxas.",
        };
        break;
      }

      const resposta = await supabase
        .from("cash_transactions")
        .update({
          confirmado: true,
          data_confirmacao: dataBaixa,
          data: dataBaixa,
          valor: valorFinal,
        })
        .eq("id", item.id);

      if (resposta.error) {
        error = resposta.error;
        break;
      }
    }

    setSalvando(false);

    if (error) {
      console.error(error);
      setErro(`Erro ao dar baixa: ${error.message}`);
      return;
    }

    setBaixaId("");
    setValoresDoGrupo({});
    await carregarCaixa();

    setMensagem("Pagamento confirmado no caixa.");
    setTimeout(() => setMensagem(""), 3000);
  }

  const aReceber = pendentes
    .filter((t) => t.tipo === "entrada")
    .reduce(
      (soma, t) => soma + Number(t.valor || 0),
      0
    );

  const aPagar = pendentes
    .filter((t) => t.tipo === "saida")
    .reduce(
      (soma, t) => soma + Number(t.valor || 0),
      0
    );

  const transacaoSaldoInicial = transacoes.find(
    (t) =>
      t.origem === "outro" &&
      t.descricao === DESCRICAO_SALDO_INICIAL
  );

  const saldoInicial = transacaoSaldoInicial
    ? Number(transacaoSaldoInicial.valor || 0)
    : 0;

  const entradasOperacionais = confirmadas
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

  const saidas = confirmadas
    .filter((t) => t.tipo === "saida")
    .reduce(
      (soma, transacao) =>
        soma + Number(transacao.valor || 0),
      0
    );

  const saldoAtual =
    saldoInicial + entradasOperacionais - saidas;

  /*
   * Dar baixa: o lançamento vira dinheiro de verdade, na data
   * em que o pagamento aconteceu - que quase nunca é a data em
   * que a compra ou a venda foi cadastrada.
   */
  async function darBaixa(transacao: any) {
    setErro("");
    setMensagem("");

    if (!dataBaixa) {
      setErro("Informe a data do pagamento.");
      return;
    }

    setSalvando(true);

    const valorFinal =
      valorBaixa.trim() === ""
        ? Number(transacao.valor || 0)
        : Number(valorBaixa);

    if (!(valorFinal > 0)) {
      setErro("Informe um valor válido.");
      return;
    }

    const { error } = await supabase
      .from("cash_transactions")
      .update({
        confirmado: true,
        data_confirmacao: dataBaixa,
        data: dataBaixa,
        valor: valorFinal,
      })
      .eq("id", transacao.id);

    setSalvando(false);

    if (error) {
      console.error(error);
      setErro(`Erro ao dar baixa: ${error.message}`);
      return;
    }

    setBaixaId("");
    await carregarCaixa();

    setMensagem(
      transacao.tipo === "entrada"
        ? "Recebimento confirmado no caixa."
        : "Pagamento confirmado no caixa."
    );

    setTimeout(() => setMensagem(""), 3000);
  }

  /*
   * Cancelar apaga o lançamento pendente. Serve para a compra
   * que não se confirmou ou o gasto que a oficina não cobrou.
   */
  function alternarSelecao(id: string) {
    setSelecionados((atuais) =>
      atuais.includes(id)
        ? atuais.filter((item) => item !== id)
        : [...atuais, id]
    );
  }

  async function darBaixaEmLote() {
    setErro("");
    setMensagem("");

    if (selecionados.length === 0) return;

    if (!dataLote) {
      setErro("Informe a data do pagamento.");
      return;
    }

    setSalvando(true);

    const { error } = await supabase
      .from("cash_transactions")
      .update({
        confirmado: true,
        data_confirmacao: dataLote,
        data: dataLote,
      })
      .in("id", selecionados);

    setSalvando(false);

    if (error) {
      console.error(error);
      setErro(`Erro ao dar baixa: ${error.message}`);
      return;
    }

    const quantidade = selecionados.length;

    setSelecionados([]);
    await carregarCaixa();

    setMensagem(
      `${quantidade} lançamento${
        quantidade === 1 ? "" : "s"
      } confirmado${
        quantidade === 1 ? "" : "s"
      } no caixa.`
    );

    setTimeout(() => setMensagem(""), 3000);
  }

  async function cancelarLancamento(transacao: any) {
    const confirmar = window.confirm(
      `Cancelar o lançamento de ${formatarMoeda(
        transacao.valor
      )}? Ele sai da lista de pendentes e não entra no caixa.`
    );

    if (!confirmar) return;

    setSalvando(true);

    const { error } = await supabase
      .from("cash_transactions")
      .delete()
      .eq("id", transacao.id);

    setSalvando(false);

    if (error) {
      console.error(error);
      setErro(`Erro ao cancelar: ${error.message}`);
      return;
    }

    await carregarCaixa();
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

        {/*
          O saldo inicial passou a ser definido na Conciliação,
          junto da data de início do controle e da separação
          entre banco, dinheiro e outros. Ter os dois caminhos
          criava saldo em dobro.
        */}
        <Link
          href="/caixa/conciliacao"
          className="flex items-center justify-center gap-2 rounded-lg bg-dourado px-4 py-3 font-semibold text-preto transition hover:bg-dourado-claro"
        >
          <Wallet size={18} />
          Conciliação e saldo inicial
        </Link>
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

      {/* PENDENTES */}

      {pendentes.length > 0 && (
        <div className="mb-6 overflow-hidden rounded-xl border border-dourado/50 bg-grafite">
          <div className="flex flex-col gap-2 border-b border-grafite-claro px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-dourado">
              <Clock size={18} />
              A confirmar
            </h2>

            <div className="flex flex-wrap gap-4 text-xs">
              {aReceber > 0 && (
                <span className="text-texto-suave">
                  A receber{" "}
                  <strong className="text-green-400">
                    {formatarMoeda(aReceber)}
                  </strong>
                </span>
              )}

              {aPagar > 0 && (
                <span className="text-texto-suave">
                  A pagar{" "}
                  <strong className="text-red-400">
                    {formatarMoeda(aPagar)}
                  </strong>
                </span>
              )}
            </div>
          </div>

          <p className="border-b border-grafite-claro px-5 py-2 text-xs text-texto-suave">
            Lançamentos que ainda não entraram no saldo. Dê
            baixa no dia em que o pagamento for feito de fato.
            Marque vários para pagar tudo de uma vez - é o caso
            do repasse das vistorias, que vai de quinze em
            quinze dias.
          </p>

          {Object.keys(pendentesPorOrigem).length > 1 && (
            <div className="flex flex-wrap gap-2 border-b border-grafite-claro px-5 py-3">
              <button
                type="button"
                onClick={() => setFiltroPendente("")}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  filtroPendente === ""
                    ? "border-dourado bg-dourado text-preto"
                    : "border-grafite-claro text-texto-suave hover:border-dourado hover:text-dourado"
                }`}
              >
                Tudo
              </button>

              {Object.entries(pendentesPorOrigem)
                .sort((a, b) => b[1] - a[1])
                .map(([origem, total]) => (
                  <button
                    key={origem}
                    type="button"
                    onClick={() =>
                      setFiltroPendente(
                        filtroPendente === origem
                          ? ""
                          : origem
                      )
                    }
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      filtroPendente === origem
                        ? "border-dourado bg-dourado text-preto"
                        : "border-grafite-claro text-texto-suave hover:border-dourado hover:text-dourado"
                    }`}
                  >
                    {origemLabel[origem] || "Outro"}:{" "}
                    {formatarMoeda(total)}
                  </button>
                ))}

              <button
                type="button"
                onClick={() => {
                  const ids = pendentesVisiveis.map(
                    (t) => t.id
                  );

                  const todos = ids.every((id) =>
                    selecionados.includes(id)
                  );

                  setSelecionados(
                    todos
                      ? selecionados.filter(
                          (id) => !ids.includes(id)
                        )
                      : [
                          ...selecionados,
                          ...ids.filter(
                            (id) =>
                              !selecionados.includes(id)
                          ),
                        ]
                  );
                }}
                className="ml-auto rounded-lg border border-dourado/50 px-3 py-1.5 text-xs font-semibold text-dourado transition hover:bg-dourado/10"
              >
                {pendentesVisiveis.every((t) =>
                  selecionados.includes(t.id)
                ) && pendentesVisiveis.length > 0
                  ? "Desmarcar todas"
                  : "Marcar todas"}
              </button>
            </div>
          )}

          {selecionados.length > 0 && (
            <div className="flex flex-wrap items-end gap-3 border-b border-dourado/30 bg-dourado/5 px-5 py-3">
              <div>
                <label className="mb-1 block text-xs text-texto-suave">
                  Data do pagamento
                </label>

                <input
                  type="date"
                  value={dataLote}
                  onChange={(e) =>
                    setDataLote(e.target.value)
                  }
                  className="rounded-lg border border-grafite-claro bg-grafite px-3 py-2 text-sm text-texto outline-none focus:border-dourado"
                />
              </div>

              <button
                type="button"
                disabled={salvando}
                onClick={darBaixaEmLote}
                className="rounded-lg bg-dourado px-4 py-2 text-sm font-semibold text-preto transition hover:bg-dourado-claro disabled:opacity-50"
              >
                {salvando
                  ? "Confirmando..."
                  : `Dar baixa em ${selecionados.length}`}
              </button>

              <span className="self-center text-sm text-texto-suave">
                Total{" "}
                <strong className="text-texto">
                  {formatarMoeda(
                    pendentes
                      .filter((t) =>
                        selecionados.includes(t.id)
                      )
                      .reduce(
                        (soma, t) =>
                          soma + Number(t.valor || 0),
                        0
                      )
                  )}
                </strong>
              </span>

              <button
                type="button"
                onClick={() => setSelecionados([])}
                className="ml-auto self-center text-sm text-texto-suave underline transition hover:text-dourado"
              >
                Limpar seleção
              </button>
            </div>
          )}

          <div className="divide-y divide-grafite-claro">
            {gruposPendentes.map((grupo: any) => {
              const vencido = grupo.data < hoje();

              /* Um grupo com um item só é a própria linha. */
              const varias = grupo.itens.length > 1;

              const idsDoGrupo = grupo.itens.map(
                (t: any) => t.id
              );

              const todosMarcados = idsDoGrupo.every(
                (id: string) =>
                  selecionados.includes(id)
              );

              return (
                <div
                  key={grupo.chave}
                  className="px-5 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={todosMarcados}
                        onChange={() =>
                          setSelecionados((atuais) =>
                            todosMarcados
                              ? atuais.filter(
                                  (id) =>
                                    !idsDoGrupo.includes(id)
                                )
                              : [
                                  ...atuais,
                                  ...idsDoGrupo.filter(
                                    (id: string) =>
                                      !atuais.includes(id)
                                  ),
                                ]
                          )
                        }
                        className="h-4 w-4 accent-yellow-500"
                        aria-label="Selecionar para baixa"
                      />

                      {grupo.tipo === "entrada" ? (
                        <ArrowUpCircle
                          className="text-green-400"
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
                          {varias
                            ? `${
                                origemLabel[grupo.origem] ||
                                "Movimentação"
                              } - ${grupo.moto}`
                            : grupo.itens[0].descricao ||
                              origemLabel[grupo.origem] ||
                              "Movimentação"}
                        </p>

                        <p className="text-xs text-texto-suave">
                          {origemLabel[grupo.origem] ||
                            "Outro"}{" "}
                          · previsto para{" "}
                          {formatarData(grupo.data)}
                          {vencido ? " · atrasado" : ""}
                        </p>

                        {varias && (
                          <p className="mt-1 text-xs text-texto-suave">
                            {grupo.itens
                              .map(
                                (t: any) =>
                                  `${String(
                                    t.descricao || ""
                                  ).split(" - ")[0]} ${formatarMoeda(
                                    t.valor
                                  )}`
                              )
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <p
                        className={`whitespace-nowrap font-semibold ${
                          grupo.tipo === "entrada"
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {grupo.tipo === "entrada"
                          ? "+"
                          : "-"}{" "}
                        {formatarMoeda(grupo.total)}
                      </p>

                      {baixaId !== grupo.chave && (
                        <button
                          type="button"
                          onClick={() => {
                            setBaixaId(grupo.chave);
                            setDataBaixa(hoje());
                            setValorBaixa(
                              String(
                                grupo.itens[0].valor ?? ""
                              )
                            );

                            setValoresDoGrupo(
                              Object.fromEntries(
                                grupo.itens.map(
                                  (item: any) => [
                                    item.id,
                                    String(
                                      item.valor ?? ""
                                    ),
                                  ]
                                )
                              )
                            );
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-dourado px-3 py-1.5 text-xs font-semibold text-preto transition hover:bg-dourado-claro"
                        >
                          <Check size={13} />
                          Dar baixa
                        </button>
                      )}
                    </div>
                  </div>

                  {baixaId === grupo.chave && (
                    <div className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-grafite-claro bg-preto/20 p-3">
                      <div>
                        <label className="mb-1 block text-xs text-texto-suave">
                          Data do pagamento
                        </label>

                        <input
                          type="date"
                          value={dataBaixa}
                          onChange={(e) =>
                            setDataBaixa(e.target.value)
                          }
                          className="rounded-lg border border-grafite-claro bg-grafite px-3 py-2 text-sm text-texto outline-none focus:border-dourado"
                        />
                      </div>

                      {!varias && (
                        <div>
                          <label className="mb-1 block text-xs text-texto-suave">
                            Valor pago
                          </label>

                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={valorBaixa}
                            onChange={(e) =>
                              setValorBaixa(e.target.value)
                            }
                            className="w-36 rounded-lg border border-grafite-claro bg-grafite px-3 py-2 text-sm text-texto outline-none focus:border-dourado"
                          />
                        </div>
                      )}

                      {varias &&
                        grupo.itens.map((item: any) => (
                          <div key={item.id}>
                            <label className="mb-1 block text-xs text-texto-suave">
                              {String(
                                item.descricao || ""
                              ).split(" - ")[0] || "Valor"}
                            </label>

                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={
                                valoresDoGrupo[item.id] ??
                                ""
                              }
                              onChange={(e) =>
                                setValoresDoGrupo(
                                  (atuais) => ({
                                    ...atuais,
                                    [item.id]:
                                      e.target.value,
                                  })
                                )
                              }
                              className="w-32 rounded-lg border border-grafite-claro bg-grafite px-3 py-2 text-sm text-texto outline-none focus:border-dourado"
                            />
                          </div>
                        ))}

                      <button
                        type="button"
                        disabled={salvando}
                        onClick={() =>
                          varias
                            ? darBaixaNoGrupo(grupo)
                            : darBaixa(grupo.itens[0])
                        }
                        className="rounded-lg bg-dourado px-4 py-2 text-sm font-semibold text-preto transition hover:bg-dourado-claro disabled:opacity-50"
                      >
                        {salvando
                          ? "Confirmando..."
                          : varias
                            ? `Confirmar ${grupo.itens.length} taxas`
                            : "Confirmar"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setBaixaId("")}
                        className="rounded-lg border border-grafite-claro px-4 py-2 text-sm text-texto-suave transition hover:border-dourado hover:text-dourado"
                      >
                        Voltar
                      </button>

                      {!varias && (
                        <button
                          type="button"
                          disabled={salvando}
                          onClick={() =>
                            cancelarLancamento(
                              grupo.itens[0]
                            )
                          }
                          className="ml-auto rounded-lg border border-grafite-claro px-4 py-2 text-sm text-red-300 transition hover:border-red-700 hover:bg-red-950/40 disabled:opacity-50"
                        >
                          Cancelar lançamento
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}          </div>
        </div>
      )}

      {/* EXTRATO */}

      <div className="overflow-hidden rounded-xl border border-grafite-claro bg-grafite">
        <div className="border-b border-grafite-claro px-5 py-3">
          <h2 className="font-semibold text-dourado">
            Extrato
          </h2>
        </div>

        {confirmadas.length === 0 && (
          <div className="p-8 text-center text-texto-suave">
            Nenhuma movimentação confirmada ainda.
          </div>
        )}

        <div className="divide-y divide-grafite-claro">
          {confirmadas.map((t) => {
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