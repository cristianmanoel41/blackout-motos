"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import CampoMoeda from "@/components/CampoMoeda";
import {
  HardHat,
  Pencil,
  Plus,
  Receipt,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";

const supabase = createClient();

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
  observacoes: string | null;
};

function hoje() {
  const data = new Date();
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function normalizar(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const formVazio = {
  produto: "Capacete",
  marca: "",
  modelo: "",
  cor: "",
  tamanho: "",
  preco_venda_padrao: "",
  estoque_inicial: "",
  custo_inicial: "",
  ativo: true,
  observacoes: "",
};

export default function CapacetesPage() {
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [busca, setBusca] = useState("");

  const [investido, setInvestido] = useState(0);

  const [vendidos, setVendidos] = useState({
    quantidade: 0,
    receita: 0,
    custo: 0,
    brindes: 0,
  });

  const [formAberto, setFormAberto] = useState(false);
  const [editandoId, setEditandoId] = useState("");
  const [form, setForm] = useState(formVazio);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarTudo();
  }, []);

  async function carregarTudo() {
    setCarregando(true);
    setErro("");

    const [
      { data: listaModelos, error: erroModelos },
      { data: compras, error: erroCompras },
      { data: saidas, error: erroSaidas },
    ] = await Promise.all([
      supabase
        .from("helmet_models")
        .select("*")
        .order("marca", { ascending: true })
        .order("modelo", { ascending: true })
        .order("tamanho", { ascending: true }),
      supabase
        .from("helmet_purchase_items")
        .select("quantidade, custo_unitario"),
      supabase
        .from("helmet_sale_items")
        .select("quantidade, valor_unitario, custo_unitario"),
    ]);

    const falha = erroModelos || erroCompras || erroSaidas;

    if (falha) {
      setErro(
        `Não foi possível carregar os capacetes: ${falha.message}`
      );
      setCarregando(false);
      return;
    }

    setModelos((listaModelos as Modelo[]) || []);

    setInvestido(
      (compras || []).reduce(
        (soma, item) =>
          soma +
          Number(item.quantidade || 0) *
            Number(item.custo_unitario || 0),
        0
      )
    );

    setVendidos(
      (saidas || []).reduce(
        (resumo, item) => {
          const quantidade = Number(item.quantidade || 0);
          const valor = Number(item.valor_unitario || 0);
          const custo = Number(item.custo_unitario || 0);

          return {
            quantidade: resumo.quantidade + quantidade,
            receita: resumo.receita + quantidade * valor,
            custo: resumo.custo + quantidade * custo,
            brindes:
              resumo.brindes + (valor === 0 ? quantidade : 0),
          };
        },
        { quantidade: 0, receita: 0, custo: 0, brindes: 0 }
      )
    );

    setCarregando(false);
  }

  const totais = useMemo(() => {
    return modelos.reduce(
      (resumo, modelo) => {
        const estoque = Math.max(
          Number(modelo.estoque_atual || 0),
          0
        );

        return {
          quantidade: resumo.quantidade + estoque,
          custo:
            resumo.custo +
            estoque * Number(modelo.custo_medio || 0),
          venda:
            resumo.venda +
            estoque * Number(modelo.preco_venda_padrao || 0),
        };
      },
      { quantidade: 0, custo: 0, venda: 0 }
    );
  }, [modelos]);

  const lucro = vendidos.receita - vendidos.custo;

  const modelosFiltrados = useMemo(() => {
    const termo = normalizar(busca);

    if (!termo) return modelos;

    return modelos.filter((modelo) =>
      normalizar(
        `${modelo.produto} ${modelo.marca} ${modelo.modelo} ${modelo.cor} ${modelo.tamanho}`
      ).includes(termo)
    );
  }, [modelos, busca]);

  function abrirNovo() {
    setEditandoId("");
    setForm(formVazio);
    setFormAberto(true);
    setErro("");
    setMensagem("");
  }

  function abrirEdicao(modelo: Modelo) {
    setEditandoId(modelo.id);

    setForm({
      produto: modelo.produto || "Capacete",
      marca: modelo.marca || "",
      modelo: modelo.modelo || "",
      cor: modelo.cor || "",
      tamanho: modelo.tamanho || "",
      preco_venda_padrao: String(
        modelo.preco_venda_padrao ?? ""
      ),
      estoque_inicial: "",
      custo_inicial: "",
      ativo: modelo.ativo,
      observacoes: modelo.observacoes || "",
    });

    setFormAberto(true);
    setErro("");
    setMensagem("");
  }

  async function salvarModelo() {
    setErro("");
    setMensagem("");

    if (!form.marca.trim() || !form.modelo.trim()) {
      setErro("Informe a marca e o modelo do capacete.");
      return;
    }

    setSalvando(true);

    const dados = {
      produto: form.produto.trim() || "Capacete",
      marca: form.marca.trim(),
      modelo: form.modelo.trim(),
      cor: form.cor.trim() || "Não informada",
      tamanho: form.tamanho.trim() || "Único",
      preco_venda_padrao:
        Number(form.preco_venda_padrao) || 0,
      ativo: form.ativo,
      observacoes: form.observacoes.trim() || null,
    };

    try {
      if (editandoId) {
        const { error } = await supabase
          .from("helmet_models")
          .update(dados)
          .eq("id", editandoId);

        if (error) throw error;

        setMensagem("Modelo atualizado.");
      } else {
        const { data: criado, error } = await supabase
          .from("helmet_models")
          .insert(dados)
          .select("id")
          .single();

        if (error || !criado) {
          throw error || new Error("Falha ao criar o modelo.");
        }

        const estoqueInicial =
          Number(form.estoque_inicial) || 0;

        const custoInicial = Number(form.custo_inicial) || 0;

        if (estoqueInicial > 0) {
          const { data: nota, error: erroNota } = await supabase
            .from("helmet_purchases")
            .insert({
              data_compra: hoje(),
              fornecedor: "Estoque inicial",
              numero_nota: null,
              valor_total: estoqueInicial * custoInicial,
              lancar_caixa: false,
              observacoes:
                "Lançamento de estoque inicial (não gera saída no caixa).",
            })
            .select("id")
            .single();

          if (erroNota || !nota) {
            throw (
              erroNota ||
              new Error("Falha ao lançar o estoque inicial.")
            );
          }

          const { error: erroItem } = await supabase
            .from("helmet_purchase_items")
            .insert({
              purchase_id: nota.id,
              helmet_model_id: criado.id,
              quantidade: estoqueInicial,
              custo_unitario: custoInicial,
            });

          if (erroItem) throw erroItem;
        }

        setMensagem("Modelo cadastrado.");
      }

      setFormAberto(false);
      setForm(formVazio);
      setEditandoId("");
      await carregarTudo();
    } catch (error: any) {
      console.error(error);

      setErro(
        error?.code === "23505"
          ? "Já existe um capacete com essa marca, modelo, cor e tamanho."
          : error?.message ||
              "Não foi possível salvar o modelo."
      );
    } finally {
      setSalvando(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-grafite-claro bg-grafite-claro px-4 py-3 text-texto outline-none transition focus:border-dourado";

  const labelClass = "mb-1 block text-sm font-medium text-texto";

  return (
    <div className="w-full">
      {/* CABEÇALHO */}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-dourado">
            <HardHat size={24} />
            Capacetes
          </h1>

          <p className="mt-1 text-sm text-texto-suave">
            Estoque, custo e lucro da mercadoria da loja.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/capacetes/compras/nova"
            className="flex items-center gap-2 rounded-lg border border-grafite-claro bg-grafite px-4 py-2 text-sm font-semibold text-texto transition hover:border-dourado hover:text-dourado"
          >
            <Receipt size={17} />
            Lançar Nota de Compra
          </Link>

          <Link
            href="/capacetes/vendas/nova"
            className="flex items-center gap-2 rounded-lg border border-grafite-claro bg-grafite px-4 py-2 text-sm font-semibold text-texto transition hover:border-dourado hover:text-dourado"
          >
            <ShoppingBag size={17} />
            Vender Capacete
          </Link>

          <button
            type="button"
            onClick={abrirNovo}
            className="flex items-center gap-2 rounded-lg bg-dourado px-4 py-2 text-sm font-semibold text-preto transition hover:bg-dourado-claro"
          >
            <Plus size={17} />
            Novo Modelo
          </button>
        </div>
      </div>

      {erro && (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-950 px-4 py-3 text-sm text-red-300">
          {erro}
        </div>
      )}

      {mensagem && (
        <div className="mb-4 rounded-lg border border-green-700 bg-green-950 px-4 py-3 text-sm text-green-300">
          {mensagem}
        </div>
      )}

      {/* NÚMEROS */}

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-grafite-claro bg-grafite p-4">
          <p className="text-xs text-texto-suave">
            Mercadoria disponível (a custo)
          </p>

          <p className="mt-1 text-2xl font-bold text-dourado">
            {formatarMoeda(totais.custo)}
          </p>

          <p className="mt-1 text-xs text-texto-suave">
            {totais.quantidade} capacete
            {totais.quantidade === 1 ? "" : "s"} em estoque
          </p>
        </div>

        <div className="rounded-xl border border-grafite-claro bg-grafite p-4">
          <p className="text-xs text-texto-suave">
            Mercadoria disponível (a preço de venda)
          </p>

          <p className="mt-1 text-2xl font-bold text-texto">
            {formatarMoeda(totais.venda)}
          </p>

          <p className="mt-1 text-xs text-texto-suave">
            Se vender tudo pelo valor padrão
          </p>
        </div>

        <div className="rounded-xl border border-grafite-claro bg-grafite p-4">
          <p className="text-xs text-texto-suave">
            Gasto total com capacetes
          </p>

          <p className="mt-1 text-2xl font-bold text-texto">
            {formatarMoeda(investido)}
          </p>

          <p className="mt-1 text-xs text-texto-suave">
            Somando todas as notas de compra
          </p>
        </div>

        <div className="rounded-xl border border-grafite-claro bg-grafite p-4">
          <p className="text-xs text-texto-suave">
            Lucro com capacetes vendidos
          </p>

          <p
            className={`mt-1 text-2xl font-bold ${
              lucro >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {formatarMoeda(lucro)}
          </p>

          <p className="mt-1 text-xs text-texto-suave">
            {vendidos.quantidade} vendido
            {vendidos.quantidade === 1 ? "" : "s"} ·{" "}
            {formatarMoeda(vendidos.receita)} recebido ·{" "}
            {vendidos.brindes} de brinde
          </p>
        </div>
      </div>

      {/* BUSCA */}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-texto-suave"
          />

          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por marca, modelo, cor ou tamanho"
            className="w-full rounded-lg border border-grafite-claro bg-grafite py-2.5 pl-10 pr-4 text-sm text-texto outline-none transition focus:border-dourado"
          />
        </div>

        <div className="flex gap-2 text-sm">
          <Link
            href="/capacetes/compras"
            className="rounded-lg border border-grafite-claro px-3 py-2 text-texto-suave transition hover:border-dourado hover:text-dourado"
          >
            Notas de compra
          </Link>

          <Link
            href="/capacetes/vendas"
            className="rounded-lg border border-grafite-claro px-3 py-2 text-texto-suave transition hover:border-dourado hover:text-dourado"
          >
            Vendas avulsas
          </Link>
        </div>
      </div>

      {/* LISTA */}

      {carregando && (
        <div className="rounded-xl border border-grafite-claro bg-grafite p-6 text-center text-sm text-texto-suave">
          Carregando capacetes...
        </div>
      )}

      {!carregando && modelosFiltrados.length === 0 && (
        <div className="rounded-xl border border-grafite-claro bg-grafite p-8 text-center text-sm text-texto-suave">
          {modelos.length === 0
            ? 'Nenhum capacete cadastrado ainda. Clique em "Novo Modelo" ou lance uma nota de compra.'
            : "Nenhum capacete encontrado com esse termo."}
        </div>
      )}

      {!carregando && modelosFiltrados.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-grafite-claro bg-grafite">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-grafite-claro text-left text-xs uppercase tracking-wide text-texto-suave">
              <tr>
                <th className="px-4 py-3">Capacete</th>
                <th className="px-4 py-3">Cor</th>
                <th className="px-4 py-3">Tamanho</th>
                <th className="px-4 py-3 text-right">Estoque</th>
                <th className="px-4 py-3 text-right">
                  Custo médio
                </th>
                <th className="px-4 py-3 text-right">
                  Valor padrão
                </th>
                <th className="px-4 py-3 text-right">
                  Em estoque
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>

            <tbody>
              {modelosFiltrados.map((modelo) => {
                const estoque = Number(
                  modelo.estoque_atual || 0
                );

                return (
                  <tr
                    key={modelo.id}
                    className="border-b border-grafite-claro/60 last:border-0"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-texto">
                        {modelo.produto} {modelo.marca}{" "}
                        {modelo.modelo}
                      </p>

                      {!modelo.ativo && (
                        <span className="text-xs text-texto-suave">
                          inativo
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-texto-suave">
                      {modelo.cor}
                    </td>

                    <td className="px-4 py-3 text-texto-suave">
                      {modelo.tamanho}
                    </td>

                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        estoque <= 0
                          ? "text-red-400"
                          : estoque <= 2
                            ? "text-yellow-400"
                            : "text-texto"
                      }`}
                    >
                      {estoque}
                    </td>

                    <td className="px-4 py-3 text-right text-texto-suave">
                      {formatarMoeda(modelo.custo_medio)}
                    </td>

                    <td className="px-4 py-3 text-right text-texto">
                      {formatarMoeda(
                        modelo.preco_venda_padrao
                      )}
                    </td>

                    <td className="px-4 py-3 text-right font-semibold text-dourado">
                      {formatarMoeda(
                        Math.max(estoque, 0) *
                          Number(modelo.custo_medio || 0)
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => abrirEdicao(modelo)}
                        className="rounded-lg border border-grafite-claro p-2 text-texto-suave transition hover:border-dourado hover:text-dourado"
                        aria-label="Editar modelo"
                      >
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* FORMULÁRIO */}

      {formAberto && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/70 p-4">
          <div className="mt-10 w-full max-w-lg rounded-xl border border-grafite-claro bg-grafite p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-dourado">
                {editandoId
                  ? "Editar capacete"
                  : "Novo capacete"}
              </h2>

              <button
                type="button"
                onClick={() => setFormAberto(false)}
                className="rounded-lg p-2 text-texto-suave transition hover:text-dourado"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>Produto</label>

                <input
                  value={form.produto}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      produto: e.target.value,
                    })
                  }
                  placeholder="Capacete"
                  className={inputClass}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Marca *</label>

                  <input
                    value={form.marca}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        marca: e.target.value,
                      })
                    }
                    placeholder="Ex.: Pro Tork"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Modelo *</label>

                  <input
                    value={form.modelo}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        modelo: e.target.value,
                      })
                    }
                    placeholder="Ex.: New Liberty Four"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Cor</label>

                  <input
                    value={form.cor}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        cor: e.target.value,
                      })
                    }
                    placeholder="Ex.: Preto"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Tamanho</label>

                  <input
                    value={form.tamanho}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        tamanho: e.target.value,
                      })
                    }
                    placeholder="Ex.: 58 (vazio = Único)"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Valor padrão de venda (R$)
                  </label>

                  <CampoMoeda
                    value={form.preco_venda_padrao}
                    onChange={(valorDigitado) =>
                      setForm({
                        ...form,
                        preco_venda_padrao: valorDigitado,
                      })
                    }
                    placeholder="0,00"
                    className={inputClass}
                  />
                </div>
              </div>

              {!editandoId && (
                <div className="grid gap-4 rounded-lg border border-grafite-claro bg-preto/40 p-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <p className="text-xs text-texto-suave">
                      Já tem esse capacete na loja? Lance aqui o
                      que existe hoje. Isso entra no estoque sem
                      gerar saída no caixa. O que for comprado
                      depois deve ser lançado pela nota fiscal.
                    </p>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Estoque inicial (un.)
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.estoque_inicial}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          estoque_inicial: e.target.value,
                        })
                      }
                      placeholder="0"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Custo unitário (R$)
                    </label>

                    <CampoMoeda
                      value={form.custo_inicial}
                      onChange={(valorDigitado) =>
                        setForm({
                          ...form,
                          custo_inicial: valorDigitado,
                        })
                      }
                      placeholder="0,00"
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className={labelClass}>Observações</label>

                <textarea
                  rows={2}
                  value={form.observacoes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      observacoes: e.target.value,
                    })
                  }
                  className={inputClass}
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-texto">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      ativo: e.target.checked,
                    })
                  }
                />
                Ativo (aparece na hora da venda)
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={salvando}
                  onClick={salvarModelo}
                  className="rounded-lg bg-dourado px-6 py-3 text-sm font-semibold text-preto transition hover:bg-dourado-claro disabled:opacity-60"
                >
                  {salvando ? "Salvando..." : "Salvar"}
                </button>

                <button
                  type="button"
                  onClick={() => setFormAberto(false)}
                  className="rounded-lg border border-grafite-claro px-6 py-3 text-sm font-semibold text-texto-suave transition hover:text-texto"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
