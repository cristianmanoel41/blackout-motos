import Link from "next/link";
import { headers } from "next/headers";
import { TrendingUp } from "lucide-react";
import styles from "./dashboard.module.css";

/*
 * O LUCRO LÍQUIDO DO MÊS, NO PAINEL
 *
 * O financeiro saiu do painel em 02/10/2026 e foi morar em
 * Relatórios, a pedido da loja. Este número voltou no dia
 * seguinte: é o único que responde "como está indo o mês" sem
 * precisar abrir outra tela, e sem ele o painel conta só metade
 * da história - quantas motos entraram e saíram, mas não se a
 * loja ganhou dinheiro com isso.
 *
 * O resto do financeiro continua em Relatórios.
 *
 * O NÚMERO VEM DA MESMA CONTA DO RELATÓRIO
 *
 * Não é refeito aqui. Lucro líquido soma faturamento, custo das
 * motos, gastos das motos, capacetes e despesas da loja - são
 * catorze consultas e uma dúzia de decisões, e duas cópias
 * dessa conta acabariam mostrando valores diferentes na mesma
 * tela do mesmo sistema. Um painel que discorda do relatório é
 * pior que um painel sem o número.
 */

const emReais = (valor: number) =>
  valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

export default async function LucroDoMes() {
  const hoje = new Date();
  const mes = hoje.getMonth() + 1;
  const ano = hoje.getFullYear();

  const cabecalhos = await headers();
  const host = cabecalhos.get("host") || "localhost:3000";
  const protocolo = host.startsWith("localhost") ? "http" : "https";

  let linhas: Array<[string, string]> = [];

  try {
    const resposta = await fetch(
      `${protocolo}://${host}/api/relatorios/mensal?mes=${mes}&ano=${ano}&formato=json`,
      {
        headers: { cookie: cabecalhos.get("cookie") || "" },
        cache: "no-store",
      }
    );

    if (resposta.ok) {
      const dados = (await resposta.json()) as {
        linhas: Array<[string, string | number]>;
      };

      linhas = dados.linhas.map(([r, v]) => [String(r), String(v)]);
    }
  } catch {
    /* O painel não cai por causa de um card. Sem o número, ele
       aparece vazio e o resto da tela continua de pé. */
  }

  const achar = (rotulo: string) =>
    linhas.find(([r]) => r === rotulo)?.[1] ?? "";

  const liquido = Number(achar("Lucro líquido"));
  const bruto = Number(achar("Lucro bruto"));

  const temNumero = Number.isFinite(liquido) && achar("Lucro líquido") !== "";
  const negativo = temNumero && liquido < 0;

  return (
    <Link href="/relatorios" className="block">
      <div className={styles.metricCard}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.08em] text-black/45">
              Lucro líquido do mês
            </p>

            <p
              className={`mt-3 text-2xl font-black tracking-tight ${
                negativo ? styles.metricValueNegative : styles.metricValue
              }`}
            >
              {temNumero ? emReais(liquido) : "—"}
            </p>
          </div>

          <div className={styles.icon3d}>
            <TrendingUp size={23} strokeWidth={2.2} />
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 text-xs font-bold text-black/45">
          <span className="h-1.5 w-1.5 rounded-full bg-[#c99712]" />
          {temNumero && Number.isFinite(bruto)
            ? `Bruto ${emReais(bruto)} · ver em Relatórios`
            : "Ver em Relatórios"}
        </div>
      </div>
    </Link>
  );
}
