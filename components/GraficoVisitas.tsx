"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import styles from "./GraficoValores.module.css";

/*
 * O movimento do site, em barra.
 *
 * Barra e não linha porque cada dia é uma contagem fechada, não
 * um valor que caminha: ligar 12 visitas de terça a 3 de quarta
 * com uma linha inventa uma passagem que não existe. E o que se
 * procura aqui é justamente o dia vazio e o dia cheio.
 *
 * Uma série só, então não leva legenda - o título já diz o que
 * está medido. O número do WhatsApp aparece ao passar o mouse,
 * onde ele tem contexto, em vez de virar uma segunda barra que
 * mede outra coisa na mesma altura.
 *
 * As cores e o balão são os mesmos do gráfico de faturamento:
 * dois gráficos no mesmo painel com sotaque diferente fazem o
 * olho procurar um significado que não existe.
 */

const COR_BARRA = "#e0b129";
const COR_GRADE = "#2b2e33";
const COR_TEXTO = "#aeb4bd";

export type PontoVisita = {
  rotulo: string;
  /* A barra: pessoas. */
  visitas: number;
  /* Só o gráfico por dia tem os dois; o por hora manda sem. */
  telas?: number;
  whatsapp?: number;
};

type ItemTooltip = {
  payload?: PontoVisita;
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

  const ponto = payload[0]?.payload;

  if (!ponto) return null;

  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipTitle}>{label}</p>

      <div className={styles.tooltipRow}>
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: COR_BARRA }}
        />
        <span>Pessoas</span>
        <span className={styles.tooltipValue}>
          {ponto.visitas}
        </span>
      </div>

      {ponto.telas !== undefined && (
        <div className={styles.tooltipRow}>
          <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
          <span>Telas abertas</span>
          <span className={styles.tooltipValue}>
            {ponto.telas}
          </span>
        </div>
      )}

      {ponto.whatsapp !== undefined && (
        <div className={styles.tooltipRow}>
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span>Chamaram no WhatsApp</span>
          <span className={styles.tooltipValue}>
            {ponto.whatsapp}
          </span>
        </div>
      )}
    </div>
  );
}

/*
 * Quantas etiquetas cabem embaixo.
 *
 * Trinta dias não cabem no celular: sem isto, as datas se
 * empilham e viram um borrão cinza. Mostrar uma a cada quatro
 * mantém a régua legível e o desenho inteiro.
 */
function saltoDasEtiquetas(quantos: number, cabem: number) {
  return Math.max(0, Math.ceil(quantos / cabem) - 1);
}

export default function GraficoVisitas({
  dados,
  cabem = 8,
  altura = 220,
}: {
  dados: PontoVisita[];
  cabem?: number;
  altura?: number;
}) {
  return (
    <div className={styles.chart} style={{ height: altura }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={dados}
          barCategoryGap={2}
          margin={{ top: 10, right: 4, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            stroke={COR_GRADE}
            vertical={false}
            strokeDasharray="3 4"
          />

          <XAxis
            dataKey="rotulo"
            tickLine={false}
            axisLine={{ stroke: COR_GRADE }}
            interval={saltoDasEtiquetas(dados.length, cabem)}
            tick={{
              fill: COR_TEXTO,
              fontSize: 11,
              fontWeight: 700,
            }}
          />

          <YAxis
            tickLine={false}
            axisLine={false}
            width={34}
            allowDecimals={false}
            tick={{
              fill: COR_TEXTO,
              fontSize: 11,
              fontWeight: 700,
            }}
          />

          <Tooltip
            cursor={{ fill: "rgba(255,255,255,.05)" }}
            content={<ConteudoTooltip />}
          />

          <Bar
            dataKey="visitas"
            fill={COR_BARRA}
            radius={[4, 4, 0, 0]}
            maxBarSize={34}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
