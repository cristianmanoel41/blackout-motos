"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import { formatarData } from "@/lib/formatadores/data";
import {
  diasDeDiferenca,
  lerArquivoOfx,
  lerOfx,
  type LancamentoOfx,
} from "@/lib/ofx";
import {
  ArrowDownLeft,
  ArrowUpRight,
  FileUp,
  Plus,
} from "lucide-react";

/*
 * Conferência com o extrato do banco.
 *
 * O Itaú Empresas deixa baixar o extrato em OFX pelo internet
 * banking - sem contrato, sem API, sem custo. A loja sobe o
 * arquivo aqui e o sistema aponta o que o banco tem e o caixa
 * não, que é justamente o que costuma faltar lançar.
 *
 * O arquivo é lido no navegador e não é guardado em lugar
 * nenhum: só as movimentações que a loja escolher lançar viram
 * registro.
 */

const supabase = createClient();

/* Folga entre a data do banco e a do lançamento. */
const FOLGA_DIAS = 3;

/* Centavos de diferença que ainda contam como o mesmo valor. */
const FOLGA_VALOR = 0.02;

type Transacao = {
  id: string;
  data: string;
  tipo: string;
  valor: number;
  descricao: string | null;
};

type Conferido = LancamentoOfx & {
  achado: Transacao | null;
};

