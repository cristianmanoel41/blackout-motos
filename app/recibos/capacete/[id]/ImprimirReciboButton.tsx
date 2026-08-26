"use client";

export default function ImprimirReciboButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-lg bg-yellow-500 px-5 py-2 text-sm font-bold text-black transition hover:bg-yellow-400"
    >
      Imprimir
    </button>
  );
}
