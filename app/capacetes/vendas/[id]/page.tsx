"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import { formatarData } from "@/lib/formatadores/data";
import { valorPorExtenso } from "@/lib/formatadores/extenso";
import { FileText, Trash2 } from "lucide-react";

const supabase = createClient();

type ItemVenda = {
  id: string;
  produto: string | null;
  marca: string | null;
  modelo: string | null;
  cor: string | null;
  tamanho: string | null;
  quantidade: number;
  valor_unitario: number;
  custo_unitario: number;
};

type VendaCapacete = {
  id: string;
  data_venda: string;
  customer_id: string | null;
  cliente_nome: string | null;
  cliente_cpf: string | null;
  cliente_telefone: string | null;
  vendedor: string | null;
  forma_pagamento: string | null;
  parcelas: number | null;
  valor_total: number;
  observacoes: string | null;
  criado_em: string;
  helmet_sale_items: ItemVenda[];
};

export default function DetalheVendaCapacetePage() {
  const params = useParams();
  const router = useRouter();

  const id = params.id as string;

  const [venda, setVenda] = useState<VendaCapacete | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    carregarVenda();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function carregarVenda() {
    setCarregando(true);
    setErro("");

    const { data, error } = await supabase
      .from("helmet_sales")
      .select(
        `
        *,
        helmet_sale_items (
          id,
          produto,
          marca,
          modelo,
          cor,
          tamanho,
          quantidade,
          valor_unitario,
          custo_unitario
        )
      `
      )
      .eq("id", id)
      .single();

    if (error || !data) {
      setErro(
        error?.message ||
          "Não foi possível carregar esta venda."
      );
      setCarregando(false);
      return;
    }

    setVenda(data as unknown as VendaCapacete);
    setCarregando(false);
  }

  async function excluirVenda() {
    if (!venda) return;

    const confirmar = window.confirm(
      "Excluir esta venda? Os capacetes voltam para o estoque e a entrada do caixa é desfeita."
    );

    if (!confirmar) return;

    setExcluindo(true);
    setErro("");

    const { error: erroCaixa } = await supabase
      .from("cash_transactions")
      .delete()
      .eq("origem", "venda_capacete")
      .eq("origem_id", venda.id);

    if (erroCaixa) {
      setErro(
        `Não foi possível desfazer o lançamento do caixa: ${erroCaixa.message}`
      );
      setExcluindo(false);
      return;
    }

    const { error } = await supabase
      .from("helmet_sales")
      .delete()
      .eq("id", venda.id);

    if (error) {
      setErro(
        `Não foi possível excluir a venda: ${error.message}`
      );
      setExcluindo(false);
      return;
    }

    router.push("/capacetes/vendas");
    router.refresh();
  }

  if (carregando) {
    return (
      <div className="rounded-xl border border-grafite-claro bg-grafite p-6 text-center text-sm text-texto-suave">
        Carregando venda...
      </div>
    );
  }

  if (!venda) {
    return (
      <div className="w-full max-w-2xl">
        <div className="rounded-xl border border-red-700 bg-red-950 px-4 py-3 text-sm text-red-300">
          {erro || "Venda não encontrada."}
        </div>

        <Link
          href="/capacetes/vendas"
          className="mt-4 inline-block rounded-lg border border-grafite-claro px-4 py-2 text-sm font-semibold text-texto-suave transition hover:border-dourado hover:text-dourado"
        >
          Voltar ao histórico
        </Link>
      </div>
    );
  }

  const itens = venda.helmet_sale_items || [];

  const quantidade = itens.reduce(
    (soma, item) => soma + Number(item.quantidade || 0),
    0
  );

  const custo = itens.reduce(
    (soma, item) =>
      soma +
      Number(item.quantidade || 0) *
        Number(item.custo_unitario || 0),
    0
  );

  const lucro = Number(venda.valor_total || 0) - custo;

  const linha = (titulo: string, valor: string) => (
    <div className="flex items-center justify-between gap-4 border-b border-grafite-claro px-5 py-3 last:border-0">
      <span className="text-sm text-texto-suave">{titulo}</span>

      <span className="text-right font-semibold text-texto">
        {valor}
      </span>
    </div>
  );

  return (
    <div className="w-full max-w-3xl">
      {/* CABEÇALHO */}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dourado">
            Venda de Capacete
          </h1>

          <p className="mt-1 text-sm text-texto-suave">
            {formatarData(venda.data_venda)} ·{" "}
            {venda.vendedor || "vendedor não informado"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/capacetes/vendas"
            className="rounded-lg border border-grafite-claro px-4 py-2 text-sm font-semibold text-texto-suave transition hover:border-dourado hover:text-dourado"
          >
            Voltar ao histórico
          </Link>

          <a
            href={`/api/recibos/capacete/${venda.id}`}
            className="flex items-center gap-2 rounded-lg bg-dourado px-4 py-2 text-sm font-semibold text-preto transition hover:bg-dourado-claro"
          >
            <FileText size={17} />
            Gerar Recibo
          </a>
        </div>
      </div>

      {erro && (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-950 px-4 py-3 text-sm text-red-300">
          {erro}
        </div>
      )}

      {/* CLIENTE */}

      <div className="mb-4 overflow-hidden rounded-xl border border-grafite-claro bg-grafite">
        <div className="bg-grafite-claro px-5 py-3">
          <h2 className="font-semibold text-dourado">Cliente</h2>
        </div>

        {linha("Nome", venda.cliente_nome || "—")}
        {linha("CPF", venda.cliente_cpf || "—")}
        {linha("Telefone", venda.cliente_telefone || "—")}
        {linha(
          "Cadastro vinculado",
          venda.customer_id ? "Sim" : "Não"
        )}
      </div>

      {/* PRODUTOS */}

      <div className="mb-4 overflow-hidden rounded-xl border border-grafite-claro bg-grafite">
        <div className="bg-grafite-claro px-5 py-3">
          <h2 className="font-semibold text-dourado">
            Produtos
          </h2>
        </div>

        {itens.length === 0 && (
          <p className="px-5 py-4 text-sm text-texto-suave">
            Esta venda não tem itens vinculados.
          </p>
        )}

        {itens.map((item) => (
          <div
            key={item.id}
            className="border-b border-grafite-claro px-5 py-4 last:border-0"
          >
            <p className="font-medium text-texto">
              {item.quantidade}x{" "}
              {[
                item.produto,
                item.marca,
                item.modelo,
              ]
                .filter(Boolean)
                .join(" ")}
            </p>

            <p className="mt-1 text-sm text-texto-suave">
              Cor {item.cor || "—"} · Tamanho{" "}
              {item.tamanho || "—"} · Unitário{" "}
              {formatarMoeda(item.valor_unitario)} · Custo{" "}
              {formatarMoeda(item.custo_unitario)}
            </p>

            <p className="mt-1 text-sm font-semibold text-dourado">
              {formatarMoeda(
                Number(item.quantidade || 0) *
                  Number(item.valor_unitario || 0)
              )}
            </p>
          </div>
        ))}
      </div>

      {/* PAGAMENTO */}

      <div className="mb-4 overflow-hidden rounded-xl border border-grafite-claro bg-grafite">
        <div className="bg-grafite-claro px-5 py-3">
          <h2 className="font-semibold text-dourado">
            Pagamento
          </h2>
        </div>

        {linha(
          "Forma de pagamento",
          `${venda.forma_pagamento || "—"}${
            venda.parcelas && venda.parcelas > 1
              ? ` em ${venda.parcelas}x`
              : ""
          }`
        )}

        {linha("Quantidade de itens", String(quantidade))}

        {linha(
          "Valor total",
          formatarMoeda(venda.valor_total)
        )}

        {linha(
          "Valor por extenso",
          valorPorExtenso(venda.valor_total)
        )}

        {linha("Custo da mercadoria", formatarMoeda(custo))}

        {linha("Lucro", formatarMoeda(lucro))}
      </div>

      {venda.observacoes && (
        <div className="mb-4 rounded-xl border border-grafite-claro bg-grafite p-5">
          <p className="text-xs uppercase tracking-wide text-texto-suave">
            Observações
          </p>

          <p className="mt-2 text-sm text-texto">
            {venda.observacoes}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={excluirVenda}
        disabled={excluindo}
        className="flex items-center gap-2 rounded-lg border border-red-800 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-950/40 disabled:opacity-50"
      >
        <Trash2 size={16} />
        {excluindo ? "Excluindo..." : "Excluir venda"}
      </button>
    </div>
  );
}
