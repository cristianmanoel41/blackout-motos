"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Bike,
  CreditCard,
  Plus,
  Trash2,
} from "lucide-react";

const supabase = createClient();

type Moto = {
  id: string | number;
  codigo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  versao?: string | null;
  ano_modelo?: string | number | null;
  placa?: string | null;
  status?: string | null;
};

type Cliente = {
  id: string;
  nome: string;
  telefone?: string | null;
  cpf?: string | null;
};

type TipoPagamento =
  | "Pix"
  | "Dinheiro"
  | "Transferência"
  | "Cartão"
  | "Moto na troca";

type ComponentePagamento = {
  idLocal: string;
  tipo: TipoPagamento;
  valor: string;
  parcelas: string;
  motoId?: string;
  motoDescricao?: string;
};

function hoje() {
  const data = new Date();
  const ano = data.getFullYear();
  const mes = String(
    data.getMonth() + 1
  ).padStart(2, "0");
  const dia = String(
    data.getDate()
  ).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}


function horaAtual() {
  const data = new Date();

  const hora = String(
    data.getHours()
  ).padStart(2, "0");

  const minuto = String(
    data.getMinutes()
  ).padStart(2, "0");

  return `${hora}:${minuto}`;
}

function moeda(valor: number) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  ).format(valor || 0);
}

function normalizarTexto(
  valor: string
) {
  return valor
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim();
}

