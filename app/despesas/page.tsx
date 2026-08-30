import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DespesasLista, {
  type Despesa,
} from "@/components/DespesasLista";
import { Plus, Receipt } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DespesasPage() {
  const supabase = await createClient();

  const { data: despesas, error } = await supabase
    .from("store_expenses")
    .select(
      "id, data, categoria, descricao, valor, forma_pagamento, pago, data_pagamento, observacoes"
    )
    .order("data", { ascending: false });

  const lista = (despesas || []) as Despesa[];

  return (
    <div className="w-full">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-dourado">
            <Receipt size={24} />
            Despesas da Loja
          </h1>

          <p className="mt-1 text-sm text-texto-suave">
            Aluguel, energia, funcionários e o resto do custo
            fixo. O que está pago já saiu do caixa.
          </p>
        </div>

        <Link
          href="/despesas/nova"
          className="flex items-center justify-center gap-2 rounded-lg bg-dourado px-4 py-2 font-semibold text-preto transition hover:bg-dourado-claro"
        >
          <Plus size={18} />
          Nova Despesa
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          Não foi possível carregar as despesas:{" "}
          {error.message}
        </div>
      )}

      <DespesasLista despesas={lista} />
    </div>
  );
}
