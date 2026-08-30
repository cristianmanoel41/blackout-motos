"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatarMoeda } from "@/lib/formatadores/moeda";

const COR_FATURAMENTO = "#c99712";
const COR_LUCRO = "#111214";
const COR_DESPESAS = "#ef4444";
const COR_GRADE = "#eceef1";
const COR_TEXTO = "#747982";

export type PontoGrafico = {
  mes: string;
  faturamento: number;
  despesas: number;
  lucro: number;
};

function abreviar(valor: number) {
  const absoluto = Math.abs(valor);

  if (absoluto >= 1000000) {
    return `${(valor / 1000000).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    })}mi`;
  }

  if (absoluto >= 1000) return `${Math.round(valor / 1000)}k`;
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
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-48 rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-2xl">
      <p className="mb-2 text-xs font-black capitalize text-black">{label}</p>

      {payload.map((item) => (
        <div key={item.name} className="flex items-center gap-2 py-1 text-xs text-black/60">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span>{item.name}</span>
          <span className="ml-auto font-black text-black">
            {formatarMoeda(Number(item.value || 0))}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function GraficoValores({ dados }: { dados: PontoGrafico[] }) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={dados}
          margin={{ top: 12, right: 8, bottom: 0, left: 4 }}
        >
          <defs>
            <linearGradient id="goldArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COR_FATURAMENTO} stopOpacity={0.32} />
              <stop offset="100%" stopColor={COR_FATURAMENTO} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="blackArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COR_LUCRO} stopOpacity={0.15} />
              <stop offset="100%" stopColor={COR_LUCRO} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke={COR_GRADE} vertical={false} strokeDasharray="3 4" />

          <XAxis
            dataKey="mes"
            tickLine={false}
            axisLine={{ stroke: COR_GRADE }}
            tick={{ fill: COR_TEXTO, fontSize: 12, fontWeight: 700 }}
          />

          <YAxis
            tickLine={false}
            axisLine={false}
            width={54}
            tick={{ fill: COR_TEXTO, fontSize: 12, fontWeight: 700 }}
            tickFormatter={abreviar}
          />

          <ReferenceLine y={0} stroke={COR_GRADE} />

          <Tooltip
            cursor={{ stroke: "#d7d9dd", strokeDasharray: "4 4" }}
            content={<ConteudoTooltip />}
          />

          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingTop: 12 }}
            formatter={(valor) => (
              <span style={{ color: COR_TEXTO, fontSize: 12, fontWeight: 700 }}>
                {valor}
              </span>
            )}
          />

          <Area
            type="monotone"
            dataKey="faturamento"
            name="Faturamento"
            stroke={COR_FATURAMENTO}
            strokeWidth={3}
            fill="url(#goldArea)"
            activeDot={{ r: 6, strokeWidth: 3, stroke: "#fff" }}
          />

          <Area
            type="monotone"
            dataKey="lucro"
            name="Lucro líquido"
            stroke={COR_LUCRO}
            strokeWidth={2.5}
            fill="url(#blackArea)"
            activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
          />

          <Area
            type="monotone"
            dataKey="despesas"
            name="Despesas"
            stroke={COR_DESPESAS}
            strokeWidth={2}
            fill="transparent"
            activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
