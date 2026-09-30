"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import { formatarData } from "@/lib/formatadores/data";
import ExcluirGastoButton from "./ExcluirGastoButton";

/*
 * A lista de gastos, uma moto por linha.
 *
 * Antes a tela era separada por mês, e cada moto aparecia uma
 * vez em cada mês em que teve gasto: para saber quanto uma moto
 * custou, era preciso caçá-la em setembro, em agosto e em
 * julho, somando de cabeça. É isso que fazia "achar a moto" dar
 * trabalho.
 *
 * Agora a moto é a linha, e o mês é filtro - continua dando
 * para ver só setembro, mas a moto não se reparte mais.
 *
 * Tudo filtra enquanto se digita, do lado do navegador. São
 * algumas centenas de lançamentos; mandar tudo de uma vez e
 * peneirar aqui é mais rápido do que ir ao banco a cada letra,
 * e some o botão "Buscar" - que é um passo a mais para quem só
 * queria olhar uma moto.
 */

export type GastoDaMoto = {
  id: string;
  data: string | null;
  /* "2026-09", para o filtro de mês. */
  mes: string;
  categoria: string | null;
  descricao: string | null;
  formaPagamento: string | null;
  valor: number;
};

export type MotoComGastos = {
  /* Nulo quando o gasto perdeu a moto. */
  id: string | null;
  chave: string;
  nome: string;
  /* "MOTO-0027 · ABC1D23 · 2023 · preta" */
  detalhe: string;
  vendida: boolean;
  /* Já sem acento e sem pontuação, montado no servidor. */
  busca: string;
  gastos: GastoDaMoto[];
};

export type Mes = {
  chave: string;
  titulo: string;
};

