"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import { History, Search } from "lucide-react";

/*
 * Histórico do sistema.
 *
 * O sistema guarda o valor atual, nunca o anterior. Quando
 * alguém corrige um número, o antigo some - e já aconteceu de
 * precisar dele de volta e não haver de onde tirar.
 *
 * Aqui fica o registro de toda mudança de valor em dinheiro:
 * de quanto para quanto, em qual registro, por quem e quando.
 */

const supabase = createClient();

type Mudanca = {
  id: string;
  tabela: string;
  registro_id: string;
  campo: string;
  valor_anterior: number | null;
  valor_novo: number | null;
  referencia: string | null;
  alterado_por: string | null;
  alterado_em: string;
};

const nomesTabela: Record<string, string> = {
  motorcycles: "Moto",
  sales: "Venda",
  motorcycle_expenses: "Gasto de moto",
  store_expenses: "Despesa da loja",
  cash_transactions: "Lançamento do caixa",
  sale_payment_components: "Pagamento da venda",
  sale_documentation_costs: "Custo da documentação",
};

const nomesCampo: Record<string, string> = {
  valor_compra: "Valor de compra",
  preco_anunciado: "Preço anunciado",
  valor_total_venda: "Valor da venda",
  valor_financiado: "Valor financiado",
  transferencia_cliente: "Recebido para documentação",
  valor: "Valor",
};

function semAcento(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function quandoFoi(data: string) {
  return new Date(data).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoricoPage() {
  const [mudancas, setMudancas] = useState<Mudanca[]>([]);
  const [nomes, setNomes] = useState<Record<string, string>>({});
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
      .from("historico_valores")
      .select("*")
      .order("alterado_em", { ascending: false })
      .limit(300);

    if (error) {
      console.error(error);

      setErro(
        `Não foi possível carregar o histórico: ${error.message}`
      );

      setCarregando(false);
      return;
    }

    const lista = (data || []) as Mudanca[];
    setMudancas(lista);

    /* Quem alterou vem como id; o nome está nos perfis. */
    const ids = Array.from(
      new Set(
        lista
          .map((item) => item.alterado_por)
          .filter(Boolean) as string[]
      )
    );

    if (ids.length > 0) {
      const { data: perfis } = await supabase
        .from("profiles")
        .select("id, nome")
        .in("id", ids);

      setNomes(
        Object.fromEntries(
          (perfis || []).map((perfil: any) => [
            String(perfil.id),
            perfil.nome || "",
          ])
        )
      );
    }

    setCarregando(false);
  }

  const filtradas = useMemo(() => {
    const termo = semAcento(busca);

    if (!termo) return mudancas;

    return mudancas.filter((item) =>
      semAcento(
        [
          nomesTabela[item.tabela] || item.tabela,
          nomesCampo[item.campo] || item.campo,
          item.referencia,
          nomes[String(item.alterado_por)],
        ]
          .filter(Boolean)
          .join(" ")
      ).includes(termo)
    );
  }, [mudancas, busca, nomes]);

  if (carregando) {
    return (
      <div className="p-6 text-texto-suave">
        Carregando histórico...
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-dourado">
          <History size={24} />
          Histórico do Sistema
        </h1>

        <p className="mt-1 text-sm text-texto-suave">
          Toda alteração de valor em dinheiro fica registrada
          aqui: de quanto para quanto, em qual registro e por
          quem. Serve para achar o número antigo quando algo for
          digitado errado.
        </p>
      </div>

      {erro && (
        <div className="mb-4 rounded-xl border border-red-700 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {erro}
        </div>
      )}

      <div className="relative mb-4 w-full lg:max-w-sm">
        <Search
          size={17}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-texto-suave"
        />

        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por moto, cliente, campo ou quem alterou"
          className="w-full rounded-xl border border-grafite-claro bg-grafite py-2.5 pl-10 pr-4 text-sm text-texto outline-none transition focus:border-dourado"
        />
      </div>

      {filtradas.length === 0 ? (
        <div className="rounded-xl border border-grafite-claro bg-grafite p-8 text-center text-sm text-texto-suave">
          {mudancas.length === 0
            ? "Nenhuma alteração registrada ainda. A partir de agora, toda correção de valor aparece aqui."
            : "Nenhuma alteração encontrada com esse termo."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-grafite-claro bg-grafite">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b border-grafite-claro text-left text-xs uppercase tracking-wide text-texto-suave">
              <tr>
                <th className="px-4 py-3">Quando</th>
                <th className="px-4 py-3">O quê</th>
                <th className="px-4 py-3">Campo</th>
                <th className="px-4 py-3 text-right">De</th>
                <th className="px-4 py-3 text-right">Para</th>
                <th className="px-4 py-3">Quem</th>
              </tr>
            </thead>

            <tbody>
              {filtradas.map((item) => {
                const diferenca =
                  Number(item.valor_novo || 0) -
                  Number(item.valor_anterior || 0);

                return (
                  <tr
                    key={item.id}
                    className="border-b border-grafite-claro/60 last:border-0"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-texto-suave">
                      {quandoFoi(item.alterado_em)}
                    </td>

                    <td className="px-4 py-3">
                      <span className="block font-medium text-texto">
                        {nomesTabela[item.tabela] ||
                          item.tabela}
                      </span>

                      {item.referencia && (
                        <span className="text-xs text-texto-suave">
                          {item.referencia}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-texto-suave">
                      {nomesCampo[item.campo] || item.campo}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right text-texto-suave">
                      {formatarMoeda(
                        Number(item.valor_anterior || 0)
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <span className="font-semibold text-texto">
                        {formatarMoeda(
                          Number(item.valor_novo || 0)
                        )}
                      </span>

                      <span
                        className={`block text-xs ${
                          diferenca >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {diferenca >= 0 ? "+" : "-"}{" "}
                        {formatarMoeda(Math.abs(diferenca))}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-texto-suave">
                      {nomes[String(item.alterado_por)] ||
                        "Não identificado"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-texto-suave">
        Mostrando as {filtradas.length} alterações mais recentes.
      </p>
    </div>
  );
}
