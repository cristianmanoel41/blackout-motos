import Link from "next/link";
import { headers } from "next/headers";
import { BarChart3 } from "lucide-react";
import GraficoLucroMensal, {
  type MesDoGrafico,
} from "@/components/GraficoLucroMensal";
import styles from "./dashboard.module.css";

/*
 * O LUCRO MÊS A MÊS, NO PAINEL
 *
 * O card do lucro diz como está o mês; o gráfico diz se a loja
 * está melhorando ou piorando. Os dois juntos respondem o que o
 * card sozinho não responde: "esse número é bom?".
 *
 * Cada barra é o "Lucro líquido" do relatório mensal daquele
 * mês - a mesma rota que o card e a impressão usam. A conta não
 * é refeita aqui (ver o comentário em LucroDoMes): se o
 * relatório mudar, o gráfico muda junto.
 *
 * São doze chamadas ao relatório, em paralelo. Por isso fica
 * dentro de Suspense no painel: o resto da tela aparece antes.
 */

const MESES = 12;

const ABREVIADOS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

export default async function LucroPorMes() {
  const cabecalhos = await headers();
  const host = cabecalhos.get("host") || "localhost:3000";
  const protocolo =
    cabecalhos.get("x-forwarded-proto")?.split(",")[0] ||
    (process.env.NODE_ENV === "development" ? "http" : "https");

  const hoje = new Date();

  const periodos = Array.from({ length: MESES }, (_, i) => {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - (MESES - 1 - i), 1);
    return { mes: data.getMonth() + 1, ano: data.getFullYear() };
  });

  const meses = await Promise.all(
    periodos.map(async ({ mes, ano }): Promise<MesDoGrafico | null> => {
      try {
        const resposta = await fetch(
          `${protocolo}://${host}/api/relatorios/mensal?mes=${mes}&ano=${ano}&formato=json`,
          {
            headers: { cookie: cabecalhos.get("cookie") || "" },
            cache: "no-store",
          }
        );

        if (!resposta.ok) return null;

        const dados = (await resposta.json()) as {
          linhas: Array<[string, string | number]>;
        };

        const achar = (rotulo: string) => {
          const linha = dados.linhas.find(([r]) => r === rotulo);
          return linha ? Number(linha[1]) : NaN;
        };

        const liquido = achar("Lucro líquido");
        if (!Number.isFinite(liquido)) return null;

        return {
          rotulo: `${ABREVIADOS[mes - 1]}/${String(ano).slice(2)}`,
          mes,
          ano,
          liquido,
          bruto: achar("Lucro bruto") || 0,
          faturamento: achar("Faturamento") || 0,
          vendidas: achar("Motos vendidas") || 0,
          atual: mes === hoje.getMonth() + 1 && ano === hoje.getFullYear(),
        };
      } catch {
        return null;
      }
    })
  );

  const validos = meses.filter((m): m is MesDoGrafico => m !== null);

  /* Meses antes da loja usar o sistema vêm zerados; não entram
     na média, senão ela parece pior do que é. */
  const comMovimento = validos.filter(
    (m) => m.faturamento !== 0 || m.liquido !== 0
  );

  const total = comMovimento.reduce((soma, m) => soma + m.liquido, 0);
  const media = comMovimento.length ? total / comMovimento.length : 0;
  const melhor = comMovimento.reduce<MesDoGrafico | null>(
    (maior, m) => (!maior || m.liquido > maior.liquido ? m : maior),
    null
  );

  const emReais = (valor: number) =>
    valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    });

  return (
    <div className={styles.panel}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={styles.icon3d}>
            <BarChart3 size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-black">Lucro líquido por mês</h2>
            <p className="text-xs font-bold text-black/45">
              Últimos {MESES} meses · a mesma conta de Relatórios · clique num mês para abrir
            </p>
          </div>
        </div>

        {comMovimento.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Resumo titulo="No período" valor={emReais(total)} negativo={total < 0} />
            <Resumo titulo="Média por mês" valor={emReais(media)} negativo={media < 0} />
            {melhor && (
              <Resumo
                titulo="Melhor mês"
                valor={emReais(melhor.liquido)}
                detalhe={melhor.rotulo}
              />
            )}
          </div>
        )}
      </div>

      {validos.length > 0 ? (
        <GraficoLucroMensal dados={validos} />
      ) : (
        <p className="py-10 text-center text-sm font-bold text-black/45">
          Não foi possível carregar os números agora.{" "}
          <Link href="/relatorios" className="underline">
            Ver em Relatórios
          </Link>
        </p>
      )}
    </div>
  );
}

function Resumo({
  titulo,
  valor,
  detalhe,
  negativo,
}: {
  titulo: string;
  valor: string;
  detalhe?: string;
  negativo?: boolean;
}) {
  return (
    <div className={`${styles.dataPill} rounded-xl px-3 py-2`}>
      <p className="text-[10px] font-black uppercase tracking-wider text-black/40">
        {titulo}
        {detalhe ? ` · ${detalhe}` : ""}
      </p>
      <p
        className={`text-base font-black ${
          negativo ? "text-red-400" : "text-black"
        }`}
      >
        {valor}
      </p>
    </div>
  );
}

/* O lugar do gráfico enquanto as doze contas rodam. */
export function LucroPorMesCarregando() {
  return (
    <div className={styles.panel}>
      <div className="h-[22rem] animate-pulse rounded-xl bg-white/[0.03]" />
    </div>
  );
}
