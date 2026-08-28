"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scale } from "lucide-react";

export default function LinkControleCaixa() {
  const pathname = usePathname();

  if (
    pathname.startsWith(
      "/caixa/conciliacao"
    )
  ) {
    return null;
  }

  return (
    <Link
      href="/caixa/conciliacao"
      className="fixed bottom-20 right-5 z-50 inline-flex items-center gap-2 rounded-xl border border-dourado/50 bg-dourado px-5 py-3 text-sm font-bold text-preto shadow-2xl transition hover:bg-dourado-claro"
      title="Saldo inicial e conciliação do caixa"
    >
      <Scale size={18} />
      Conciliar Caixa
    </Link>
  );
}
