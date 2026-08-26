"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import { formatarData } from "@/lib/formatadores/data";
import {
  Eye,
  FileText,
  Plus,
  Search,
  ShoppingBag,
} from "lucide-react";

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
  cliente_nome: string | null;
  cliente_cpf: string | null;
  vendedor: string | null;
  forma_pagamento: string | null;
  parcelas: number | null;
  valor_total: number;
  helmet_sale_items: ItemVenda[];
};

function normalizar(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function descricaoItens(itens: ItemVenda[]) {
  if (!itens || itens.length === 0) return "—";

  return itens
    .map((item) =>
      [item.produto, item.marca, item.modelo, item.cor, item.tamanho]
        .filter(Boolean)
        .join(" ")
    )
    .join(" | ");
}

export default function HistoricoVendasCapacetePage() {
  const [vendas, setVendas] = useState<VendaCapacete[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    carregarVendas();
  }, []);

  async function carregarVendas() {
    setCarregando(true);
    setErro("");

    const { data, error } = await supabase
      .from("helmet_sales")
      .select(
        `
        id,
        data_venda,
        cliente_nome,
        cliente_cpf,
        vendedor,
        forma_pagamento,
        parcelas,
        valor_total,
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
      .order("data_venda", { ascending: false })
      .order("criado_em", { ascending: false });

    if (error) {
      setErro(
        `Não foi possível carregar o histórico: ${error.message}`
      );
      setCarregando(false);
      return;
    }

    setVendas((data as unknown as VendaCapacete[]) || []);
    setCarregando(false);
  }

  const vendasFiltradas = useMemo(() => {
    const termo = normalizar(busca);

    if (!termo) return vendas;

    return vendas.filter((venda) =>
      normalizar(
        [
          venda.cliente_nome,
          venda.cliente_cpf,
          venda.vendedor,
          venda.forma_pagamento,
          descricaoItens(venda.helmet_sale_items),
        ]
          .filter(Boolean)
          .join(" ")
      ).includes(termo)
    );
  }, [vendas, busca]);

  const totais = useMemo(() => {
    return vendasFiltradas.reduce(
      (resumo, venda) => {
        const custo = (venda.helmet_sale_items || []).reduce(
          (soma, item) =>
            soma +
            Number(item.quantidade || 0) *
              Number(item.custo_unitario || 0),
          0
        );

        const quantidade = (
          venda.helmet_sale_items || []
        ).reduce(
          (soma, item) => soma + Number(item.quantidade || 0),
          0
        );

        return {
          quantidade: resumo.quantidade + quantidade,
          receita:
            resumo.receita + Number(venda.valor_total || 0),
          custo: resumo.custo + custo,
        };
      },
      { quantidade: 0, receita: 0, custo: 0 }
    );
  }, [vendasFiltradas]);

  const lucro = totais.receita - totais.custo;

  return (
    <div className="w-full">
      {/* CABEÇALHO */}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-dourado">
            <ShoppingBag size={24} />
            Histórico de Vendas de Capacete
          </h1>

          <p className="mt-1 text-sm text-texto-suave">
            Vendas de balcão. Capacete vendido junto com moto
            aparece dentro da venda da moto.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/capacetes"
            className="rounded-lg border border-grafite-claro px-4 py-2 text-sm font-semibold text-texto-suave transition hover:border-dourado hover:text-dourado"
          >
            Voltar aos capacetes
          </Link>

          <Link
            href="/capacetes/vendas/nova"
            className="flex items-center gap-2 rounded-lg bg-dourado px-4 py-2 text-sm font-semibold text-preto transition hover:bg-dourado-claro"
          >
            <Plus size={17} />
            Nova Venda
          </Link>
        </div>
      </div>

      {/* NÚMEROS */}

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-grafite-claro bg-grafite p-4">
          <p className="text-xs text-texto-suave">Recebido</p>

          <p className="mt-1 text-2xl font-bold text-dourado">
            {formatarMoeda(totais.receita)}
          </p>

          <p className="mt-1 text-xs text-texto-suave">
            {totais.quantidade} capacete
            {totais.quantidade === 1 ? "" : "s"} em{" "}
            {vendasFiltradas.length} venda
            {vendasFiltradas.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="rounded-xl border border-grafite-claro bg-grafite p-4">
          <p className="text-xs text-texto-suave">
            Custo da mercadoria
          </p>

          <p className="mt-1 text-2xl font-bold text-texto">
            {formatarMoeda(totais.custo)}
          </p>
        </div>

        <div className="rounded-xl border border-grafite-claro bg-grafite p-4">
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

      {/* BUSCA */}

      <div className="relative mb-4 w-full sm:max-w-sm">
        <Search
          size={17}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-texto-suave"
        />

        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por cliente, produto ou vendedor"
          className="w-full rounded-lg border border-grafite-claro bg-grafite py-2.5 pl-10 pr-4 text-sm text-texto outline-none transition focus:border-dourado"
        />
      </div>

      {erro && (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-950 px-4 py-3 text-sm text-red-300">
          {erro}
        </div>
      )}

      {carregando && (
        <div className="rounded-xl border border-grafite-claro bg-grafite p-6 text-center text-sm text-texto-suave">
          Carregando vendas...
        </div>
      )}

      {!carregando && vendasFiltradas.length === 0 && (
        <div className="rounded-xl border border-grafite-claro bg-grafite p-8 text-center text-sm text-texto-suave">
          {vendas.length === 0
            ? "Nenhuma venda de capacete registrada ainda."
            : "Nenhuma venda encontrada com esse termo."}
        </div>
      )}

      {/* TABELA */}

      {!carregando && vendasFiltradas.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-grafite-claro bg-grafite">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-grafite-claro text-left text-xs uppercase tracking-wide text-texto-suave">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3 text-right">Qtd.</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3">Pagamento</th>
                <th className="px-4 py-3">Vendedor</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>

            <tbody>
              {vendasFiltradas.map((venda) => {
                const quantidade = (
                  venda.helmet_sale_items || []
                ).reduce(
                  (soma, item) =>
                    soma + Number(item.quantidade || 0),
                  0
                );

                return (
                  <tr
                    key={venda.id}
                    className="border-b border-grafite-claro/60 last:border-0"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-texto-suave">
                      {formatarData(venda.data_venda)}
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-medium text-texto">
                        {venda.cliente_nome || "—"}
                      </p>

                      {venda.cliente_cpf && (
                        <p className="text-xs text-texto-suave">
                          {venda.cliente_cpf}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3 text-texto-suave">
                      {descricaoItens(venda.helmet_sale_items)}
                    </td>

                    <td className="px-4 py-3 text-right text-texto">
                      {quantidade}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-dourado">
                      {formatarMoeda(venda.valor_total)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-texto-suave">
                      {venda.forma_pagamento || "—"}
                      {venda.parcelas && venda.parcelas > 1
                        ? ` ${venda.parcelas}x`
                        : ""}
                    </td>

                    <td className="px-4 py-3 text-texto-suave">
                      {venda.vendedor || "—"}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/capacetes/vendas/${venda.id}`}
                          className="flex items-center gap-1 rounded-lg border border-grafite-claro px-3 py-2 text-xs font-semibold text-texto-suave transition hover:border-dourado hover:text-dourado"
                        >
                          <Eye size={14} />
                          Ver
                        </Link>

                        <a
                          href={`/api/recibos/capacete/${venda.id}`}
                          className="flex items-center gap-1 whitespace-nowrap rounded-lg border border-dourado/50 px-3 py-2 text-xs font-semibold text-dourado transition hover:bg-dourado hover:text-preto"
                        >
                          <FileText size={14} />
                          Gerar Recibo
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
