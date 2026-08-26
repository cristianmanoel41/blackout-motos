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

import {
  FileSignature,
  FileText,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { opcoesDeBanco } from "@/lib/dados/financeiras";
import { BotaoWhatsapp } from "@/components/CardWhatsapp";

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
    parcelasFinanciamento,
    setParcelasFinanciamento,
  ] = useState("");

  const [
    valorParcelaManual,
    setValorParcelaManual,
  ] = useState("");

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
    motoTrocaId,
    setMotoTrocaId,
  ] = useState("");

  const [
    motoTrocaNome,
    setMotoTrocaNome,
  ] = useState("");

  const [
    faltandoProcuracao,
    setFaltandoProcuracao,
  ] = useState<string[]>([]);

  const [
    capacetes,
    setCapacetes,
  ] = useState<
    {
      id: string;
      produto: string | null;
      marca: string | null;
      modelo: string | null;
      cor: string | null;
      tamanho: string | null;
      quantidade: number;
      valor_unitario: number;
      custo_unitario: number;
    }[]
  >([]);

  const totalCapacetes =
    useMemo(() => {
      return capacetes.reduce(
        (total, item) =>
          total +
          Number(
            item.quantidade || 0
          ) *
            Number(
              item.valor_unitario ||
                0
            ),
        0
      );
    }, [capacetes]);

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

  const parcelasNumero =
    Number(
      parcelasFinanciamento
    ) || 0;

  const valorParcelaFinal =
    Number(
      valorParcelaManual
    ) || 0;

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

    setParcelasFinanciamento(
      venda.parcelas_financiamento
        ? String(
            venda.parcelas_financiamento
          )
        : ""
    );

    setValorParcelaManual(
      venda.valor_parcela_financiamento
        ? String(
            venda.valor_parcela_financiamento
          )
        : ""
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
      data: capacetesVenda,
    } = await supabase
      .from(
        "helmet_sale_items"
      )
      .select(
        `
        id,
        produto,
        marca,
        modelo,
        cor,
        tamanho,
        quantidade,
        valor_unitario,
        custo_unitario
      `
      )
      .eq("sale_id", id);

    setCapacetes(
      (capacetesVenda as any) ||
        []
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

    // 3. Moto recebida na troca (se houver)
    const {
      data: componentes,
    } = await supabase
      .from(
        "sale_payment_components"
      )
      .select(
        "motorcycle_id, tipo"
      )
      .eq("sale_id", id)
      .eq(
        "tipo",
        "Moto na troca"
      );

    const idTroca =
      componentes?.find(
        (componente) =>
          componente.motorcycle_id
      )?.motorcycle_id;

    if (idTroca) {
      setMotoTrocaId(
        String(idTroca)
      );

      const { data: motoTroca } =
        await supabase
          .from("motorcycles")
          .select("*")
          .eq("id", idTroca)
          .single();

      setMotoTrocaNome(
        motoTroca
          ? [
              motoTroca.codigo,
              motoTroca.marca,
              motoTroca.modelo,
              motoTroca.ano_modelo,
              motoTroca.placa,
            ]
              .filter(Boolean)
              .join(" · ")
          : ""
      );

      // mesmos campos exigidos pela
      // rota da procuração
      const obrigatorios: [
        string,
        unknown,
      ][] = [
        [
          "Nome de quem entregou a moto",
          motoTroca?.fornecedor_nome,
        ],
        [
          "CPF",
          motoTroca?.fornecedor_cpf,
        ],
        [
          "Rua",
          motoTroca?.fornecedor_rua,
        ],
        [
          "Número",
          motoTroca?.fornecedor_numero,
        ],
        [
          "Bairro",
          motoTroca?.fornecedor_bairro,
        ],
        [
          "Cidade",
          motoTroca?.fornecedor_cidade,
        ],
        [
          "Estado",
          motoTroca?.fornecedor_estado,
        ],
        [
          "CEP",
          motoTroca?.fornecedor_cep,
        ],
        [
          "Placa",
          motoTroca?.placa,
        ],
        [
          "Renavam",
          motoTroca?.renavam,
        ],
        [
          "Chassi",
          motoTroca?.chassi,
        ],
      ];

      setFaltandoProcuracao(
        obrigatorios
          .filter(
            ([, valor]) =>
              !String(
                valor ?? ""
              ).trim()
          )
          .map(([nome]) => nome)
      );
    } else {
      setMotoTrocaId("");
      setMotoTrocaNome("");
      setFaltandoProcuracao([]);
    }

    setCarregando(false);
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

          /*
           * O campo editado é o total da venda.
           * O valor da moto é o total menos os
           * capacetes que saíram nesta venda.
           */
          valor_venda:
            valorVendaNumero -
            totalCapacetes,

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

          parcelas_financiamento:
            ehFinanciamento &&
            parcelasNumero > 0
              ? parcelasNumero
              : null,

          valor_parcela_financiamento:
            ehFinanciamento &&
            valorParcelaFinal > 0
              ? valorParcelaFinal
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

                {telefone.trim() && (
                  <div className="mt-2">
                    <BotaoWhatsapp
                      telefone={telefone}
                      nome={cliente}
                    />
                  </div>
                )}
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

                <select
                  value={banco}
                  onChange={(e) =>
                    setBanco(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                >
                  <option value="">
                    Selecione
                  </option>

                  {opcoesDeBanco(
                    banco
                  ).map((nome) => (
                    <option
                      key={nome}
                      value={nome}
                    >
                      {nome}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {ehFinanciamento && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-zinc-300">
                    Parcelas do financiamento
                  </label>

                  <select
                    value={
                      parcelasFinanciamento
                    }
                    onChange={(e) =>
                      setParcelasFinanciamento(
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                  >
                    <option value="">
                      Não informado
                    </option>

                    <option value="12">
                      12x
                    </option>

                    <option value="24">
                      24x
                    </option>

                    <option value="36">
                      36x
                    </option>

                    <option value="48">
                      48x
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-300">
                    Valor da parcela
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      valorParcelaManual
                    }
                    onChange={(e) =>
                      setValorParcelaManual(
                        e.target.value
                      )
                    }
                    placeholder="0,00"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                  />

                  <p className="mt-2 text-xs text-zinc-500">
                    Só para controle interno.
                  </p>
                </div>

                {parcelasNumero >
                  0 && (
                  <p className="text-sm text-zinc-300 md:col-span-2">
                    No contrato:{" "}
                    <strong className="text-yellow-500">
                      financiamento em{" "}
                      {parcelasNumero}x
                    </strong>
                  </p>
                )}
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

          {capacetes.length > 0 && (
            <section className="rounded-xl border border-zinc-800 bg-black/40 p-5">
              <h3 className="mb-3 font-semibold text-yellow-500">
                Capacetes desta venda
              </h3>

              <div className="space-y-2">
                {capacetes.map(
                  (item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm"
                    >
                      <span className="text-zinc-200">
                        {
                          item.quantidade
                        }
                        x{" "}
                        {[
                          item.produto,
                          item.marca,
                          item.modelo,
                          item.cor,
                          item.tamanho,
                        ]
                          .filter(Boolean)
                          .join(" · ") ||
                          "Capacete"}
                      </span>

                      <span className="text-zinc-400">
                        {Number(
                          item.valor_unitario
                        ) === 0
                          ? "brinde"
                          : `${moeda(
                              Number(
                                item.valor_unitario
                              )
                            )} cada`}{" "}
                        · custo{" "}
                        {moeda(
                          Number(
                            item.custo_unitario
                          )
                        )}
                      </span>
                    </div>
                  )
                )}
              </div>

              <p className="mt-3 border-t border-zinc-800 pt-3 text-sm text-zinc-400">
                Total em capacetes:{" "}
                <strong className="text-yellow-500">
                  {moeda(
                    totalCapacetes
                  )}
                </strong>{" "}
                · já incluso no valor da venda acima.
                Para trocar os capacetes, exclua e
                registre a venda novamente.
              </p>
            </section>
          )}

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

          {/* DOCUMENTOS */}

          <section className="rounded-xl border border-zinc-800 bg-black p-5">
            <h3 className="mb-1 font-semibold text-yellow-500">
              Documentos
            </h3>

            <p className="mb-4 text-xs text-zinc-500">
              Gerados com os dados salvos. Salve as
              alterações antes de baixar.
            </p>

            <div className="flex flex-wrap gap-3">
              <a
                href={`/api/contratos/venda/${id}`}
                className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-yellow-400"
              >
                <FileText size={16} />
                Contrato de Venda
              </a>

              {motoTrocaId && (
                <>
                  <a
                    href={`/api/contratos/procuracao/${motoTrocaId}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-yellow-500 px-4 py-2 text-sm font-semibold text-yellow-400 transition hover:bg-yellow-500 hover:text-black"
                  >
                    <FileSignature size={16} />
                    Procuração da Moto da Troca
                  </a>

                  <a
                    href={`/api/contratos/compra/${motoTrocaId}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-yellow-500 hover:text-yellow-500"
                  >
                    <FileText size={16} />
                    Contrato de Compra da Troca
                  </a>
                </>
              )}
            </div>

            {motoTrocaId ? (
              <>
                <p className="mt-3 text-xs text-zinc-500">
                  Moto recebida na troca:{" "}
                  <span className="text-zinc-300">
                    {motoTrocaNome ||
                      "cadastrada"}
                  </span>
                  . A procuração usa os dados de quem
                  entregou a moto (cadastrados como
                  fornecedor dela).
                </p>

                {faltandoProcuracao.length >
                  0 && (
                  <div className="mt-3 rounded-lg border border-yellow-800 bg-yellow-950/20 p-3 text-xs text-yellow-300">
                    <p className="font-semibold">
                      A procuração ainda não pode
                      ser gerada. Faltam:
                    </p>

                    <p className="mt-1">
                      {faltandoProcuracao.join(
                        ", "
                      )}
                      .
                    </p>

                    <Link
                      href={`/motos/${motoTrocaId}`}
                      className="mt-2 inline-block font-semibold underline hover:text-yellow-200"
                    >
                      Completar o cadastro da moto
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <p className="mt-3 text-xs text-zinc-500">
                Esta venda não tem moto recebida na
                troca.
              </p>
            )}
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