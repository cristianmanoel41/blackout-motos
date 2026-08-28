import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import { formatarData } from "@/lib/formatadores/data";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function hojeSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function adicionarLavagemPadrao(
  formData: FormData
) {
  "use server";

  const motoId =
    String(
      formData.get("motorcycle_id") || ""
    ).trim();

  const data =
    String(
      formData.get("data") || ""
    ).trim();

  const mes =
    String(
      formData.get("mes") || "todos"
    ).trim();

  const baseUrl =
    `/gastos?mes=${encodeURIComponent(
      mes || "todos"
    )}`;

  if (!motoId || !data) {
    redirect(
      `${baseUrl}&lavagem=erro`
    );
  }

  const supabase =
    await createClient();

  const {
    data: lavagemExistente,
    error: buscaError,
  } = await supabase
    .from("motorcycle_expenses")
    .select("id")
    .eq(
      "motorcycle_id",
      motoId
    )
    .ilike(
      "categoria",
      "lavagem"
    )
    .limit(1);

  if (buscaError) {
    console.error(
      "Erro ao verificar lavagem:",
      buscaError
    );

    redirect(
      `${baseUrl}&lavagem=erro`
    );
  }

  if (
    lavagemExistente &&
    lavagemExistente.length > 0
  ) {
    redirect(
      `${baseUrl}&lavagem=existente`
    );
  }

  const { error } =
    await supabase
      .from(
        "motorcycle_expenses"
      )
      .insert({
        motorcycle_id:
          motoId,
        data,
        categoria:
          "Lavagem",
        descricao:
          "Lavagem padrão da moto",
        forma_pagamento:
          "Automático",
        valor: 35,
      });

  if (error) {
    console.error(
      "Erro ao adicionar lavagem padrão:",
      error
    );

    redirect(
      `${baseUrl}&lavagem=erro`
    );
  }

  revalidatePath(
    "/gastos"
  );

  redirect(
    `${baseUrl}&lavagem=adicionada`
  );
}

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
    lavagem?: string;
  }>;
}) {
  const {
    mes: mesSelecionado = "todos",
    lavagem: statusLavagem,
  } = await searchParams;
  const supabase = await createClient();

  const [
    gastosResult,
    motosResult,
  ] = await Promise.all([
    supabase
      .from("motorcycle_expenses")
      .select(`
        *,
        motorcycles (
          id,
          codigo,
          marca,
          modelo,
          placa
        )
      `)
      .order("data", { ascending: false }),
    supabase
      .from("motorcycles")
      .select(
        "id, codigo, marca, modelo, placa, status"
      )
      .in(
        "status",
        [
          "disponivel",
          "reservada",
          "manutencao",
        ]
      )
      .order("codigo", { ascending: true }),
  ]);

  const {
    data: gastos,
    error,
  } = gastosResult;

  const motosDisponiveis =
    motosResult.data ?? [];

  const erroMotos =
    motosResult.error;

  if (erroMotos) {
    console.error(
      "Erro ao carregar motos para lavagem:",
      erroMotos
    );
  }

  /*
   * Consulta original substituída acima para carregar,
   * em paralelo, os gastos e as motos disponíveis.
   */
  /*
  const { data: gastos, error } = await supabase
    .from("motorcycle_expenses")
    .select(`
      *,
      motorcycles (
        id,
        codigo,
        marca,
        modelo,
        placa
      )
    `)
    .order("data", { ascending: false });
  */

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

  const tituloTotal =
    mesSelecionado === "todos"
      ? "Total geral de gastos"
      : "Total de gastos no mês";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dourado">
          Gastos das Motos
        </h1>

        <p className="mt-1 text-sm text-texto-suave">
          Gastos separados por mês e agrupados por moto.
        </p>
      </div>

      {statusLavagem === "adicionada" && (
        <div className="mb-4 rounded-xl border border-green-700 bg-green-950/30 p-4 text-sm text-green-300">
          Lavagem padrão de R$ 35,00 adicionada à moto.
        </div>
      )}

      {statusLavagem === "existente" && (
        <div className="mb-4 rounded-xl border border-yellow-700 bg-yellow-950/30 p-4 text-sm text-yellow-300">
          Esta moto já possui um lançamento de lavagem. Nenhum valor duplicado foi criado.
        </div>
      )}

      {statusLavagem === "erro" && (
        <div className="mb-4 rounded-xl border border-red-700 bg-red-950/30 p-4 text-sm text-red-300">
          Não foi possível adicionar a lavagem padrão. Tente novamente.
        </div>
      )}

      <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(280px,420px)_1fr]">
        <form
          method="get"
          className="rounded-xl border border-grafite-claro bg-grafite p-5"
        >
          <label
            htmlFor="mes"
            className="mb-2 block text-sm font-semibold text-white"
          >
            Selecionar mês
          </label>

          <div className="flex gap-3">
            <select
              id="mes"
              name="mes"
              defaultValue={mesSelecionado}
              className="min-w-0 flex-1 rounded-lg border border-grafite-claro bg-preto px-3 py-2.5 text-sm text-white outline-none focus:border-dourado"
            >
              <option value="todos">Todos os meses</option>

              {mesesDisponiveis.map((mes) => (
                <option key={mes.chave} value={mes.chave}>
                  {mes.titulo}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="rounded-lg bg-dourado px-4 py-2.5 text-sm font-bold text-preto hover:opacity-90"
            >
              Aplicar
            </button>
          </div>
        </form>

        <div className="rounded-xl border border-grafite-claro bg-grafite p-5">
          <p className="text-sm text-texto-suave">
            {tituloTotal}
          </p>

          <p className="mt-1 text-2xl font-bold text-dourado">
            {formatarMoeda(totalGeral)}
          </p>
        </div>
      </div>

      <form
        action={adicionarLavagemPadrao}
        className="mb-6 rounded-xl border border-dourado/30 bg-grafite p-5"
      >
        <div className="mb-4">
          <h2 className="font-semibold text-dourado">
            + Lavagem padrão R$ 35
          </h2>
          <p className="mt-1 text-xs text-texto-suave">
            Use para motos antigas que ainda não possuem o custo da lavagem.
          </p>
        </div>

        <input
          type="hidden"
          name="mes"
          value={
            mesSelecionado
          }
        />

        <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <select
            name="motorcycle_id"
            required
            defaultValue=""
            className="rounded-lg border border-grafite-claro bg-preto px-3 py-2.5 text-sm text-white outline-none focus:border-dourado"
          >
            <option value="" disabled>
              Selecione a moto
            </option>

            {motosDisponiveis.map(
              (moto) => (
                <option
                  key={moto.id}
                  value={moto.id}
                >
                  {[
                    moto.codigo,
                    moto.marca,
                    moto.modelo,
                    moto.placa,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </option>
              )
            )}
          </select>

          <input
            type="date"
            name="data"
            required
            defaultValue={
              hojeSaoPaulo()
            }
            className="rounded-lg border border-grafite-claro bg-preto px-3 py-2.5 text-sm text-white outline-none focus:border-dourado"
          />

          <button
            type="submit"
            className="rounded-lg bg-dourado px-5 py-2.5 text-sm font-bold text-preto hover:opacity-90"
          >
            Adicionar R$ 35
          </button>
        </div>
      </form>

      {gastosFiltrados.length === 0 ? (
        <div className="rounded-xl border border-grafite-claro bg-grafite p-8 text-center text-texto-suave">
          Nenhum gasto registrado para o mês selecionado.
        </div>
      ) : (
        <div className="space-y-8">
          {mesesOrdenados.map((grupoMes) => {
            const motosDoMes = Array.from(
              grupoMes.motos.values()
            ).sort((a, b) =>
              b.ultimaData.localeCompare(a.ultimaData)
            );

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
                      Total do mês
                    </p>
                    <p className="text-xl font-bold text-dourado">
                      {formatarMoeda(grupoMes.total)}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {motosDoMes.map((grupoMoto, indiceMoto) => {
                    const moto = grupoMoto.moto;

                    return (
                      <div
                        key={
                          moto?.id
                            ? `${grupoMes.chave}-${moto.id}`
                            : `${grupoMes.chave}-sem-moto-${indiceMoto}`
                        }
                        className="overflow-hidden rounded-xl border border-grafite-claro bg-grafite"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-grafite-claro bg-preto/70 px-5 py-4">
                          <div>
                            <div className="text-base font-bold text-white">
                              {moto
                                ? `${moto.marca || ""} ${moto.modelo || ""}`.trim()
                                : "Moto não encontrada"}
                            </div>

                            <div className="mt-1 text-xs text-texto-suave">
                              {moto?.codigo || ""}
                              {moto?.placa
                                ? ` · ${moto.placa}`
                                : ""}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-5">
                            <div className="text-right">
                              <p className="text-xs text-texto-suave">
                                Lançamentos
                              </p>
                              <p className="font-bold text-white">
                                {grupoMoto.gastos.length}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-xs text-texto-suave">
                                Total da moto
                              </p>
                              <p className="text-lg font-bold text-dourado">
                                {formatarMoeda(grupoMoto.total)}
                              </p>
                            </div>

                            {moto?.id && (
                              <Link
                                href={`/motos/${moto.id}`}
                                className="rounded-lg border border-dourado/40 px-3 py-2 text-sm font-semibold text-dourado hover:bg-dourado/10"
                              >
                                Ver Moto
                              </Link>
                            )}
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[850px] text-sm">
                            <thead className="border-b border-grafite-claro bg-preto/30">
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
                                    <Link
                                      href={`/gastos/${gasto.id}`}
                                      className="font-semibold text-dourado hover:underline"
                                    >
                                      Editar
                                    </Link>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
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
