import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Plus } from "lucide-react";
import ListaClientes from "@/components/ListaClientes";

export default async function ClientesPage() {
  const supabase = await createClient();

  const { data: clientes } = await supabase
    .from("customers")
    .select("id, nome, cpf, telefone, email, cidade")
    .order("nome");

  const lista = clientes || [];

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dourado">
            Clientes
          </h1>

          <p className="mt-1 text-sm text-texto-suave">
            Consulte, visualize e altere os dados dos clientes.
          </p>
        </div>

        <Link
          href="/clientes/novo"
          className="flex items-center justify-center gap-2 rounded-lg bg-dourado px-4 py-2 font-semibold text-preto transition hover:bg-dourado-claro"
        >
          <Plus size={18} />
          Novo Cliente
        </Link>
      </div>

      {lista.length === 0 ? (
        <div className="rounded-xl border border-grafite-claro bg-grafite p-8 text-center text-texto-suave">
          Nenhum cliente cadastrado ainda.
        </div>
      ) : (
        <ListaClientes clientes={lista} />
      )}
    </div>
  );
}