function semAcento(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export default function ListaDeGastos({
  motos,
  meses,
}: {
  motos: MotoComGastos[];
  meses: Mes[];
}) {
  const [procura, setProcura] = useState("");
  const [mes, setMes] = useState("todos");

  const termo = semAcento(procura);

  /*
   * O que sobra depois dos dois filtros.
   *
   * O mês corta os gastos por dentro de cada moto, e não a moto
   * inteira: moto sem gasto naquele mês simplesmente sai da
   * lista, e o total que aparece é o do mês escolhido.
   */
  const lista = useMemo(() => {
    return motos
      .map((moto) => {
        const gastos =
          mes === "todos"
            ? moto.gastos
            : moto.gastos.filter(
                (gasto) => gasto.mes === mes
              );

        const total = gastos.reduce(
          (soma, gasto) => soma + gasto.valor,
          0
        );

        const ultima = gastos.reduce(
          (maior, gasto) =>
            gasto.data && gasto.data > maior
              ? gasto.data
              : maior,
          ""
        );

        return { ...moto, gastos, total, ultima };
      })
      .filter((moto) => moto.gastos.length > 0)
      .filter(
        (moto) => !termo || moto.busca.includes(termo)
      )
      /* A que mais custou primeiro: ordenar por data deixava a
         moto de 3 mil perdida no meio de lavagens de 35. */
      .sort((a, b) => b.total - a.total);
  }, [motos, mes, termo]);

  const total = lista.reduce(
    (soma, moto) => soma + moto.total,
    0
  );

  const lancamentos = lista.reduce(
    (soma, moto) => soma + moto.gastos.length,
    0
  );

  const tituloMes =
    mes === "todos"
      ? "Todos os meses"
      : meses.find((item) => item.chave === mes)?.titulo ||
        "Mês selecionado";

  return (
    <div>
      <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(520px,1fr)_minmax(360px,0.8fr)]">
        <div className="rounded-xl border border-grafite-claro bg-grafite p-5">
          <div className="grid gap-4 md:grid-cols-[1fr_220px] md:items-end">
            <div>
              <label
                htmlFor="procura"
                className="mb-2 block text-sm font-semibold text-white"
              >
                Achar a moto
              </label>

              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-suave"
                />

                <input
                  id="procura"
                  type="text"
                  value={procura}
                  onChange={(evento) =>
                    setProcura(evento.target.value)
                  }
                  autoComplete="off"
                  placeholder="Modelo, placa, ano, cor ou código"
                  className="w-full rounded-lg border border-grafite-claro bg-preto py-2.5 pl-9 pr-9 text-sm text-white outline-none placeholder:text-texto-suave focus:border-dourado"
                />

                {procura && (
                  <button
                    type="button"
                    onClick={() => setProcura("")}
                    aria-label="Limpar"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-texto-suave hover:text-white"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="mes"
                className="mb-2 block text-sm font-semibold text-white"
              >
                Mês
              </label>

              <select
                id="mes"
                value={mes}
                onChange={(evento) =>
                  setMes(evento.target.value)
                }
                className="w-full rounded-lg border border-grafite-claro bg-preto px-3 py-2.5 text-sm text-white outline-none focus:border-dourado"
              >
                <option value="todos">
                  Todos os meses
                </option>

                {meses.map((item) => (
                  <option key={item.chave} value={item.chave}>
                    {item.titulo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="mt-3 text-xs text-texto-suave">
            {lista.length === 0
              ? "Nenhuma moto encontrada."
              : `${lista.length} ${
                  lista.length === 1
                    ? "moto encontrada"
                    : "motos encontradas"
                }`}
            {procura && ". A busca vale para o mês escolhido."}
          </p>
        </div>

        <div className="rounded-xl border border-dourado/30 bg-grafite p-5">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-white">
                {procura ? "Total do que aparece" : "Gasto no período"}
              </p>

              <p className="mt-1 text-xs text-texto-suave">
                {tituloMes}
              </p>

              <p className="mt-2 text-3xl font-bold text-dourado">
                {formatarMoeda(total)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-right">
              <div className="rounded-lg border border-grafite-claro bg-preto/40 px-4 py-3">
                <p className="text-xs text-texto-suave">
                  Motos
                </p>
                <p className="mt-1 text-lg font-bold text-white">
                  {lista.length}
                </p>
              </div>

              <div className="rounded-lg border border-grafite-claro bg-preto/40 px-4 py-3">
                <p className="text-xs text-texto-suave">
                  Lançamentos
                </p>
                <p className="mt-1 text-lg font-bold text-white">
                  {lancamentos}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {lista.length === 0 ? (
        <div className="rounded-xl border border-grafite-claro bg-grafite p-8 text-center">
          <p className="font-semibold text-white">
            {procura
              ? "Nenhuma moto com esse nome."
              : "Nenhum gasto neste mês."}
          </p>

          <p className="mt-1 text-sm text-texto-suave">
            {procura
              ? "Procure por modelo, placa, ano, cor ou código da moto."
              : "Escolha outro mês ou lance o primeiro gasto."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-grafite-claro bg-grafite">
          <div className="hidden grid-cols-[minmax(0,1.6fr)_150px_170px_44px] items-center gap-4 border-b border-grafite-claro bg-preto/70 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-texto-suave md:grid">
            <span>Moto</span>
            <span>Lançamentos</span>
            <span className="text-right">Custo total</span>
            <span />
          </div>

          {lista.map((moto) => (
            <details
              key={moto.chave}
              className="group border-b border-grafite-claro last:border-b-0"
            >
              <summary className="grid cursor-pointer list-none gap-3 bg-grafite px-5 py-4 transition hover:bg-preto/50 [&::-webkit-details-marker]:hidden md:grid-cols-[minmax(0,1.6fr)_150px_170px_44px] md:items-center md:gap-4">
                <div className="min-w-0">
                  <div className="truncate text-base font-bold text-white">
                    {moto.nome}

                    {moto.vendida && (
                      <span className="ml-2 rounded bg-preto px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-texto-suave">
                        vendida
                      </span>
                    )}
                  </div>

                  {/*
                    * Placa, código, ano e cor na mesma linha do
                    * nome: é o que separa uma CG 160 da outra
                    * CG 160, e antes ficava numa coluna à parte
                    * que o olho não ligava ao nome.
                    */}
                  <div className="truncate text-xs text-texto-suave">
                    {moto.detalhe}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 md:block">
                  <span className="text-xs text-texto-suave md:hidden">
                    Lançamentos
                  </span>

                  <span className="text-sm text-texto-suave">
                    {moto.gastos.length}{" "}
                    {moto.gastos.length === 1
                      ? "gasto"
                      : "gastos"}
                    {moto.ultima && (
                      <span className="block text-xs">
                        último em {formatarData(moto.ultima)}
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 md:block md:text-right">
                  <span className="text-xs text-texto-suave md:hidden">
                    Custo total
                  </span>

                  <span className="text-lg font-bold text-dourado">
                    {formatarMoeda(moto.total)}
                  </span>
                </div>

                <span className="hidden text-center text-lg font-bold text-dourado transition-transform group-open:rotate-180 md:block">
                  ▼
                </span>
              </summary>

              <div className="border-t border-grafite-claro">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <p className="text-xs text-texto-suave">
                    Gastos desta moto
                    {mes !== "todos" && ` em ${tituloMes}`}
                  </p>

                  {moto.id && (
                    <Link
                      href={`/motos/${moto.id}`}
                      className="rounded-lg border border-dourado/40 px-3 py-2 text-xs font-semibold text-dourado hover:bg-dourado/10"
                    >
                      Ver Moto
                    </Link>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-y border-grafite-claro bg-preto/30">
                      <tr className="text-left text-xs uppercase tracking-wide text-texto-suave">
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3">Gasto</th>
                        <th className="px-4 py-3 text-right">
                          Valor
                        </th>
                        <th className="px-4 py-3 text-right">
                          Ação
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {moto.gastos.map((gasto) => (
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
                            <span className="font-medium text-white">
                              {gasto.categoria || "Gasto"}
                            </span>

                            {gasto.descricao && (
                              <span className="block text-xs text-texto-suave">
                                {gasto.descricao}
                                {gasto.formaPagamento
                                  ? ` · ${gasto.formaPagamento}`
                                  : ""}
                              </span>
                            )}
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
                      Custo total desta moto
                      {mes !== "todos" && " no mês"}
                    </p>

                    <p className="text-xl font-bold text-dourado">
                      {formatarMoeda(moto.total)}
                    </p>
                  </div>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
