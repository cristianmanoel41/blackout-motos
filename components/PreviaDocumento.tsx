"use client";

import { useEffect, useRef, useState } from "react";
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

  /*
   * Tudo que esta entre o timbre e a data e o corpo do
   * contrato. Agrupado, ele pode ocupar o meio da folha
   * sozinho - o cabecalho continua junto no alto e a
   * assinatura, no pe.
   */
  const filhos = Array.from(documento.body.children);

  const inicio = filhos.findIndex(
    (item) =>
      !item.classList.contains("cabecalho-loja") &&
      item.tagName === "P" &&
      (item.textContent || "").trim().length > 0 &&
      !item.querySelector("img")
  );

  const fim = filhos.findIndex((item) =>
    item.classList.contains("data-documento")
  );

  if (inicio >= 0 && fim > inicio) {
    const corpo = documento.createElement("div");
    corpo.className = "corpo-documento";

    filhos[inicio].before(corpo);

    /*
     * O corpo vai em blocos, nao em paragrafos soltos.
     *
     * Linha em branco no Word fecha um bloco; linhas coladas
     * continuam coladas. Assim "Ano de fabricacao", que e
     * continuacao da descricao da moto, nao se afasta dela
     * quando a folha distribui o espaco.
     */
    let bloco: HTMLDivElement | null = null;

    for (const item of filhos.slice(inicio, fim)) {
      const vazio =
        (item.textContent || "").trim().length === 0 &&
        !item.querySelector("img");

      if (vazio) {
        bloco = null;
        item.remove();
        continue;
      }

      if (!bloco) {
        bloco = documento.createElement("div");
        bloco.className = "bloco-documento";
        corpo.appendChild(bloco);
      }

      bloco.appendChild(item);
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
  espalhar = false,
  fonte,
}: {
  url: string;
  titulo: string;
  voltarPara: string;
  voltarRotulo?: string;
  /* Documento com pouco texto: espalha para encher a folha. */
  espalhar?: boolean;
  /* Maior corpo aceito, em pt. Encolhe se nao couber. */
  fonte?: number;
}) {
  const [html, setHtml] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const folhaRef = useRef<HTMLDivElement>(null);

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

  /*
   * Quanto o corpo pode crescer depende do texto: o mesmo
   * tamanho que enche a folha de um documento joga o outro
   * para a pagina 2. Em vez de calibrar na mao documento por
   * documento, a folha se mede.
   *
   * Comeca no maior corpo aceito e vai descendo de meio em
   * meio ponto ate a folha voltar para 29,7cm. Ler
   * offsetHeight forca o navegador a recalcular, entao cada
   * passo ja enxerga o tamanho anterior.
   *
   * Na impressao a folha e um pouco mais larga que na tela -
   * margem de 15mm contra 2cm -, entao o que coube aqui cabe
   * la tambem.
   */
  useEffect(() => {
    const folha = folhaRef.current;

    if (!espalhar || !html || !folha) return;

    /* 29,7cm em pixel de CSS: 1cm vale 96/2,54 px. */
    const alturaDaFolha = (29.7 * 96) / 2.54;

    let tamanho = fonte || 15;

    while (tamanho >= 9) {
      folha.style.setProperty(
        "--corpo-fonte",
        `${tamanho}pt`
      );

      if (folha.offsetHeight <= alturaDaFolha + 1) break;

      tamanho -= 0.5;
    }
  }, [html, espalhar, fonte]);

  return (
    <>
      <style>{`
        @page {
          size: A4;
          margin: 0;
        }

        .folha-documento {
          position: relative;
          display: flex;
          flex-direction: column;
        }

        .folha-documento .documento-word {
          display: flex;
          flex: 1;
          flex-direction: column;
        }

        .documento-word .data-documento {
          margin-top: auto !important;
        }

        .documento-espalhado .documento-word {
          font-size: var(--corpo-fonte, 15pt) !important;
          line-height: 1.65 !important;
        }

        /*
         * O corpo toma a folha entre o timbre e a data, e
         * distribui os blocos por ela - em vez de empilhar no
         * alto e deixar um buraco unico no meio.
         *
         * "space-between", nao "space-evenly": o primeiro
         * bloco encosta no timbre e o ultimo encosta na data.
         * Com folga nas pontas o texto vira um miolo
         * centralizado, que nao e o que se quer.
         */
        .documento-espalhado .corpo-documento {
          display: flex !important;
          flex: 1 1 auto !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          padding: 0.7em 0 !important;
        }

        /* Alinhado dos dois lados, como esta no Word. */
        .documento-espalhado .corpo-documento p {
          text-align: justify !important;
        }

        .documento-espalhado .corpo-documento p {
          margin: 0 !important;
        }

        /* Dentro do bloco as linhas ficam juntas. */
        .documento-espalhado .bloco-documento p + p {
          margin-top: 0.15em !important;
        }

        /* O timbre da loja fica no tamanho de cabecalho. */
        .documento-espalhado
          .documento-word
          .cabecalho-loja {
          font-size: 11pt !important;
          line-height: 1.15 !important;
          margin-bottom: 0 !important;
        }

        .marca-dagua-documento {
          position: absolute !important;
          top: 105mm !important;
          left: 50% !important;
          width: 13cm !important;
          max-width: none !important;
          height: auto !important;
          max-height: none !important;
          transform: translateX(-50%) !important;
          opacity: 0.14 !important;
          filter: grayscale(1) !important;
          pointer-events: none !important;
          z-index: 0 !important;
        }

        .folha-documento > * {
          position: relative;
          z-index: 1;
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
          font-family: Calibri, Carlito, sans-serif !important;
          font-size: 10pt !important;
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

        /*
         * A linha e desenhada com borda, entao ela pega a
         * largura toda da coluna - trocar o tanto de
         * underscore no Word nao muda nada aqui. Quem manda no
         * comprimento e esta largura.
         */
        .documento-word .linha-assinatura-doc {
          width: 8cm !important;
          max-width: 100% !important;
          margin-top: 0 !important;
          margin-right: auto !important;
          margin-bottom: 2mm !important;
          margin-left: 0 !important;
        }

        /*
         * Nos contratos as assinaturas ficam lado a lado numa
         * tabela; ali a linha acompanha a coluna, que ja e
         * estreita.
         */
        .documento-word
          .assinaturas-documento
          .linha-assinatura-doc {
          width: auto !important;
        }

        /* O rotulo acompanha a linha, no canto de baixo. */
        .documento-word .rotulo-assinatura-doc {
          width: 8cm !important;
          max-width: 100% !important;
          margin-top: 0 !important;
          margin-right: auto !important;
          margin-left: 0 !important;
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
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            width: 210mm !important;
            max-width: none !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 12mm 15mm !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            box-shadow: none !important;
            overflow: visible !important;
            /*
             * Na impressao a folha tambem e coluna, senao a
             * assinatura volta a subir e o vazio reaparece no
             * pe da pagina.
             */
            display: flex !important;
            flex-direction: column !important;
          }

          .documento-word {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            color: #000000 !important;
            background: transparent !important;
          }

          .marca-dagua-documento {
            display: block !important;
            visibility: visible !important;
            position: absolute !important;
            top: 105mm !important;
            left: 50% !important;
            width: 13cm !important;
            max-width: none !important;
            height: auto !important;
            max-height: none !important;
            transform: translateX(-50%) !important;
            opacity: 0.14 !important;
            filter: grayscale(1) !important;
            z-index: 0 !important;
          }

          .documento-word img {
            width: 9.21cm !important;
            max-width: 9.21cm !important;
            height: 3cm !important;
            max-height: 3cm !important;
            object-fit: contain !important;
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

        <div
          ref={folhaRef}
          className={`folha-documento mx-auto min-h-[29.7cm] w-[21cm] max-w-full bg-white px-[2cm] py-[1.5cm] text-black shadow-2xl${
            espalhar ? " documento-espalhado" : ""
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-blackout-menu.png"
            alt=""
            aria-hidden="true"
            className="marca-dagua-documento"
          />

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