function novoIdLocal() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export default function VendasPage() {
  const [motos, setMotos] =
    useState<Moto[]>([]);

  const [clientes, setClientes] =
    useState<Cliente[]>([]);

  const [
    carregandoMotos,
    setCarregandoMotos,
  ] = useState(true);

  const [
    carregandoClientes,
    setCarregandoClientes,
  ] = useState(true);

  const [salvando, setSalvando] =
    useState(false);

  const [mensagem, setMensagem] =
    useState("");

  const [erro, setErro] =
    useState("");

  const [dataVenda, setDataVenda] =
    useState(hoje());

  const [horaVenda, setHoraVenda] =
    useState(horaAtual());

  const [motoId, setMotoId] =
    useState("");

  const [clienteId, setClienteId] =
    useState("");

  const [
    buscaCliente,
    setBuscaCliente,
  ] = useState("");

  const [vendedor, setVendedor] =
    useState("");

  const [tipoVenda, setTipoVenda] =
    useState<
      "avista" | "financiamento"
    >("avista");

  const [valorVenda, setValorVenda] =
    useState("");

  const [banco, setBanco] =
    useState("");

  const [
    componentes,
    setComponentes,
  ] = useState<
    ComponentePagamento[]
  >([]);

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

  const motoSelecionada =
    motos.find(
      (moto) =>
        String(moto.id) ===
        String(motoId)
    );

  const clienteSelecionado =
    clientes.find(
      (cliente) =>
        String(cliente.id) ===
        String(clienteId)
    );

  const clientesFiltrados =
    clientes.filter((cliente) => {
      const termoTexto =
        normalizarTexto(
          buscaCliente
        );

      const termoCpf =
        buscaCliente.replace(
          /\D/g,
          ""
        );

      if (
        !termoTexto &&
        !termoCpf
      ) {
        return [];
      }

      const nome =
        normalizarTexto(
          cliente.nome || ""
        );

      const cpf = (
        cliente.cpf || ""
      ).replace(/\D/g, "");

      const encontrouNome =
        termoTexto.length > 0 &&
        nome.includes(
          termoTexto
        );

      const encontrouCpf =
        termoCpf.length > 0 &&
        cpf.includes(
          termoCpf
        );

      return (
        encontrouNome ||
        encontrouCpf
      );
    });

  const valorVendaNumero =
    Number(valorVenda) || 0;

  const entradaTotal =
    useMemo(() => {
      return componentes.reduce(
        (total, componente) =>
          total +
          (Number(
            componente.valor
          ) || 0),
        0
      );
    }, [componentes]);

  const valorFinanciado =
    useMemo(() => {
      if (
        tipoVenda !==
        "financiamento"
      ) {
        return 0;
      }

      return Math.max(
        valorVendaNumero -
          entradaTotal,
        0
      );
    }, [
      tipoVenda,
      valorVendaNumero,
      entradaTotal,
    ]);

  const totalPagamentosCaixa =
    useMemo(() => {
      return componentes
        .filter(
          (componente) =>
            componente.tipo !==
            "Moto na troca"
        )
        .reduce(
          (total, componente) =>
            total +
            (Number(
              componente.valor
            ) || 0),
          0
        );
    }, [componentes]);

  const totalTroca =
    useMemo(() => {
      return componentes
        .filter(
          (componente) =>
            componente.tipo ===
            "Moto na troca"
        )
        .reduce(
          (total, componente) =>
            total +
            (Number(
              componente.valor
            ) || 0),
          0
        );
    }, [componentes]);

  const valorFalta =
    Math.max(
      valorVendaNumero -
        entradaTotal,
      0
    );

  async function carregarMotos() {
    setCarregandoMotos(true);

    const { data, error } =
      await supabase
        .from("motorcycles")
        .select("*")
        .in("status", [
          "disponivel",
          "reservada",
        ])
        .order("criado_em", {
          ascending: false,
        });

    if (error) {
      setErro(
        `Não foi possível carregar as motos: ${error.message}`
      );
      setCarregandoMotos(false);
      return;
    }

    setMotos(data || []);
    setCarregandoMotos(false);
  }

  async function carregarClientes(
    clienteParaSelecionar?: string
  ) {
    setCarregandoClientes(true);

    const { data, error } =
      await supabase
        .from("customers")
        .select(
          "id, nome, telefone, cpf"
        )
        .order("nome", {
          ascending: true,
        });

    if (error) {
      setErro(
        `Não foi possível carregar os clientes: ${error.message}`
      );
      setCarregandoClientes(false);
      return;
    }

    const lista = data || [];
    setClientes(lista);

    if (
      clienteParaSelecionar
    ) {
      const encontrado =
        lista.find(
          (cliente) =>
            String(
              cliente.id
            ) ===
            String(
              clienteParaSelecionar
            )
        );

      if (encontrado) {
        setClienteId(
          String(
            encontrado.id
          )
        );

        setBuscaCliente(
          encontrado.nome
        );
      }
    }

    setCarregandoClientes(false);
  }

  useEffect(() => {
    async function iniciar() {
      const parametros =
        new URLSearchParams(
          window.location.search
        );

      const motoRecebida =
        parametros.get("moto") ||
        "";

      const clienteRecebido =
        parametros.get(
          "cliente"
        ) || "";

      const trocaMotoId =
        parametros.get(
          "trocaMoto"
        ) || "";

      const trocaDescricao =
        parametros.get(
          "trocaDescricao"
        ) || "";

      const trocaValor =
        parametros.get(
          "trocaValor"
        ) || "";

      const rascunhoSalvo =
        sessionStorage.getItem(
          "blackout-venda-em-andamento"
        );

      if (rascunhoSalvo) {
        try {
          const rascunho =
            JSON.parse(
              rascunhoSalvo
            );

          if (
            rascunho.dataVenda
          ) {
            setDataVenda(
              rascunho.dataVenda
            );
          }

          if (
            rascunho.horaVenda
          ) {
            setHoraVenda(
              rascunho.horaVenda
            );
          }

          if (rascunho.motoId) {
            setMotoId(
              rascunho.motoId
            );
          }

          if (
            rascunho.vendedor
          ) {
            setVendedor(
              rascunho.vendedor
            );
          }

          if (
            rascunho.tipoVenda
          ) {
            setTipoVenda(
              rascunho.tipoVenda
            );
          }

          if (
            rascunho.valorVenda
          ) {
            setValorVenda(
              rascunho.valorVenda
            );
          }

          if (rascunho.banco) {
            setBanco(
              rascunho.banco
            );
          }

          if (
            Array.isArray(
              rascunho.componentes
            )
          ) {
            setComponentes(
              rascunho.componentes
            );
          }

          if (
            rascunho.transferenciaCliente
          ) {
            setTransferenciaCliente(
              rascunho.transferenciaCliente
            );
          }

          if (
            rascunho.transferenciaLoja
          ) {
            setTransferenciaLoja(
              rascunho.transferenciaLoja
            );
          }

          if (
            rascunho.observacoes
          ) {
            setObservacoes(
              rascunho.observacoes
            );
          }
        } catch (e) {
          console.error(
            "Erro ao restaurar venda:",
            e
          );
        }
      }

      if (motoRecebida) {
        setMotoId(
          motoRecebida
        );
      }

      if (
        trocaMotoId &&
        trocaValor
      ) {
        setComponentes(
          (atuais) => {
            const jaExiste =
              atuais.some(
                (item) =>
                  item.motoId ===
                  trocaMotoId
              );

            if (jaExiste) {
              return atuais;
            }

            return [
              ...atuais,
              {
                idLocal:
                  novoIdLocal(),
                tipo:
                  "Moto na troca",
                valor:
                  trocaValor,
                parcelas: "1",
                motoId:
                  trocaMotoId,
                motoDescricao:
                  trocaDescricao ||
                  "Moto recebida na troca",
              },
            ];
          }
        );
      }

      await carregarMotos();

      await carregarClientes(
        clienteRecebido
      );
    }

    iniciar();
  }, []);

  function salvarRascunho() {
    const rascunho = {
      dataVenda,
      horaVenda,
      motoId,
      vendedor,
      tipoVenda,
      valorVenda,
      banco,
      componentes,
      transferenciaCliente,
      transferenciaLoja,
      observacoes,
    };

    sessionStorage.setItem(
      "blackout-venda-em-andamento",
      JSON.stringify(
        rascunho
      )
    );
  }

  function cadastrarNovoCliente() {
    salvarRascunho();

    const parametros =
      new URLSearchParams();

    parametros.set(
      "retorno",
      "venda"
    );

    if (motoId) {
      parametros.set(
        "moto",
        motoId
      );
    }

    window.location.href =
      `/clientes/novo?${parametros.toString()}`;
  }

  function cadastrarMotoTroca() {
    salvarRascunho();

    window.location.href =
      "/motos/nova?retorno=venda-troca";
  }

  function adicionarPagamento(
    tipo: TipoPagamento
  ) {
    if (
      tipo ===
      "Moto na troca"
    ) {
      cadastrarMotoTroca();
      return;
    }

    setComponentes(
      (atuais) => [
        ...atuais,
        {
          idLocal:
            novoIdLocal(),
          tipo,
          valor: "",
          parcelas: "1",
        },
      ]
    );
  }

  function alterarComponente(
    idLocal: string,
    campo:
      | "valor"
      | "parcelas",
    valor: string
  ) {
    setComponentes(
      (atuais) =>
        atuais.map(
          (item) =>
            item.idLocal ===
            idLocal
              ? {
                  ...item,
                  [campo]: valor,
                }
              : item
        )
    );
  }

  function removerComponente(
    idLocal: string
  ) {
    setComponentes(
      (atuais) =>
        atuais.filter(
          (item) =>
            item.idLocal !==
            idLocal
        )
    );
  }

  function limparFormulario() {
    setDataVenda(hoje());
    setHoraVenda(horaAtual());
    setMotoId("");
    setClienteId("");
    setBuscaCliente("");
    setVendedor("");
    setTipoVenda("avista");
    setValorVenda("");
    setBanco("");
    setComponentes([]);
    setTransferenciaCliente("");
    setTransferenciaLoja("");
    setObservacoes("");
  }

  async function salvarVenda(
    event: FormEvent
  ) {
    event.preventDefault();

    setErro("");
    setMensagem("");

    if (!horaVenda) {
      setErro(
        "Informe a hora da venda."
      );
      return;
    }

    if (!motoId) {
      setErro(
        "Selecione a moto vendida."
      );
      return;
    }

    if (
      !clienteId ||
      !clienteSelecionado
    ) {
      setErro(
        "É obrigatório selecionar um cliente cadastrado."
      );
      return;
    }

    if (!vendedor) {
      setErro(
        "Selecione o vendedor."
      );
      return;
    }

    if (
      valorVendaNumero <= 0
    ) {
      setErro(
        "Informe o valor da moto."
      );
      return;
    }

    if (
      componentes.length === 0
    ) {
      setErro(
        tipoVenda ===
          "financiamento"
          ? "Adicione pelo menos uma forma de pagamento para a entrada."
          : "Adicione a forma de pagamento da venda."
      );
      return;
    }

    for (
      const componente of
      componentes
    ) {
      const valor =
        Number(
          componente.valor
        ) || 0;

      if (valor <= 0) {
        setErro(
          `Informe o valor de ${componente.tipo}.`
        );
        return;
      }

      if (
        componente.tipo ===
          "Cartão" &&
        (
          Number(
            componente.parcelas
          ) < 1 ||
          Number(
            componente.parcelas
          ) > 24
        )
      ) {
        setErro(
          "No cartão, escolha de 1x a 24x."
        );
        return;
      }

      if (
        componente.tipo ===
          "Moto na troca" &&
        !componente.motoId
      ) {
        setErro(
          "A moto recebida na troca precisa estar cadastrada e vinculada."
        );
        return;
      }
    }

    if (
      entradaTotal >
      valorVendaNumero
    ) {
      setErro(
        "A soma dos pagamentos/entrada não pode ser maior que o valor da moto."
      );
      return;
    }

    if (
      tipoVenda === "avista" &&
      Math.abs(
        entradaTotal -
          valorVendaNumero
      ) > 0.009
    ) {
      setErro(
        `Na venda à vista, a composição precisa fechar o valor da moto. Falta ${moeda(
          valorFalta
        )}.`
      );
      return;
    }

    if (
      tipoVenda ===
        "financiamento" &&
      entradaTotal >=
        valorVendaNumero
    ) {
      setErro(
        "Se a entrada cobre todo o valor da moto, altere o tipo da venda para À vista."
      );
      return;
    }

    if (
      tipoVenda ===
        "financiamento" &&
      !banco.trim()
    ) {
      setErro(
        "Informe o banco ou financeira."
      );
      return;
    }

    const confirmar =
      window.confirm(
        `Confirmar a venda de ${
          motoSelecionada
            ? `${motoSelecionada.marca || ""} ${motoSelecionada.modelo || ""}`
            : "esta moto"
        } para ${clienteSelecionado.nome}?`
      );

    if (!confirmar) {
      return;
    }

    setSalvando(true);

    try {
      const formaResumo =
        tipoVenda ===
        "financiamento"
          ? "Financiamento"
          : componentes.length ===
              1
            ? componentes[0]
                .tipo
            : "Misto";

      const entradaCompat =
        tipoVenda ===
        "financiamento"
          ? entradaTotal
          : valorVendaNumero;

      const {
        data: vendaCriada,
        error: vendaError,
      } = await supabase
        .from("sales")
        .insert({
          data_venda: dataVenda,
          hora_venda: horaVenda,
          motorcycle_id:
            motoId,
          customer_id:
            clienteSelecionado.id,
          cliente:
            clienteSelecionado.nome.trim(),
          telefone:
            clienteSelecionado.telefone?.trim() ||
            "",
          vendedor,
          forma_pagamento:
            formaResumo,
          tipo_venda:
            tipoVenda,
          valor_venda:
            valorVendaNumero,
          valor_total_venda:
            valorVendaNumero,
          entrada:
            entradaCompat,
          entrada_total:
            entradaTotal,
          valor_financiado:
            valorFinanciado,
          banco:
            tipoVenda ===
            "financiamento"
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
        .select("id")
        .single();

      if (
        vendaError ||
        !vendaCriada
      ) {
        throw (
          vendaError ||
          new Error(
            "Não foi possível registrar a venda."
          )
        );
      }

      const componentesBanco =
        componentes.map(
          (componente) => {
            const valor =
              Number(
                componente.valor
              ) || 0;

            const parcelas =
              componente.tipo ===
              "Cartão"
                ? Number(
                    componente.parcelas
                  ) || 1
                : null;

            return {
              sale_id:
                vendaCriada.id,
              tipo:
                componente.tipo,
              valor,
              parcelas,
              valor_parcela:
                parcelas
                  ? valor /
                    parcelas
                  : null,
              motorcycle_id:
                componente.motoId ||
                null,
              observacoes:
                componente.motoDescricao ||
                null,
            };
          }
        );

      const {
        error:
          componentesError,
      } = await supabase
        .from(
          "sale_payment_components"
        )
        .insert(
          componentesBanco
        );

      if (componentesError) {
        await supabase
          .from("sales")
          .delete()
          .eq(
            "id",
            vendaCriada.id
          );

        throw componentesError;
      }

      const motosTroca =
        componentes.filter(
          (componente) =>
            componente.tipo ===
              "Moto na troca" &&
            componente.motoId
        );

      for (
        const troca of
        motosTroca
      ) {
        const {
          error: trocaError,
        } = await supabase
          .from("motorcycles")
          .update({
            origem_troca_venda_id:
              vendaCriada.id,
            status:
              "disponivel",
          })
          .eq(
            "id",
            troca.motoId
          );

        if (trocaError) {
          throw trocaError;
        }
      }

      const {
        error: motoError,
      } = await supabase
        .from("motorcycles")
        .update({
          status: "vendida",
        })
        .eq(
          "id",
          motoId
        );

      if (motoError) {
        throw motoError;
      }

      /*
       * CAIXA:
       * - Pagamentos reais recebidos entram no caixa.
       * - Moto na troca NÃO entra no caixa.
       * - Financiamento entra como recebimento do banco.
       */
      const valorCaixaVenda =
        totalPagamentosCaixa +
        valorFinanciado +
        (Number(
          transferenciaCliente
        ) || 0);

      if (
        valorCaixaVenda > 0
      ) {
        const {
          error: caixaError,
        } = await supabase
          .from(
            "cash_transactions"
          )
          .insert({
            data: dataVenda,
            tipo: "entrada",
            origem: "venda",
            origem_id:
              vendaCriada.id,
            valor:
              valorCaixaVenda,
            descricao:
              `Venda - ${
                motoSelecionada
                  ? `${motoSelecionada.marca || ""} ${motoSelecionada.modelo || ""}`
                  : "Moto"
              }`,
          });

        if (caixaError) {
          throw caixaError;
        }
      }

      const valorTransfLoja =
        Number(
          transferenciaLoja
        ) || 0;

      if (
        valorTransfLoja > 0
      ) {
        const {
          error:
            transferenciaError,
        } = await supabase
          .from(
            "cash_transactions"
          )
          .insert({
            data: dataVenda,
            tipo: "saida",
            origem: "venda",
            origem_id:
              vendaCriada.id,
            valor:
              valorTransfLoja,
            descricao:
              "Transferência paga pela loja",
          });

        if (
          transferenciaError
        ) {
          throw transferenciaError;
        }
      }

      setMensagem(
        "Venda registrada com sucesso. Pagamentos, financiamento e moto de troca foram vinculados."
      );

      limparFormulario();

      sessionStorage.removeItem(
        "blackout-venda-em-andamento"
      );

      window.history.replaceState(
        {},
        "",
        "/vendas"
      );

      await carregarMotos();
    } catch (error: any) {
      console.error(error);

      const mensagemErro = [
        error?.message,
        error?.details,
        error?.hint,
        error?.code
          ? `Código: ${error.code}`
          : null,
      ]
        .filter(Boolean)
        .join(" | ");

      setErro(
        mensagemErro ||
          "Não foi possível registrar a venda."
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="mb-1 text-sm font-semibold uppercase tracking-[0.25em] text-yellow-500">
            Blackout Motos
          </p>

          <h1 className="text-3xl font-bold md:text-4xl">
            Registrar Venda
          </h1>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/vendas/historico"
              className="rounded-lg border border-yellow-500 px-4 py-2 font-semibold text-yellow-500 transition hover:bg-yellow-500 hover:text-black"
            >
              Ver Todas as Vendas
            </Link>

            <Link
              href="/estoque"
              className="rounded-lg border border-zinc-700 px-4 py-2 font-semibold text-zinc-300 transition hover:border-yellow-500 hover:text-yellow-500"
            >
              Voltar ao Estoque
            </Link>
          </div>
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

        <form
          onSubmit={salvarVenda}
          className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 md:p-8"
        >
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

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Moto vendida *
                </label>

                <select
                  value={motoId}
                  onChange={(e) =>
                    setMotoId(
                      e.target.value
                    )
                  }
                  disabled={
                    carregandoMotos
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                >
                  <option value="">
                    {carregandoMotos
                      ? "Carregando motos..."
                      : "Selecione a moto"}
                  </option>

                  {motos.map(
                    (moto) => (
                      <option
                        key={moto.id}
                        value={moto.id}
                      >
                        {moto.codigo
                          ? `${moto.codigo} - `
                          : ""}
                        {moto.marca || ""}{" "}
                        {moto.modelo || ""}{" "}
                        {moto.versao || ""}
                        {moto.ano_modelo
                          ? ` - ${moto.ano_modelo}`
                          : ""}
                        {moto.placa
                          ? ` - ${moto.placa}`
                          : ""}
                      </option>
                    )
                  )}
                </select>
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

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Tipo da venda *
                </label>

                <select
                  value={tipoVenda}
                  onChange={(e) => {
                    const valor =
                      e.target.value as
                        | "avista"
                        | "financiamento";

                    setTipoVenda(
                      valor
                    );

                    if (
                      valor ===
                      "avista"
                    ) {
                      setBanco("");
                    }
                  }}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                >
                  <option value="avista">
                    À vista / pagamento completo
                  </option>

                  <option value="financiamento">
                    Financiamento
                  </option>
                </select>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-4 border-b border-zinc-800 pb-3">
              <h2 className="text-lg font-semibold text-yellow-500">
                Cliente *
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Digite parte do nome ou CPF e selecione uma sugestão.
              </p>
            </div>

            <div className="relative">
              <input
                type="text"
                value={buscaCliente}
                onChange={(e) => {
                  const valor =
                    e.target.value;

                  setBuscaCliente(
                    valor
                  );

                  if (
                    clienteSelecionado &&
                    valor !==
                      clienteSelecionado.nome
                  ) {
                    setClienteId("");
                  }
                }}
                placeholder="Digite o nome ou CPF do cliente..."
                autoComplete="off"
                className="w-full rounded-xl border border-yellow-600/60 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
              />

              {buscaCliente.trim() &&
                !clienteSelecionado && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl">
                    {carregandoClientes ? (
                      <div className="p-4 text-sm text-zinc-400">
                        Carregando clientes...
                      </div>
                    ) : clientesFiltrados.length >
                      0 ? (
                      clientesFiltrados
                        .slice(0, 10)
                        .map(
                          (
                            cliente
                          ) => (
                            <button
                              key={
                                cliente.id
                              }
                              type="button"
                              onClick={() => {
                                setClienteId(
                                  String(
                                    cliente.id
                                  )
                                );
                                setBuscaCliente(
                                  cliente.nome
                                );
                              }}
                              className="block w-full border-b border-zinc-800 px-4 py-3 text-left hover:bg-zinc-900"
                            >
                              <p className="font-semibold">
                                {
                                  cliente.nome
                                }
                              </p>

                              <p className="mt-1 text-xs text-zinc-400">
                                {cliente.cpf
                                  ? `CPF: ${cliente.cpf}`
                                  : ""}
                                {cliente.telefone
                                  ? ` · ${cliente.telefone}`
                                  : ""}
                              </p>
                            </button>
                          )
                        )
                    ) : (
                      <div className="p-4 text-sm text-yellow-300">
                        Nenhum cliente encontrado.
                      </div>
                    )}
                  </div>
                )}
            </div>

            <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-zinc-400">
                {clienteSelecionado
                  ? `Selecionado: ${clienteSelecionado.nome}`
                  : "Nenhum cliente selecionado."}
              </div>

              <button
                type="button"
                onClick={
                  cadastrarNovoCliente
                }
                className="rounded-xl bg-yellow-500 px-5 py-3 font-bold text-black hover:bg-yellow-400"
              >
                + Cadastrar Cliente
              </button>
            </div>
          </section>

          <section>
            <h2 className="mb-4 border-b border-zinc-800 pb-3 text-lg font-semibold text-yellow-500">
              Valor da Moto
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Valor da moto *
                </label>

                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={valorVenda}
                  onChange={(e) =>
                    setValorVenda(
                      e.target.value
                    )
                  }
                  placeholder="0,00"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                />
              </div>

              {tipoVenda ===
                "financiamento" && (
                <div>
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
                    placeholder="Ex.: Banco Pan, Santander..."
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                  />
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="mb-4 border-b border-zinc-800 pb-3">
              <h2 className="text-lg font-semibold text-yellow-500">
                {tipoVenda ===
                "financiamento"
                  ? "Composição da Entrada"
                  : "Composição do Pagamento"}
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Você pode combinar Pix, dinheiro, transferência, cartão e moto na troca.
              </p>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {(
                [
                  "Pix",
                  "Dinheiro",
                  "Transferência",
                  "Cartão",
                ] as TipoPagamento[]
              ).map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() =>
                    adicionarPagamento(
                      tipo
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 hover:border-yellow-500 hover:text-yellow-500"
                >
                  {tipo ===
                  "Cartão" ? (
                    <CreditCard
                      size={16}
                    />
                  ) : (
                    <Plus
                      size={16}
                    />
                  )}
                  {tipo}
                </button>
              ))}

              <button
                type="button"
                onClick={
                  cadastrarMotoTroca
                }
                className="inline-flex items-center gap-2 rounded-lg border border-yellow-700 bg-yellow-950/20 px-3 py-2 text-sm font-semibold text-yellow-300 hover:bg-yellow-900/30"
              >
                <Bike size={16} />
                Moto na troca
              </button>
            </div>

            {componentes.length ===
              0 && (
              <div className="rounded-xl border border-zinc-800 bg-black/40 p-5 text-sm text-zinc-400">
                Nenhuma forma de pagamento adicionada.
              </div>
            )}

            <div className="space-y-3">
              {componentes.map(
                (componente) => {
                  const valor =
                    Number(
                      componente.valor
                    ) || 0;

                  const parcelas =
                    Math.max(
                      1,
                      Number(
                        componente.parcelas
                      ) || 1
                    );

                  return (
                    <div
                      key={
                        componente.idLocal
                      }
                      className="rounded-xl border border-zinc-800 bg-black p-4"
                    >
                      <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_46px] md:items-end">
                        <div>
                          <p className="text-xs text-zinc-500">
                            Forma
                          </p>

                          <p className="mt-2 font-semibold text-white">
                            {
                              componente.tipo
                            }
                          </p>

                          {componente.tipo ===
                            "Moto na troca" && (
                            <p className="mt-1 text-xs text-yellow-300">
                              {componente.motoDescricao ||
                                "Moto vinculada"}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="mb-2 block text-xs text-zinc-500">
                            Valor
                          </label>

                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={
                              componente.valor
                            }
                            onChange={(e) =>
                              alterarComponente(
                                componente.idLocal,
                                "valor",
                                e
                                  .target
                                  .value
                              )
                            }
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 outline-none focus:border-yellow-500"
                          />
                        </div>

                        <div>
                          {componente.tipo ===
                          "Cartão" ? (
                            <>
                              <label className="mb-2 block text-xs text-zinc-500">
                                Parcelas
                              </label>

                              <select
                                value={
                                  componente.parcelas
                                }
                                onChange={(e) =>
                                  alterarComponente(
                                    componente.idLocal,
                                    "parcelas",
                                    e
                                      .target
                                      .value
                                  )
                                }
                                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 outline-none focus:border-yellow-500"
                              >
                                {Array.from(
                                  {
                                    length:
                                      24,
                                  },
                                  (
                                    _,
                                    indice
                                  ) =>
                                    indice +
                                    1
                                ).map(
                                  (
                                    parcela
                                  ) => (
                                    <option
                                      key={
                                        parcela
                                      }
                                      value={
                                        parcela
                                      }
                                    >
                                      {
                                        parcela
                                      }
                                      x
                                    </option>
                                  )
                                )}
                              </select>

                              <p className="mt-1 text-xs text-yellow-500">
                                {parcelas}x de{" "}
                                {moeda(
                                  valor /
                                    parcelas
                                )}
                              </p>
                            </>
                          ) : (
                            <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-500">
                              {componente.tipo ===
                              "Moto na troca"
                                ? "Vinculada ao estoque"
                                : "Pagamento único"}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removerComponente(
                              componente.idLocal
                            )
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-900 text-red-400 hover:bg-red-950/30"
                          title="Remover"
                        >
                          <Trash2
                            size={16}
                          />
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <Resumo
                titulo={
                  tipoVenda ===
                  "financiamento"
                    ? "Entrada total"
                    : "Pagamento total"
                }
                valor={
                  entradaTotal
                }
              />

              <Resumo
                titulo="Moto na troca"
                valor={totalTroca}
              />

              <Resumo
                titulo="Recebimento em dinheiro/cartão"
                valor={
                  totalPagamentosCaixa
                }
              />

              <Resumo
                titulo="Valor financiado"
                valor={
                  valorFinanciado
                }
                destaque
              />
            </div>

            {tipoVenda ===
              "avista" &&
              valorVendaNumero >
                0 &&
              entradaTotal <
                valorVendaNumero && (
                <p className="mt-3 text-sm text-yellow-300">
                  Falta compor{" "}
                  <strong>
                    {moeda(
                      valorFalta
                    )}
                  </strong>{" "}
                  para fechar o valor da venda.
                </p>
              )}

            {tipoVenda ===
              "financiamento" && (
              <div className="mt-4 rounded-xl border border-yellow-800/50 bg-yellow-950/10 p-4">
                <p className="text-sm text-zinc-300">
                  Cálculo automático
                </p>

                <p className="mt-2 text-lg font-bold text-yellow-500">
                  {moeda(
                    valorVendaNumero
                  )}{" "}
                  -{" "}
                  {moeda(
                    entradaTotal
                  )}{" "}
                  ={" "}
                  {moeda(
                    valorFinanciado
                  )}
                </p>
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-4 border-b border-zinc-800 pb-3 text-lg font-semibold text-yellow-500">
              Transferência do Documento
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
                  value={
                    transferenciaCliente
                  }
                  onChange={(e) =>
                    setTransferenciaCliente(
                      e.target.value
                    )
                  }
                  placeholder="0,00"
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
                  value={
                    transferenciaLoja
                  }
                  onChange={(e) =>
                    setTransferenciaLoja(
                      e.target.value
                    )
                  }
                  placeholder="0,00"
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
              placeholder="Informações adicionais..."
            />
          </section>

          <section className="rounded-xl border border-zinc-800 bg-black p-5">
            <h3 className="mb-4 font-semibold text-yellow-500">
              Resumo da Venda
            </h3>

            <div className="grid gap-4 md:grid-cols-4">
              <ResumoTexto
                titulo="Cliente"
                valor={
                  clienteSelecionado?.nome ||
                  "Obrigatório"
                }
              />

              <ResumoTexto
                titulo="Tipo"
                valor={
                  tipoVenda ===
                  "financiamento"
                    ? "Financiamento"
                    : "À vista"
                }
              />

              <Resumo
                titulo="Valor da moto"
                valor={
                  valorVendaNumero
                }
              />

              <Resumo
                titulo="Financiado"
                valor={
                  valorFinanciado
                }
                destaque
              />
            </div>
          </section>

          <button
            type="submit"
            disabled={
              salvando ||
              !clienteId
            }
            className="w-full rounded-xl bg-yellow-500 px-6 py-4 text-base font-bold text-black transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {salvando
              ? "Registrando venda..."
              : !clienteId
                ? "Selecione um Cliente para Continuar"
                : "Registrar Venda"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Resumo({
  titulo,
  valor,
  destaque = false,
}: {
  titulo: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <p className="text-xs text-zinc-500">
        {titulo}
      </p>

      <p
        className={`mt-1 font-bold ${
          destaque
            ? "text-yellow-500"
            : "text-white"
        }`}
      >
        {moeda(valor)}
      </p>
    </div>
  );
}

function ResumoTexto({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div>
      <p className="text-xs text-zinc-500">
        {titulo}
      </p>
      <p className="mt-1 font-semibold">
        {valor}
      </p>
    </div>
  );
}