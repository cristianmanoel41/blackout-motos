import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import { formatarData } from "@/lib/formatadores/data";
import {
  Plus,
  Eye,
  ShoppingCart,
} from "lucide-react";

const statusStyle: Record<string, string> = {
  disponivel:
    "bg-green-900 text-green-300 border-green-700",
  reservada:
    "bg-yellow-900 text-yellow-300 border-yellow-700",
  vendida:
    "bg-blue-900 text-blue-300 border-blue-700",
  manutencao:
    "bg-orange-900 text-orange-300 border-orange-700",
  arquivada:
    "bg-gray-800 text-gray-400 border-gray-700",
};

const statusLabel: Record<string, string> = {
  disponivel: "Disponível",
  reservada: "Reservada",
  vendida: "Vendida",
  manutencao: "Manutenção",
  arquivada: "Arquivada",
};

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
          Clique em "Cadastrar Moto" para
          começar.
        </div>
      )}

      {/* CARDS */}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">

        {motos?.map((moto) => {

          const totalGastos =
            moto.motorcycle_expenses?.reduce(
              (
                soma: number,
                gasto: any
              ) =>
                soma +
                Number(
                  gasto.valor || 0
                ),
              0
            ) ?? 0;

          const custoTotal =
            Number(
              moto.valor_compra || 0
            ) + totalGastos;

          const podeVender =
            moto.status ===
              "disponivel" ||
            moto.status ===
              "reservada";

          return (
            <div
              key={moto.id}
              className="rounded-xl border border-grafite-claro bg-grafite p-4 transition hover:border-dourado"
            >

              {/* ID + STATUS */}

              <div className="mb-2 flex items-start justify-between gap-2">

                <span className="font-mono text-[11px] text-texto-suave">
                  {moto.codigo}
                </span>

                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                    statusStyle[
                      moto.status
                    ] ||
                    "border-gray-700 bg-gray-800 text-gray-400"
                  }`}
                >
                  {statusLabel[
                    moto.status
                  ] || moto.status}
                </span>

              </div>

              {/* MOTO */}

              <h3 className="truncate text-base font-semibold text-texto">
                {moto.marca}{" "}
                {moto.modelo}
              </h3>

              <p className="mb-3 truncate text-xs text-texto-suave">
                {moto.versao
                  ? `${moto.versao} · `
                  : ""}

                {moto.ano_modelo ??
                  ""}

                {moto.cor
                  ? ` · ${moto.cor}`
                  : ""}
              </p>

              {/* VALORES */}

              <div className="mb-3 grid grid-cols-2 gap-x-3 gap-y-2">

                <div>
                  <p className="text-[10px] text-texto-suave">
                    Valor compra
                  </p>

                  <p className="text-xs font-semibold text-texto">
                    {formatarMoeda(
                      moto.valor_compra ||
                        0
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] text-texto-suave">
                    Gastos
                  </p>

                  <p className="text-xs font-semibold text-red-400">
                    {formatarMoeda(
                      totalGastos
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] text-texto-suave">
                    Custo total
                  </p>

                  <p className="text-xs font-bold text-dourado">
                    {formatarMoeda(
                      custoTotal
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] text-texto-suave">
                    Anunciado
                  </p>

                  <p className="text-xs font-semibold text-green-400">
                    {formatarMoeda(
                      moto.preco_anunciado ??
                        moto.valor_compra
                    )}
                  </p>
                </div>

              </div>

              {/* DATA */}

              <div className="mb-3 border-t border-grafite-claro pt-2">

                <span className="text-[10px] text-texto-suave">
                  Entrada:{" "}
                  {formatarData(
                    moto.data_entrada
                  )}
                </span>

              </div>

              {/* BOTÕES */}

              <div className="flex gap-2">

                <Link
                  href={`/motos/${moto.id}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-grafite-claro px-2 py-1.5 text-xs font-semibold text-texto transition hover:border-dourado hover:text-dourado"
                >
                  <Eye size={14} />
                  Ver
                </Link>

                {podeVender && (
                  <Link
                    href={`/vendas?moto=${moto.id}`}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-dourado px-2 py-1.5 text-xs font-bold text-preto transition hover:bg-dourado-claro"
                  >
                    <ShoppingCart
                      size={14}
                    />
                    Vender
                  </Link>
                )}

              </div>

            </div>
          );
        })}

      </div>
    </div>
  );
}