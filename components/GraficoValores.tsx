"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatarMoeda } from "@/lib/formatadores/moeda";

// Paleta validada para fundo escuro (#1a1a1a):
// separação de matiz segura para daltonismo.
const COR_FATURAMENTO = "#b08d1e";
const COR_LUCRO = "#3b82f6";
const COR_DESPESAS = "#db2777";

const COR_GRADE = "#262626";
const COR_TEXTO_SUAVE = "#a3a3a3";

export type PontoGrafico = {
  mes: string;
  faturamento: number;
  despesas: number;
  lucro: number;
};

function abreviar(valor: number) {
  const absoluto = Math.abs(valor);

  if (absoluto >= 1000000) {
    return `${(valor / 1000000).toLocaleString(
      "pt-BR",
      {
        maximumFractionDigits: 1,
      }
    )}mi`;
  }

  if (absoluto >= 1000) {
    return `${Math.round(
      valor / 1000
    )}k`;
  }

  return String(valor);
}

type ItemTooltip = {
  name?: string;
  value?: number;
  color?: string;
};

function ConteudoTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ItemTooltip[];
  label?: string;
}) {
  if (
    !active ||
    !payload ||
    payload.length === 0
  ) {
    return null;
  }

  return (
    <div className="rounded-lg border border-grafite-claro bg-preto px-3 py-2 shadow-xl">
      <p className="mb-1 text-xs font-semibold capitalize text-texto">
        {label}
      </p>

      {payload.map((item) => (
        <div
          key={item.name}
          className="flex items-center gap-2 text-xs text-texto-suave"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor:
                item.color,
            }}
          />

          <span>{item.name}</span>

          <span className="ml-auto font-semibold text-texto">
            {formatarMoeda(
              Number(item.value || 0)
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function GraficoValores({
  dados,
}: {
  dados: PontoGrafico[];
}) {
  return (
    <div className="rounded-xl border border-grafite-claro bg-grafite p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-dourado">
          Faturamento, despesas e lucro líquido
        </h3>

        <p className="text-xs text-texto-suave">
          Últimos 6 meses · valores em R$
        </p>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <BarChart
            data={dados}
            margin={{
              top: 8,
              right: 8,
              bottom: 0,
              left: 8,
            }}
            barGap={2}
            barCategoryGap="25%"
          >
            <CartesianGrid
              stroke={COR_GRADE}
              vertical={false}
            />

            <XAxis
              dataKey="mes"
              tickLine={false}
              axisLine={{
                stroke: COR_GRADE,
              }}
              tick={{
                fill: COR_TEXTO_SUAVE,
                fontSize: 12,
              }}
            />

            <YAxis
              tickLine={false}
              axisLine={false}
              width={52}
              tick={{
                fill: COR_TEXTO_SUAVE,
                fontSize: 12,
              }}
              tickFormatter={abreviar}
            />

            <ReferenceLine
              y={0}
              stroke={COR_GRADE}
            />

            <Tooltip
              cursor={{
                fill: "rgba(255,255,255,0.04)",
              }}
              content={
                <ConteudoTooltip />
              }
            />

            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(valor) => (
                <span className="text-xs text-texto-suave">
                  {valor}
                </span>
              )}
            />

            <Bar
              dataKey="faturamento"
              name="Faturamento"
              fill={COR_FATURAMENTO}
              radius={[4, 4, 0, 0]}
            />

            <Bar
              dataKey="despesas"
              name="Despesas da loja"
              fill={COR_DESPESAS}
              radius={[4, 4, 0, 0]}
            />

            <Bar
              dataKey="lucro"
              name="Lucro líquido"
              fill={COR_LUCRO}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
