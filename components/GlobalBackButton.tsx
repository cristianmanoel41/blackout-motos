"use client";

export default function GlobalBackButton() {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 99999,
        background: "red",
        color: "white",
        padding: "20px",
        fontSize: "20px",
      }}
    >
      TESTE VOLTAR
    </div>
  );
}