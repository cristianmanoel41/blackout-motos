"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HardHat } from "lucide-react";

export default function VendaAcoesFixas({
  vendaId,
}: {
  vendaId: string;
}) {
  const pathname = usePathname();

  if (
    pathname ===
    `/vendas/${vendaId}/capacete`
  ) {
    return null;
  }

  return (
    <Link
      href={`/vendas/${vendaId}/capacete`}
      className="fixed bottom-20 right-5 z-50 inline-flex items-center gap-2 rounded-xl border border-yellow-400/50 bg-yellow-500 px-5 py-3 text-sm font-bold text-black shadow-2xl transition hover:bg-yellow-400"
      title="Adicionar capacete a esta venda"
    >
      <HardHat size={18} />
      Adicionar capacete
    </Link>
  );
}
