"use client";

import { useEffect, useState } from "react";

/*
 * Botão de teste da página de diagnóstico.
 *
 * Separa duas coisas que parecem a mesma:
 *
 * - o navegador executar JavaScript (o script solto da página
 *   já responde por isso);
 * - o React assumir a página, o que é o que faz clique
 *   funcionar em qualquer botão do site.
 *
 * O aviso muda sozinho quando o React entra. Se ele continuar
 * dizendo que não entrou, todo clique do site está morto
 * naquele aparelho - e é o que precisamos descobrir.
 */

export default function BotaoTeste() {
  const [vivo, setVivo] = useState(false);
  const [toques, setToques] = useState(0);

  useEffect(() => {
    setVivo(true);
  }, []);

  return (
    <div style={{ marginTop: 6 }}>
      <p
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: vivo ? "#4ade80" : "#fca5a5",
        }}
      >
        {vivo
          ? "SIM - o React assumiu a página"
          : "NÃO - a página está sem interação"}
      </p>

      <button
        type="button"
        onClick={() => setToques((n) => n + 1)}
        style={{
          marginTop: 10,
          width: "100%",
          padding: "14px 16px",
          borderRadius: 12,
          border: "1px solid #e0b129",
          background: "#e0b129",
          color: "#17140a",
          fontSize: 15,
          fontWeight: 800,
        }}
      >
        Toque aqui para testar
      </button>

      <p
        style={{
          marginTop: 8,
          fontSize: 14,
          color: toques > 0 ? "#4ade80" : "#9ca3af",
        }}
      >
        {toques > 0
          ? `Funcionou: ${toques} toque${
              toques === 1 ? "" : "s"
            } registrado${toques === 1 ? "" : "s"}`
          : "Nenhum toque registrado ainda"}
      </p>
    </div>
  );
}
