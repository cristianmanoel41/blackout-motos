"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import { formatarMoeda } from "@/lib/formatadores/moeda";

const supabase = createClient();

const formasPagamento = [
  "Pix",
  "Dinheiro",
  "Transferência",
  "Cartão",
  "Financiamento",
];

function moeda(valor: number) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  ).format(valor || 0);
}

export default function EditarVendaPage() {
  const params = useParams();
  const router = useRouter();

  const id = params.id as string;

  const [carregando, setCarregando] =
    useState(true);

  const [salvando, setSalvando] =
    useState(false);

  const [erro, setErro] =
    useState("");

  const [mensagem, setMensagem] =
    useState("");

  const [dataVenda, setDataVenda] =
    useState("");

  const [horaVenda, setHoraVenda] =
    useState("");

  const [cliente, setCliente] =
    useState("");

  const [telefone, setTelefone] =
    useState("");

  const [vendedor, setVendedor] =
    useState("");

  const [
    formaPagamento,
    setFormaPagamento,
  ] = useState("");

  const [valorVenda, setValorVenda] =
    useState("");

  const [entrada, setEntrada] =
    useState("");

  const [banco, setBanco] =
    useState("");

  const [
    transferenciaCliente,
    setTransferenciaCliente,
  ] = useState("");

  const [
    transferenciaLoja,
    setTransferenciaLoja,
  ] = useState("");

  const [
    observacoes,
    setObservacoes,
  ] = useState("");

  const [motoNome, setMotoNome] =
    useState("");

  const [motorcycleId, setMotorcycleId] =
    useState("");

  const [
    capacetesVinculados,
    setCapacetesVinculados,
  ] = useState<any[]>([]);

  /*
   * Composicao do pagamento: pix, dinheiro, cartao, moto na
   * troca. Ficava so na criacao da venda; se o cliente
   * trocasse a forma depois, nao havia onde corrigir.
   */
  const [componentes, setComponentes] =
    useState<any[]>([]);

  const ehFinanciamento =
    formaPagamento ===
    "Financiamento";

  const valorFinanciado =
    useMemo(() => {
      if (!ehFinanciamento) {
        return 0;
      }

      const venda =
        Number(valorVenda) || 0;

      const valorEntrada =
        Number(entrada) || 0;

      return Math.max(
        venda - valorEntrada,
        0
      );
    }, [
      valorVenda,
      entrada,
      ehFinanciamento,
    ]);


  const totalCapacetesVinculados =
    useMemo(() => {
      return capacetesVinculados.reduce(
        (total, item) =>
          total +
          Number(
            item.valor_recebido || 0
          ),
        0
      );
    }, [capacetesVinculados]);

  const totalCapacetesJaIncluidos =
    useMemo(() => {
      return capacetesVinculados
        .filter(
          (item) =>
            item.ja_incluido_na_venda
        )
        .reduce(
          (total, item) =>
            total +
            Number(
              item.valor_recebido ||
                0
            ),
          0
        );
    }, [capacetesVinculados]);

  const totalCapacetesRecebidosDepois =
    useMemo(() => {
      return capacetesVinculados
        .filter(
          (item) =>
            !item.ja_incluido_na_venda
        )
        .reduce(
          (total, item) =>
            total +
            Number(
              item.valor_recebido ||
                0
            ),
          0
        );
    }, [capacetesVinculados]);

  const totalComponentes =
    useMemo(() => {
      return componentes.reduce(
        (total, item) =>
          total +
          (Number(item.valor) || 0),
        0
      );
    }, [componentes]);

  const totalFinanceiroOperacao =
    (Number(valorVenda) || 0) +
    totalCapacetesRecebidosDepois;

  useEffect(() => {
    carregarVenda();
  }, [id]);

  async function carregarVenda() {
    setCarregando(true);
    setErro("");

    // 1. Carrega a venda SEM embed de motorcycles
    const {
      data: venda,
      error: vendaError,
    } = await supabase
      .from("sales")
      .select("*")
      .eq("id", id)
      .single();

    if (
      vendaError ||
      !venda
    ) {
      console.error(vendaError);

      setErro(
        vendaError?.message ||
          "Não foi possível carregar os dados da venda."
      );

      setCarregando(false);
      return;
    }

    setDataVenda(
      venda.data_venda || ""
    );

    setHoraVenda(
      venda.hora_venda
        ? String(
            venda.hora_venda
          ).slice(0, 5)
        : ""
    );

    setCliente(
      venda.cliente || ""
    );

    setTelefone(
      venda.telefone || ""
    );

    setVendedor(
      venda.vendedor || ""
    );

    setFormaPagamento(
      venda.forma_pagamento ||
        (Number(
          venda.valor_financiado
        ) > 0
          ? "Financiamento"
          : "")
    );

    setValorVenda(
      String(
        venda.valor_total_venda ??
          venda.valor_venda ??
          ""
      )
    );

    setEntrada(
      String(
        venda.entrada_total ??
          venda.entrada ??
          ""
      )
    );

    setBanco(
      venda.banco || ""
    );

    setTransferenciaCliente(
      String(
        venda.transferencia_cliente ??
          ""
      )
    );

    setTransferenciaLoja(
      String(
        venda.transferencia_loja ??
          ""
      )
    );

    setObservacoes(
      venda.observacoes || ""
    );

    const {
      data: componentesData,
      error: componentesError,
    } = await supabase
      .from(
        "sale_payment_components"
      )
      .select("*")
      .eq("sale_id", id)
      .order("criado_em", {
        ascending: true,
      });

    if (componentesError) {
      console.error(
        componentesError
      );
    }

    setComponentes(
      (componentesData || []).map(
        (item: any) => ({
          idLocal: String(item.id),
          tipo: item.tipo || "Pix",
          destino:
            item.destino ===
            "capacete"
              ? "capacete"
              : "moto",
          valor: String(
            item.valor ?? ""
          ),
          parcelas: String(
            item.parcelas ?? "1"
          ),
          motorcycle_id:
            item.motorcycle_id ||
            null,
          observacoes:
            item.observacoes || null,
        })
      )
    );

    const idMoto =
      venda.motorcycle_id
        ? String(
            venda.motorcycle_id
          )
        : "";

    setMotorcycleId(
      idMoto
    );

    // 2. Carrega a moto separadamente
    if (idMoto) {
      const {
        data: moto,
        error: motoError,
      } = await supabase
        .from("motorcycles")
        .select(`
          id,
          codigo,
          marca,
          modelo,
          versao,
          ano_modelo,
          placa
        `)
        .eq(
          "id",
          idMoto
        )
        .single();

      if (
        motoError ||
        !moto
      ) {
        console.error(
          motoError
        );

        setMotoNome(
          "Moto não encontrada"
        );
      } else {
        setMotoNome(
          [
            moto.codigo,
            moto.marca,
            moto.modelo,
            moto.versao,
            moto.ano_modelo,
            moto.placa,
          ]
            .filter(Boolean)
            .join(" · ")
        );
      }
    } else {
      setMotoNome(
        "Moto não encontrada"
      );
    }

    try {
      const respostaCapacetes =
        await fetch(
          `/api/vendas/${encodeURIComponent(
            id
          )}/capacetes`,
          {
            cache: "no-store",
          }
        );

      if (respostaCapacetes.ok) {
        const dadosCapacetes =
          await respostaCapacetes.json();

        setCapacetesVinculados(
          Array.isArray(
            dadosCapacetes?.lancamentos
          )
            ? dadosCapacetes.lancamentos
            : []
        );
      } else {
        const dadosErro =
          await respostaCapacetes
            .json()
            .catch(() => null);

        console.error(
          "Não foi possível carregar os capacetes vinculados:",
          dadosErro
        );

        setCapacetesVinculados(
          []
        );
      }
    } catch (error) {
      console.error(
        "Erro ao carregar capacetes vinculados:",
        error
      );

      setCapacetesVinculados([]);
    }

    setCarregando(false);
  }

  function atualizarComponente(
    idLocal: string,
    campo: string,
    valor: string
  ) {
    setComponentes((atuais) =>
      atuais.map((item) =>
        item.idLocal === idLocal
          ? { ...item, [campo]: valor }
          : item
      )
    );
  }

  function adicionarComponente() {
    setComponentes((atuais) => [
      ...atuais,
      {
        idLocal: `novo-${Date.now()}-${atuais.length}`,
        tipo: "Pix",
        destino: "moto",
        valor: "",
        parcelas: "1",
        motorcycle_id: null,
        observacoes: null,
      },
    ]);
  }

  function removerComponente(
    idLocal: string
  ) {
    setComponentes((atuais) =>
      atuais.filter(
        (item) =>
          item.idLocal !== idLocal
      )
    );
  }

  /*
   * A composicao e regravada inteira: apaga o que estava e
   * insere o que esta na tela. E o mesmo caminho da criacao da
   * venda, entao os dois lugares gravam igual.
   */
  async function regravarComponentes() {
    const { error: erroApagar } =
      await supabase
        .from(
          "sale_payment_components"
        )
        .delete()
        .eq("sale_id", id);

    if (erroApagar) throw erroApagar;

    const validos = componentes.filter(
      (item) =>
        Number(item.valor) > 0
    );

    if (validos.length === 0) return;

    const linhas = validos.map(
      (item) => {
        const valor =
          Number(item.valor) || 0;

        const parcelas =
          item.tipo === "Cartão"
            ? Number(item.parcelas) || 1
            : null;

        return {
          sale_id: id,
          tipo: item.tipo,
          destino:
            item.destino ===
            "capacete"
              ? "capacete"
              : "moto",
          valor,
          parcelas,
          valor_parcela: parcelas
            ? valor / parcelas
            : null,
          motorcycle_id:
            item.motorcycle_id ||
            null,
          observacoes:
            item.observacoes || null,
        };
      }
    );

    const { error: erroInserir } =
      await supabase
        .from(
          "sale_payment_components"
        )
        .insert(linhas);

    if (erroInserir) throw erroInserir;
  }

  /*
   * O caixa tem que acompanhar: se o valor da venda muda, o
   * lancamento antigo fica mentindo. A baixa ja dada e
   * preservada - so o valor e a descricao sao corrigidos.
   */
  async function sincronizarCaixa() {
    const recebidoDoCliente =
      componentes
        .filter(
          (item) =>
            item.tipo !==
            "Moto na troca"
        )
        .reduce(
          (total, item) =>
            total +
            (Number(item.valor) || 0),
          0
        ) +
      (Number(transferenciaCliente) ||
        0);

    const { data: lancamentos } =
      await supabase
        .from("cash_transactions")
        .select("id, valor, descricao, tipo")
        .eq("origem", "venda")
        .eq("origem_id", id)
        .eq("tipo", "entrada")
        .order("criado_em", {
          ascending: true,
        });

    const lista = lancamentos || [];

    const doBanco = lista.find((item: any) =>
      String(item.descricao || "").startsWith(
        "Financiamento"
      )
    );

    const doCliente = lista.find(
      (item: any) => item !== doBanco
    );

    if (doCliente) {
      await supabase
        .from("cash_transactions")
        .update({
          valor: recebidoDoCliente,
        })
        .eq("id", doCliente.id);
    }

    if (doBanco) {
      await supabase
        .from("cash_transactions")
        .update({
          valor: valorFinanciado,
        })
        .eq("id", doBanco.id);
    }
  }

  async function salvarAlteracoes() {
    setErro("");
    setMensagem("");

    if (!dataVenda) {
      setErro(
        "Informe a data da venda."
      );
      return;
    }

    if (!horaVenda) {
      setErro(
        "Informe a hora da venda."
      );
      return;
    }

    if (!cliente.trim()) {
      setErro(
        "Informe o nome do cliente."
      );
      return;
    }

    if (!vendedor) {
      setErro(
        "Selecione o vendedor."
      );
      return;
    }

    if (!formaPagamento) {
      setErro(
        "Selecione a forma de pagamento."
      );
      return;
    }

    if (
      !valorVenda ||
      Number(valorVenda) <= 0
    ) {
      setErro(
        "Informe o valor da venda."
      );
      return;
    }

    if (
      ehFinanciamento &&
      Number(entrada || 0) >
        Number(valorVenda)
    ) {
      setErro(
        "A entrada não pode ser maior que o valor da venda."
      );
      return;
    }

    if (
      ehFinanciamento &&
      !banco.trim()
    ) {
      setErro(
        "Informe o banco ou financeira."
      );
      return;
    }

    const confirmar =
      window.confirm(
        "Deseja salvar as alterações desta venda?"
      );

    if (!confirmar) {
      return;
    }

    setSalvando(true);

    const valorVendaNumero =
      Number(valorVenda) || 0;

    const entradaFinal =
      ehFinanciamento
        ? Number(entrada) || 0
        : valorVendaNumero;

    const { error } =
      await supabase
        .from("sales")
        .update({
          data_venda:
            dataVenda,

          hora_venda:
            horaVenda,

          cliente:
            cliente.trim(),

          telefone:
            telefone.trim(),

          vendedor,

          forma_pagamento:
            formaPagamento,

          valor_venda:
            valorVendaNumero,

          valor_total_venda:
            valorVendaNumero,

          entrada:
            entradaFinal,

          entrada_total:
            entradaFinal,

          valor_financiado:
            valorFinanciado,

          banco:
            ehFinanciamento
              ? banco.trim()
              : null,

          transferencia_cliente:
            Number(
              transferenciaCliente
            ) || 0,

          transferencia_loja:
            Number(
              transferenciaLoja
            ) || 0,

          observacoes:
            observacoes.trim(),
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

    try {
      await regravarComponentes();
      await sincronizarCaixa();
    } catch (erroComposicao: any) {
      console.error(erroComposicao);

      setErro(
        `A venda foi salva, mas a composição do pagamento não: ${
          erroComposicao?.message || ""
        }`
      );

      setSalvando(false);
      return;
    }

    setMensagem(
      "Venda atualizada com sucesso!"
    );

    setSalvando(false);

    setTimeout(() => {
      router.push(
        "/vendas/historico"
      );

      router.refresh();
    }, 800);
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

        {/* CABEÇALHO */}

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

        <div className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 md:p-8">

          {/* DADOS */}

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
                    setDataVenda(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Hora da venda
                </label>

                <input
                  type="time"
                  value={horaVenda}
                  onChange={(e) =>
                    setHoraVenda(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-zinc-300">
                  Moto
                </label>

                <div className="min-h-[50px] rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-300">
                  {motoNome}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Vendedor *
                </label>

                <select
                  value={vendedor}
                  onChange={(e) =>
                    setVendedor(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                >
                  <option value="">
                    Selecione
                  </option>

                  <option value="Cristian">
                    Cristian
                  </option>

                  <option value="Bruno">
                    Bruno
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Forma de pagamento *
                </label>

                <select
                  value={
                    formaPagamento
                  }
                  onChange={(e) => {
                    const forma =
                      e.target.value;

                    setFormaPagamento(
                      forma
                    );

                    if (
                      forma !==
                      "Financiamento"
                    ) {
                      setBanco("");
                    }
                  }}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                >
                  <option value="">
                    Selecione
                  </option>

                  {formasPagamento.map(
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

          {/* CLIENTE */}

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
                    setCliente(
                      e.target.value
                    )
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
                    setTelefone(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                />
              </div>

            </div>
          </section>

          {/* VALORES */}

          <section>
            <h2 className="mb-4 border-b border-zinc-800 pb-3 text-lg font-semibold text-yellow-500">
              Valores
            </h2>

            <div
              className={`grid gap-4 ${
                ehFinanciamento
                  ? "md:grid-cols-3"
                  : "md:grid-cols-2"
              }`}
            >

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
                    setValorVenda(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                />
              </div>

              {ehFinanciamento && (
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
                      setEntrada(
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Valor financiado
                </label>

                <div className="flex min-h-[50px] items-center rounded-xl border border-yellow-600/50 bg-yellow-500/10 px-4 py-3 text-lg font-bold text-yellow-500">
                  {moeda(
                    valorFinanciado
                  )}
                </div>
              </div>

            </div>

            {ehFinanciamento && (
              <div className="mt-4">
                <label className="mb-2 block text-sm text-zinc-300">
                  Banco / Financeira *
                </label>

                <input
                  type="text"
                  value={banco}
                  onChange={(e) =>
                    setBanco(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                />
              </div>
            )}

            {!ehFinanciamento &&
              formaPagamento && (
                <div className="mt-4 rounded-xl border border-green-800 bg-green-950/20 p-4 text-sm text-green-300">
                  Venda à vista por{" "}
                  <strong>
                    {formaPagamento}
                  </strong>
                  . Valor financiado será
                  R$ 0,00.
                </div>
              )}
          </section>

          {/* COMPOSIÇÃO DO PAGAMENTO */}

          <section>
            <div className="mb-4 flex flex-col gap-3 border-b border-zinc-800 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-yellow-500">
                  Composição do pagamento
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Como o cliente pagou. Corrija aqui se a forma
                  mudou depois da venda fechada.
                </p>
              </div>

              <button
                type="button"
                onClick={adicionarComponente}
                className="rounded-xl border border-yellow-600/60 px-4 py-2 text-sm font-semibold text-yellow-400 transition hover:bg-yellow-500/10"
              >
                + Adicionar pagamento
              </button>
            </div>

            {componentes.length === 0 ? (
              <p className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400">
                Nenhum pagamento detalhado nesta venda.
              </p>
            ) : (
              <div className="space-y-3">
                {componentes.map((item) => {
                  const ehTroca =
                    item.tipo === "Moto na troca";

                  return (
                    <div
                      key={item.idLocal}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
                    >
                      <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto]">
                        <div>
                          <label className="mb-1 block text-xs text-zinc-400">
                            Forma
                          </label>

                          <select
                            value={item.tipo}
                            disabled={ehTroca}
                            onChange={(e) =>
                              atualizarComponente(
                                item.idLocal,
                                "tipo",
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm outline-none focus:border-yellow-500 disabled:opacity-60"
                          >
                            <option>Pix</option>
                            <option>Dinheiro</option>
                            <option>Transferência</option>
                            <option>Cartão</option>
                            <option>Moto na troca</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs text-zinc-400">
                            Valor
                          </label>

                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.valor}
                            onChange={(e) =>
                              atualizarComponente(
                                item.idLocal,
                                "valor",
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm outline-none focus:border-yellow-500"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs text-zinc-400">
                            {item.tipo === "Cartão"
                              ? "Parcelas"
                              : "Refere-se a"}
                          </label>

                          {item.tipo === "Cartão" ? (
                            <input
                              type="number"
                              min="1"
                              value={item.parcelas}
                              onChange={(e) =>
                                atualizarComponente(
                                  item.idLocal,
                                  "parcelas",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm outline-none focus:border-yellow-500"
                            />
                          ) : (
                            <select
                              value={item.destino}
                              onChange={(e) =>
                                atualizarComponente(
                                  item.idLocal,
                                  "destino",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm outline-none focus:border-yellow-500"
                            >
                              <option value="moto">Moto</option>
                              <option value="capacete">
                                Capacete
                              </option>
                            </select>
                          )}
                        </div>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() =>
                              removerComponente(
                                item.idLocal
                              )
                            }
                            className="w-full rounded-lg border border-zinc-700 px-3 py-2.5 text-sm text-red-300 transition hover:border-red-700 hover:bg-red-950/30 md:w-auto"
                          >
                            Remover
                          </button>
                        </div>
                      </div>

                      {ehTroca && item.observacoes && (
                        <p className="mt-2 text-xs text-zinc-500">
                          {item.observacoes}
                        </p>
                      )}
                    </div>
                  );
                })}

                <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm">
                  <span className="text-zinc-400">
                    Total da composição
                  </span>

                  <strong
                    className={
                      Math.abs(
                        totalComponentes -
                          (Number(valorVenda) || 0)
                      ) < 0.01
                        ? "text-green-400"
                        : "text-yellow-400"
                    }
                  >
                    {formatarMoeda(totalComponentes)}
                  </strong>
                </div>

                {Math.abs(
                  totalComponentes -
                    (Number(valorVenda) || 0)
                ) >= 0.01 && (
                  <p className="text-xs text-yellow-400">
                    A composição soma{" "}
                    {formatarMoeda(totalComponentes)} e o valor
                    da venda é{" "}
                    {formatarMoeda(Number(valorVenda) || 0)}.
                    Confira antes de salvar.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* CAPACETES VINCULADOS À VENDA */}

          <section>
            <div className="mb-4 flex flex-col gap-3 border-b border-zinc-800 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-yellow-500">
                  Capacetes vinculados à venda
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Aqui aparece separado o que é valor da moto e o que é valor de capacete.
                </p>
              </div>

              <Link
                href={`/vendas/${id}/capacete`}
                className="inline-flex items-center justify-center rounded-lg border border-yellow-500 px-4 py-2 text-sm font-semibold text-yellow-500 transition hover:bg-yellow-500 hover:text-black"
              >
                Adicionar capacete
              </Link>
            </div>

            {capacetesVinculados.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-black/40 p-4 text-sm text-zinc-400">
                Nenhum capacete foi vinculado a esta venda.
              </div>
            ) : (
              <div className="space-y-3">
                {capacetesVinculados.map(
                  (item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-zinc-800 bg-black/40 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold text-white">
                            Capacete / acessório
                          </p>

                          <p className="mt-1 text-sm text-zinc-400">
                            {item.observacoes ||
                              "Capacete antigo sem cadastro de estoque"}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full bg-zinc-800 px-2 py-1 text-zinc-300">
                              {item.forma_pagamento ||
                                "Pagamento não informado"}
                            </span>

                            {item.ja_incluido_na_venda ? (
                              <span className="rounded-full bg-green-950 px-2 py-1 font-semibold text-green-300">
                                Já incluído no valor da venda
                              </span>
                            ) : (
                              <span className="rounded-full bg-yellow-950 px-2 py-1 font-semibold text-yellow-300">
                                Recebido depois da venda
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="text-xs uppercase tracking-wide text-zinc-500">
                            Valor do capacete
                          </p>

                          <p className="mt-1 text-xl font-bold text-yellow-500">
                            {moeda(
                              Number(
                                item.valor_recebido ||
                                  0
                              )
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                )}

                <div className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs text-zinc-500">
                      Valor registrado da venda
                    </p>

                    <p className="mt-1 font-bold text-white">
                      {moeda(
                        Number(valorVenda)
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500">
                      Capacetes vinculados
                    </p>

                    <p className="mt-1 font-bold text-yellow-500">
                      {moeda(
                        totalCapacetesVinculados
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500">
                      Deste total, já estava na venda
                    </p>

                    <p className="mt-1 font-bold text-green-400">
                      {moeda(
                        totalCapacetesJaIncluidos
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500">
                      Total financeiro da operação
                    </p>

                    <p className="mt-1 font-bold text-yellow-500">
                      {moeda(
                        totalFinanceiroOperacao
                      )}
                    </p>
                  </div>
                </div>

                {totalCapacetesRecebidosDepois >
                  0 && (
                  <div className="rounded-xl border border-yellow-800/60 bg-yellow-950/20 p-4 text-sm text-yellow-200">
                    Recebido depois da venda:{" "}
                    <strong>
                      {moeda(
                        totalCapacetesRecebidosDepois
                      )}
                    </strong>
                    . Esse valor é somado ao total financeiro da operação porque foi uma entrada nova no caixa.
                  </div>
                )}

                {totalCapacetesJaIncluidos >
                  0 && (
                  <p className="text-xs leading-5 text-zinc-500">
                    Os capacetes marcados como “já incluído no valor da venda” aparecem separados para conferência, mas não são somados novamente ao total para não duplicar o dinheiro.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* TRANSFERÊNCIA */}

          <section>
            <h2 className="mb-4 border-b border-zinc-800 pb-3 text-lg font-semibold text-yellow-500">
              Transferência
            </h2>

            <div className="grid gap-4 md:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Paga pelo cliente
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={
                    transferenciaCliente
                  }
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
                  Paga pela loja
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={
                    transferenciaLoja
                  }
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
                setObservacoes(
                  e.target.value
                )
              }
              rows={4}
              className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
            />
          </section>

          {/* RESUMO */}

          <section className="rounded-xl border border-zinc-800 bg-black p-5">
            <h3 className="mb-4 font-semibold text-yellow-500">
              Resumo Atualizado
            </h3>

            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs text-zinc-500">
                  Pagamento
                </p>

                <p className="mt-1 font-semibold">
                  {formaPagamento ||
                    "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-zinc-500">
                  Venda
                </p>

                <p className="mt-1 font-semibold">
                  {moeda(
                    Number(valorVenda)
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-zinc-500">
                  Recebido / Entrada
                </p>

                <p className="mt-1 font-semibold">
                  {moeda(
                    ehFinanciamento
                      ? Number(
                          entrada
                        )
                      : Number(
                          valorVenda
                        )
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-zinc-500">
                  Financiado
                </p>

                <p className="mt-1 font-semibold text-yellow-500">
                  {moeda(
                    valorFinanciado
                  )}
                </p>
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-3 md:flex-row">

            <button
              type="button"
              onClick={
                salvarAlteracoes
              }
              disabled={salvando}
              className="flex-1 rounded-xl bg-yellow-500 px-6 py-4 font-bold text-black transition hover:bg-yellow-400 disabled:opacity-50"
            >
              {salvando
                ? "Salvando..."
                : "Salvar Alterações"}
            </button>

            <Link
              href="/vendas/historico"
              className="rounded-xl border border-zinc-700 px-6 py-4 text-center font-semibold text-zinc-300"
            >
              Cancelar
            </Link>

          </div>

        </div>
      </div>
    </main>
  );
}