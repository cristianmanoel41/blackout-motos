import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { montarDadosRecibo } from "@/lib/recibos/capacete";
import BotaoImprimir from "@/components/BotaoImprimir";
import { ArrowLeft, FileText } from "lucide-react";

/*
 * Recibo pronto para imprimir, direto no navegador.
 *
 * A folha é A5 paisagem, igual ao modelo Word. Ctrl+P
 * imprime ou salva em PDF sem precisar de nenhum programa
 * instalado. A barra de cima some na impressão.
 */

export const dynamic = "force-dynamic";

export default async function ReciboCapacetePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const { dados, erro } = await montarDadosRecibo(
    supabase,
    id
  );

  if (!dados) {
    return (
      <main className="min-h-screen bg-preto p-6 text-texto">
        <div className="mx-auto max-w-xl rounded-xl border border-red-700 bg-red-950/30 p-5 text-red-300">
          {erro || "Não foi possível montar o recibo."}
        </div>

        <div className="mx-auto mt-4 max-w-xl">
          <Link
            href="/capacetes/vendas"
            className="text-sm text-dourado underline"
          >
            Voltar ao histórico
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-800 py-6 print:bg-white print:py-0">
      {/* BARRA - some na impressão */}

      <div className="mx-auto mb-6 flex max-w-[21cm] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <Link
          href={`/capacetes/vendas/${id}`}
          className="inline-flex items-center gap-2 rounded-lg border border-grafite-claro bg-grafite px-4 py-3 text-sm font-semibold text-texto transition hover:border-dourado hover:text-dourado"
        >
          <ArrowLeft size={17} />
          Voltar para a venda
        </Link>

        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/recibos/capacete/${id}`}
            className="inline-flex items-center gap-2 rounded-lg border border-grafite-claro bg-grafite px-4 py-3 text-sm font-semibold text-texto transition hover:border-dourado hover:text-dourado"
          >
            <FileText size={17} />
            Baixar em Word
          </a>

          <BotaoImprimir />
        </div>
      </div>

      {/* FOLHA A5 PAISAGEM */}

      <div className="mx-auto w-[21cm] max-w-full bg-white px-[1cm] py-[0.8cm] text-black shadow-2xl print:w-auto print:px-0 print:py-0 print:shadow-none">
        {/* CABEÇALHO */}

        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-blackout.png"
            alt="Blackout Motos"
            className="mx-auto h-[1.9cm] w-[1.9cm] object-contain"
          />

          <p className="mt-1 text-[15pt] font-bold tracking-[0.15em]">
            BLACKOUT MOTOS
          </p>

          <p className="mt-1 text-[7.5pt] text-neutral-700">
            Avenida Andrômeda, 3521 - Bosque dos Eucaliptos -
            São José dos Campos/SP - CEP 12233-000
          </p>

          <p className="mt-3 text-[12pt] font-bold tracking-[0.3em]">
            RECIBO
          </p>
        </div>

        <div className="mt-2 border-b border-neutral-300" />

        {/* CORPO */}

        <p className="mt-4 text-justify text-[9.5pt] leading-relaxed">
          Recebemos de{" "}
          <strong>{dados.cliente_nome}</strong>, CPF{" "}
          {dados.cliente_cpf}, telefone{" "}
          {dados.cliente_telefone}, a quantia de{" "}
          <strong>{dados.valor_total}</strong> (
          {dados.valor_extenso}), referente à compra de{" "}
          {dados.quantidade} unidade(s) de {dados.produto},
          marca {dados.marca}, modelo {dados.modelo}, cor{" "}
          {dados.cor}, tamanho {dados.tamanho}, ao valor
          unitário de {dados.valor_unitario}.
        </p>

        <p className="mt-3 text-[9.5pt]">
          Forma de pagamento: {dados.forma_pagamento}.
        </p>

        <p className="mt-3 text-[9.5pt]">
          São José dos Campos, {dados.data_extenso}, às{" "}
          {dados.hora_documento}.
        </p>

        {/* ASSINATURAS */}

        <div className="mt-[1.6cm] flex justify-center gap-[1cm]">
          <div className="w-[9cm] max-w-[45%]">
            <div className="border-b border-black" />

            <p className="mt-1 text-center text-[8.5pt] font-bold">
              BLACKOUT MOTOS
            </p>
          </div>

          <div className="w-[9cm] max-w-[45%]">
            <div className="border-b border-black" />

            <p className="mt-1 break-words text-center text-[8.5pt] font-bold">
              {dados.cliente_nome}
            </p>
          </div>
        </div>

        <p className="mt-3 text-center text-[7.5pt] text-neutral-600">
          Vendedor: {dados.vendedor}
        </p>
      </div>
    </main>
  );
}
