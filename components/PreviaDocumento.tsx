"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Printer,
} from "lucide-react";

function prepararHtmlDocumento(valor: string) {
  const parser = new DOMParser();
  const documento = parser.parseFromString(valor, "text/html");

  const paragrafos = Array.from(
    documento.body.querySelectorAll("p")
  );

  for (const paragrafo of paragrafos) {
    const texto = (paragrafo.textContent || "")
      .replace(/\s+/g, " ")
      .trim();

    if (
      texto.startsWith("AV: ANDRÔMEDA") ||
      texto.startsWith("TELEFONE:") ||
      texto.startsWith("CNPJ:")
    ) {
      paragrafo.classList.add("cabecalho-loja");
    }

    if (
      texto.startsWith("São José dos Campos,") ||
      texto.startsWith("SÃO JOSÉ DOS CAMPOS ")
    ) {
      paragrafo.classList.add("data-documento");
    }

    if (/_{12,}/.test(texto)) {
      paragrafo.classList.add("linha-assinatura-doc");
    }

    if (texto === "Firma por autenticidade") {
      paragrafo.classList.add("rotulo-assinatura-doc");
    }
  }

  const tabelas = Array.from(
    documento.body.querySelectorAll("table")
  );

  for (const tabela of tabelas) {
    tabela.classList.add("assinaturas-documento");
  }

  return documento.body.innerHTML;
}

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
          let mensagem = `Erro ${resposta.status}`;

          try {
            const corpo = await resposta.json();
            mensagem = corpo?.error || mensagem;
          } catch {
            // Mantém a mensagem pelo status.
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
          setHtml(prepararHtmlDocumento(value));
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
    <>
      <style>{`
        @page {
          size: A4;
          margin: 0;
        }

        .documento-word img {
          display: block !important;
          width: 9.21cm !important;
          max-width: 9.21cm !important;
          height: 3cm !important;
          max-height: 3cm !important;
          margin: 0 auto 1mm !important;
          object-fit: contain !important;
        }

        .documento-word .cabecalho-loja {
          margin: 0 auto !important;
          padding: 0 !important;
          text-align: center !important;
          font-family: Arial, sans-serif !important;
          font-size: 7pt !important;
          line-height: 1.1 !important;
          font-weight: 400 !important;
        }

        .documento-word .cabecalho-loja + .cabecalho-loja {
          margin-top: 0.4mm !important;
        }

        .documento-word
          .cabecalho-loja
          + *:not(.cabecalho-loja) {
          margin-top: 1.5em !important;
        }

        .documento-word .data-documento {
          margin-bottom: 15mm !important;
        }

        .documento-word .assinaturas-documento {
          width: 100% !important;
          margin: 0 !important;
          border-collapse: collapse !important;
          table-layout: fixed !important;
        }

        .documento-word .assinaturas-documento td {
          border: 0 !important;
          padding: 0 1mm !important;
          text-align: center !important;
          vertical-align: top !important;
        }

        .documento-word .assinaturas-documento td:nth-child(1),
        .documento-word .assinaturas-documento td:nth-child(3) {
          width: 45% !important;
        }

        .documento-word .assinaturas-documento td:nth-child(2) {
          width: 10% !important;
        }

        .documento-word .assinaturas-documento p {
          margin: 0 !important;
          padding: 0 !important;
          text-align: center !important;
        }

        .documento-word .assinaturas-documento tr:first-child p {
          margin-bottom: 2mm !important;
        }

        .documento-word .linha-assinatura-doc {
          margin-top: 0 !important;
          margin-bottom: 2mm !important;
        }

        .documento-word .rotulo-assinatura-doc {
          margin-top: 0 !important;
        }

        @media print {
          html,
          body {
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          body * {
            visibility: hidden !important;
          }

          .folha-documento,
          .folha-documento * {
            visibility: visible !important;
          }

          .no-print {
            display: none !important;
            visibility: hidden !important;
          }

          .folha-documento {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 210mm !important;
            max-width: none !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 12mm 15mm !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            box-shadow: none !important;
            overflow: visible !important;
          }

          .documento-word {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            color: #000000 !important;
            background: #ffffff !important;
          }

          .documento-word img {
            width: 5cm !important;
            max-width: 5cm !important;
            height: auto !important;
            margin: 0 auto 1mm !important;
          }

          .documento-word p {
            orphans: 3;
            widows: 3;
          }

          a[href]::after {
            content: none !important;
          }
        }
      `}</style>

      <main className="min-h-screen bg-neutral-800 py-6 print:min-h-0 print:bg-white print:p-0">
        <div className="no-print mx-auto mb-6 flex max-w-[21cm] flex-wrap items-center justify-between gap-3 px-4">
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
          <div className="no-print mx-auto mb-6 max-w-[21cm] px-4">
            <div className="rounded-xl border border-red-700 bg-red-950/30 p-5 text-sm text-red-300">
              {erro}
            </div>
          </div>
        )}

        <div className="folha-documento mx-auto w-[21cm] max-w-full bg-white px-[2cm] py-[1.5cm] text-black shadow-2xl">
          {carregando && (
            <p className="no-print text-center text-sm text-neutral-500">
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
    </>
  );
}
