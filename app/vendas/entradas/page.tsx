"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import { formatarData } from "@/lib/formatadores/data";
import { ArrowLeft, Search, TrendingUp } from "lucide-react";

/*
 * Histórico de entradas.
 *
 * Todo dinheiro que entra na conta da loja, venha de onde vier:
 * venda de moto, de capacete, documentação, reembolso. A
 * descrição já traz a moto, então dá para procurar por modelo
 * ou placa.
 *
 * Separa o que já caiu do que ainda vai cair - o financiamento
 * costuma demorar dias para o banco depositar.
 */

const supabase = createClient();

type Entrada = {
  id: string;
  data: string;
  descricao: string | null;
  origem: string;
  valor: number;
  confirmado: boolean;
};

const nomesOrigem: Record<string, string> = {
  venda: "Venda de moto",
  venda_capacete: "Venda de capacete",
  documentacao: "Documentação",
  vistoria: "Vistoria",
  compra_moto: "Compra de moto",
  gasto_moto: "Gasto de moto",
  despesa_loja: "Despesa da loja",
  compra_capacete: "Compra de capacetes",
  outro: "Outro",
};

const nomesMeses = [
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

function semAcento(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function EntradasPage() {
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    setErro("");

    const { data, error } = await supabase
      .from("cash_transactions")
      .select(
        "id, data, descricao, origem, valor, confirmado"
      )
      .eq("tipo", "entrada")
      .order("data", { ascending: false })
      .limit(400);

    if (error) {
      console.error(error);

      setErro(
        `Não foi possível carregar: ${error.message}`
      );

      setCarregando(false);
      return;
    }

    setEntradas((data || []) as Entrada[]);
    setCarregando(false);
  }

  const filtradas = useMemo(() => {
    const termo = semAcento(busca);

    if (!termo) return entradas;

    return entradas.filter((item) =>
      semAcento(
        [
          item.descricao,
          nomesOrigem[item.origem] || item.origem,
        ]
          .filter(Boolean)
          .join(" ")
      ).includes(termo)
    );
  }, [entradas, busca]);

  const totais = useMemo(() => {
    return filtradas.reduce(
      (resumo, item) => {
        const valor = Number(item.valor || 0);

        return item.confirmado === false
          ? {
              ...resumo,
              aReceber: resumo.aReceber + valor,
            }
          : {
              ...resumo,
              naConta: resumo.naConta + valor,
            };
      },
      { naConta: 0, aReceber: 0 }
    );
  }, [filtradas]);

  /* Uma faixa a cada virada de mês, com o total do mês. */
  const grupos = useMemo(() => {
    const meses: Array<{
      chave: string;
      titulo: string;
      itens: Entrada[];
      total: number;
    }> = [];

    filtradas.forEach((item) => {
      const chave = String(item.data || "").slice(0, 7);

      let grupo = meses.find((m) => m.chave === chave);

      if (!grupo) {
        const [ano, mes] = chave.split("-");
        const indice = Number(mes) - 1;

        grupo = {
          chave,
          titulo:
            nomesMeses[indice] && ano
              ? `${nomesMeses[indice]} de ${ano}`
              : "Sem data",
          itens: [],
          total: 0,
        };

        meses.push(grupo);
      }

      grupo.itens.push(item);
      grupo.total += Number(item.valor || 0);
    });

    return meses;
  }, [filtradas]);

  if (carregando) {
    return (
      <div className="p-6 text-texto-suave">
        Carregando entradas...
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-dourado">
            <TrendingUp size={24} />
            Histórico de Entradas
          </h1>

          <p className="mt-1 text-sm text-texto-suave">
            Todo dinheiro que entra na conta da loja, com a moto
            de cada venda. Procure por modelo, placa ou cliente.
          </p>
        </div>

        <Link
          href="/vendas/historico"
          className="flex items-center justify-center gap-2 rounded-lg border border-grafite-claro px-4 py-2 font-semibold text-texto transition hover:border-dourado hover:text-dourado"
        >
          <ArrowLeft size={18} />
          Histórico de vendas
        </Link>
      </div>

      {erro && (
        <div className="mb-4 rounded-xl border border-red-700 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {erro}
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-grafite-claro bg-grafite p-4">
          <p className="text-xs text-texto-suave">
            Já entrou na conta
          </p>

          <p className="mt-1 text-2xl font-bold text-green-400">
            {formatarMoeda(totais.naConta)}
          </p>
        </div>

        <div className="rounded-xl border border-grafite-claro bg-grafite p-4">
          <p className="text-xs text-texto-suave">
            Ainda vai entrar
          </p>

          <p className="mt-1 text-2xl font-bold text-dourado">
            {formatarMoeda(totais.aReceber)}
          </p>

          <p className="mt-1 text-xs text-texto-suave">
            Financiamento e recebimentos combinados
          </p>
        </div>
      </div>

      <div className="relative mb-4 w-full lg:max-w-sm">
        <Search
          size={17}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-texto-suave"
        />

        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Procurar por moto, placa ou origem"
          className="w-full rounded-xl border border-grafite-claro bg-grafite py-2.5 pl-10 pr-4 text-sm text-texto outline-none transition focus:border-dourado"
        />
      </div>

      {filtradas.length === 0 ? (
        <div className="rounded-xl border border-grafite-claro bg-grafite p-8 text-center text-sm text-texto-suave">
          {entradas.length === 0
            ? "Nenhuma entrada registrada ainda."
            : "Nenhuma entrada encontrada com esse termo."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-grafite-claro bg-grafite">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-grafite-claro text-left text-xs uppercase tracking-wide text-texto-suave">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">De onde veio</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3">Situação</th>
              </tr>
            </thead>

            <tbody>
              {grupos.map((grupo) => (
                <Fragment key={grupo.chave}>
                  <tr className="border-b border-grafite-claro bg-preto/50">
                    <td colSpan={5} className="px-4 py-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-sm font-bold text-dourado">
                          {grupo.titulo}
                        </span>

                        <span className="text-xs text-texto-suave">
                          {grupo.itens.length} entrada
                          {grupo.itens.length === 1
                            ? ""
                            : "s"}{" "}
                          ·{" "}
                          <strong className="text-texto">
                            {formatarMoeda(grupo.total)}
                          </strong>
                        </span>
                      </div>
                    </td>
                  </tr>

                  {grupo.itens.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-grafite-claro/60"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-texto-suave">
                        {formatarData(item.data)}
                      </td>

                      <td className="px-4 py-3 text-texto">
                        {item.descricao || "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-texto-suave">
                        {nomesOrigem[item.origem] ||
                          "Outro"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-green-400">
                        + {formatarMoeda(item.valor)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {item.confirmado === false ? (
                          <span className="text-xs font-semibold text-dourado">
                            A receber
                          </span>
                        ) : (
                          <span className="text-xs text-texto-suave">
                            Na conta
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
