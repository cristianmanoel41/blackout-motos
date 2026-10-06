"use client";

import { useEffect, useState } from "react";
import { Download, Loader2, Share2 } from "lucide-react";

/*
 * O botão de baixar o contrato.
 *
 * Era um link simples apontando para o arquivo. Funciona na
 * maioria dos lugares, mas quando não funciona não acontece
 * NADA: nem download, nem aviso. O Cristian tocou e ficou
 * olhando para a tela sem saber se tinha travado, se tinha
 * baixado em algum canto, ou se o link estava quebrado.
 *
 * Aqui o arquivo é buscado por JavaScript antes de salvar. Isso
 * muda duas coisas:
 *
 *   1. Dá para mostrar "Baixando..." enquanto acontece, e dizer
 *      o motivo quando falha. Silêncio deixa de ser resposta.
 *   2. O arquivo chega à mão antes de pedir para salvar, então
 *      não depende de o navegador interpretar o cabeçalho do
 *      servidor - que é justamente a parte que varia de
 *      aparelho para aparelho.
 *
 * Sem JavaScript o <noscript> entrega o link direto, que é o
 * comportamento de antes. Pior, mas não é nada.
 */

export default function BaixarContrato({
  token,
}: {
  token: string;
}) {
  const [baixando, setBaixando] = useState(false);
  const [erro, setErro] = useState("");

  /*
   * No iPhone não existe "baixar".
   *
   * O Safari do iOS ignora o pedido de download quando o arquivo
   * é PDF: ele abre no leitor dele, e pronto. Não adianta
   * insistir pelo cabeçalho nem pelo atributo do link - foi
   * decisão da Apple, não falha do site.
   *
   * O caminho que o aparelho oferece é outro: o menu de
   * compartilhar, onde existe "Salvar em Arquivos". E ele
   * aceita arquivo, então dá para entregar o contrato ali
   * direto - e de quebra a pessoa pode mandar para o WhatsApp,
   * para o e-mail, para onde quiser.
   *
   * No computador esse menu não existe, e lá o download comum
   * funciona bem. Por isso o botão muda de nome conforme o
   * aparelho: prometer "baixar" onde não baixa foi exatamente
   * o que fez o Cristian ficar olhando para a tela.
   */
  const [compartilhaArquivo, setCompartilhaArquivo] =
    useState(false);

  useEffect(() => {
    try {
      const teste = new File(["a"], "t.pdf", {
        type: "application/pdf",
      });

      setCompartilhaArquivo(
        typeof navigator !== "undefined" &&
          typeof navigator.share === "function" &&
          typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [teste] })
      );
    } catch {
      setCompartilhaArquivo(false);
    }
  }, []);

  const endereco = `/contrato/${token}/arquivo?baixar=1`;

  async function baixar() {
    setErro("");
    setBaixando(true);

    try {
      const resposta = await fetch(endereco);

      if (!resposta.ok) {
        throw new Error(
          resposta.status === 404
            ? "Este contrato não está mais disponível."
            : `O servidor respondeu ${resposta.status}.`
        );
      }

      const arquivo = await resposta.blob();

      /* Celular: entrega ao menu do sistema, que sabe salvar. */
      if (compartilhaArquivo) {
        const paraCompartilhar = new File(
          [arquivo],
          "Contrato - Blackout Motos.pdf",
          { type: "application/pdf" }
        );

        try {
          await navigator.share({
            files: [paraCompartilhar],
            title: "Contrato - Blackout Motos",
          });
        } catch (e) {
          /* Fechar o menu é desistir, não é erro. */
          if (
            e instanceof Error &&
            (e.name === "AbortError" ||
              e.name === "NotAllowedError")
          ) {
            return;
          }

          throw e;
        }

        return;
      }

      const temporario = URL.createObjectURL(arquivo);

      const atalho = document.createElement("a");

      atalho.href = temporario;
      atalho.download = "Contrato - Blackout Motos.pdf";
      atalho.rel = "noopener";

      document.body.appendChild(atalho);
      atalho.click();
      atalho.remove();

      /*
       * O endereço temporário é solto depois, não na hora.
       *
       * Soltar antes de o navegador terminar de ler faz o
       * download morrer no meio - e, de novo, sem aviso.
       */
      setTimeout(() => URL.revokeObjectURL(temporario), 60000);
    } catch (e) {
      setErro(
        e instanceof Error
          ? e.message
          : "Não consegui baixar o arquivo."
      );
    } finally {
      setBaixando(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={baixar}
        disabled={baixando}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#e0b129] px-6 py-3.5 text-sm font-bold text-[#08080a] transition disabled:opacity-70"
      >
        {baixando ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            {compartilhaArquivo
              ? "Preparando..."
              : "Baixando..."}
          </>
        ) : compartilhaArquivo ? (
          <>
            <Share2 size={16} />
            Salvar no celular
          </>
        ) : (
          <>
            <Download size={16} />
            Baixar o PDF
          </>
        )}
      </button>

      {/*
        * O que esperar depois de tocar.
        *
        * No iPhone abre o menu de compartilhar, e a opção que
        * guarda o arquivo chama "Salvar em Arquivos" - não é
        * óbvio para quem nunca usou, e sem este aviso a pessoa
        * fecha o menu achando que era outra coisa.
        */}
      {compartilhaArquivo && !erro && (
        <p className="text-center text-xs leading-5 text-[#a7adb6]">
          Vai abrir o menu do seu celular — escolha{" "}
          <strong className="text-[#f5f5f5]">
            Salvar em Arquivos
          </strong>
          .
        </p>
      )}

      {erro && (
        <p className="text-center text-xs leading-5 text-red-300">
          {erro} Se continuar, abra em &quot;Ver na tela&quot; e
          use o botão de compartilhar do seu celular para salvar.
        </p>
      )}

      <noscript>
        <a
          href={endereco}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-3.5 text-sm font-bold text-[#f5f5f5]"
        >
          Baixar o PDF
        </a>
      </noscript>
    </>
  );
}