export default function ExtratoOfx() {
  const [linhas, setLinhas] = useState<Conferido[]>([]);
  const [arquivoNome, setArquivoNome] = useState("");

  const [lendo, setLendo] = useState(false);
  const [lancando, setLancando] = useState("");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  const [soFaltando, setSoFaltando] = useState(true);

  async function receber(arquivo: File | null) {
    if (!arquivo) return;

    setErro("");
    setAviso("");
    setLendo(true);
    setArquivoNome(arquivo.name);

    try {
      const conteudo = await lerArquivoOfx(arquivo);
      const doBanco = lerOfx(conteudo);

      if (doBanco.length === 0) {
        setLinhas([]);
        setLendo(false);

        setErro(
          "Não encontrei movimentação nesse arquivo. Confira se o extrato foi baixado no formato OFX."
        );

        return;
      }

      /* Só o período que o extrato cobre. */
      const primeira = doBanco[0].data;
      const ultima = doBanco[doBanco.length - 1].data;

      const { data: transacoes, error } = await supabase
        .from("cash_transactions")
        .select("id, data, tipo, valor, descricao")
        .gte("data", recuar(primeira))
        .lte("data", avancar(ultima));

      if (error) {
        setLendo(false);

        setErro(
          `Não foi possível ler o caixa: ${error.message}`
        );

        return;
      }

      const doCaixa = (transacoes as Transacao[]) || [];
      const usados = new Set<string>();

      const conferidas: Conferido[] = doBanco.map(
        (lancamento) => {
          const achado =
            doCaixa.find(
              (t) =>
                !usados.has(t.id) &&
                t.tipo === lancamento.tipo &&
                Math.abs(
                  Number(t.valor) - lancamento.valor
                ) <= FOLGA_VALOR &&
                diasDeDiferenca(t.data, lancamento.data) <=
                  FOLGA_DIAS
            ) || null;

          if (achado) usados.add(achado.id);

          return { ...lancamento, achado };
        }
      );

      setLinhas(conferidas);
      setLendo(false);
    } catch (falha) {
      setLendo(false);

      setErro(
        `Não consegui ler o arquivo: ${
          falha instanceof Error
            ? falha.message
            : "formato não reconhecido"
        }`
      );
    }
  }

  /* Lança no caixa uma linha que o banco tem e o caixa não. */
  async function lancar(linha: Conferido) {
    setErro("");
    setAviso("");
    setLancando(linha.id);

    const { error } = await supabase
      .from("cash_transactions")
      .insert({
        data: linha.data,
        tipo: linha.tipo,
        origem: "outro",
        valor: linha.valor,
        descricao: `${linha.descricao} (extrato)`,
        confirmado: true,
        data_confirmacao: linha.data,
      });

    setLancando("");

    if (error) {
      setErro(
        `Não foi possível lançar: ${error.message}`
      );

      return;
    }

    /* Marca como conferida sem precisar reler o arquivo. */
    setLinhas((atuais) =>
      atuais.map((item) =>
        item.id === linha.id
          ? {
              ...item,
              achado: {
                id: "novo",
                data: linha.data,
                tipo: linha.tipo,
                valor: linha.valor,
                descricao: linha.descricao,
              },
            }
          : item
      )
    );

    setAviso(
      `Lançado: ${linha.descricao} — ${formatarMoeda(
        linha.valor
      )}`
    );
  }

  const faltando = useMemo(
    () => linhas.filter((linha) => !linha.achado),
    [linhas]
  );

  const visiveis = soFaltando ? faltando : linhas;

  const totais = useMemo(() => {
    return faltando.reduce(
      (resumo, linha) => ({
        entradas:
          resumo.entradas +
          (linha.tipo === "entrada" ? linha.valor : 0),
        saidas:
          resumo.saidas +
          (linha.tipo === "saida" ? linha.valor : 0),
      }),
      { entradas: 0, saidas: 0 }
    );
  }, [faltando]);

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-grafite-claro bg-grafite">
      <div className="border-b border-grafite-claro px-5 py-4">
        <h2 className="flex items-center gap-2 font-semibold text-white">
          <FileUp size={18} className="text-dourado" />
          Conferir com o extrato do banco
        </h2>

        <p className="mt-1 text-xs leading-5 text-texto-suave">
          No Itaú Empresas, baixe o extrato do período no
          formato <strong className="text-texto">OFX</strong> e
          solte o arquivo aqui. O sistema compara com o caixa e
          mostra o que o banco tem e você ainda não lançou. O
          arquivo é lido aqui no navegador e não fica guardado.
        </p>
      </div>

      <div className="border-b border-grafite-claro px-5 py-4">
        <input
          type="file"
          accept=".ofx,.OFX,text/plain"
          onChange={(evento) =>
            receber(evento.target.files?.[0] || null)
          }
          className="w-full rounded-lg border border-grafite-claro bg-preto px-3 py-2.5 text-sm text-texto file:mr-3 file:rounded-md file:border-0 file:bg-dourado file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-preto"
        />

        {arquivoNome && !lendo && (
          <p className="mt-2 text-xs text-texto-suave">
            {arquivoNome} · {linhas.length} movimenta
            {linhas.length === 1 ? "ção" : "ções"} no extrato
          </p>
        )}

        {lendo && (
          <p className="mt-2 text-xs text-texto-suave">
            Lendo o arquivo...
          </p>
        )}
      </div>

      {erro && (
        <div className="border-b border-grafite-claro px-5 py-3 text-sm text-red-300">
          {erro}
        </div>
      )}

      {aviso && (
        <div className="border-b border-grafite-claro px-5 py-3 text-sm text-green-300">
          {aviso}
        </div>
      )}

      {linhas.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-grafite-claro px-5 py-3">
            <div className="text-sm">
              {faltando.length === 0 ? (
                <span className="font-semibold text-green-400">
                  Tudo conferido: nada faltando no caixa.
                </span>
              ) : (
                <span className="text-texto-suave">
                  <strong className="text-white">
                    {faltando.length}
                  </strong>{" "}
                  sem lançamento ·{" "}
                  <span className="text-green-400">
                    entradas{" "}
                    {formatarMoeda(totais.entradas)}
                  </span>{" "}
                  ·{" "}
                  <span className="text-red-400">
                    saídas {formatarMoeda(totais.saidas)}
                  </span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSoFaltando(!soFaltando)}
              className="rounded-lg border border-grafite-claro px-3 py-1.5 text-xs font-semibold text-texto-suave transition hover:border-dourado hover:text-dourado"
            >
              {soFaltando
                ? "Ver o extrato inteiro"
                : "Ver só o que falta"}
            </button>
          </div>

          <div className="divide-y divide-grafite-claro">
            {visiveis.length === 0 ? (
              <p className="p-8 text-center text-sm text-texto-suave">
                Nada para mostrar aqui.
              </p>
            ) : (
              visiveis.map((linha) => (
                <div
                  key={linha.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="flex items-center gap-3">
                    {linha.tipo === "entrada" ? (
                      <ArrowDownLeft
                        size={16}
                        className="text-green-400"
                      />
                    ) : (
                      <ArrowUpRight
                        size={16}
                        className="text-red-400"
                      />
                    )}

                    <div>
                      <p className="text-sm text-white">
                        {linha.descricao}
                      </p>

                      <p className="text-xs text-texto-suave">
                        {formatarData(linha.data)}
                        {linha.achado
                          ? " · já está no caixa"
                          : " · não encontrado no caixa"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <strong
                      className={`text-sm ${
                        linha.tipo === "entrada"
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {formatarMoeda(linha.valor)}
                    </strong>

                    {linha.achado ? (
                      <span className="rounded-lg border border-grafite-claro px-3 py-1.5 text-xs text-texto-suave">
                        Conferido
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={lancando === linha.id}
                        onClick={() => lancar(linha)}
                        className="inline-flex items-center gap-1 rounded-lg bg-dourado px-3 py-1.5 text-xs font-bold text-preto transition hover:opacity-90 disabled:opacity-50"
                      >
                        <Plus size={13} />
                        {lancando === linha.id
                          ? "Lançando..."
                          : "Lançar"}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}

function recuar(data: string) {
  return mover(data, -FOLGA_DIAS);
}

function avancar(data: string) {
  return mover(data, FOLGA_DIAS);
}

function mover(data: string, dias: number) {
  const base = new Date(`${data}T00:00:00`);

  base.setDate(base.getDate() + dias);

  return base.toLocaleDateString("en-CA");
}
