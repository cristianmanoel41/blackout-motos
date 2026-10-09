"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatarData } from "@/lib/formatadores/data";
import {
  conferirCrlv,
  type LeituraDoCrlv,
  type MotoParaConferir,
  type Situacao,
} from "@/lib/documentos/crlv";
import {
  CircleAlert,
  CircleCheck,
  CircleHelp,
  FileSearch,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";

const supabase = createClient();

/*
 * A CONFERÊNCIA DO CRLV NA FICHA DA MOTO
 *
 * Mostra, campo por campo, o que está no cadastro e o que está
 * no CRLV anexado. O objetivo é um só: o contrato não sair com
 * dado errado da moto. Por isso a tela não corrige nada
 * sozinha - aponta, e quem corrige é a loja, no "Editar" da
 * ficha, olhando o documento.
 *
 * Usa sempre o CRLV mais recente. Quando ele ainda não foi
 * lido (acabou de ser anexado), a leitura começa sozinha.
 */

type Anexo = {
  id: string;
  arquivo_nome: string;
  data: string;
  leitura: LeituraDoCrlv | null;
};

const ESTILO: Record<
  Situacao,
  { classe: string; Icone: typeof CircleCheck; rotulo: string }
> = {
  igual: {
    classe: "border-green-800 bg-green-950/30 text-green-300",
    Icone: CircleCheck,
    rotulo: "Confere",
  },
  diferente: {
    classe: "border-red-700 bg-red-950/40 text-red-300",
    Icone: CircleAlert,
    rotulo: "Diferente",
  },
  atencao: {
    classe: "border-amber-700 bg-amber-950/30 text-amber-300",
    Icone: TriangleAlert,
    rotulo: "Confira",
  },
  sem_dado: {
    classe: "border-grafite-claro bg-preto/40 text-texto-suave",
    Icone: CircleHelp,
    rotulo: "Sem dado",
  },
};

export default function ConferenciaCrlv({
  motorcycleId,
  moto,
  versao = 0,
}: {
  motorcycleId: string;
  moto: MotoParaConferir;
  /* Muda quando um anexo entra ou sai, para recarregar. */
  versao?: number;
}) {
  const [anexo, setAnexo] = useState<Anexo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motorcycleId, versao]);

  async function carregar() {
    setCarregando(true);
    setErro("");

    const { data, error } = await supabase
      .from("motorcycle_inspections")
      .select("id, arquivo_nome, data, leitura")
      .eq("motorcycle_id", motorcycleId)
      .eq("tipo", "crlv")
      .order("data", { ascending: false })
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    setCarregando(false);

    if (error) {
      setErro(
        error.message.includes("leitura")
          ? "Falta rodar a migração 0035_leitura_do_crlv.sql no Supabase."
          : `Não foi possível carregar o CRLV: ${error.message}`
      );
      return;
    }

    const encontrado = (data as Anexo | null) || null;
    setAnexo(encontrado);

    if (encontrado && !encontrado.leitura) {
      await ler(encontrado.id, false);
    }
  }

  async function ler(anexoId: string, deNovo: boolean) {
    setLendo(true);
    setErro("");

    try {
      const resposta = await fetch("/api/motos/conferir-crlv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anexoId, deNovo }),
      });

      const corpo = await resposta.json().catch(() => ({}));

      if (!resposta.ok || !corpo.leitura) {
        setErro(
          corpo.erro || "Não foi possível ler o CRLV."
        );
        return;
      }

      setAnexo((atual) =>
        atual && atual.id === anexoId
          ? { ...atual, leitura: corpo.leitura }
          : atual
      );
    } catch {
      setErro("Sem conexão para ler o CRLV. Tente de novo.");
    } finally {
      setLendo(false);
    }
  }

  const itens = anexo?.leitura
    ? conferirCrlv(moto, anexo.leitura.dados)
    : [];

  const diferentes = itens.filter(
    (item) => item.situacao === "diferente"
  ).length;

  const paraOlhar = itens.filter(
    (item) =>
      item.situacao === "atencao" ||
      item.situacao === "sem_dado"
  ).length;

  return (
    <section className="rounded-2xl border border-grafite-claro bg-grafite p-5 md:p-8">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-grafite-claro pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-dourado">
            <FileSearch size={20} />
            Conferência com o CRLV
          </h2>

          <p className="mt-1 text-sm text-texto-suave">
            Compara o cadastro com o CRLV anexado, para o
            contrato não sair com dado errado da moto.
          </p>
        </div>

        {anexo?.leitura && (
          <button
            type="button"
            onClick={() => ler(anexo.id, true)}
            disabled={lendo}
            className="inline-flex items-center gap-2 rounded-lg border border-grafite-claro px-3 py-2 text-sm text-texto-suave transition hover:border-dourado hover:text-dourado disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={lendo ? "animate-spin" : ""}
            />
            Ler de novo
          </button>
        )}
      </div>

      {erro && (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {erro}
        </div>
      )}

      {carregando && (
        <p className="text-sm text-texto-suave">
          Procurando o CRLV...
        </p>
      )}

      {!carregando && !anexo && (
        <div className="rounded-xl border border-grafite-claro bg-preto/40 p-5 text-sm text-texto-suave">
          Nenhum CRLV anexado. Anexe o CRLV em{" "}
          <strong className="text-texto">
            Vistorias e CRLV
          </strong>{" "}
          e a conferência é feita na hora.
        </div>
      )}

      {lendo && !anexo?.leitura && (
        <p className="flex items-center gap-2 text-sm text-texto-suave">
          <RefreshCw size={15} className="animate-spin" />
          Lendo o CRLV...
        </p>
      )}

      {anexo?.leitura && (
        <>
          {/*
            * O resumo primeiro: na maioria das vezes está tudo
            * certo, e a loja precisa saber disso de relance.
            */}
          <div
            className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
              diferentes
                ? ESTILO.diferente.classe
                : paraOlhar
                ? ESTILO.atencao.classe
                : ESTILO.igual.classe
            }`}
          >
            {diferentes ? (
              <CircleAlert size={20} className="mt-0.5 shrink-0" />
            ) : paraOlhar ? (
              <TriangleAlert size={20} className="mt-0.5 shrink-0" />
            ) : (
              <CircleCheck size={20} className="mt-0.5 shrink-0" />
            )}

            <p>
              {diferentes ? (
                <>
                  <strong>
                    {diferentes === 1
                      ? "1 dado não bate"
                      : `${diferentes} dados não batem`}{" "}
                    com o CRLV.
                  </strong>{" "}
                  Corrija no &quot;Editar&quot; da ficha antes
                  de emitir o contrato.
                </>
              ) : paraOlhar ? (
                <>
                  <strong>Nada diferente</strong>, mas{" "}
                  {paraOlhar === 1
                    ? "1 campo pede"
                    : `${paraOlhar} campos pedem`}{" "}
                  um olhar.
                </>
              ) : (
                <strong>
                  Todos os dados conferem com o CRLV.
                </strong>
              )}
            </p>
          </div>

          <ul className="space-y-2">
            {itens.map((item) => {
              const { classe, Icone, rotulo } =
                ESTILO[item.situacao];

              return (
                <li
                  key={item.campo}
                  className="rounded-xl border border-grafite-claro bg-preto/40 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-texto">
                      {item.nome}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-semibold ${classe}`}
                    >
                      <Icone size={13} />
                      {rotulo}
                    </span>
                  </div>

                  <dl className="mt-2 grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                    <div className="min-w-0">
                      <dt className="text-xs text-texto-suave">
                        Cadastro
                      </dt>
                      <dd className="break-all text-texto">
                        {item.cadastro}
                      </dd>
                    </div>

                    <div className="min-w-0">
                      <dt className="text-xs text-texto-suave">
                        CRLV
                      </dt>
                      <dd className="break-all text-texto">
                        {item.documento}
                      </dd>
                    </div>
                  </dl>

                  {item.nota && (
                    <p className="mt-1 text-xs text-texto-suave">
                      {item.nota}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>

          <p className="mt-3 text-xs text-texto-suave">
            {anexo.arquivo_nome} · anexado em{" "}
            {formatarData(anexo.data)} ·{" "}
            {anexo.leitura.fonte === "pdf"
              ? "lido do CRLV-e digital"
              : "lido pela IA - confira no documento os campos marcados"}
          </p>
        </>
      )}
    </section>
  );
}
