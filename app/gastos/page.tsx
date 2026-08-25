import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import { formatarData } from "@/lib/formatadores/data";

export default async function GastosMotosPage() {
  const supabase = await createClient();

  const { data: gastos, error } = await supabase
    .from("motorcycle_expenses")
    .select(`
      *,
      motorcycles (
        id,
        codigo,
        marca,
        modelo,
        placa
      )
    `)
    .order("data", { ascending: false });

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-700 bg-red-950/30 p-4 text-red-300">
          Erro ao carregar gastos: {error.message}
        </div>
      </div>
    );
  }

  const total =
    gastos?.reduce(
      (soma, gasto) => soma + Number(gasto.valor || 0),
      0
    ) ?? 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dourado">
          Gastos das Motos
        </h1>

        <p className="mt-1 text-sm text-texto-suave">
          Todos os gastos registrados nas motos.
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-grafite-claro bg-grafite p-5">
        <p className="text-sm text-texto-suave">
          Total de gastos
        </p>

        <p className="mt-1 text-2xl font-bold text-dourado">
          {formatarMoeda(total)}
        </p>
      </div>

      {!gastos || gastos.length === 0 ? (
        <div className="rounded-xl border border-grafite-claro bg-grafite p-8 text-center text-texto-suave">
          Nenhum gasto registrado.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-grafite-claro bg-grafite">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-grafite-claro bg-preto">
              <tr className="text-left text-texto-suave">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Moto</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Pagamento</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>

            <tbody>
              {gastos.map((gasto) => {
                const moto = gasto.motorcycles;

                return (
                  <tr
                    key={gasto.id}
                    className="border-b border-grafite-claro last:border-b-0"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      {gasto.data
                        ? formatarData(gasto.data)
                        : "—"}
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">
                        {moto
                          ? `${moto.marca || ""} ${moto.modelo || ""}`
                          : "Moto não encontrada"}
                      </div>

                      <div className="text-xs text-texto-suave">
                        {moto?.codigo || ""}
                        {moto?.placa
                          ? ` · ${moto.placa}`
                          : ""}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {gasto.categoria || "—"}
                    </td>

                    <td className="px-4 py-3">
                      {gasto.descricao || "—"}
                    </td>

                    <td className="px-4 py-3">
                      {gasto.forma_pagamento || "—"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-dourado">
                      {formatarMoeda(gasto.valor)}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        {moto?.id && (
                          <Link
                            href={`/motos/${moto.id}`}
                            className="text-sm font-semibold text-dourado hover:underline"
                          >
                            Ver Moto
                          </Link>
                        )}

                        <Link
                          href={`/gastos/${gasto.id}`}
                          className="text-sm font-semibold text-dourado hover:underline"
                        >
                          Editar
                        </Link>
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