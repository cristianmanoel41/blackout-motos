import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import EstoqueLista from "@/components/EstoqueLista";
import { Plus } from "lucide-react";

export default async function EstoquePage() {
  const supabase = await createClient();

  const { data: motos } = await supabase
    .from("motorcycles")
    .select(`
      *,
      motorcycle_expenses (
        valor
      )
    `)
    .order("criado_em", {
      ascending: false,
    });

  return (
    <div className="w-full">

      {/* CABEÇALHO */}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        <h1 className="text-2xl font-bold text-dourado">
          Estoque
        </h1>

        <Link
          href="/motos/nova"
          className="flex items-center justify-center gap-2 rounded-lg bg-dourado px-4 py-2 text-sm font-semibold text-preto transition hover:bg-dourado-claro"
        >
          <Plus size={17} />
          Cadastrar Moto
        </Link>

      </div>

      {/* ESTOQUE VAZIO */}

      {(!motos ||
        motos.length === 0) && (
        <div className="rounded-xl border border-grafite-claro bg-grafite p-6 text-center text-sm text-texto-suave">
          Nenhuma moto cadastrada ainda.
          Clique em &quot;Cadastrar Moto&quot; para
          começar.
        </div>
      )}

      {/* BUSCA + CARDS */}

      {motos &&
        motos.length > 0 && (
          <EstoqueLista
            motos={motos}
          />
        )}

    </div>
  );
}
