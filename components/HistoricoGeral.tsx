"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import { BotaoWhatsapp } from "@/components/CardWhatsapp";
import {
  Bike,
  FileText,
  HardHat,
  Pencil,
  Search,
} from "lucide-react";

export type RegistroHistorico = {
  id: string;
  tipo: "moto" | "capacete";
  data: string;
  hora: string | null;
  /* Quando a venda foi cadastrada no sistema. */
  registradoEm?: string | null;
  titulo: string;
  detalhe: string;
  cliente: string;
  contato: string;
  telefone: string | null;
  vendedor: string;
  valor: number;
  pagamento: string;
  observacaoPagamento: string;
  extra: string;
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

const filtros = [
  { chave: "todos", nome: "Todas" },
  { chave: "moto", nome: "Motos" },
  { chave: "capacete", nome: "Capacetes" },
] as const;

type Filtro = (typeof filtros)[number]["chave"];

function dataBrasil(data: string | null | undefined) {
  if (!data) return "-";

  const [ano, mes, dia] = data.split("-");

  if (!ano || !mes || !dia) return data;

  return `${dia}/${mes}/${ano}`;
}

function normalizar(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function HistoricoGeral({
  ordemInicial = "venda",
  registros,
}: {
  registros: RegistroHistorico[];
  ordemInicial?: "venda" | "registro";
}) {
  const [filtro, setFiltro] = useState<Filtro>("todos");

  /*
   * A lista inteira cresce todo mês e vira uma rolagem sem
   * fim. O normal é olhar um mês por vez - o mês corrente,
   * quase sempre.
   */
  const hoje = new Date();

  const [mes, setMes] = useState(
    hoje.getMonth() + 1
  );

  const [ano, setAno] = useState(
    hoje.getFullYear()
  );

  const [periodoTodo, setPeriodoTodo] =
    useState(false);

  /*
   * Duas leituras da mesma lista: por data da venda, que e
   * como o mes fecha, e por ordem de cadastro, que e como
   * se confere o que acabou de ser lancado.
   */
  const [ordem, setOrdem] = useState<
    "venda" | "registro"
  >(ordemInicial);
  const [busca, setBusca] = useState("");

  const doPeriodo = useMemo(() => {
    if (periodoTodo) return registros;

    const prefixo = `${ano}-${String(mes).padStart(
      2,
      "0"
    )}`;

    return registros.filter((registro) =>
      String(registro.data || "").startsWith(prefixo)
    );
  }, [registros, mes, ano, periodoTodo]);

  const filtrados = useMemo(() => {
    const termo = normalizar(busca);

    return doPeriodo.filter((registro) => {
      const passouTipo =
        filtro === "todos" || registro.tipo === filtro;

      if (!passouTipo) return false;

      if (!termo) return true;

      return normalizar(
        [
          registro.titulo,
          registro.detalhe,
          registro.cliente,
          registro.contato,
          registro.vendedor,
          registro.pagamento,
        ].join(" ")
      ).includes(termo);
    });
  }, [doPeriodo, filtro, busca]);

  /*
   * As vendas ja chegam da mais recente para a mais antiga.
   * Aqui elas so ganham uma faixa a cada virada de mes, com
   * quantas foram e quanto somaram - o mes vira um bloco em
   * vez de uma lista continua.
   */
  const grupos = useMemo(() => {
    const meses: Array<{
      chave: string;
      titulo: string;
      itens: typeof filtrados;
      total: number;
    }> = [];

    /*
     * Na ordem de cadastro nao faz sentido quebrar por mes:
     * a lista vira uma so, do que foi lancado por ultimo para
     * o mais antigo.
     */
    if (ordem === "registro") {
      const porRegistro = [...filtrados].sort((a, b) =>
        String(b.registradoEm || "").localeCompare(
          String(a.registradoEm || "")
        )
      );

      return [
        {
          chave: "registro",
          titulo: "Por ordem de cadastro",
          itens: porRegistro,
          total: porRegistro.reduce(
            (soma, item) =>
              soma + (Number(item.valor) || 0),
            0
          ),
        },
      ];
    }

    filtrados.forEach((registro) => {
      const chave = String(registro.data || "").slice(0, 7);

      let grupo = meses.find(
        (item) => item.chave === chave
      );

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

      grupo.itens.push(registro);
      grupo.total += Number(registro.valor) || 0;
    });

    return meses;
  }, [filtrados, ordem]);

  const totais = useMemo(() => {
    return doPeriodo.reduce(
      (resumo, registro) => {
        const chave =
          registro.tipo === "moto" ? "motos" : "capacetes";

        return {
          ...resumo,
          geral: resumo.geral + registro.valor,
          [chave]: resumo[chave] + registro.valor,
          [`qtd_${chave}`]: resumo[`qtd_${chave}`] + 1,
        };
      },
      {
        geral: 0,
        motos: 0,
        capacetes: 0,
        qtd_motos: 0,
        qtd_capacetes: 0,
      } as Record<string, number>
    );
  }, [doPeriodo]);

  const totalFiltrado = filtrados.reduce(
    (soma, registro) => soma + registro.valor,
    0
  );

  return (
    <div className="w-full">
      {/* NÚMEROS */}

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-grafite-claro bg-grafite p-4">
          <p className="text-xs text-texto-suave">
            Total vendido
          </p>

          <p className="mt-1 text-2xl font-bold text-dourado">
            {formatarMoeda(totais.geral)}
          </p>

          <p className="mt-1 text-xs text-texto-suave">
            {doPeriodo.length} venda
            {doPeriodo.length === 1 ? "" : "s"}{" "}
            {periodoTodo
              ? "no total"
              : `em ${nomesMeses[mes - 1]}`}
          </p>
        </div>

        <div className="rounded-xl border border-grafite-claro bg-grafite p-4">
          <p className="flex items-center gap-2 text-xs text-texto-suave">
            <Bike size={14} />
            Motos
          </p>

          <p className="mt-1 text-2xl font-bold text-texto">
            {formatarMoeda(totais.motos)}
          </p>

          <p className="mt-1 text-xs text-texto-suave">
            {totais.qtd_motos} venda
            {totais.qtd_motos === 1 ? "" : "s"}
          </p>
        </div>

        <div className="rounded-xl border border-grafite-claro bg-grafite p-4">
          <p className="flex items-center gap-2 text-xs text-texto-suave">
            <HardHat size={14} />
            Capacetes (venda de balcão)
          </p>

          <p className="mt-1 text-2xl font-bold text-texto">
            {formatarMoeda(totais.capacetes)}
          </p>

          <p className="mt-1 text-xs text-texto-suave">
            {totais.qtd_capacetes} venda
            {totais.qtd_capacetes === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {/* FILTROS */}

      {/* PERÍODO */}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={mes}
          onChange={(e) => {
            setMes(Number(e.target.value));
            setPeriodoTodo(false);
          }}
          disabled={periodoTodo}
          className="rounded-lg border border-grafite-claro bg-grafite px-3 py-2 text-sm text-texto outline-none transition focus:border-dourado disabled:opacity-50"
        >
          {nomesMeses.map((nome, indice) => (
            <option key={nome} value={indice + 1}>
              {nome}
            </option>
          ))}
        </select>

        <select
          value={ano}
          onChange={(e) => {
            setAno(Number(e.target.value));
            setPeriodoTodo(false);
          }}
          disabled={periodoTodo}
          className="rounded-lg border border-grafite-claro bg-grafite px-3 py-2 text-sm text-texto outline-none transition focus:border-dourado disabled:opacity-50"
        >
          {Array.from(
            { length: 5 },
            (_, i) => hoje.getFullYear() - i
          ).map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() =>
            setPeriodoTodo((atual) => !atual)
          }
          className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
            periodoTodo
              ? "border-dourado bg-dourado text-preto"
              : "border-grafite-claro text-texto-suave hover:border-dourado hover:text-dourado"
          }`}
        >
          Todos os meses
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {filtros.map((item) => {
            const ativo = filtro === item.chave;

            return (
              <button
                key={item.chave}
                type="button"
                onClick={() => setFiltro(item.chave)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  ativo
                    ? "bg-dourado text-preto"
                    : "border border-grafite-claro text-texto-suave hover:border-dourado hover:text-dourado"
                }`}
              >
                {item.nome}
              </button>
            );
          })}

          <span className="mx-1 hidden w-px self-stretch bg-grafite-claro sm:block" />

          {(
            [
              { chave: "venda", nome: "Por data da venda" },
              { chave: "registro", nome: "Por ordem de cadastro" },
            ] as const
          ).map((item) => (
            <button
              key={item.chave}
              type="button"
              onClick={() => setOrdem(item.chave)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                ordem === item.chave
                  ? "bg-dourado text-preto"
                  : "border border-grafite-claro text-texto-suave hover:border-dourado hover:text-dourado"
              }`}
            >
              {item.nome}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:max-w-sm">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-texto-suave"
          />

          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por cliente, produto, placa ou vendedor"
            className="w-full rounded-lg border border-grafite-claro bg-grafite py-2.5 pl-10 pr-4 text-sm text-texto outline-none transition focus:border-dourado"
          />
        </div>
      </div>

      {/* RESULTADO DO FILTRO */}

      {(filtro !== "todos" || busca.trim()) && (
        <p className="mb-3 text-sm text-texto-suave">
          Mostrando{" "}
          <strong className="text-texto">
            {filtrados.length}
          </strong>{" "}
          de {doPeriodo.length} · total{" "}
          <strong className="text-dourado">
            {formatarMoeda(totalFiltrado)}
          </strong>
        </p>
      )}

      {/* VAZIO */}

      {filtrados.length === 0 && (
        <div className="rounded-xl border border-grafite-claro bg-grafite p-8 text-center text-sm text-texto-suave">
          {doPeriodo.length === 0
            ? "Nenhuma venda registrada ainda."
            : "Nenhuma venda encontrada com esse filtro."}
        </div>
      )}

      {/* TABELA */}

      {filtrados.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-grafite-claro bg-grafite">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="border-b border-grafite-claro bg-preto text-left text-texto-suave">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Vendedor</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3">Pagamento</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>

            <tbody>
              {grupos.map((grupo) => (
                <Fragment key={grupo.chave}>
                <tr className="border-b border-grafite-claro bg-preto/60">
                  <td colSpan={8} className="px-4 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-sm font-bold text-dourado">
                        {grupo.titulo}
                      </span>

                      <span className="text-xs text-texto-suave">
                        {grupo.itens.length} venda
                        {grupo.itens.length === 1 ? "" : "s"} ·{" "}
                        <strong className="text-texto">
                          {formatarMoeda(grupo.total)}
                        </strong>
                      </span>
                    </div>
                  </td>
                </tr>

                {grupo.itens.map((registro) => (
                <tr
                  key={`${registro.tipo}-${registro.id}`}
                  className="border-b border-grafite-claro last:border-b-0 hover:bg-preto/40"
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    {dataBrasil(registro.data)}

                    {registro.hora && (
                      <span className="block text-xs text-texto-suave">
                        {registro.hora}
                      </span>
                    )}

                    {ordem === "registro" &&
                      registro.registradoEm && (
                        <span className="mt-1 block text-xs text-dourado">
                          cadastrada{" "}
                          {new Date(
                            registro.registradoEm
                          ).toLocaleString("pt-BR", {
                            timeZone: "America/Sao_Paulo",
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg border px-2 py-1 text-xs font-semibold ${
                        registro.tipo === "moto"
                          ? "border-sky-700 bg-sky-950/40 text-sky-300"
                          : "border-purple-700 bg-purple-950/40 text-purple-300"
                      }`}
                    >
                      {registro.tipo === "moto" ? (
                        <Bike size={13} />
                      ) : (
                        <HardHat size={13} />
                      )}

                      {registro.tipo === "moto"
                        ? "Moto"
                        : "Capacete"}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-semibold text-white">
                      {registro.titulo}
                    </div>

                    {registro.detalhe && (
                      <div className="text-xs text-texto-suave">
                        {registro.detalhe}
                      </div>
                    )}

                    {registro.extra && (
                      <div className="mt-1 inline-flex items-center gap-1 rounded border border-purple-800/60 px-1.5 py-0.5 text-[11px] text-purple-300">
                        <HardHat size={11} />
                        {registro.extra}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="text-white">
                      {registro.cliente}
                    </div>

                    {registro.contato && (
                      <div className="text-xs text-texto-suave">
                        {registro.contato}
                      </div>
                    )}

                    {registro.telefone && (
                      <div className="mt-1">
                        <BotaoWhatsapp
                          telefone={registro.telefone}
                          nome={registro.cliente}
                        />
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3 font-semibold text-dourado">
                    {registro.vendedor || "-"}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-white">
                    {formatarMoeda(registro.valor)}
                  </td>

                  <td className="px-4 py-3">
                    <div className="text-texto">
                      {registro.pagamento || "-"}
                    </div>

                    {registro.observacaoPagamento && (
                      <div className="text-xs text-texto-suave">
                        {registro.observacaoPagamento}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {registro.tipo === "moto" ? (
                        <>
                          <Link
                            href={`/vendas/${registro.id}`}
                            className="inline-flex items-center gap-2 rounded-lg border border-dourado px-3 py-2 text-xs font-semibold text-dourado transition hover:bg-dourado hover:text-preto"
                          >
                            <Pencil size={14} />
                            Editar
                          </Link>

                          <a
                            href={`/documentos/contrato-venda/${registro.id}`}
                            className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-dourado px-3 py-2 text-xs font-bold text-preto transition hover:bg-dourado-claro"
                          >
                            <FileText size={14} />
                            Gerar Contrato
                          </a>
                        </>
                      ) : (
                        <>
                          <Link
                            href={`/capacetes/vendas/${registro.id}`}
                            className="inline-flex items-center gap-2 rounded-lg border border-dourado px-3 py-2 text-xs font-semibold text-dourado transition hover:bg-dourado hover:text-preto"
                          >
                            <Pencil size={14} />
                            Ver
                          </Link>

                          <Link
                            href={`/recibos/capacete/${registro.id}`}
                            className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-dourado px-3 py-2 text-xs font-bold text-preto transition hover:bg-dourado-claro"
                          >
                            <FileText size={14} />
                            Gerar Recibo
                          </Link>
                        </>
                      )}
                    </div>
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
