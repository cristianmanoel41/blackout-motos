"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/*
 * O site se atualiza sozinho quando algo muda (pedido de
 * 18/11/2026).
 *
 * A cada minuto, com a aba aberta na frente, pergunta ao
 * servidor a impressão digital do site (/api/site-versao):
 *
 *   - o estoque mudou (moto nova, vendida, preço, foto):
 *     router.refresh() traz os dados novos sem recarregar a
 *     página - a rolagem, o chat e o que a pessoa digitou
 *     continuam onde estavam;
 *   - saiu uma versão nova do site: aí precisa recarregar de
 *     verdade, mas só quando a pessoa sai e volta para a aba,
 *     para não piscar a tela no meio do que ela está fazendo.
 *
 * Com a aba escondida não pergunta nada; ao voltar, confere na
 * hora.
 */

const INTERVALO = 60 * 1000;

export default function AtualizarSozinho() {
  const router = useRouter();

  useEffect(() => {
    let versao: string | null = null;
    let deploy: string | null = null;
    let recarregarAoVoltar = false;
    let ocupado = false;

    async function conferir() {
      if (ocupado || document.visibilityState !== "visible") return;
      ocupado = true;
      try {
        const resposta = await fetch("/api/site-versao", { cache: "no-store" });
        if (!resposta.ok) return;
        const atual = (await resposta.json()) as { versao: string | null; deploy: string };

        if (deploy && atual.deploy !== deploy) recarregarAoVoltar = true;
        deploy = deploy || atual.deploy;

        if (atual.versao) {
          if (versao && atual.versao !== versao) router.refresh();
          versao = atual.versao;
        }
      } catch {
        /* Sem internet agora: tenta na próxima. */
      } finally {
        ocupado = false;
      }
    }

    function aoMudarDeAba() {
      if (document.visibilityState === "hidden") {
        if (recarregarAoVoltar) window.location.reload();
        return;
      }
      conferir();
    }

    conferir();
    const relogio = window.setInterval(conferir, INTERVALO);
    document.addEventListener("visibilitychange", aoMudarDeAba);

    return () => {
      window.clearInterval(relogio);
      document.removeEventListener("visibilitychange", aoMudarDeAba);
    };
  }, [router]);

  return null;
}
