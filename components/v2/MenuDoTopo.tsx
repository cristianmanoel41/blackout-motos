"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MENU } from "@/lib/dados/loja";

/*
 * Os links do topo, com o da página aberta aceso.
 *
 * Fica separado do cabeçalho porque só ele precisa saber o
 * endereço: o resto do cabeçalho continua vindo pronto do
 * servidor. Antes o "Início" ficava aceso em toda página.
 *
 * A ficha de uma moto acende "Estoque", e a proposta acende
 * "Financiamento": quem está ali chegou por eles.
 */
export default function MenuDoTopo() {
  const caminho = usePathname() || "/";

  function aberto(href: string) {
    if (href === "/") return caminho === "/";

    return caminho === href || caminho.startsWith(`${href}/`);
  }

  return (
    <nav className="hidden items-center gap-7 lg:flex">
      {MENU.map((item) => {
        const atual = aberto(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={atual ? "page" : undefined}
            className={`text-[13px] font-semibold transition ${
              atual ? "ouro" : "suave hover:text-white"
            }`}
          >
            {item.nome}
          </Link>
        );
      })}
    </nav>
  );
}
