import type { ReactNode } from "react";
import VendaAcoesFixas from "./VendaAcoesFixas";

export default async function VendaIdLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      {children}
      <VendaAcoesFixas vendaId={id} />
    </>
  );
}
