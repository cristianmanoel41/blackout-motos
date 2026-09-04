import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import { formatarData } from "@/lib/formatadores/data";
import ExcluirGastoButton from "./ExcluirGastoButton";
import NovoGastoBotao from "./NovoGastoBotao";

const NOMES_MESES = [
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

function normalizarBusca(valor: string | null | undefined) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function obterMesAno(data: string | null | undefined) {
  const valor = String(data || "").slice(0, 10);
  const [anoTexto, mesTexto] = valor.split("-");

  const ano = Number(anoTexto);
  const mes = Number(mesTexto);

  if (
    !Number.isInteger(ano) ||
    !Number.isInteger(mes) ||
    mes < 1 ||
    mes > 12
  ) {
    return {
      chave: "sem-data",
      titulo: "Sem data",
      ordem: "0000-00",
    };
  }

  return {
    chave: `${anoTexto}-${mesTexto}`,
    titulo: `${NOMES_MESES[mes - 1]} de ${ano}`,
    ordem: `${anoTexto}-${mesTexto}`,
  };
}

export default async function GastosMotosPage({
  searchParams,
}: {
  searchParams: Promise<{
    mes?: string;
    q?: string;
  }>;
}) {
  const {
    mes: mesSelecionado = "todos",
    q: busca = "",
  } = await searchParams;

  const termoBusca = normalizarBusca(busca);
  const supabase = await createClient();

  const { data: gastos, error } = await supabase
    .from("motorcycle_expenses")
    .select(`
      *,
      motorcycles (
        id,
        codigo,
        marca,
        modelo,
        versao,
        placa,
        ano_modelo,
        cor
      )
    `)
    .order("data", { ascending: false });

  /*
   * Motos que ainda estão na loja primeiro: gasto de moto
   * vendida existe, mas é exceção.
   */
  const { data: motosParaGasto } = await supabase
    .from("motorcycles")
    .select("id, codigo, marca, modelo, placa, status")
    .order("status", { ascending: true })
    .order("codigo", { ascending: false });

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-700 bg-red-950/30 p-4 text-red-300">
          Erro ao carregar gastos: {error.message}
        </div>
      </div>
    );
  }

  const mesesDisponiveisMap = new Map<
    string,
    { chave: string; titulo: string; ordem: string }
  >();

  for (const gasto of gastos ?? []) {
    const mesInfo = obterMesAno(gasto.data);
    if (!mesesDisponiveisMap.has(mesInfo.chave)) {
      mesesDisponiveisMap.set(mesInfo.chave, mesInfo);
    }
  }

  const mesesDisponiveis = Array.from(
    mesesDisponiveisMap.values()
  ).sort((a, b) => b.ordem.localeCompare(a.ordem));

  const gastosFiltrados =
    mesSelecionado === "todos"
      ? gastos ?? []
      : (gastos ?? []).filter(
          (gasto) => obterMesAno(gasto.data).chave === mesSelecionado
        );

  const totalGeral = gastosFiltrados.reduce(
    (soma, gasto) => soma + Number(gasto.valor || 0),
    0
  );

  const motosComGastoNoPeriodo = new Set(
    gastosFiltrados
      .map((gasto) => gasto.motorcycles?.id)
      .filter(Boolean)
      .map(String)
  ).size;

  const quantidadeLancamentos =
    gastosFiltrados.length;

  const tituloMesSelecionado =
    mesSelecionado === "todos"
      ? "Todos os meses"
      : mesesDisponiveis.find(
          (mes) =>
            mes.chave ===
            mesSelecionado
        )?.titulo ||
        "Mês selecionado";

  const meses = new Map<
    string,
    {
      chave: string;
      titulo: string;
      ordem: string;
      total: number;
      motos: Map<
        string,
        {
          moto: any;
          gastos: any[];
          total: number;
          ultimaData: string;
        }
      >;
    }
  >();

  for (const gasto of gastosFiltrados) {
    const mesInfo = obterMesAno(gasto.data);

    if (!meses.has(mesInfo.chave)) {
      meses.set(mesInfo.chave, {
        ...mesInfo,
        total: 0,
        motos: new Map(),
      });
    }

    const grupoMes = meses.get(mesInfo.chave)!;
    const moto = gasto.motorcycles;
    const chaveMoto = moto?.id
      ? String(moto.id)
      : `sem-moto-${gasto.id}`;

    if (!grupoMes.motos.has(chaveMoto)) {
      grupoMes.motos.set(chaveMoto, {
        moto,
        gastos: [],
        total: 0,
        ultimaData: gasto.data || "",
      });
    }

    const grupoMoto = grupoMes.motos.get(chaveMoto)!;
    const valor = Number(gasto.valor || 0);

    grupoMoto.gastos.push(gasto);
    grupoMoto.total += valor;
    grupoMes.total += valor;

    if (
      gasto.data &&
      (!grupoMoto.ultimaData || gasto.data > grupoMoto.ultimaData)
    ) {
      grupoMoto.ultimaData = gasto.data;
    }
  }

  const mesesOrdenados = Array.from(meses.values()).sort((a, b) =>
    b.ordem.localeCompare(a.ordem)
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dourado">
            Gastos das Motos
          </h1>

          <p className="mt-1 text-sm text-texto-suave">
            Gastos separados por mês e agrupados por moto.
          </p>
        </div>

        <NovoGastoBotao
          motos={motosParaGasto || []}
        />
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(520px,1fr)_minmax(360px,0.8fr)]">
        <form
          method="get"
          className="rounded-xl border border-grafite-claro bg-grafite p-5"
        >
          <div className="grid gap-4 md:grid-cols-[220px_1fr_auto] md:items-end">
            <div>
              <label
                htmlFor="mes"
                className="mb-2 block text-sm font-semibold text-white"
              >
                Selecionar mês
              </label>

              <select
                id="mes"
                name="mes"
                defaultValue={mesSelecionado}
                className="w-full rounded-lg border border-grafite-claro bg-preto px-3 py-2.5 text-sm text-white outline-none focus:border-dourado"
              >
                <option value="todos">Todos os meses</option>

                {mesesDisponiveis.map((mes) => (
                  <option
                    key={mes.chave}
                    value={mes.chave}
                  >
                    {mes.titulo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="q"
                className="mb-2 block text-sm font-semibold text-white"
              >
                Pesquisar moto
              </label>

              <input
                id="q"
                name="q"
                type="search"
                defaultValue={busca}
                placeholder="Modelo, placa, marca, versão, ano, cor ou ID"
                className="w-full rounded-lg border border-grafite-claro bg-preto px-3 py-2.5 text-sm text-white outline-none placeholder:text-texto-suave focus:border-dourado"
              />
            </div>

            <button
              type="submit"
              className="rounded-lg bg-dourado px-5 py-2.5 text-sm font-bold text-preto hover:opacity-90"
            >
              Buscar
            </button>
          </div>

          {termoBusca && (
            <div className="mt-3 flex items-center justify-between gap-3 text-xs">
              <span className="text-texto-suave">
                Pesquisa ativa: <strong className="text-white">{busca}</strong>
              </span>

              <Link
                href={`/gastos?mes=${encodeURIComponent(mesSelecionado)}`}
                className="font-semibold text-dourado hover:underline"
              >
                Limpar pesquisa
              </Link>
            </div>
          )}
        </form>

        <div className="rounded-xl border border-dourado/30 bg-grafite p-5">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-white">
                Gasto mensal
              </p>

              <p className="mt-1 text-xs text-texto-suave">
                {tituloMesSelecionado}
              </p>

              <p className="mt-2 text-3xl font-bold text-dourado">
                {formatarMoeda(totalGeral)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-right">
              <div className="rounded-lg border border-grafite-claro bg-preto/40 px-4 py-3">
                <p className="text-xs text-texto-suave">
                  Motos
                </p>
                <p className="mt-1 text-lg font-bold text-white">
                  {motosComGastoNoPeriodo}
                </p>
              </div>

              <div className="rounded-lg border border-grafite-claro bg-preto/40 px-4 py-3">
                <p className="text-xs text-texto-suave">
                  Lançamentos
                </p>
                <p className="mt-1 text-lg font-bold text-white">
                  {quantidadeLancamentos}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {gastosFiltrados.length === 0 ? (
        <div className="rounded-xl border border-grafite-claro bg-grafite p-8 text-center text-texto-suave">
          Nenhum gasto registrado para o mês selecionado.
        </div>
      ) : termoBusca &&
        !mesesOrdenados.some((grupoMes) =>
          Array.from(grupoMes.motos.values()).some((grupoMoto) => {
            const moto = grupoMoto.moto;
            const textoMoto = normalizarBusca(
              [
                moto?.codigo,
                moto?.marca,
                moto?.modelo,
                moto?.versao,
                moto?.placa,
                moto?.ano_modelo,
                moto?.cor,
              ]
                .filter(Boolean)
                .join(" ")
            );

            return textoMoto.includes(termoBusca);
          })
        ) ? (
        <div className="rounded-xl border border-grafite-claro bg-grafite p-8 text-center">
          <p className="font-semibold text-white">
            Nenhuma moto encontrada.
          </p>
          <p className="mt-1 text-sm text-texto-suave">
            Tente pesquisar por modelo, placa, marca, versão, ano, cor ou ID da moto.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {mesesOrdenados.map((grupoMes) => {
            const motosDoMes = Array.from(
              grupoMes.motos.values()
            )
              .filter((grupoMoto) => {
                if (!termoBusca) return true;

                const moto = grupoMoto.moto;
                const textoMoto = normalizarBusca(
                  [
                    moto?.codigo,
                    moto?.marca,
                    moto?.modelo,
                    moto?.versao,
                    moto?.placa,
                    moto?.ano_modelo,
                    moto?.cor,
                  ]
                    .filter(Boolean)
                    .join(" ")
                );

                return textoMoto.includes(termoBusca);
              })
              .sort((a, b) =>
                b.ultimaData.localeCompare(a.ultimaData)
              );

            const totalExibido = motosDoMes.reduce(
              (soma, grupoMoto) => soma + grupoMoto.total,
              0
            );

            if (termoBusca && motosDoMes.length === 0) {
              return null;
            }

            return (
              <section key={grupoMes.chave}>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3 rounded-xl border border-grafite-claro bg-preto px-5 py-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {grupoMes.titulo}
                    </h2>
                    <p className="mt-1 text-sm text-texto-suave">
                      {motosDoMes.length}{" "}
                      {motosDoMes.length === 1 ? "moto" : "motos"} com gastos
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-texto-suave">
                      {termoBusca ? "Total exibido" : "Total do mês"}
                    </p>
                    <p className="text-xl font-bold text-dourado">
                      {formatarMoeda(termoBusca ? totalExibido : grupoMes.total)}
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-grafite-claro bg-grafite">
                  <div className="hidden grid-cols-[minmax(0,1.5fr)_160px_180px_44px] items-center gap-4 border-b border-grafite-claro bg-preto/70 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-texto-suave md:grid">
                    <span>Moto</span>
                    <span>Placa / ID</span>
                    <span className="text-right">Custo total</span>
                    <span />
                  </div>

                  {motosDoMes.map((grupoMoto, indiceMoto) => {
                    const moto = grupoMoto.moto;

                    return (
                      <details
                        key={
                          moto?.id
                            ? `${grupoMes.chave}-${moto.id}`
                            : `${grupoMes.chave}-sem-moto-${indiceMoto}`
                        }
                        className="group border-b border-grafite-claro last:border-b-0"
                      >
                        <summary className="grid cursor-pointer list-none gap-3 bg-grafite px-5 py-4 transition hover:bg-preto/50 [&::-webkit-details-marker]:hidden md:grid-cols-[minmax(0,1.5fr)_160px_180px_44px] md:items-center md:gap-4">
                          <div className="min-w-0">
                            <div className="truncate text-base font-bold text-white">
                              {moto
                                ? `${moto.marca || ""} ${moto.modelo || ""}`.trim()
                                : "Moto não encontrada"}
                            </div>
                          </div>

                          <div className="text-sm text-texto-suave">
                            <span className="md:hidden">Placa / ID: </span>
                            {moto?.placa || moto?.codigo || "—"}
                            {moto?.placa && moto?.codigo
                              ? ` · ${moto.codigo}`
                              : ""}
                          </div>

                          <div className="flex items-center justify-between gap-3 md:block md:text-right">
                            <span className="text-xs text-texto-suave md:hidden">
                              Custo total
                            </span>
                            <span className="text-lg font-bold text-dourado">
                              {formatarMoeda(grupoMoto.total)}
                            </span>
                          </div>

                          <span className="hidden text-center text-lg font-bold text-dourado transition-transform group-open:rotate-180 md:block">
                            ▼
                          </span>
                        </summary>

                        <div className="border-t border-grafite-claro">
                          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                            <p className="text-xs text-texto-suave">
                              Detalhamento dos gastos desta moto
                            </p>

                            {moto?.id && (
                              <Link
                                href={`/motos/${moto.id}`}
                                className="rounded-lg border border-dourado/40 px-3 py-2 text-xs font-semibold text-dourado hover:bg-dourado/10"
                              >
                                Ver Moto
                              </Link>
                            )}
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[850px] text-sm">
                              <thead className="border-y border-grafite-claro bg-preto/30">
                                <tr className="text-left text-xs uppercase tracking-wide text-texto-suave">
                                  <th className="px-4 py-3">Data</th>
                                  <th className="px-4 py-3">Categoria</th>
                                  <th className="px-4 py-3">Descrição</th>
                                  <th className="px-4 py-3">Pagamento</th>
                                  <th className="px-4 py-3 text-right">Valor</th>
                                  <th className="px-4 py-3 text-right">Ação</th>
                                </tr>
                              </thead>

                              <tbody>
                                {grupoMoto.gastos.map((gasto) => (
                                  <tr
                                    key={gasto.id}
                                    className="border-b border-grafite-claro last:border-b-0"
                                  >
                                    <td className="whitespace-nowrap px-4 py-3">
                                      {gasto.data
                                        ? formatarData(gasto.data)
                                        : "—"}
                                    </td>

                                    <td className="px-4 py-3">
                                      {gasto.categoria || "—"}
                                    </td>

                                    <td className="px-4 py-3">
                                      {gasto.descricao || "—"}
                                    </td>

                                    <td className="px-4 py-3">
                                      {gasto.forma_pagamento || "—"}
                                    </td>

                                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-dourado">
                                      {formatarMoeda(gasto.valor)}
                                    </td>

                                    <td className="px-4 py-3 text-right">
                                      <div className="flex items-center justify-end gap-3">
                                        <Link
                                          href={`/gastos/${gasto.id}`}
                                          className="font-semibold text-dourado hover:underline"
                                        >
                                          Editar
                                        </Link>

                                        <ExcluirGastoButton
                                          gastoId={String(gasto.id)}
                                          descricao={
                                            gasto.descricao ||
                                            gasto.categoria ||
                                            "este lançamento"
                                          }
                                        />
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex justify-end border-t border-grafite-claro bg-preto/30 px-5 py-4">
                            <div className="text-right">
                              <p className="text-xs text-texto-suave">
                                Custo total desta moto no mês
                              </p>
                              <p className="text-xl font-bold text-dourado">
                                {formatarMoeda(grupoMoto.total)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </details>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
