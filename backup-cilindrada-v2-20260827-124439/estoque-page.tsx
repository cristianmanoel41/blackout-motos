"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Plus,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatarMoeda } from "@/lib/formatadores/moeda";

const supabase = createClient();
const ITENS_POR_PAGINA = 12;

type Moto = {
  id: string | number;
  codigo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  versao?: string | null;
  ano_fabricacao?: number | string | null;
  ano_modelo?: number | string | null;
  cor?: string | null;
  placa?: string | null;
  quilometragem?: number | string | null;
  preco_anunciado?: number | string | null;
  status?: string | null;
  data_entrada?: string | null;
  tipo_entrada?: string | null;
};

function normalizarTexto(valor: unknown) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatarKm(valor: unknown) {
  const numero = Number(valor || 0);
  if (!Number.isFinite(numero)) return "0";
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(numero);
}

function formatarData(valor?: string | null) {
  if (!valor) return "—";
  const partes = valor.split("-");
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return valor;
}

function rotuloStatus(status?: string | null) {
  switch (normalizarTexto(status)) {
    case "disponivel":
      return "Disponível";
    case "reservada":
      return "Reservada";
    case "manutencao":
      return "Em manutenção";
    case "vendida":
      return "Vendida";
    default:
      return status || "Não informado";
  }
}

function classeStatus(status?: string | null) {
  switch (normalizarTexto(status)) {
    case "disponivel":
      return "border-green-700/60 bg-green-950/45 text-green-300";
    case "reservada":
      return "border-blue-700/60 bg-blue-950/45 text-blue-300";
    case "manutencao":
      return "border-orange-700/60 bg-orange-950/45 text-orange-300";
    case "vendida":
      return "border-indigo-700/60 bg-indigo-950/45 text-indigo-300";
    default:
      return "border-zinc-700 bg-zinc-900 text-zinc-300";
  }
}

function paginasVisiveis(paginaAtual: number, totalPaginas: number) {
  if (totalPaginas <= 7) {
    return Array.from({ length: totalPaginas }, (_, i) => i + 1);
  }

  const paginas: Array<number | "..."> = [1];
  const inicio = Math.max(2, paginaAtual - 1);
  const fim = Math.min(totalPaginas - 1, paginaAtual + 1);

  if (inicio > 2) paginas.push("...");
  for (let pagina = inicio; pagina <= fim; pagina += 1) {
    paginas.push(pagina);
  }
  if (fim < totalPaginas - 1) paginas.push("...");
  paginas.push(totalPaginas);
  return paginas;
}

