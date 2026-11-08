"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import styles from "./GraficoValores.module.css";

/*
 * O GRÁFICO DO LUCRO LÍQUIDO MÊS A MÊS
 *
 * Barras, e não linha: cada mês é um resultado fechado, não um
 * ponto de uma curva contínua - e mês no prejuízo precisa ficar
 * abaixo do zero, à vista, coisa que a área esconde.
 *
 * Dourado é lucro, vermelho é prejuízo; o vermelho também fica
 * abaixo da linha do zero e o valor aparece ao passar o mouse,
 * então a cor nunca é a única pista. O mês atual leva o valor
 * escrito em cima, e o tracejado marca a média dos meses com
 * movimento.
 */

export type MesDoGrafico = {
  rotulo: string;
  mes: number;
  ano: number;
  liquido: number;
  bruto: number;
  faturamento: number;
  vendidas: number;
  atual: boolean;
};

const OURO = "#e0b129";
const OURO_FUNDO = "#8a6a10";
const VERMELHO = "#ff525b";
const GRADE = "#2b2e33";
const TEXTO = "#aeb4bd";
const SUPERFICIE = "#101214";

/*
 * Os degraus do eixo em número redondo (5k, 10k, 20k...).
 * O automático dividia em quatro partes iguais e saía 12k,
 * 23k, 35k - número que ninguém usa para pensar em dinheiro.
 */
function degraus(valores: number[]) {
  const maior = Math.max(0, ...valores);
  const menor = Math.min(0, ...valores);
  const bruto = (maior - menor) / 4 || 1000;
  const potencia = Math.pow(10, Math.floor(Math.log10(bruto)));
  const passo =
    [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= bruto) ||
    10 * potencia;

  const inicio = Math.floor(menor / passo) * passo;
  const fim = Math.ceil(maior / passo) * passo;
  const lista: number[] = [];
  for (let v = inicio; v <= fim + passo / 2; v += passo) lista.push(v);
  return lista;
}

function abreviar(valor: number) {
  const absoluto = Math.abs(valor);

  if (absoluto >= 1000000) {
    return `${(valor / 1000000).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    })}mi`;
  }

  if (absoluto >= 1000) {
    return `${(valor / 1000).toLocaleString("pt-BR", {
      maximumFractionDigits: absoluto >= 10000 ? 0 : 1,
    })}k`;
  }

  return String(Math.round(valor));
}

/*
 * A barra desenhada à mão, para arredondar só a ponta do dado:
 * em cima no lucro, embaixo no prejuízo. A base fica reta,
 * colada na linha do zero.
 */
function BarraArredondada(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: MesDoGrafico;
  ativo?: boolean;
}) {
  const { x = 0, y = 0, width = 0, height = 0, payload, ativo } = props;
  if (!payload || width <= 0) return null;

  const topo = Math.min(y, y + height);
  const altura = Math.abs(height);
  if (altura < 0.5) return null;

  const r = Math.min(6, width / 2, altura);
  const negativo = payload.liquido < 0;
  const fundo = topo + altura;
  const direita = x + width;

  const caminho = negativo
    ? `M${x},${topo} H${direita} V${fundo - r} Q${direita},${fundo} ${direita - r},${fundo} H${x + r} Q${x},${fundo} ${x},${fundo - r} Z`
    : `M${x},${fundo} V${topo + r} Q${x},${topo} ${x + r},${topo} H${direita - r} Q${direita},${topo} ${direita},${topo + r} V${fundo} Z`;

  const preenchimento = negativo
    ? "url(#lucroNegativo)"
    : payload.atual
      ? "url(#lucroAtual)"
      : "url(#lucroPositivo)";

  return (
    <path
      d={caminho}
      fill={preenchimento}
      opacity={ativo === false ? 0.45 : 1}
      style={{
        transition: "opacity .18s ease",
        filter:
          payload.atual && !negativo
            ? "drop-shadow(0 0 10px rgba(224,177,41,.35))"
            : undefined,
      }}
    />
  );
}

function ConteudoTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: MesDoGrafico }>;
}) {
  if (!active || !payload?.length) return null;

  const mes = payload[0].payload;
  const negativo = mes.liquido < 0;
  const margem =
    mes.faturamento > 0 ? (mes.liquido / mes.faturamento) * 100 : null;

  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipTitle}>
        {mes.rotulo}
        {mes.atual ? " · mês atual" : ""}
      </p>

      <div className={styles.tooltipRow}>
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: negativo ? VERMELHO : OURO }}
        />
        <span>{negativo ? "Prejuízo" : "Lucro líquido"}</span>
        <span className={styles.tooltipValue}>
          {formatarMoeda(mes.liquido)}
        </span>
      </div>

      <div className={styles.tooltipRow}>
        <span className="h-2.5 w-2.5" />
        <span>Lucro bruto</span>
        <span className={styles.tooltipValue}>{formatarMoeda(mes.bruto)}</span>
      </div>

      <div className={styles.tooltipRow}>
        <span className="h-2.5 w-2.5" />
        <span>Faturamento</span>
        <span className={styles.tooltipValue}>
          {formatarMoeda(mes.faturamento)}
        </span>
      </div>

      <div className={styles.tooltipRow}>
        <span className="h-2.5 w-2.5" />
        <span>
          {mes.vendidas}{" "}
          {mes.vendidas === 1 ? "moto vendida" : "motos vendidas"}
          {margem !== null ? ` · margem ${margem.toFixed(0)}%` : ""}
        </span>
      </div>
    </div>
  );
}

