"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import {
  opcoesDeVendedor,
  useUsuarioAtual,
  VENDEDORES,
} from "@/lib/usuario/atual";
import {
  FileText,
  HardHat,
  Plus,
  ShoppingBag,
  Trash2,
  UserPlus,
} from "lucide-react";

const supabase = createClient();

const CHAVE_RASCUNHO = "blackout-venda-capacete-em-andamento";

const formasPagamento = [
  "Pix",
  "Dinheiro",
  "Transferência",
  "Cartão",
];



type Modelo = {
  id: string;
  produto: string;
  marca: string;
  modelo: string;
  cor: string;
  tamanho: string;
  preco_venda_padrao: number;
  custo_medio: number;
  estoque_atual: number;
  ativo: boolean;
};

type Cliente = {
  id: string;
  nome: string;
  telefone: string | null;
  cpf: string | null;
};

type ItemVenda = {
  idLocal: string;
  modeloId: string;
  novoProduto: string;
  novoMarca: string;
  novoModelo: string;
  novoCor: string;
  novoTamanho: string;
  novoCusto: string;
  quantidade: string;
  valorUnitario: string;
};

function hoje() {
  const data = new Date();
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function novoIdLocal() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function itemVazio(): ItemVenda {
  return {
    idLocal: novoIdLocal(),
    modeloId: "",
    novoProduto: "Capacete",
    novoMarca: "",
    novoModelo: "",
    novoCor: "",
    novoTamanho: "",
    novoCusto: "",
    quantidade: "1",
    valorUnitario: "",
  };
}

function normalizar(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function apenasNumeros(valor: string) {
  return valor.replace(/\D/g, "");
}

function descreverModelo(modelo: Modelo) {
  return [
    modelo.produto,
    modelo.marca,
    modelo.modelo,
    modelo.cor,
    modelo.tamanho,
  ]
    .filter(Boolean)
    .join(" · ");
}

export default function NovaVendaCapacetePage() {
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [dataVenda, setDataVenda] = useState(hoje());
  const [vendedor, setVendedor] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [buscaCliente, setBuscaCliente] = useState("");
  const [clienteCpf, setClienteCpf] = useState("");
  const [clienteTelefone, setClienteTelefone] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("Pix");
  const [parcelas, setParcelas] = useState("1");
  const [lancarCaixa, setLancarCaixa] = useState(true);
  const [observacoes, setObservacoes] = useState("");

  const [itens, setItens] = useState<ItemVenda[]>([itemVazio()]);

  const { usuario } = useUsuarioAtual();

  /*
   * Vendedor entra sozinho com quem está logado.
   */
  useEffect(() => {
    if (usuario?.nome && !vendedor) {
      setVendedor(usuario.nome);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  const [vendaSalva, setVendaSalva] = useState<{
    id: string;
    cliente: string;
    total: number;
  } | null>(null);

  useEffect(() => {
    iniciar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function iniciar() {
    const parametros = new URLSearchParams(
      window.location.search
    );

    const clienteRecebido = parametros.get("cliente") || "";

    const rascunhoSalvo =
      sessionStorage.getItem(CHAVE_RASCUNHO);

    if (rascunhoSalvo) {
      try {
        const rascunho = JSON.parse(rascunhoSalvo);

        if (rascunho.dataVenda) setDataVenda(rascunho.dataVenda);
        if (rascunho.vendedor) setVendedor(rascunho.vendedor);
        if (rascunho.clienteId) setClienteId(rascunho.clienteId);

        if (rascunho.buscaCliente) {
          setBuscaCliente(rascunho.buscaCliente);
        }

        if (rascunho.clienteCpf) {
          setClienteCpf(rascunho.clienteCpf);
        }

        if (rascunho.clienteTelefone) {
          setClienteTelefone(rascunho.clienteTelefone);
        }

        if (rascunho.formaPagamento) {
          setFormaPagamento(rascunho.formaPagamento);
        }

        if (rascunho.parcelas) setParcelas(rascunho.parcelas);

        if (typeof rascunho.lancarCaixa === "boolean") {
          setLancarCaixa(rascunho.lancarCaixa);
        }

        if (rascunho.observacoes) {
          setObservacoes(rascunho.observacoes);
        }

        if (
          Array.isArray(rascunho.itens) &&
          rascunho.itens.length > 0
        ) {
          setItens(rascunho.itens);
        }
      } catch (e) {
        console.error("Erro ao restaurar a venda:", e);
      }

      sessionStorage.removeItem(CHAVE_RASCUNHO);
    }

    await carregarDados(clienteRecebido);
  }

  async function carregarDados(
    clienteParaSelecionar?: string
  ) {
    setCarregando(true);

    const [
      { data: listaModelos, error: erroModelos },
      { data: listaClientes, error: erroClientes },
    ] = await Promise.all([
      supabase
        .from("helmet_models")
        .select(
          "id, produto, marca, modelo, cor, tamanho, preco_venda_padrao, custo_medio, estoque_atual, ativo"
        )
        .eq("ativo", true)
        .order("marca", { ascending: true })
        .order("modelo", { ascending: true })
        .order("tamanho", { ascending: true }),
      supabase
        .from("customers")
        .select("id, nome, telefone, cpf")
        .order("nome", { ascending: true }),
    ]);

    const falha = erroModelos || erroClientes;

    if (falha) {
      setErro(
        `Não foi possível carregar os dados: ${falha.message}`
      );
      setCarregando(false);
      return;
    }

    setModelos((listaModelos as Modelo[]) || []);

    const lista = (listaClientes as Cliente[]) || [];
    setClientes(lista);

    if (clienteParaSelecionar) {
      const encontrado = lista.find(
        (cliente) =>
          String(cliente.id) === String(clienteParaSelecionar)
      );

      if (encontrado) {
        selecionarCliente(encontrado);
      }
    }

    setCarregando(false);
  }

  function selecionarCliente(cliente: Cliente) {
    setClienteId(String(cliente.id));
    setBuscaCliente(cliente.nome);
    setClienteCpf(cliente.cpf || "");
    setClienteTelefone(cliente.telefone || "");
  }

  const clientesFiltrados = useMemo(() => {
    const termo = normalizar(buscaCliente);

    if (!termo || clienteId) return [];

    const somenteNumeros = apenasNumeros(buscaCliente);

    return clientes
      .filter((cliente) => {
        const achouNome =
          normalizar(cliente.nome).includes(termo);

        const achouCpf =
          somenteNumeros.length >= 3 &&
          apenasNumeros(cliente.cpf || "").includes(
            somenteNumeros
          );

        return achouNome || achouCpf;
      })
      .slice(0, 8);
  }, [clientes, buscaCliente, clienteId]);

  const resumo = useMemo(() => {
    return itens.reduce(
      (total, item) => {
        const modelo = modelos.find(
          (m) => m.id === item.modeloId
        );

        const quantidade = Number(item.quantidade) || 0;
        const valor = Number(item.valorUnitario) || 0;

        const custo =
          item.modeloId === "novo"
            ? Number(item.novoCusto) || 0
            : Number(modelo?.custo_medio || 0);

        return {
          quantidade: total.quantidade + quantidade,
          receita: total.receita + quantidade * valor,
          custo: total.custo + quantidade * custo,
        };
      },
      { quantidade: 0, receita: 0, custo: 0 }
    );
  }, [itens, modelos]);

  const lucro = resumo.receita - resumo.custo;

  function alterarItem(
    idLocal: string,
    campo: keyof ItemVenda,
    valor: string
  ) {
    setItens((atuais) =>
      atuais.map((item) => {
        if (item.idLocal !== idLocal) return item;

        const atualizado = { ...item, [campo]: valor };

        /*
         * Ao escolher o capacete, já sugere o valor padrão.
         */
        if (campo === "modeloId") {
          const modelo = modelos.find((m) => m.id === valor);

          atualizado.valorUnitario = modelo
            ? String(modelo.preco_venda_padrao ?? "")
            : "";
        }

        return atualizado;
      })
    );
  }

  function removerItem(idLocal: string) {
    setItens((atuais) =>
      atuais.length === 1
        ? atuais
        : atuais.filter((item) => item.idLocal !== idLocal)
    );
  }

  function salvarRascunho() {
    sessionStorage.setItem(
      CHAVE_RASCUNHO,
      JSON.stringify({
        dataVenda,
        vendedor,
        clienteId,
        buscaCliente,
        clienteCpf,
        clienteTelefone,
        formaPagamento,
        parcelas,
        lancarCaixa,
        observacoes,
        itens,
      })
    );
  }

  function cadastrarCliente() {
    salvarRascunho();

    window.location.href =
      "/clientes/novo?retorno=capacete";
  }

  function novaVenda() {
    setVendaSalva(null);
    setErro("");
    setDataVenda(hoje());

    /*
     * Volta com o usuário logado, e não em branco.
     */
    setVendedor(usuario?.nome || "");
    setClienteId("");
    setBuscaCliente("");
    setClienteCpf("");
    setClienteTelefone("");
    setFormaPagamento("Pix");
    setParcelas("1");
    setLancarCaixa(true);
    setObservacoes("");
    setItens([itemVazio()]);
    carregarDados();
  }

  async function salvar(event: FormEvent) {
    event.preventDefault();
    setErro("");

    if (!dataVenda) {
      setErro("Informe a data da venda.");
      return;
    }

    if (!buscaCliente.trim()) {
      setErro(
        "Informe o cliente. Pesquise um cadastrado ou digite o nome."
      );
      return;
    }

    if (!vendedor) {
      setErro("Selecione o vendedor.");
      return;
    }

    const usados: Record<string, number> = {};

    for (const item of itens) {
      const quantidade = Number(item.quantidade) || 0;

      if (!item.modeloId) {
        setErro("Escolha o capacete de cada item.");
        return;
      }

      if (
        item.modeloId === "novo" &&
        (!item.novoMarca.trim() || !item.novoModelo.trim())
      ) {
        setErro(
          "Informe a marca e o modelo do capacete novo."
        );
        return;
      }

      if (quantidade <= 0) {
        setErro("A quantidade precisa ser maior que zero.");
        return;
      }

      if (Number(item.valorUnitario) < 0) {
        setErro("O valor unitário não pode ser negativo.");
        return;
      }

      if (item.modeloId !== "novo") {
        usados[item.modeloId] =
          (usados[item.modeloId] || 0) + quantidade;
      }
    }

    for (const [modeloId, quantidade] of Object.entries(
      usados
    )) {
      const modelo = modelos.find((m) => m.id === modeloId);

      if (
        modelo &&
        quantidade > Number(modelo.estoque_atual || 0)
      ) {
        setErro(
          `Estoque insuficiente de ${descreverModelo(
            modelo
          )}. Disponível: ${modelo.estoque_atual}.`
        );
        return;
      }
    }

    setSalvando(true);

    let vendaId = "";

    try {
      /*
       * 1. Capacetes cadastrados na hora entram no catálogo
       *    com uma entrada de estoque da quantidade vendida,
       *    para o estoque não ficar negativo e o custo ficar
       *    registrado. Essa entrada NÃO mexe no caixa.
       */
      const itensResolvidos: {
        modeloId: string;
        produto: string;
        marca: string;
        modelo: string;
        cor: string;
        tamanho: string;
        quantidade: number;
        valorUnitario: number;
        custoUnitario: number;
      }[] = [];

      for (const item of itens) {
        const quantidade = Number(item.quantidade) || 0;
        const valorUnitario = Number(item.valorUnitario) || 0;

        if (item.modeloId !== "novo") {
          const modelo = modelos.find(
            (m) => m.id === item.modeloId
          );

          itensResolvidos.push({
            modeloId: item.modeloId,
            produto: modelo?.produto || "Capacete",
            marca: modelo?.marca || "",
            modelo: modelo?.modelo || "",
            cor: modelo?.cor || "",
            tamanho: modelo?.tamanho || "",
            quantidade,
            valorUnitario,
            custoUnitario: Number(modelo?.custo_medio || 0),
          });

          continue;
        }

        const custoUnitario = Number(item.novoCusto) || 0;

        const dadosModelo = {
          produto: item.novoProduto.trim() || "Capacete",
          marca: item.novoMarca.trim(),
          modelo: item.novoModelo.trim(),
          cor: item.novoCor.trim() || "Não informada",
          tamanho: item.novoTamanho.trim() || "Único",
          preco_venda_padrao: valorUnitario,
        };

        const { data: modeloCriado, error: erroModelo } =
          await supabase
            .from("helmet_models")
            .insert(dadosModelo)
            .select("id")
            .single();

        if (erroModelo || !modeloCriado) {
          throw (
            erroModelo ||
            new Error("Falha ao cadastrar o capacete novo.")
          );
        }

        const { data: entrada, error: erroEntrada } =
          await supabase
            .from("helmet_purchases")
            .insert({
              data_compra: dataVenda,
              fornecedor: "Entrada avulsa (cadastro na venda)",
              valor_total: quantidade * custoUnitario,
              lancar_caixa: false,
              observacoes:
                "Capacete cadastrado na hora da venda. Não gerou saída no caixa.",
            })
            .select("id")
            .single();

        if (erroEntrada || !entrada) {
          throw (
            erroEntrada ||
            new Error(
              "Falha ao lançar a entrada de estoque do capacete novo."
            )
          );
        }

        const { error: erroItemEntrada } = await supabase
          .from("helmet_purchase_items")
          .insert({
            purchase_id: entrada.id,
            helmet_model_id: modeloCriado.id,
            quantidade,
            custo_unitario: custoUnitario,
          });

        if (erroItemEntrada) throw erroItemEntrada;

        itensResolvidos.push({
          modeloId: modeloCriado.id,
          produto: dadosModelo.produto,
          marca: dadosModelo.marca,
          modelo: dadosModelo.modelo,
          cor: dadosModelo.cor,
          tamanho: dadosModelo.tamanho,
          quantidade,
          valorUnitario,
          custoUnitario,
        });
      }

      /*
       * 2. Cabeçalho da venda.
       */
      const { data: venda, error: erroVenda } = await supabase
        .from("helmet_sales")
        .insert({
          data_venda: dataVenda,
          customer_id: clienteId || null,
          cliente_nome: buscaCliente.trim(),
          cliente_cpf: clienteCpf.trim() || null,
          cliente_telefone: clienteTelefone.trim() || null,
          vendedor,
          forma_pagamento: formaPagamento,
          parcelas:
            formaPagamento === "Cartão"
              ? Number(parcelas) || 1
              : null,
          valor_total: resumo.receita,
          observacoes: observacoes.trim() || null,
        })
        .select("id")
        .single();

      if (erroVenda || !venda) {
        throw erroVenda || new Error("Falha ao salvar a venda.");
      }

      vendaId = venda.id;

      /*
       * 3. Itens vendidos (o estoque baixa pelo banco).
       */
      const { error: erroItens } = await supabase
        .from("helmet_sale_items")
        .insert(
          itensResolvidos.map((item) => ({
            helmet_sale_id: venda.id,
            helmet_model_id: item.modeloId,
            data: dataVenda,
            produto: item.produto,
            marca: item.marca,
            modelo: item.modelo,
            cor: item.cor,
            tamanho: item.tamanho,
            quantidade: item.quantidade,
            valor_unitario: item.valorUnitario,
            custo_unitario: item.custoUnitario,
          }))
        );

      if (erroItens) throw erroItens;

      /*
       * 4. Entrada no caixa.
       */
      if (lancarCaixa && resumo.receita > 0) {
        const primeiro = itensResolvidos[0];

        const descricaoProduto = [
          primeiro?.marca,
          primeiro?.modelo,
        ]
          .filter(Boolean)
          .join(" ");

        const { error: erroCaixa } = await supabase
          .from("cash_transactions")
          .insert({
            data: dataVenda,
            tipo: "entrada",
            origem: "venda_capacete",
            origem_id: venda.id,
            valor: resumo.receita,
            descricao: `Venda de capacete${
              descricaoProduto ? ` - ${descricaoProduto}` : ""
            }${
              itensResolvidos.length > 1
                ? ` e mais ${itensResolvidos.length - 1} item(ns)`
                : ""
            }`,
          });

        if (erroCaixa) throw erroCaixa;
      }

      setVendaSalva({
        id: venda.id,
        cliente: buscaCliente.trim(),
        total: resumo.receita,
      });

      setSalvando(false);
    } catch (error: any) {
      console.error(error);

      if (vendaId) {
        await supabase
          .from("helmet_sales")
          .delete()
          .eq("id", vendaId);
      }

      setErro(
        [error?.message, error?.details, error?.hint]
          .filter(Boolean)
          .join(" | ") || "Não foi possível salvar a venda."
      );

      setSalvando(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-grafite-claro bg-grafite-claro px-4 py-3 text-texto outline-none transition focus:border-dourado";

  const labelClass = "mb-1 block text-sm font-medium text-texto";

  // =========================================================
  // TELA DE SUCESSO
  // =========================================================

  if (vendaSalva) {
    return (
      <div className="w-full max-w-2xl">
        <div className="rounded-xl border border-green-700 bg-green-950/30 p-6">
          <h1 className="text-xl font-bold text-green-300">
            Venda registrada com sucesso.
          </h1>

          <p className="mt-2 text-sm text-texto">
            {vendaSalva.cliente} ·{" "}
            <strong className="text-dourado">
              {formatarMoeda(vendaSalva.total)}
            </strong>
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href={`/recibos/capacete/${vendaSalva.id}`}
              className="flex items-center gap-2 rounded-lg bg-dourado px-5 py-3 text-sm font-semibold text-preto transition hover:bg-dourado-claro"
            >
              <FileText size={17} />
              Gerar Recibo
            </Link>

            <button
              type="button"
              onClick={novaVenda}
              className="flex items-center gap-2 rounded-lg border border-grafite-claro px-5 py-3 text-sm font-semibold text-texto transition hover:border-dourado hover:text-dourado"
            >
              <Plus size={17} />
              Nova Venda
            </button>

            <Link
              href="/capacetes/vendas"
              className="flex items-center gap-2 rounded-lg border border-grafite-claro px-5 py-3 text-sm font-semibold text-texto transition hover:border-dourado hover:text-dourado"
            >
              <ShoppingBag size={17} />
              Ver Histórico
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // FORMULÁRIO
  // =========================================================

  return (
    <div className="w-full max-w-4xl">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-dourado">
          <HardHat size={24} />
          Venda de Capacete
        </h1>

        <p className="mt-1 text-sm text-texto-suave">
          Venda de balcão. Baixa o estoque, entra no caixa e
          gera recibo em Word.
        </p>
      </div>

      <form
        onSubmit={salvar}
        className="space-y-6 rounded-xl border border-grafite-claro bg-grafite p-5"
      >
        {/* DADOS DA VENDA */}

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Data da venda *</label>

            <input
              type="date"
              value={dataVenda}
              onChange={(e) => setDataVenda(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Vendedor *</label>

            <select
              value={vendedor}
              onChange={(e) => setVendedor(e.target.value)}
              className={inputClass}
            >
              <option value="">Selecione</option>

              {opcoesDeVendedor(
                VENDEDORES,
                usuario?.nome
              ).map((nome) => (
                <option key={nome} value={nome}>
                  {nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              Forma de pagamento *
            </label>

            <select
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value)}
              className={inputClass}
            >
              {formasPagamento.map((forma) => (
                <option key={forma} value={forma}>
                  {forma}
                </option>
              ))}
            </select>
          </div>
        </div>

        {formaPagamento === "Cartão" && (
          <div className="sm:max-w-[12rem]">
            <label className={labelClass}>Parcelas</label>

            <input
              type="number"
              min="1"
              max="24"
              step="1"
              value={parcelas}
              onChange={(e) => setParcelas(e.target.value)}
              className={inputClass}
            />
          </div>
        )}

        {/* CLIENTE */}

        <div className="rounded-xl border border-grafite-claro bg-preto/40 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-dourado">
              Cliente
            </h2>

            <button
              type="button"
              onClick={cadastrarCliente}
              className="flex items-center gap-2 rounded-lg border border-grafite-claro px-3 py-2 text-sm font-semibold text-texto transition hover:border-dourado hover:text-dourado"
            >
              <UserPlus size={16} />
              Cadastrar Cliente
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="relative sm:col-span-3">
              <label className={labelClass}>
                Nome do cliente *
              </label>

              <input
                value={buscaCliente}
                onChange={(e) => {
                  setBuscaCliente(e.target.value);
                  setClienteId("");
                }}
                placeholder="Digite o nome ou o CPF para pesquisar"
                autoComplete="off"
                className={inputClass}
              />

              {clientesFiltrados.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-grafite-claro bg-grafite shadow-2xl">
                  {clientesFiltrados.map((cliente) => (
                    <button
                      key={cliente.id}
                      type="button"
                      onClick={() => selecionarCliente(cliente)}
                      className="block w-full border-b border-grafite-claro px-4 py-2 text-left text-sm text-texto transition last:border-0 hover:bg-grafite-claro"
                    >
                      <span className="font-medium">
                        {cliente.nome}
                      </span>

                      {cliente.cpf && (
                        <span className="text-texto-suave">
                          {" "}
                          · {cliente.cpf}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {clienteId && (
                <p className="mt-1 text-xs text-green-400">
                  Cliente cadastrado selecionado.
                </p>
              )}

              {!clienteId && buscaCliente.trim() && (
                <p className="mt-1 text-xs text-texto-suave">
                  Sem cadastro vinculado. O recibo usa o nome
                  digitado aqui.
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>CPF</label>

              <input
                value={clienteCpf}
                onChange={(e) => setClienteCpf(e.target.value)}
                placeholder="000.000.000-00"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Telefone</label>

              <input
                value={clienteTelefone}
                onChange={(e) =>
                  setClienteTelefone(e.target.value)
                }
                placeholder="(12) 90000-0000"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* PRODUTOS */}

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-dourado">
              Produtos
            </h2>

            <button
              type="button"
              onClick={() =>
                setItens((atuais) => [...atuais, itemVazio()])
              }
              className="flex items-center gap-2 rounded-lg border border-grafite-claro px-3 py-2 text-sm font-semibold text-texto transition hover:border-dourado hover:text-dourado"
            >
              <Plus size={16} />
              Adicionar item
            </button>
          </div>

          {carregando && (
            <p className="text-sm text-texto-suave">
              Carregando capacetes...
            </p>
          )}

          <div className="space-y-3">
            {itens.map((item, indice) => {
              const modelo = modelos.find(
                (m) => m.id === item.modeloId
              );

              const quantidade = Number(item.quantidade) || 0;
              const valor = Number(item.valorUnitario) || 0;

              return (
                <div
                  key={item.idLocal}
                  className="rounded-xl border border-grafite-claro bg-preto/40 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-texto-suave">
                      Item {indice + 1}
                    </span>

                    {itens.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removerItem(item.idLocal)}
                        className="rounded-lg p-2 text-red-300 transition hover:bg-red-950/40"
                        aria-label="Remover item"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-4">
                    <div className="sm:col-span-4">
                      <label className={labelClass}>
                        Produto *
                      </label>

                      <select
                        value={item.modeloId}
                        onChange={(e) =>
                          alterarItem(
                            item.idLocal,
                            "modeloId",
                            e.target.value
                          )
                        }
                        className={inputClass}
                      >
                        <option value="">Selecione</option>

                        {modelos.map((m) => (
                          <option key={m.id} value={m.id}>
                            {descreverModelo(m)} · estoque{" "}
                            {m.estoque_atual}
                          </option>
                        ))}

                        <option value="novo">
                          + Cadastrar capacete novo
                        </option>
                      </select>
                    </div>

                    {/*
                     * Dados que vêm do cadastro do capacete.
                     * Só leitura: para mudar a cor, edite o
                     * capacete em Capacetes.
                     */}
                    {modelo && (
                      <div className="grid gap-4 sm:col-span-4 sm:grid-cols-4">
                        <CampoDoCadastro
                          titulo="Produto"
                          valor={modelo.produto}
                        />

                        <CampoDoCadastro
                          titulo="Marca"
                          valor={modelo.marca}
                        />

                        <CampoDoCadastro
                          titulo="Modelo"
                          valor={modelo.modelo}
                        />

                        <CampoDoCadastro
                          titulo="Cor"
                          valor={modelo.cor}
                        />

                        <CampoDoCadastro
                          titulo="Tamanho"
                          valor={modelo.tamanho}
                        />
                      </div>
                    )}

                    {item.modeloId === "novo" && (
                      <>
                        <div>
                          <label className={labelClass}>
                            Produto
                          </label>

                          <input
                            value={item.novoProduto}
                            onChange={(e) =>
                              alterarItem(
                                item.idLocal,
                                "novoProduto",
                                e.target.value
                              )
                            }
                            placeholder="Capacete"
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label className={labelClass}>
                            Marca *
                          </label>

                          <input
                            value={item.novoMarca}
                            onChange={(e) =>
                              alterarItem(
                                item.idLocal,
                                "novoMarca",
                                e.target.value
                              )
                            }
                            placeholder="Ex.: Pro Tork"
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label className={labelClass}>
                            Modelo *
                          </label>

                          <input
                            value={item.novoModelo}
                            onChange={(e) =>
                              alterarItem(
                                item.idLocal,
                                "novoModelo",
                                e.target.value
                              )
                            }
                            placeholder="Ex.: New Liberty Four"
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label className={labelClass}>Cor</label>

                          <input
                            value={item.novoCor}
                            onChange={(e) =>
                              alterarItem(
                                item.idLocal,
                                "novoCor",
                                e.target.value
                              )
                            }
                            placeholder="Ex.: Preto"
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label className={labelClass}>
                            Tamanho
                          </label>

                          <input
                            value={item.novoTamanho}
                            onChange={(e) =>
                              alterarItem(
                                item.idLocal,
                                "novoTamanho",
                                e.target.value
                              )
                            }
                            placeholder="Ex.: 58"
                            className={inputClass}
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className={labelClass}>
                            Custo unitário (o que a loja pagou)
                          </label>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.novoCusto}
                            onChange={(e) =>
                              alterarItem(
                                item.idLocal,
                                "novoCusto",
                                e.target.value
                              )
                            }
                            placeholder="0,00"
                            className={inputClass}
                          />

                          <p className="mt-1 text-xs text-texto-suave">
                            O capacete entra no catálogo e a
                            quantidade vendida entra no estoque
                            para sair na hora, sem mexer no
                            caixa. Se a nota fiscal dessa compra
                            for lançada depois, o estoque
                            contaria em dobro.
                          </p>
                        </div>
                      </>
                    )}

                    <div>
                      <label className={labelClass}>
                        Quantidade *
                      </label>

                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantidade}
                        onChange={(e) =>
                          alterarItem(
                            item.idLocal,
                            "quantidade",
                            e.target.value
                          )
                        }
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>
                        Valor unitário (R$)
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.valorUnitario}
                        onChange={(e) =>
                          alterarItem(
                            item.idLocal,
                            "valorUnitario",
                            e.target.value
                          )
                        }
                        placeholder="0,00"
                        className={inputClass}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className={labelClass}>
                        Valor total do item
                      </label>

                      <div className="rounded-lg border border-grafite-claro bg-grafite px-4 py-3 font-semibold text-dourado">
                        {formatarMoeda(quantidade * valor)}
                      </div>
                    </div>
                  </div>

                  {modelo && (
                    <p className="mt-3 text-xs text-texto-suave">
                      Custo médio{" "}
                      {formatarMoeda(modelo.custo_medio)} ·
                      estoque {modelo.estoque_atual} · valor
                      padrão{" "}
                      {formatarMoeda(modelo.preco_venda_padrao)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RESUMO */}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-grafite-claro bg-preto/40 p-4">
            <p className="text-xs text-texto-suave">
              Valor total da venda
            </p>

            <p className="mt-1 text-2xl font-bold text-dourado">
              {formatarMoeda(resumo.receita)}
            </p>

            <p className="mt-1 text-xs text-texto-suave">
              {resumo.quantidade} item(ns)
            </p>
          </div>

          <div className="rounded-xl border border-grafite-claro bg-preto/40 p-4">
            <p className="text-xs text-texto-suave">
              Custo da mercadoria
            </p>

            <p className="mt-1 text-2xl font-bold text-texto">
              {formatarMoeda(resumo.custo)}
            </p>
          </div>

          <div className="rounded-xl border border-grafite-claro bg-preto/40 p-4">
            <p className="text-xs text-texto-suave">Lucro</p>

            <p
              className={`mt-1 text-2xl font-bold ${
                lucro >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {formatarMoeda(lucro)}
            </p>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-texto">
          <input
            type="checkbox"
            checked={lancarCaixa}
            onChange={(e) => setLancarCaixa(e.target.checked)}
          />
          Lançar entrada no caixa
        </label>

        <div>
          <label className={labelClass}>Observações</label>

          <textarea
            rows={2}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            className={inputClass}
          />
        </div>

        {erro && (
          <div className="rounded-lg border border-red-700 bg-red-950 px-4 py-3 text-sm text-red-300">
            {erro}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={salvando}
            className="rounded-lg bg-dourado px-8 py-3 font-semibold text-preto transition hover:bg-dourado-claro disabled:opacity-60"
          >
            {salvando ? "Salvando..." : "Registrar Venda"}
          </button>

          <Link
            href="/capacetes"
            className="rounded-lg border border-grafite-claro px-8 py-3 font-semibold text-texto-suave transition hover:text-texto"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}

/*
 * Campo preenchido pelo cadastro do capacete.
 * É só leitura de propósito: o estoque é controlado por
 * produto + marca + modelo + cor + tamanho, então mudar
 * a cor aqui deixaria a venda diferente do estoque.
 * Para corrigir, edite o capacete em Capacetes.
 */
function CampoDoCadastro({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string | null | undefined;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-texto">
        {titulo}
      </label>

      <div className="truncate rounded-lg border border-grafite-claro bg-grafite px-4 py-3 text-texto-suave">
        {valor || "—"}
      </div>
    </div>
  );
}
