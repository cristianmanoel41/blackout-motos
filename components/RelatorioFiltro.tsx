"use client";

import Link from "next/link";

import {
  useOptimistic,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { Download, Printer } from "lucide-react";

export default function RelatorioFiltro({
  mes,
  ano,
  meses,
  anos,
}: {
  mes: number;
  ano: number;
  meses: string[];
  anos: number[];
}) {
  const router = useRouter();

  const [atualizando, iniciar] =
    useTransition();

  // mostra a escolha na hora e volta a
  // seguir a URL quando os dados chegam
  const [selecao, selecionar] =
    useOptimistic({ mes, ano });

  function atualizar(
    novoMes: number,
    novoAno: number
  ) {
    iniciar(() => {
      selecionar({
        mes: novoMes,
        ano: novoAno,
      });

      router.push(
        `/relatorios?mes=${novoMes}&ano=${novoAno}`,
        { scroll: false }
      );
    });
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">

      <select
        value={selecao.mes}
        onChange={(e) =>
          atualizar(
            Number(e.target.value),
            selecao.ano
          )
        }
        className="rounded-lg border border-grafite-claro bg-grafite-claro px-4 py-2 text-texto outline-none focus:border-dourado"
      >
        {meses.map((nome, i) => (
          <option
            key={i}
            value={i + 1}
          >
            {nome}
          </option>
        ))}
      </select>

      <select
        value={selecao.ano}
        onChange={(e) =>
          atualizar(
            selecao.mes,
            Number(e.target.value)
          )
        }
        className="rounded-lg border border-grafite-claro bg-grafite-claro px-4 py-2 text-texto outline-none focus:border-dourado"
      >
        {anos.map((valor) => (
          <option
            key={valor}
            value={valor}
          >
            {valor}
          </option>
        ))}
      </select>

      {/*
        * Imprimir vem antes de baixar.
        *
        * O CSV serve para conferir numero no Excel; a folha e
        * o que se guarda na pasta e se mostra ao contador.
        * Quem abre esta tela quer o segundo muito mais vezes.
        */}
      <Link
        href={`/relatorios/imprimir?mes=${selecao.mes}&ano=${selecao.ano}`}
        className="flex items-center gap-2 rounded-lg border border-dourado bg-dourado px-6 py-2 font-semibold text-preto transition hover:brightness-110"
      >
        <Printer size={17} />
        Imprimir
      </Link>

      <a
        href={`/api/relatorios/mensal?mes=${selecao.mes}&ano=${selecao.ano}`}
        className="flex items-center gap-2 rounded-lg border border-dourado px-6 py-2 font-semibold text-dourado transition hover:bg-dourado hover:text-preto"
      >
        <Download size={17} />
        Baixar Arquivo
      </a>

      {atualizando && (
        <span className="text-sm text-texto-suave">
          Atualizando...
        </span>
      )}

    </div>
  );
}
