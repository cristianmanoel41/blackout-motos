"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import { formatarData } from "@/lib/formatadores/data";
import {
  Eye,
  Search,
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

const tipoEntradaLabel: Record<string, string> = {
  compra_nova: "Comprada",
  troca: "Troca",
  estoque_inicial: "Estoque inicial",
};

const tipoEntradaStyle: Record<string, string> = {
  compra_nova:
    "bg-grafite-claro text-texto-suave border-grafite-claro",
  troca:
    "bg-purple-900 text-purple-300 border-purple-700",
  estoque_inicial:
    "bg-sky-900 text-sky-300 border-sky-700",
};

type Moto = {
  id: string;
  codigo: string | null;
  marca: string | null;
  modelo: string | null;
  versao: string | null;
  cor: string | null;
  placa: string | null;
  ano_fabricacao: number | null;
  ano_modelo: number | null;
  quilometragem: number | null;
  data_entrada: string | null;
  tipo_entrada: string | null;
  valor_compra: number | null;
  preco_anunciado: number | null;
  status: string;
  motorcycle_expenses?:
    | { valor: number | null }[]
    | null;
};

function normalizar(valor: unknown) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function textoDaMoto(moto: Moto) {
  return [
    moto.codigo,
    moto.marca,
    moto.modelo,
    moto.versao,
    moto.cor,
    moto.placa,
    moto.ano_fabricacao,
    moto.ano_modelo,
    statusLabel[moto.status] ||
      moto.status,
    tipoEntradaLabel[
      moto.tipo_entrada || ""
    ] || moto.tipo_entrada,
  ]
    .map((parte) =>
      normalizar(parte)
    )
    .filter(Boolean)
    .join(" ");
}

export default function EstoqueLista({
  motos,
}: {
  motos: Moto[];
}) {
  const [busca, setBusca] =
    useState("");

  const motosFiltradas = useMemo(() => {
    const termos = busca
      .split(/\s+/)
      .map((termo) =>
        normalizar(termo)
      )
      .filter(Boolean);

    if (termos.length === 0) {
      return motos;
    }

    return motos.filter((moto) => {
      const texto =
        textoDaMoto(moto);

      return termos.every((termo) =>
        texto.includes(termo)
      );
    });
  }, [motos, busca]);

  return (
    <>
      {/* BUSCA */}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">

        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-suave"
          />

          <input
            type="text"
            value={busca}
            onChange={(e) =>
              setBusca(e.target.value)
            }
            placeholder="Procurar por marca, modelo, cor, placa, ano ou código..."
            className="w-full rounded-lg border border-grafite-claro bg-preto py-2 pl-9 pr-9 text-sm text-texto outline-none placeholder:text-texto-suave focus:border-dourado"
          />

          {busca && (
            <button
              type="button"
              onClick={() =>
                setBusca("")
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-texto-suave hover:text-dourado"
            >
              limpar
            </button>
          )}
        </div>

        <span className="text-xs text-texto-suave sm:w-40 sm:text-right">
          {motosFiltradas.length}
          {motosFiltradas.length === 1
            ? " moto"
            : " motos"}
        </span>

      </div>

      {/* NENHUM RESULTADO */}

      {motos.length > 0 &&
        motosFiltradas.length === 0 && (
          <div className="rounded-xl border border-grafite-claro bg-grafite p-6 text-center text-sm text-texto-suave">
            Nenhuma moto encontrada para
            &quot;{busca}&quot;.
          </div>
        )}

      {/* CARDS */}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">

        {motosFiltradas.map((moto) => {

          const totalGastos =
            moto.motorcycle_expenses?.reduce(
              (soma, gasto) =>
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

              <p className="truncate text-xs text-texto-suave">
                {moto.versao
                  ? `${moto.versao} · `
                  : ""}

                {moto.ano_modelo ??
                  ""}

                {moto.cor
                  ? ` · ${moto.cor}`
                  : ""}
              </p>

              <p className="mb-3 truncate text-xs text-texto-suave">
                {moto.placa || "sem placa"}
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

              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-t border-grafite-claro pt-2">

                <span className="text-[10px] text-texto-suave">
                  Entrada:{" "}
                  {formatarData(
                    moto.data_entrada
                  )}
                </span>

                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                    tipoEntradaStyle[
                      moto.tipo_entrada || ""
                    ] ||
                    "border-gray-700 bg-gray-800 text-gray-400"
                  }`}
                >
                  {tipoEntradaLabel[
                    moto.tipo_entrada || ""
                  ] ||
                    moto.tipo_entrada ||
                    "Não informado"}
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
    </>
  );
}
