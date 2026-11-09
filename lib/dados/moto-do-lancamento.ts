import type { SupabaseClient } from "@supabase/supabase-js";

/*
 * DE QUAL MOTO É ESTE LANÇAMENTO DO CAIXA?
 *
 * O lançamento guarda só a origem e o id dela (origem_id), e a
 * descrição nem sempre traz a moto - "Pix", "Transferência",
 * "Vistoria" sozinhos não dizem de qual moto é o dinheiro. Aqui
 * o id é seguido até a moto:
 *
 *   compra_moto              -> a própria moto
 *   venda                    -> a venda -> a moto vendida
 *   gasto_moto               -> o gasto -> a moto
 *   documentacao / vistoria  -> o custo -> a venda -> a moto
 *
 * Só leitura. Lançamento sem moto (despesa da loja, capacete,
 * avulso) simplesmente não aparece no resultado.
 */

type Lancamento = {
  id: string;
  origem?: string | null;
  origem_id?: string | null;
};

export type MotoDoLancamento = {
  id: string;
  nome: string;
};

/* O .in() vai na URL; lotes evitam passar do tamanho dela. */
const LOTE = 150;

async function buscarEmLotes<T>(
  ids: string[],
  buscar: (lote: string[]) => PromiseLike<{ data: T[] | null }>
) {
  const unicos = Array.from(new Set(ids.filter(Boolean)));
  const resultado: T[] = [];

  for (let i = 0; i < unicos.length; i += LOTE) {
    const { data } = await buscar(unicos.slice(i, i + LOTE));
    if (data) resultado.push(...data);
  }

  return resultado;
}

function nomeDaMoto(moto: {
  marca?: string | null;
  modelo?: string | null;
  ano_modelo?: string | number | null;
  placa?: string | null;
}) {
  const modelo = [moto.marca, moto.modelo].filter(Boolean).join(" ");
  const ano = moto.ano_modelo ? ` ${moto.ano_modelo}` : "";
  const placa = moto.placa ? ` · ${String(moto.placa).toUpperCase()}` : "";

  return `${modelo || "Moto"}${ano}${placa}`;
}

export async function motosDosLancamentos(
  supabase: SupabaseClient,
  lancamentos: Lancamento[]
): Promise<Record<string, MotoDoLancamento>> {
  const ids = (origens: string[]) =>
    lancamentos
      .filter((t) => t.origem_id && origens.includes(String(t.origem)))
      .map((t) => String(t.origem_id));

  const [vendas, gastos, custos] = await Promise.all([
    buscarEmLotes<{ id: string; motorcycle_id: string | null }>(
      ids(["venda"]),
      (lote) => supabase.from("sales").select("id, motorcycle_id").in("id", lote)
    ),
    buscarEmLotes<{ id: string; motorcycle_id: string | null }>(
      ids(["gasto_moto"]),
      (lote) =>
        supabase
          .from("motorcycle_expenses")
          .select("id, motorcycle_id")
          .in("id", lote)
    ),
    buscarEmLotes<{ id: string; sale_id: string | null }>(
      ids(["documentacao", "vistoria"]),
      (lote) =>
        supabase
          .from("sale_documentation_costs")
          .select("id, sale_id")
          .in("id", lote)
    ),
  ]);

  /* As vendas dos custos de documentação, que ainda não vieram. */
  const vendasJaBuscadas = new Set(vendas.map((v) => String(v.id)));
  const vendasDosCustos = await buscarEmLotes<{
    id: string;
    motorcycle_id: string | null;
  }>(
    custos
      .map((c) => String(c.sale_id || ""))
      .filter((id) => id && !vendasJaBuscadas.has(id)),
    (lote) => supabase.from("sales").select("id, motorcycle_id").in("id", lote)
  );

  const motoDaVenda = new Map(
    [...vendas, ...vendasDosCustos].map((v) => [
      String(v.id),
      String(v.motorcycle_id || ""),
    ])
  );
  const motoDoGasto = new Map(
    gastos.map((g) => [String(g.id), String(g.motorcycle_id || "")])
  );
  const vendaDoCusto = new Map(
    custos.map((c) => [String(c.id), String(c.sale_id || "")])
  );

  /* Cada lançamento -> id da moto. */
  const motoDe: Record<string, string> = {};

  for (const t of lancamentos) {
    const origemId = String(t.origem_id || "");
    if (!origemId) continue;

    let motoId = "";

    if (t.origem === "compra_moto") motoId = origemId;
    else if (t.origem === "venda") motoId = motoDaVenda.get(origemId) || "";
    else if (t.origem === "gasto_moto") motoId = motoDoGasto.get(origemId) || "";
    else if (t.origem === "documentacao" || t.origem === "vistoria")
      motoId = motoDaVenda.get(vendaDoCusto.get(origemId) || "") || "";

    if (motoId) motoDe[String(t.id)] = motoId;
  }

  const motos = await buscarEmLotes<{
    id: string;
    marca: string | null;
    modelo: string | null;
    ano_modelo: string | number | null;
    placa: string | null;
  }>(Object.values(motoDe), (lote) =>
    supabase
      .from("motorcycles")
      .select("id, marca, modelo, ano_modelo, placa")
      .in("id", lote)
  );

  const nomes = new Map(motos.map((m) => [String(m.id), nomeDaMoto(m)]));

  const resultado: Record<string, MotoDoLancamento> = {};

  for (const [lancamento, motoId] of Object.entries(motoDe)) {
    const nome = nomes.get(motoId);
    if (nome) resultado[lancamento] = { id: motoId, nome };
  }

  return resultado;
}
