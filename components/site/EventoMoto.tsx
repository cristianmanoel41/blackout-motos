"use client";

import { useEffect, useRef } from "react";
import { PRONTO, rastrear } from "@/components/site/Pixel";

/*
 * Avisa o Meta que esta moto foi vista.
 *
 * O `id` é o mesmo do catálogo que o Meta busca de hora em
 * hora - é essa igualdade que liga as duas pontas e permite o
 * anúncio perseguir a moto certa: quem abriu a Twister e não
 * chamou volta a ver a Twister no Instagram.
 *
 * Espera o pixel existir para contar. Quem aceita os cookies
 * já está com a ficha aberta, então sem isso a primeira moto
 * vista de cada visitante nunca seria registrada.
 *
 * E conta UMA vez por moto: montar o componente e o pixel
 * subir acontecem quase juntos quando o consentimento já está
 * guardado, e sem a trava a mesma visita iria em dobro.
 */

export default function EventoMoto({
  id,
  nome,
  preco,
}: {
  id: string;
  nome: string;
  preco: number | null;
}) {
  const jaContou = useRef(false);

  useEffect(() => {
    function avisar() {
      if (jaContou.current) return;

      /* Sem pixel ainda: não conta, e espera o aviso. */
      if (typeof (window as any).fbq !== "function") return;

      jaContou.current = true;

      rastrear("ViewContent", {
        content_type: "product",
        content_ids: [id],
        content_name: nome,
        value: preco || undefined,
        currency: "BRL",
      });
    }

    avisar();

    window.addEventListener(PRONTO, avisar);

    return () => window.removeEventListener(PRONTO, avisar);
  }, [id, nome, preco]);

  return null;
}
