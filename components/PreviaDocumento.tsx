"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Printer,
} from "lucide-react";

/*
 * Prévia de um documento em Word direto no navegador.
 *
 * O arquivo é o MESMO que o botão "Baixar em Word" entrega:
 * a tela busca o .docx já preenchido na rota do documento e
 * converte para HTML aqui no navegador. Assim o texto exibido
 * é sempre o do modelo da loja, sem nenhuma cópia paralela
 * para sair do ar.
 *
 * A conversão é aproximada em espaçamento e fonte - serve para
 * conferir e imprimir. Para editar o texto, use o Word.
 */

export default function PreviaDocumento({
  url,
  titulo,
  voltarPara,
  voltarRotulo = "Voltar",
}: {
  url: string;
  titulo: string;
  voltarPara: string;
  voltarRotulo?: string;
}) {
  const [html, setHtml] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      setErro("");

      try {
        const resposta = await fetch(url);

        if (!resposta.ok) {
          /* A rota devolve JSON quando dá erro. */
          let mensagem = `Erro ${resposta.status}`;

          try {
            const corpo = await resposta.json();
            mensagem = corpo?.error || mensagem;
          } catch {
            /* resposta sem JSON: mantém o status */
          }

          throw new Error(mensagem);
        }

        const arquivo = await resposta.arrayBuffer();

        const mammoth = await import(
          "mammoth/mammoth.browser"
        );

        const { value } = await mammoth.convertToHtml({
          arrayBuffer: arquivo,
        });

        if (!cancelado) {
          setHtml(value);
        }
      } catch (e: any) {
        console.error(e);

        if (!cancelado) {
          setErro(
            e?.message ||
              "Não foi possível montar a prévia do documento."
          );
        }
      } finally {
        if (!cancelado) {
          setCarregando(false);
        }
      }
    }

    carregar();

    return () => {
      cancelado = true;
    };
  }, [url]);

  return (
    <main className="min-h-screen bg-neutral-800 py-6 print:bg-white print:py-0">
      {/* BARRA - some na impressão */}

      <div className="mx-auto mb-6 flex max-w-[21cm] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <Link
          href={voltarPara}
          className="inline-flex items-center gap-2 rounded-lg border border-grafite-claro bg-grafite px-4 py-3 text-sm font-semibold text-texto transition hover:border-dourado hover:text-dourado"
        >
          <ArrowLeft size={17} />
          {voltarRotulo}
        </Link>

        <div className="flex flex-wrap gap-2">
          <a
            href={url}
            className="inline-flex items-center gap-2 rounded-lg border border-grafite-claro bg-grafite px-4 py-3 text-sm font-semibold text-texto transition hover:border-dourado hover:text-dourado"
          >
            <FileText size={17} />
            Baixar em Word
          </a>

          <button
            type="button"
            onClick={() => window.print()}
            disabled={carregando || !!erro}
            className="inline-flex items-center gap-2 rounded-lg bg-dourado px-5 py-3 text-sm font-bold text-preto transition hover:bg-dourado-claro disabled:opacity-50"
          >
            <Printer size={17} />
            Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      {erro && (
        <div className="mx-auto mb-6 max-w-[21cm] px-4 print:hidden">
          <div className="rounded-xl border border-red-700 bg-red-950/30 p-5 text-sm text-red-300">
            {erro}
          </div>
        </div>
      )}

      {/* FOLHA A4 */}

      <div className="folha-documento mx-auto w-[21cm] max-w-full bg-white px-[2cm] py-[1.5cm] text-black shadow-2xl print:w-auto print:px-0 print:py-0 print:shadow-none">
        {carregando && (
          <p className="text-center text-sm text-neutral-500">
            Montando a prévia de {titulo}...
          </p>
        )}

        {!carregando && !erro && (
          <div
            className="documento-word"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>
    </main>
  );
}