export default function GraficoLucroMensal({
  dados,
}: {
  dados: MesDoGrafico[];
}) {
  const router = useRouter();
  const [ativo, setAtivo] = useState<number | null>(null);

  const comMovimento = dados.filter(
    (m) => m.faturamento !== 0 || m.liquido !== 0,
  );
  const media = comMovimento.length
    ? comMovimento.reduce((soma, m) => soma + m.liquido, 0) /
      comMovimento.length
    : 0;

  const temNegativo = dados.some((m) => m.liquido < 0);
  const ticks = degraus(dados.map((m) => m.liquido));

  return (
    <div>
      <div className={`${styles.chart} h-[300px] w-full`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={dados}
            margin={{ top: 26, right: 8, bottom: 0, left: 0 }}
            barCategoryGap="22%"
            onMouseMove={(estado) => {
              const indice = Number(estado?.activeTooltipIndex);
              setAtivo(Number.isFinite(indice) ? indice : null);
            }}
            onMouseLeave={() => setAtivo(null)}
          >
            <defs>
              <linearGradient id="lucroPositivo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={OURO} stopOpacity={0.9} />
                <stop offset="100%" stopColor={OURO_FUNDO} stopOpacity={0.55} />
              </linearGradient>
              <linearGradient id="lucroAtual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffd45c" />
                <stop offset="100%" stopColor={OURO} stopOpacity={0.85} />
              </linearGradient>
              <linearGradient id="lucroNegativo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={VERMELHO} stopOpacity={0.5} />
                <stop offset="100%" stopColor={VERMELHO} stopOpacity={0.95} />
              </linearGradient>
            </defs>

            <CartesianGrid
              stroke={GRADE}
              vertical={false}
              strokeDasharray="3 4"
            />

            <XAxis
              dataKey="rotulo"
              tickLine={false}
              axisLine={false}
              interval={0}
              tick={{ fill: TEXTO, fontSize: 10, fontWeight: 700 }}
              tickFormatter={(rotulo: string) => rotulo.split("/")[0]}
            />

            <YAxis
              tickLine={false}
              axisLine={false}
              width={46}
              ticks={ticks}
              domain={[ticks[0], ticks[ticks.length - 1]]}
              tick={{ fill: TEXTO, fontSize: 11, fontWeight: 700 }}
              tickFormatter={abreviar}
            />

            <Tooltip
              cursor={{ fill: "rgba(255,255,255,.04)", radius: 8 }}
              content={<ConteudoTooltip />}
            />

            {temNegativo && <ReferenceLine y={0} stroke="#575c64" />}

            {comMovimento.length > 1 && (
              <ReferenceLine
                y={media}
                stroke={OURO}
                strokeOpacity={0.45}
                strokeDasharray="5 5"
              />
            )}

            <Bar
              dataKey="liquido"
              name="Lucro líquido"
              cursor="pointer"
              isAnimationActive
              animationDuration={700}
              shape={(props: unknown) => {
                const p = props as Parameters<typeof BarraArredondada>[0] & {
                  index?: number;
                };
                return (
                  <BarraArredondada
                    {...p}
                    ativo={ativo === null ? undefined : ativo === p.index}
                  />
                );
              }}
              onClick={(dado: unknown) => {
                const mes = (dado as { payload?: MesDoGrafico })?.payload;
                if (mes)
                  router.push(`/relatorios?mes=${mes.mes}&ano=${mes.ano}`);
              }}
            >
              {/* Só o mês atual leva o número escrito: número em
                toda barra vira ruído, e o resto está no hover. */}
              <LabelList
                dataKey="liquido"
                content={(props: unknown) => {
                  const { x, y, width, height, index } = props as {
                    x?: number;
                    y?: number;
                    width?: number;
                    height?: number;
                    index?: number;
                  };
                  const mes = index !== undefined ? dados[index] : undefined;
                  if (!mes?.atual || x === undefined || y === undefined)
                    return null;

                  const negativo = mes.liquido < 0;
                  const base = negativo
                    ? y + Math.abs(height ?? 0) + 14
                    : Math.min(y, y + (height ?? 0)) - 8;

                  return (
                    <text
                      x={x + (width ?? 0) / 2}
                      y={base}
                      textAnchor="middle"
                      fill="#ffffff"
                      stroke={SUPERFICIE}
                      strokeWidth={3}
                      paintOrder="stroke"
                      fontSize={12}
                      fontWeight={900}
                    >
                      {abreviar(mes.liquido)}
                    </text>
                  );
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* A legenda embaixo: o rótulo da média dentro do gráfico
        brigava com as barras e roubava largura no celular. */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[11px] font-bold text-black/50">
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: OURO }}
          />
          Lucro
        </span>
        {temNegativo && (
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: VERMELHO }}
            />
            Prejuízo
          </span>
        )}
        {comMovimento.length > 1 && (
          <span className="flex items-center gap-1.5">
            <span
              className="w-4 border-t-2 border-dashed"
              style={{ borderColor: OURO }}
            />
            Média {formatarMoeda(media)}
          </span>
        )}
      </div>
    </div>
  );
}
