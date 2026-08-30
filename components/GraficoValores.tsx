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
import styles from "./GraficoValores.module.css";

const COR_FATURAMENTO = "#e0b129";
const COR_LUCRO = "#f5f7fa";
const COR_DESPESAS = "#ff525b";
const COR_GRADE = "#2b2e33";
const COR_TEXTO = "#aeb4bd";

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
    <div className={styles.tooltip}>
      <p className={styles.tooltipTitle}>{label}</p>

      {payload.map((item) => (
        <div key={item.name} className={styles.tooltipRow}>
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span>{item.name}</span>
          <span className={styles.tooltipValue}>
            {formatarMoeda(Number(item.value || 0))}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function GraficoValores({ dados }: { dados: PontoGrafico[] }) {
  return (
    <div className={`${styles.chart} h-[320px] w-full`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={dados}
          margin={{ top: 12, right: 8, bottom: 0, left: 4 }}
        >
          <defs>
            <linearGradient id="goldAreaDark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COR_FATURAMENTO} stopOpacity={0.42} />
              <stop offset="100%" stopColor={COR_FATURAMENTO} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="whiteAreaDark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COR_LUCRO} stopOpacity={0.13} />
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
            cursor={{ stroke: "#575c64", strokeDasharray: "4 4" }}
            content={<ConteudoTooltip />}
          />

          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingTop: 12 }}
            formatter={(valor) => <span className={styles.legendText}>{valor}</span>}
          />

          <Area
            type="monotone"
            dataKey="faturamento"
            name="Faturamento"
            stroke={COR_FATURAMENTO}
            strokeWidth={3}
            fill="url(#goldAreaDark)"
            activeDot={{ r: 6, strokeWidth: 3, stroke: "#111316" }}
          />

          <Area
            type="monotone"
            dataKey="lucro"
            name="Lucro líquido"
            stroke={COR_LUCRO}
            strokeWidth={2.5}
            fill="url(#whiteAreaDark)"
            activeDot={{ r: 5, strokeWidth: 2, stroke: "#111316" }}
          />

          <Area
            type="monotone"
            dataKey="despesas"
            name="Despesas"
            stroke={COR_DESPESAS}
            strokeWidth={2}
            fill="transparent"
            activeDot={{ r: 5, strokeWidth: 2, stroke: "#111316" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