export default function EstoquePage() {
  const [motos, setMotos] = useState<Moto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");
  const [marca, setMarca] = useState("todas");
  const [ano, setAno] = useState("todos");
  const [pagina, setPagina] = useState(1);

  async function carregarEstoque() {
    setCarregando(true);
    setErro("");

    const { data, error } = await supabase
      .from("motorcycles")
      .select(
        [
          "id",
          "codigo",
          "marca",
          "modelo",
          "versao",
          "ano_fabricacao",
          "ano_modelo",
          "cor",
          "placa",
          "quilometragem",
          "preco_anunciado",
          "status",
          "data_entrada",
          "tipo_entrada",
        ].join(",")
      )
      .order("data_entrada", {
        ascending: false,
        nullsFirst: false,
      });

    if (error) {
      console.error(error);
      setErro("Não foi possível carregar o estoque.");
      setMotos([]);
      setCarregando(false);
      return;
    }

    setMotos((data || []) as unknown as Moto[]);
    setCarregando(false);
  }

  useEffect(() => {
    carregarEstoque();
  }, []);

  const marcas = useMemo(() => {
    const valores = new Set<string>();
    for (const moto of motos) {
      const valor = String(moto.marca || "").trim();
      if (valor) valores.add(valor);
    }
    return Array.from(valores).sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    );
  }, [motos]);

  const anos = useMemo(() => {
    const valores = new Set<string>();
    for (const moto of motos) {
      const valor = String(
        moto.ano_modelo || moto.ano_fabricacao || ""
      ).trim();
      if (valor) valores.add(valor);
    }
    return Array.from(valores).sort(
      (a, b) => Number(b) - Number(a)
    );
  }, [motos]);

  const motosFiltradas = useMemo(() => {
    const termos = normalizarTexto(busca)
      .split(/\s+/)
      .filter(Boolean);

    return motos.filter((moto) => {
      const texto = normalizarTexto(
        [
          moto.codigo,
          moto.marca,
          moto.modelo,
          moto.versao,
          moto.cor,
          moto.placa,
          moto.ano_fabricacao,
          moto.ano_modelo,
        ]
          .filter(Boolean)
          .join(" ")
      );

      const passouBusca =
        termos.length === 0 ||
        termos.every((termo) => texto.includes(termo));

      const passouStatus =
        status === "todos" ||
        normalizarTexto(moto.status) === status;

      const passouMarca =
        marca === "todas" ||
        normalizarTexto(moto.marca) === normalizarTexto(marca);

      const anoMoto = String(
        moto.ano_modelo || moto.ano_fabricacao || ""
      );
      const passouAno = ano === "todos" || anoMoto === ano;

      return passouBusca && passouStatus && passouMarca && passouAno;
    });
  }, [motos, busca, status, marca, ano]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(motosFiltradas.length / ITENS_POR_PAGINA)
  );

  useEffect(() => {
    setPagina(1);
  }, [busca, status, marca, ano]);

  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas);
  }, [pagina, totalPaginas]);

  const inicio = (pagina - 1) * ITENS_POR_PAGINA;
  const fim = Math.min(
    inicio + ITENS_POR_PAGINA,
    motosFiltradas.length
  );
  const motosDaPagina = motosFiltradas.slice(inicio, fim);

  const temFiltros =
    busca.trim() !== "" ||
    status !== "todos" ||
    marca !== "todas" ||
    ano !== "todos";

  function limparFiltros() {
    setBusca("");
    setStatus("todos");
    setMarca("todas");
    setAno("todos");
    setPagina(1);
  }

  return (
    <main className="min-h-screen bg-preto text-texto">
      <div className="mx-auto w-full max-w-[1700px] p-4 md:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-dourado md:text-3xl">
              Estoque
            </h1>
            <p className="mt-1 text-sm text-texto-suave">
              Visualização em lista para acompanhar muitas motos de uma vez.
            </p>
          </div>

          <Link
            href="/motos/nova"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-dourado px-5 py-3 font-bold text-preto transition hover:bg-dourado-claro"
          >
            <Plus size={18} />
            Cadastrar Moto
          </Link>
        </div>

        <section className="mb-4 rounded-2xl border border-grafite-claro bg-grafite p-3 md:p-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(280px,1.6fr)_180px_200px_150px_auto]">
            <label className="relative block">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-texto-suave"
              />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Procurar por marca, modelo, cor, placa, ano ou código..."
                className="w-full rounded-xl border border-grafite-claro bg-preto py-3 pl-11 pr-4 text-sm text-texto outline-none transition placeholder:text-zinc-600 focus:border-dourado"
              />
            </label>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl border border-grafite-claro bg-preto px-4 py-3 text-sm text-texto outline-none focus:border-dourado"
            >
              <option value="todos">Status: Todos</option>
              <option value="disponivel">Disponível</option>
              <option value="reservada">Reservada</option>
              <option value="manutencao">Em manutenção</option>
              <option value="vendida">Vendida</option>
            </select>

            <select
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              className="rounded-xl border border-grafite-claro bg-preto px-4 py-3 text-sm text-texto outline-none focus:border-dourado"
            >
              <option value="todas">Marca: Todas</option>
              {marcas.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={ano}
              onChange={(e) => setAno(e.target.value)}
              className="rounded-xl border border-grafite-claro bg-preto px-4 py-3 text-sm text-texto outline-none focus:border-dourado"
            >
              <option value="todos">Ano: Todos</option>
              {anos.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={limparFiltros}
              disabled={!temFiltros}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-dourado/50 px-4 py-3 text-sm font-semibold text-dourado transition hover:bg-dourado/10 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-600"
            >
              {temFiltros ? <X size={17} /> : <SlidersHorizontal size={17} />}
              Limpar filtros
            </button>
          </div>
        </section>

        {erro && (
          <div className="mb-4 rounded-xl border border-red-800 bg-red-950/30 p-4 text-sm text-red-300">
            {erro}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-grafite-claro bg-grafite">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] border-collapse">
              <thead>
                <tr className="border-b border-grafite-claro bg-preto/60 text-left text-[11px] uppercase tracking-wide text-texto-suave">
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Modelo</th>
                  <th className="px-4 py-3 font-semibold">Marca</th>
                  <th className="px-4 py-3 font-semibold">Ano</th>
                  <th className="px-4 py-3 font-semibold">Cor</th>
                  <th className="px-4 py-3 font-semibold">Placa</th>
                  <th className="px-4 py-3 text-right font-semibold">KM</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Valor anunciado
                  </th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Data entrada</th>
                  <th className="px-4 py-3 text-center font-semibold">Ações</th>
                </tr>
              </thead>

              <tbody>
                {carregando ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-16 text-center text-sm text-texto-suave"
                    >
                      Carregando estoque...
                    </td>
                  </tr>
                ) : motosDaPagina.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-16 text-center">
                      <p className="font-semibold text-texto">
                        Nenhuma moto encontrada.
                      </p>
                      <p className="mt-1 text-sm text-texto-suave">
                        Tente limpar ou alterar os filtros.
                      </p>
                    </td>
                  </tr>
                ) : (
                  motosDaPagina.map((moto) => {
                    const disponivel =
                      normalizarTexto(moto.status) === "disponivel";
                    const anoFab = moto.ano_fabricacao || "—";
                    const anoMod = moto.ano_modelo || "—";

                    return (
                      <tr
                        key={String(moto.id)}
                        className="border-b border-grafite-claro/70 transition last:border-b-0 hover:bg-white/[0.025]"
                      >
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="font-mono text-xs font-semibold text-dourado">
                            {moto.codigo || `#${moto.id}`}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="min-w-[180px]">
                            <p className="font-semibold text-white">
                              {moto.modelo || "Sem modelo"}
                            </p>
                            {moto.versao && (
                              <p className="mt-0.5 text-xs text-texto-suave">
                                {moto.versao}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-300">
                          {moto.marca || "—"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-300">
                          {anoFab}/{anoMod}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-300">
                          {moto.cor || "—"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-zinc-200">
                          {moto.placa || "—"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-zinc-300">
                          {formatarKm(moto.quilometragem)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-dourado">
                          {formatarMoeda(Number(moto.preco_anunciado || 0))}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${classeStatus(
                              moto.status
                            )}`}
                          >
                            {rotuloStatus(moto.status)}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-300">
                          {formatarData(moto.data_entrada)}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              href={`/motos/${moto.id}`}
                              title="Ver moto"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-grafite-claro bg-preto text-zinc-300 transition hover:border-dourado hover:text-dourado"
                            >
                              <Eye size={16} />
                            </Link>

                            {disponivel && (
                              <Link
                                href={`/vendas?moto=${encodeURIComponent(
                                  String(moto.id)
                                )}`}
                                title="Vender moto"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-dourado/60 bg-dourado/10 text-dourado transition hover:bg-dourado hover:text-preto"
                              >
                                <ShoppingCart size={16} />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4 border-t border-grafite-claro bg-preto/40 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm text-texto-suave">
              {motosFiltradas.length === 0
                ? "Nenhuma moto para exibir"
                : `Mostrando ${inicio + 1} a ${fim} de ${motosFiltradas.length} ${
                    motosFiltradas.length === 1 ? "moto" : "motos"
                  }`}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setPagina((atual) => Math.max(1, atual - 1))
                }
                disabled={pagina <= 1}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-grafite-claro px-3 text-sm font-semibold text-zinc-300 transition hover:border-dourado hover:text-dourado disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft size={17} />
                Anterior
              </button>

              {paginasVisiveis(pagina, totalPaginas).map((item, index) =>
                item === "..." ? (
                  <span
                    key={`reticencias-${index}`}
                    className="inline-flex h-10 w-8 items-center justify-center text-zinc-500"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPagina(item)}
                    className={`h-10 min-w-10 rounded-lg border px-3 text-sm font-bold transition ${
                      pagina === item
                        ? "border-dourado bg-dourado text-preto"
                        : "border-grafite-claro text-zinc-300 hover:border-dourado hover:text-dourado"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={() =>
                  setPagina((atual) =>
                    Math.min(totalPaginas, atual + 1)
                  )
                }
                disabled={pagina >= totalPaginas}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-grafite-claro px-3 text-sm font-semibold text-zinc-300 transition hover:border-dourado hover:text-dourado disabled:cursor-not-allowed disabled:opacity-30"
              >
                Próximo
                <ChevronRight size={17} />
              </button>
            </div>

            <div className="text-right text-xs text-zinc-500">
              {ITENS_POR_PAGINA} por página
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
