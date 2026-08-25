import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Plus,
  Pencil,
  FileText,
} from "lucide-react";

function moeda(
  valor: number | string | null
) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  ).format(Number(valor) || 0);
}

function dataBrasil(
  data: string | null
) {
  if (!data) return "-";

  const [ano, mes, dia] =
    data.split("-");

  if (!ano || !mes || !dia) {
    return data;
  }

  return `${dia}/${mes}/${ano}`;
}

export default async function HistoricoVendasPage() {
  const supabase =
    await createClient();

  const {
    data: vendas,
    error,
  } = await supabase
    .from("sales")
    .select(`
      *,
      motorcycles (
        codigo,
        marca,
        modelo,
        versao,
        ano_modelo,
        placa
      )
    `)
    .order("data_venda", {
      ascending: false,
    });

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-700 bg-red-950/30 p-4 text-red-300">
          Erro ao carregar vendas:{" "}
          {error.message}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* CABEÇALHO */}

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dourado">
            Histórico de Vendas
          </h1>

          <p className="mt-1 text-sm text-texto-suave">
            Consulte todas as vendas
            registradas.
          </p>
        </div>

        <Link
          href="/vendas"
          className="flex items-center justify-center gap-2 rounded-lg bg-dourado px-4 py-2 font-semibold text-preto transition hover:bg-dourado-claro"
        >
          <Plus size={18} />
          Nova Venda
        </Link>
      </div>

      {/* SEM VENDAS */}

      {(!vendas ||
        vendas.length === 0) && (
        <div className="rounded-xl border border-grafite-claro bg-grafite p-8 text-center text-texto-suave">
          Nenhuma venda registrada
          ainda.
        </div>
      )}

      {/* TABELA */}

      {vendas &&
        vendas.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-grafite-claro bg-grafite">
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="border-b border-grafite-claro bg-preto">
                <tr className="text-left text-texto-suave">
                  <th className="px-4 py-3">
                    Data
                  </th>

                  <th className="px-4 py-3">
                    Moto
                  </th>

                  <th className="px-4 py-3">
                    Cliente
                  </th>

                  <th className="px-4 py-3">
                    Vendedor
                  </th>

                  <th className="px-4 py-3">
                    Venda
                  </th>

                  <th className="px-4 py-3">
                    Entrada
                  </th>

                  <th className="px-4 py-3">
                    Financiado
                  </th>

                  <th className="px-4 py-3">
                    Banco
                  </th>

                  <th className="px-4 py-3 text-center">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody>
                {vendas.map(
                  (venda) => {
                    const moto =
                      venda.motorcycles;

                    return (
                      <tr
                        key={venda.id}
                        className="border-b border-grafite-claro last:border-b-0 hover:bg-preto/40"
                      >
                        {/* DATA */}

                        <td className="whitespace-nowrap px-4 py-3">
                          {dataBrasil(
                            venda.data_venda
                          )}
                        </td>

                        {/* MOTO */}

                        <td className="px-4 py-3">
                          <div className="font-semibold text-white">
                            {moto
                              ? `${
                                  moto.marca ||
                                  ""
                                } ${
                                  moto.modelo ||
                                  ""
                                }`
                              : "Moto não encontrada"}
                          </div>

                          <div className="text-xs text-texto-suave">
                            {moto?.codigo ||
                              ""}

                            {moto?.ano_modelo
                              ? ` · ${moto.ano_modelo}`
                              : ""}

                            {moto?.placa
                              ? ` · ${moto.placa}`
                              : ""}
                          </div>
                        </td>

                        {/* CLIENTE */}

                        <td className="px-4 py-3">
                          <div className="text-white">
                            {venda.cliente ||
                              "Não informado"}
                          </div>

                          <div className="text-xs text-texto-suave">
                            {venda.telefone ||
                              ""}
                          </div>
                        </td>

                        {/* VENDEDOR */}

                        <td className="px-4 py-3 font-semibold text-dourado">
                          {venda.vendedor ||
                            "-"}
                        </td>

                        {/* VALOR VENDA */}

                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-white">
                          {moeda(
                            venda.valor_total_venda ??
                              venda.valor_venda
                          )}
                        </td>

                        {/* ENTRADA */}

                        <td className="whitespace-nowrap px-4 py-3">
                          {moeda(
                            venda.entrada
                          )}
                        </td>

                        {/* FINANCIADO */}

                        <td className="whitespace-nowrap px-4 py-3 text-dourado">
                          {moeda(
                            venda.valor_financiado
                          )}
                        </td>

                        {/* BANCO */}

                        <td className="px-4 py-3">
                          {venda.banco ||
                            "-"}
                        </td>

                        {/* AÇÕES */}

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">

                            {/* EDITAR */}

                            <Link
                              href={`/vendas/${venda.id}`}
                              className="inline-flex items-center gap-2 rounded-lg border border-dourado px-3 py-2 text-xs font-semibold text-dourado transition hover:bg-dourado hover:text-preto"
                            >
                              <Pencil
                                size={14}
                              />
                              Editar
                            </Link>

                            {/* CONTRATO */}

                            <button
                              type="button"
                              disabled
                              title="O modelo de contrato será configurado em breve"
                              className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-dourado px-3 py-2 text-xs font-bold text-preto opacity-50"
                            >
                              <FileText
                                size={14}
                              />
                              Gerar Contrato
                            </button>

                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}