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

  /*
   * As linhas vazias entre a data e as assinaturas.
   *
   * No modelo do Word sao sete paragrafos em branco, usados
   * para empurrar a assinatura para o pe da folha. Na tela
   * eles viram um buraco entre "Sao Jose dos Campos" e as
   * linhas - e, pior, ocupam altura que faria falta para a
   * letra crescer.
   *
   * Saem daqui, e quem passa a decidir esse espaco e o CSS:
   * a sobra da folha vira espaco de carimbo, logo acima das
   * assinaturas.
   */
  const depoisDaData = Array.from(
    documento.body.children
  ).slice(
    Array.from(documento.body.children).findIndex((item) =>
      item.classList.contains("data-documento")
    ) + 1
  );

  for (const item of depoisDaData) {
    const vazio =
      (item.textContent || "").trim().length === 0 &&
      !item.querySelector("img") &&
      item.tagName === "P";

    if (vazio) item.remove();
  }

  /*
   * Tabela de assinatura, ou tabela de conteudo?
   *
   * Nos contratos a unica tabela e a das assinaturas, e por
   * isso bastava marcar todas. A lista do estoque trouxe uma
   * tabela de verdade - e o estilo de assinatura, que centraliza
   * tudo e divide as colunas em 45/10/45, destruiria ela.
   *
   * Quem decide e o conteudo: tabela de assinatura tem linha de
   * assinatura dentro.
   */
  const tabelas = Array.from(
    documento.body.querySelectorAll("table")
  );

  for (const tabela of tabelas) {
    const ehDeAssinatura = tabela.querySelector(
      ".linha-assinatura-doc"
    );

    tabela.classList.add(
      ehDeAssinatura
        ? "assinaturas-documento"
        : "tabela-documento"
    );

    if (ehDeAssinatura) continue;

    /*
     * A linha que abre um grupo.
     *
     * Ela vem da mesma tabela que as motos - o modelo do Word
     * só sabe fazer um tipo de linha -, e se reconhece pelo
     * formato: texto na primeira coluna e nada nas outras.
     *
     * Moto nunca cai nessa regra: a última coluna é o preço, e
     * moto sem preço sai como "A consultar".
     */
    const linhas = Array.from(tabela.querySelectorAll("tr"));

    for (const linha of linhas) {
      const celulas = Array.from(linha.querySelectorAll("td"));

      if (celulas.length < 2) continue;

      const texto = (celula: Element) =>
        (celula.textContent || "").trim();

      const soAPrimeira =
        texto(celulas[0]) !== "" &&
        celulas
          .slice(1)
          .every((celula) => texto(celula) === "");

      if (soAPrimeira) linha.classList.add("linha-grupo");
    }
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
  entrelinha,
  variante,
}: {
  url: string;
  titulo: string;
  voltarPara: string;
  voltarRotulo?: string;
  /* Documento com pouco texto: espalha para encher a folha. */
  espalhar?: boolean;
  /* Maior corpo aceito, em pt. Encolhe se nao couber. */
  fonte?: number;
  /*
   * Espaco entre as linhas do corpo.
   *
   * Entrelinha e fonte disputam a mesma folha: apertar um
   * pouco as linhas sobra altura para a letra crescer. Fica
   * por documento porque cada um tem um tanto de texto - o
   * contrato de compra aguenta linha mais junta, a procuracao
   * nao precisa.
   */
  entrelinha?: number;
  /*
   * Que documento e este, para o CSS.
   *
   * Vira a classe `documento-<variante>` na folha. Contrato e
   * procuracao nao usam: a aparencia deles vem do Word. A
   * lista do estoque usa, porque ela e desenhada aqui - o
   * modelo do Word so carrega o texto.
   */
  variante?: string;
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
   * A coluna de texto tem a mesma largura na tela e no papel
   * (2cm de margem dos dois lados), entao a quebra de linha e
   * a mesma e o que se ve aqui e o que sai la. Em cima e
   * embaixo o papel tem 3mm a mais de folga, para o texto que
   * coube raspando na tela nao estourar na impressora.
   */
  useEffect(() => {
    const folha = folhaRef.current;

    if (!espalhar || !html || !folha) return;

    /* 29,7cm em pixel de CSS: 1cm vale 96/2,54 px. */
    const alturaDaFolha = (29.7 * 96) / 2.54;

    folha.style.setProperty(
      "--corpo-entrelinha",
      String(entrelinha || 1.65)
    );

    let tamanho = fonte || 15;

    while (tamanho >= 9) {
      folha.style.setProperty(
        "--corpo-fonte",
        `${tamanho}pt`
      );

      if (folha.offsetHeight <= alturaDaFolha + 1) break;

      tamanho -= 0.5;
    }
  }, [html, espalhar, fonte, entrelinha]);

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
          line-height: var(--corpo-entrelinha, 1.65) !important;
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
          flex: 0 0 auto !important;
          flex-direction: column !important;
          justify-content: flex-start !important;
          padding: 0.7em 0 0 !important;
        }

        /*
         * Os blocos ficam separados por um respiro fixo.
         *
         * Antes quem separava era a distribuicao pela folha, e
         * o espaco variava com o tamanho do texto. Agora o
         * corpo nao se espalha mais: ele encosta no timbre e
         * para, e a sobra da folha vai toda para um lugar so -
         * logo acima das assinaturas, onde entra o carimbo.
         */
        .documento-espalhado
          .corpo-documento
          .bloco-documento
          + .bloco-documento {
          margin-top: 0.9em !important;
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

        /*
         * O texto comeca mais perto do timbre.
         *
         * Era 1,5em; com a letra maior isso virava quase um
         * centimetro de folha vazia logo abaixo do CNPJ. O
         * espaco que sai daqui vai parar no pe, como area de
         * carimbo.
         */
        .documento-espalhado
          .documento-word
          .cabecalho-loja
          + *:not(.cabecalho-loja) {
          margin-top: 0.9em !important;
        }

        .documento-word .data-documento {
          margin-bottom: 15mm !important;
        }

        /*
         * A data encosta no texto, e nao flutua.
         *
         * Vence a regra de cima, que a empurrava para o pe da
         * folha com margin-top: auto. Agora quem recebe a
         * sobra e o bloco das assinaturas.
         */
        .documento-espalhado .documento-word .data-documento {
          margin-top: 0.8em !important;
          margin-bottom: 0 !important;
        }

        /*
         * O espaco do carimbo.
         *
         * Sao 20mm acima das linhas: e onde o carimbo da loja
         * entra, sobre a assinatura do COMPRADOR.
         *
         * Medida fixa, e nao "margin-top: auto". Com auto, a
         * assinatura grudava no pe da folha e toda a sobra se
         * juntava acima dela - ficava longe demais da data e
         * colada na borda do papel. Agora ela sobe junto com o
         * texto, e o que sobrar da folha fica embaixo, vazio,
         * que e como contrato se parece no papel.
         */
        .documento-espalhado
          .documento-word
          .assinaturas-documento {
          /*
           * MARGEM, nunca padding.
           *
           * Esta tabela tem border-collapse: collapse, e com
           * isso o navegador IGNORA padding no elemento table.
           * Os 20mm chegaram a ser escritos como padding e nao
           * faziam nada - a assinatura ficava colada na data.
           */
          margin-top: 20mm !important;
        }

        /*
         * A tabela de conteudo - hoje, a lista do estoque.
         *
         * Pega a largura toda da folha e as linhas ficam com
         * altura de formulario: a loja imprime a lista e
         * preenche as linhas vazias a caneta, entao linha
         * apertada demais nao serve.
         *
         * A grade e desenhada aqui, e nao herdada do Word: o
         * conversor traz a tabela sem as bordas do estilo
         * "Tabela com grade", e sem elas a lista vira um monte
         * de texto solto.
         */
        .documento-word .tabela-documento {
          width: 100% !important;
          margin: 0 !important;
          border-collapse: collapse !important;
          table-layout: fixed !important;
        }

        /* ---------- A LISTA DO ESTOQUE ---------- */

        /*
         * Tipografia sem serifa.
         *
         * O conversor entrega a tabela sem fonte nenhuma, e o
         * navegador cai no Times - que da ao documento cara de
         * papel velho. Calibri e a fonte do resto dos
         * documentos da loja; Carlito tem as mesmas medidas e
         * entra onde Calibri nao existe.
         */
        .documento-lista .documento-word {
          font-family: Calibri, Carlito, "Segoe UI", Arial,
            sans-serif !important;
          color: #18181b !important;
        }

        /*
         * O titulo, que no modelo e so um paragrafo solto.
         *
         * Vira cabecalho de documento: nome da loja em caixa
         * alta, espacado, com um fio dourado embaixo separando
         * do conteudo.
         */
        .documento-lista .documento-word > p:first-of-type {
          margin: 0 0 0.5mm !important;
          font-size: 20pt !important;
          font-weight: 700 !important;
          font-style: normal !important;
          letter-spacing: 0.06em !important;
          text-align: left !important;
          color: #18181b !important;
        }

        /*
         * A linha da data, logo abaixo do nome da loja.
         *
         * O fio dourado fica aqui, e nao no titulo: ele fecha
         * o cabecalho inteiro - nome e data juntos - em vez de
         * cortar no meio.
         */
        .documento-lista .documento-word > p:nth-of-type(2) {
          margin: 0 0 5mm !important;
          padding-bottom: 2.5mm !important;
          border-bottom: 2px solid #a97800 !important;
          font-size: 9.5pt !important;
          font-weight: 600 !important;
          letter-spacing: 0.04em !important;
          text-transform: uppercase !important;
          color: #52525b !important;
        }

        .documento-lista .documento-word > p:first-of-type em,
        .documento-lista .documento-word > p:first-of-type i {
          font-style: normal !important;
        }

        /*
         * O cabecalho da tabela: faixa preta, letra branca.
         *
         * E a identidade da loja, e resolve de uma vez a
         * separacao entre titulo das colunas e conteudo - sem
         * precisar de grade em volta de cada celula.
         */
        .documento-lista .tabela-documento tr:first-child td {
          background: #18181b !important;
          border: 0 !important;
          border-bottom: 2px solid #a97800 !important;
          height: 9mm !important;
        }

        .documento-lista .tabela-documento tr:first-child p {
          color: #ffffff !important;
          font-size: 9.5pt !important;
          font-weight: 700 !important;
          letter-spacing: 0.08em !important;
          text-transform: uppercase !important;
        }

        /*
         * As linhas: so fio horizontal, sem grade.
         *
         * Grade em volta de tudo cansa a vista numa lista de
         * trinta linhas e nao ajuda a ler - o olho ja segue a
         * linha sozinho.
         *
         * Mas o fio horizontal precisa aparecer: a loja
         * escreve a caneta nas linhas vazias, e ali ele deixa
         * de ser enfeite e vira a pauta.
         */
        .documento-lista .tabela-documento td {
          /* Celula fechada dos quatro lados: cada coluna tem o
             seu campo, e o que se escreve a caneta fica dentro
             dele em vez de correr pela folha. */
          border: 1px solid #a1a1aa !important;
          padding: 0 3mm !important;
          height: 8.2mm !important;
          vertical-align: middle !important;
        }



        /*
         * Uma listra clara a cada duas linhas, para o olho nao
         * pular de coluna no meio do caminho.
         *
         * Translucida, e nao cinza solido: atras da tabela
         * passa a marca d'agua, e listra opaca cobriria o logo
         * so nas linhas pares - ele aparecia picotado, como se
         * a impressao tivesse falhado.
         */
        .documento-lista .tabela-documento tr:nth-child(even) td {
          background: rgba(24, 24, 27, 0.04) !important;
        }

        /*
         * A marca d'agua, mais fraca do que nos contratos.
         *
         * No contrato ela fica atras de texto corrido e espaco
         * em branco. Aqui ela divide a folha com uma tabela
         * cheia de numero, e no mesmo tom de cinza ela briga
         * com o que a loja precisa ler.
         */
        .documento-lista .marca-dagua-documento {
          opacity: 0.055 !important;
          top: 118mm !important;
        }

        /*
         * A linha que abre cada cilindrada.
         *
         * Faixa dourada clara, que separa os grupos sem pesar
         * como outra faixa preta, e sem gastar tinta a cada
         * cinco linhas.
         */
        .documento-lista .tabela-documento tr.linha-grupo td {
          background: rgba(169, 120, 0, 0.16) !important;
          height: 7mm !important;
          border-color: #a97800 !important;
        }

        .documento-lista .tabela-documento tr.linha-grupo p {
          font-size: 9.5pt !important;
          font-weight: 700 !important;
          letter-spacing: 0.1em !important;
          color: #6b4c00 !important;
        }

        .documento-lista .tabela-documento p {
          margin: 0 !important;
          padding: 0 !important;
          font-size: 10.5pt !important;
          line-height: 1.15 !important;
          /* Algarismo de mesma largura: as colunas de numero
             ficam alinhadas de cima a baixo. */
          font-variant-numeric: tabular-nums !important;
        }

        /*
         * Cada coluna com a largura do que ela carrega.
         *
         * Com table-layout fixo e sem isto, as cinco colunas
         * ficam iguais - e o nome da moto, que e o campo
         * comprido, quebra em duas linhas enquanto a coluna do
         * ano sobra vazia.
         */
        .documento-lista .tabela-documento td:nth-child(1) {
          width: 42% !important;
          text-align: left !important;
          font-weight: 600 !important;
        }

        .documento-lista .tabela-documento td:nth-child(2) {
          width: 15% !important;
          text-align: center !important;
        }

        .documento-lista .tabela-documento td:nth-child(3) {
          width: 16% !important;
          text-align: center !important;
        }

        .documento-lista .tabela-documento td:nth-child(4) {
          width: 12% !important;
          text-align: right !important;
        }

        /* O preco e o que a conversa procura: alinhado a
           direita e em negrito, se acha de relance. */
        .documento-lista .tabela-documento td:nth-child(5) {
          width: 15% !important;
          text-align: right !important;
          font-weight: 700 !important;
        }

        .documento-lista
          .tabela-documento
          tr:first-child
          td:nth-child(1) {
          font-weight: 700 !important;
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
            /*
             * A margem dos lados e a MESMA da previa (2cm).
             *
             * Era 15mm, e isso deixava a coluna 1cm mais larga
             * no papel: o texto quebrava em menos linhas, o
             * corpo encurtava, tudo subia e a sobra ia para o
             * pe da pagina. A previa mostrava uma coisa e a
             * impressora fazia outra.
             *
             * Em cima e embaixo fica um pouco menor que a
             * previa (12mm contra 15mm) de proposito: e folga
             * para o caso de o texto que coube raspando na
             * tela precisar de um fio a mais no papel.
             */
            padding: 12mm 20mm !important;
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
          }${variante ? ` documento-${variante}` : ""}`}
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
