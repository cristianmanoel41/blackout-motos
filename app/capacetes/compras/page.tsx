"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import { formatarData } from "@/lib/formatadores/data";
import { Plus, Receipt, Trash2 } from "lucide-react";

const supabase = createClient();

type Nota = {
  id: string;
  data_compra: string;
  numero_nota: string | null;
  fornecedor: string | null;
  valor_total: number;
  lancar_caixa: boolean;
  observacoes: string | null;
  helmet_purchase_items: {
    id: string;
    quantidade: number;
    custo_unitario: number;
    helmet_models: {
      produto: string;
      marca: string;
      modelo: string;
      cor: string;
      tamanho: string;
    } | null;
  }[];
};

export default function ComprasCapacetesPage() {
  const [notas, setNotas] = useState<Nota[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [excluindo, setExcluindo] = useState("");

  useEffect(() => {
    carregarNotas();
  }, []);

  async function carregarNotas() {
    setCarregando(true);
    setErro("");

    const { data, error } = await supabase
      .from("helmet_purchases")
      .select(
        `
        id,
        data_compra,
        numero_nota,
        fornecedor,
        valor_total,
        lancar_caixa,
        observacoes,
        helmet_purchase_items (
          id,
          quantidade,
          custo_unitario,
          helmet_models (
            produto,
            marca,
            modelo,
            cor,
            tamanho
          )
        )
      `
      )
      .order("data_compra", { ascending: false })
      .order("criado_em", { ascending: false });

    if (error) {
      setErro(
        `Não foi possível carregar as notas: ${error.message}`
      );
      setCarregando(false);
      return;
    }

    setNotas((data as unknown as Nota[]) || []);
    setCarregando(false);
  }

  async function excluirNota(nota: Nota) {
    const confirmar = window.confirm(
      "Excluir esta nota? Os capacetes dela voltam a sair do estoque e a saída do caixa é desfeita."
    );

    if (!confirmar) return;

    setExcluindo(nota.id);
    setErro("");

    const { error: erroCaixa } = await supabase
      .from("cash_transactions")
      .delete()
      .eq("origem", "compra_capacete")
      .eq("origem_id", nota.id);

    if (erroCaixa) {
      setErro(
        `Não foi possível desfazer o lançamento do caixa: ${erroCaixa.message}`
      );
      setExcluindo("");
      return;
    }

    const { error } = await supabase
      .from("helmet_purchases")
      .delete()
      .eq("id", nota.id);

    if (error) {
      setErro(
        `Não foi possível excluir a nota: ${error.message}`
      );
      setExcluindo("");
      return;
    }

    setExcluindo("");
    await carregarNotas();
  }

  const totalGeral = notas.reduce(
    (soma, nota) => soma + Number(nota.valor_total || 0),
    0
  );

  return (
    <div className="w-full">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-dourado">
            <Receipt size={24} />
            Notas de Compra
          </h1>

          <p className="mt-1 text-sm text-texto-suave">
            Tudo que a loja gastou com capacetes.
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
            href="/capacetes/compras/nova"
            className="flex items-center gap-2 rounded-lg bg-dourado px-4 py-2 text-sm font-semibold text-preto transition hover:bg-dourado-claro"
          >
            <Plus size={17} />
            Nova Nota
          </Link>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-grafite-claro bg-grafite p-5">
        <p className="text-xs text-texto-suave">
          Total comprado em capacetes
        </p>

        <p className="text-2xl font-bold text-dourado">
          {formatarMoeda(totalGeral)}
        </p>
      </div>

      {erro && (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-950 px-4 py-3 text-sm text-red-300">
          {erro}
        </div>
      )}

      {carregando && (
        <div className="rounded-xl border border-grafite-claro bg-grafite p-6 text-center text-sm text-texto-suave">
          Carregando notas...
        </div>
      )}

      {!carregando && notas.length === 0 && (
        <div className="rounded-xl border border-grafite-claro bg-grafite p-8 text-center text-sm text-texto-suave">
          Nenhuma nota lançada ainda.
        </div>
      )}

      <div className="space-y-3">
        {notas.map((nota) => (
          <div
            key={nota.id}
            className="rounded-xl border border-grafite-claro bg-grafite p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-texto">
                  {nota.fornecedor || "Fornecedor não informado"}
                  {nota.numero_nota
                    ? ` · NF ${nota.numero_nota}`
                    : ""}
                </p>

                <p className="text-sm text-texto-suave">
                  {formatarData(nota.data_compra)}
                  {nota.lancar_caixa
                    ? " · saiu do caixa"
                    : " · não lançado no caixa"}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <p className="text-lg font-semibold text-dourado">
                  {formatarMoeda(nota.valor_total)}
                </p>

                <button
                  type="button"
                  disabled={excluindo === nota.id}
                  onClick={() => excluirNota(nota)}
                  className="rounded-lg border border-grafite-claro p-2 text-red-300 transition hover:border-red-700 hover:bg-red-950/40 disabled:opacity-50"
                  aria-label="Excluir nota"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="mt-3 space-y-1 border-t border-grafite-claro pt-3">
              {nota.helmet_purchase_items?.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <span className="text-texto">
                    {item.quantidade}x{" "}
                    {item.helmet_models
                      ? `${item.helmet_models.produto} ${item.helmet_models.marca} ${item.helmet_models.modelo} · ${item.helmet_models.cor} · ${item.helmet_models.tamanho}`
                      : "Capacete"}
                  </span>

                  <span className="text-texto-suave">
                    {formatarMoeda(item.custo_unitario)} cada ·{" "}
                    <span className="text-texto">
                      {formatarMoeda(
                        Number(item.quantidade || 0) *
                          Number(item.custo_unitario || 0)
                      )}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            {nota.observacoes && (
              <p className="mt-3 text-xs text-texto-suave">
                {nota.observacoes}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
