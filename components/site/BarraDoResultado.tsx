"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

/*
 * A parcela grudada no rodapé do celular.
 *
 * No celular a conta completa fica embaixo dos campos, e quem
 * está arrastando a barra da entrada não vê o número mudar.
 * Esta barra mostra a parcela o tempo todo e some quando a
 * conta completa aparece na tela - as duas juntas seriam o
 * mesmo número duas vezes.
 *
 * Vai por portal para a raiz do site (.site-blackout): dentro
 * do simulador, qualquer animação de entrada com transform
 * prenderia o `fixed` na caixa em vez de na tela. E não para o
 * <body>, porque os estilos do site (botão de ouro, cores do
 * texto) só valem dentro da raiz.
 */
export default function BarraDoResultado({
  rotulo,
  valor,
  alvo,
}: {
  rotulo: string;
  valor: string;
  alvo: HTMLElement | null;
}) {
  const [alvoNaTela, setAlvoNaTela] = useState(false);

  useEffect(() => {
    if (!alvo || typeof IntersectionObserver === "undefined") return;

    const observador = new IntersectionObserver(
      ([entrada]) => setAlvoNaTela(entrada.isIntersecting),
      { threshold: 0.25 }
    );

    observador.observe(alvo);

    return () => observador.disconnect();
  }, [alvo]);

  /* Só existe depois de a pessoa escolher como pagar, ou
     seja, sempre no navegador - a trava é só por garantia. */
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="sim-barra"
      data-escondida={alvoNaTela ? "true" : undefined}
      aria-hidden={alvoNaTela}
    >
      <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold uppercase tracking-[0.14em] texto-ouro">
            {rotulo}
          </p>
          <p className="truncate text-lg font-black tabular-nums texto-claro">
            {valor}
          </p>
        </div>

        <button
          type="button"
          tabIndex={alvoNaTela ? -1 : 0}
          onClick={() =>
            alvo?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
          aria-label="Ver detalhes da simulação"
          className="botao-ouro inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        >
          <ChevronDown size={20} aria-hidden="true" />
        </button>
      </div>
    </div>,
    document.querySelector(".site-blackout") || document.body
  );
}
