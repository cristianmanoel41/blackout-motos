import type { ReactNode } from "react";
import LinkControleCaixa from "./LinkControleCaixa";

export default function CaixaLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      {children}
      <LinkControleCaixa />
    </>
  );
}
