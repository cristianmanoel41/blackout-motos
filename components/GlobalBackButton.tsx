"use client";

import { usePathname, useRouter } from "next/navigation";

export default function GlobalBackButton() {
  const pathname = usePathname();
  const router = useRouter();

  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/dashboard" ||
    /*
     * A vitrine é do cliente, não da loja: ele não tem para
     * onde voltar, e o botão levaria ao painel interno.
     */
    pathname.startsWith("/vitrine/") ||
    pathname.startsWith("/contrato/") ||
    /* O site e do cliente: ele chegou pelo Google, nao de outra
       tela do sistema, e tem o proprio menu. */
    pathname === "/v2" ||
    pathname === "/estoque" ||
    pathname === "/encontre-sua-moto" ||
    pathname.startsWith("/estoque/") ||
    pathname === "/financiamento" ||
    pathname.startsWith("/financiamento/") ||
    pathname === "/sobre" ||
    pathname === "/compramos-sua-moto" ||
    pathname === "/contato" ||
    pathname === "/privacidade" ||
    pathname === "/termos"
  ) {
    return null;
  }

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <button
      onClick={handleBack}
      data-voltar
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 99999,
        /* v4: discreto, para não brigar com o botão dourado
           de ação da tela. */
        backgroundColor: "rgba(24,24,27,.85)",
        color: "#ededef",
        border: "1px solid rgba(255,255,255,.12)",
        borderRadius: "999px",
        padding: "10px 16px",
        fontSize: "14px",
        fontWeight: "500",
        cursor: "pointer",
        backdropFilter: "blur(10px)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
      }}
    >
      ← Voltar
    </button>
  );
}