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
    /* O site e do cliente: ele chegou pelo Google, nao de outra
       tela do sistema, e tem o proprio menu. */
    pathname === "/estoque" ||
    pathname.startsWith("/estoque/") ||
    pathname === "/financiamento" ||
    pathname === "/sobre" ||
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
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 99999,
        backgroundColor: "#d4af37",
        color: "#000000",
        border: "none",
        borderRadius: "10px",
        padding: "12px 18px",
        fontSize: "15px",
        fontWeight: "700",
        cursor: "pointer",
        boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
      }}
    >
      ← Voltar
    </button>
  );
}