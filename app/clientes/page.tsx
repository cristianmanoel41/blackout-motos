import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Cake, Plus, X } from "lucide-react";
import ListaClientes from "@/components/ListaClientes";

/*
 * A lista de clientes, com um filtro para quem está sem a data
 * de nascimento.
 *
 * O painel avisa quantos são, mas não dizia quem - e ninguém vai
 * atrás de um número. Em 05/10/2026 eram 48 de 54: o cadastro só
 * passou a exigir a data na véspera, e os antigos ficaram para
 * trás. O aniversário deles nunca aparece.
 *
 * O filtro vive no endereço (?semData=1) para o aviso do painel
 * poder apontar direto para cá.
 */

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ semData?: string }>;
}) {
  const { semData } = await searchParams;
  const soSemData = semData === "1";

  const supabase = await createClient();

  let consulta = supabase
    .from("customers")
    .select("id, nome, cpf, telefone, email, cidade")
    .order("nome");

  if (soSemData) consulta = consulta.is("data_nascimento", null);

  const { data: clientes } = await consulta;

  const lista = clientes || [];

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dourado">Clientes</h1>

          <p className="mt-1 text-sm text-texto-suave">
            {soSemData
              ? "Mostrando só quem está sem data de nascimento."
              : "Consulte, visualize e altere os dados dos clientes."}
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

      {/*
        * A faixa do filtro.
        *
        * Ela diz o que está sendo mostrado e por que isso importa.
        * Uma lista filtrada sem aviso parece a lista inteira - e
        * quem abrisse acharia que a loja tem 48 clientes.
        */}
      {soSemData && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-[#e0b129]/35 bg-[#e0b129]/[0.07] px-4 py-3">
          <Cake size={17} className="shrink-0 text-dourado" />

          <p className="min-w-0 flex-1 text-sm font-semibold text-texto-suave">
            <span className="font-black text-dourado">{lista.length}</span>{" "}
            {lista.length === 1
              ? "cliente está sem data de nascimento e nunca vai aparecer no aviso de aniversário."
              : "clientes estão sem data de nascimento e nunca vão aparecer no aviso de aniversário."}{" "}
            Abra a ficha de cada um para preencher.
          </p>

          <Link
            href="/clientes"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-grafite-claro px-3 py-1.5 text-xs font-bold text-texto-suave transition hover:border-dourado hover:text-dourado"
          >
            <X size={13} />
            Ver todos
          </Link>
        </div>
      )}

      {lista.length === 0 ? (
        <div className="rounded-xl border border-grafite-claro bg-grafite p-8 text-center text-texto-suave">
          {soSemData
            ? "Todo cliente já tem data de nascimento cadastrada."
            : "Nenhum cliente cadastrado ainda."}
        </div>
      ) : (
        <ListaClientes clientes={lista} />
      )}
    </div>
  );
}
