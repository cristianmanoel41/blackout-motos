import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import { formatarData } from "@/lib/formatadores/data";
import { LOJA, ENDERECO_COMPLETO } from "@/lib/dados/loja";
import BotaoImprimir from "@/app/relatorios/imprimir/BotaoImprimir";
import estilo from "./imprimir.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Relatório de despesas · Blackout Motos" };

/*
 * O RELATÓRIO DE DESPESAS, PARA O CONTADOR.
 *
 * Só o que saiu de dinheiro, com data, valor e o motivo - nada
 * de venda, estoque ou financiamento, que já têm o relatório
 * mensal (/relatorios). O contador não quer o resto.
 *
 * Despesa da loja só entra se estiver PAGA: "valor pago" é a
 * data em que o dinheiro realmente saiu (data_pagamento), não a
 * data de vencimento. Gasto de moto não tem "em aberto" no
 * sistema - é lançado quando acontece, então entra pela data do
 * lançamento mesmo.
 */

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

type Linha = {
  data: string;
  descricao: string;
  valor: number;
};

export default async function RelatorioDeDespesas({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ano?: string }>;
}) {
  const params = await searchParams;
  const hoje = new Date();

  const mes = Number(params.mes) || hoje.getMonth() + 1;
  const ano = Number(params.ano) || hoje.getFullYear();

  const ultimoDia = new Date(ano, mes, 0).getDate();
  const inicioMes = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const fimMes = `${ano}-${String(mes).padStart(2, "0")}-${String(
    ultimoDia
  ).padStart(2, "0")}`;

  const supabase = await createClient();

  const [resultadoDespesas, resultadoGastos] = await Promise.all([
    supabase
      .from("store_expenses")
      .select("data, data_pagamento, categoria, descricao, valor")
      .eq("pago", true)
      .gte("data_pagamento", inicioMes)
      .lte("data_pagamento", fimMes)
      .order("data_pagamento", { ascending: true }),

    supabase
      .from("motorcycle_expenses")
      .select(
        `
        data,
        categoria,
        descricao,
        valor,
        motorcycles ( codigo, marca, modelo, versao, placa )
      `
      )
      .gte("data", inicioMes)
      .lte("data", fimMes)
      .order("data", { ascending: true }),
  ]);

  const linhasDespesas: Linha[] = (resultadoDespesas.data || []).map(
    (item) => ({
      data: item.data_pagamento || item.data,
      descricao: [item.categoria, item.descricao]
        .filter(Boolean)
        .join(" — ") || "Despesa da loja",
      valor: Number(item.valor || 0),
    })
  );

  const linhasGastos: Linha[] = (resultadoGastos.data || []).map(
    (item: any) => {
      const moto = item.motorcycles;

      const nomeMoto =
        [moto?.marca, moto?.modelo, moto?.versao]
          .filter(Boolean)
          .join(" ") || "Moto não encontrada";

      const identificador = [moto?.codigo, moto?.placa]
        .filter(Boolean)
        .join(" · ");

      return {
        data: item.data,
        descricao: [
          item.categoria || "Gasto",
          `${nomeMoto}${identificador ? ` (${identificador})` : ""}`,
          item.descricao,
        ]
          .filter(Boolean)
          .join(" — "),
        valor: Number(item.valor || 0),
      };
    }
  );

  const totalDespesas = linhasDespesas.reduce(
    (soma, linha) => soma + linha.valor,
    0
  );

  const totalGastos = linhasGastos.reduce(
    (soma, linha) => soma + linha.valor,
    0
  );

  const totalGeral = totalDespesas + totalGastos;

  const anos = Array.from({ length: 5 }, (_, i) => hoje.getFullYear() - i);
  const geradoEm = hoje.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  const linha = (item: Linha, chave: string) => (
    <tr key={chave}>
      <td className={estilo.colData}>{formatarData(item.data)}</td>
      <td>{item.descricao}</td>
      <td className={estilo.colValor}>{formatarMoeda(item.valor)}</td>
    </tr>
  );

  return (
    <div className={estilo.fundo}>
      <div className={estilo.barra}>
        <Link
          href="/despesas"
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm font-bold text-[#c9ced4] transition hover:border-[#e0b129]/60 hover:text-[#f0c640]"
        >
          <ArrowLeft size={16} />
          Voltar para despesas
        </Link>

        <form
          method="GET"
          className={estilo.filtros}
        >
          <select
            name="mes"
            defaultValue={mes}
            className="rounded-lg border border-white/15 bg-[#1b1d20] px-3 py-2 text-sm text-[#c9ced4] outline-none"
          >
            {MESES.map((nome, i) => (
              <option key={nome} value={i + 1}>
                {nome}
              </option>
            ))}
          </select>

          <select
            name="ano"
            defaultValue={ano}
            className="rounded-lg border border-white/15 bg-[#1b1d20] px-3 py-2 text-sm text-[#c9ced4] outline-none"
          >
            {anos.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="rounded-lg bg-[#e0b129] px-4 py-2 text-sm font-bold text-black transition hover:brightness-110"
          >
            Gerar
          </button>
        </form>

        <BotaoImprimir />
      </div>

      <article className={estilo.folha}>
        <header className={estilo.timbre}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-blackout-papel.png" alt={LOJA.nome} />

          <div className={estilo.loja}>
            {ENDERECO_COMPLETO.split(" · ").map((parte) => (
              <div key={parte}>{parte}</div>
            ))}
            <div>{LOJA.telefone}</div>
          </div>
        </header>

        <h1 className={estilo.titulo}>Relatório de despesas</h1>
        <p className={estilo.periodo}>
          {MESES[mes - 1]} de {ano}
        </p>

        <div className={estilo.resumo}>
          <div className={estilo.resumoItem}>
            <p className={estilo.resumoRotulo}>Despesas da loja</p>
            <p className={estilo.resumoValor}>
              {formatarMoeda(totalDespesas)}
            </p>
          </div>

          <div className={estilo.resumoItem}>
            <p className={estilo.resumoRotulo}>Gastos com motos</p>
            <p className={estilo.resumoValor}>
              {formatarMoeda(totalGastos)}
            </p>
          </div>

          <div className={estilo.resumoItem}>
            <p className={estilo.resumoRotulo}>Total pago no mês</p>
            <p className={estilo.resumoValor}>
              {formatarMoeda(totalGeral)}
            </p>
          </div>
        </div>

        <section className={estilo.bloco}>
          <h2 className={estilo.nomeDoBloco}>
            Despesas da loja
            <span>{formatarMoeda(totalDespesas)}</span>
          </h2>

          {linhasDespesas.length === 0 ? (
            <p className={estilo.vazio}>
              Nenhuma despesa paga neste período.
            </p>
          ) : (
            <table className={estilo.tabela}>
              <thead>
                <tr>
                  <th>Data do pagamento</th>
                  <th>Do que se trata</th>
                  <th>Valor pago</th>
                </tr>
              </thead>

              <tbody>
                {linhasDespesas.map((item, i) => linha(item, `d-${i}`))}
              </tbody>
            </table>
          )}
        </section>

        <section className={estilo.bloco}>
          <h2 className={estilo.nomeDoBloco}>
            Gastos com motos em estoque
            <span>{formatarMoeda(totalGastos)}</span>
          </h2>

          {linhasGastos.length === 0 ? (
            <p className={estilo.vazio}>
              Nenhum gasto de moto lançado neste período.
            </p>
          ) : (
            <table className={estilo.tabela}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Do que se trata</th>
                  <th>Valor pago</th>
                </tr>
              </thead>

              <tbody>
                {linhasGastos.map((item, i) => linha(item, `g-${i}`))}
              </tbody>
            </table>
          )}
        </section>

        <footer className={estilo.rodape}>
          {LOJA.nome} · relatório gerado pelo sistema em {geradoEm}
        </footer>
      </article>
    </div>
  );
}
