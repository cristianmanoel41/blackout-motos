"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import {
  CONVITE_GERAL,
  linkWhatsApp,
  LOJA,
  MENU,
} from "@/lib/dados/loja";
import { IconeWhatsApp } from "@/components/site/IconeWhatsApp";

/*
 * Cabeçalho do site.
 *
 * Fica grudado no topo porque o botão do WhatsApp é o caminho
 * principal de contato - em qualquer ponto da página ele está
 * a um toque. Por isso ele aparece também no celular, e não
 * dentro do menu.
 *
 * O menu do celular é <details>, o recurso do próprio
 * navegador, e NÃO estado em JavaScript: num aparelho onde o
 * script não roda, o botão com onClick simplesmente não
 * responde - foi o que aconteceu no celular da loja.
 *
 * O <summary> fica posicionado dentro da barra, e o painel
 * abre logo abaixo, em fluxo: a barra cresce e o conteúdo
 * desce junto, em vez de ficar coberto.
 */

export default function Cabecalho() {
  const caminho = usePathname();

  function ehAtual(href: string) {
    if (href === "/") return caminho === "/";

    return caminho.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/[.07] bg-[#0a0a0c]/95 backdrop-blur-md">
      <div className="relative mx-auto max-w-7xl">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link
            href="/"
            className="shrink-0"
            aria-label={LOJA.nome}
          >
            <Image
              src="/logo-blackout-site.png"
              alt={LOJA.nome}
              width={1774}
              height={887}
              priority
              className="h-11 w-auto sm:h-14"
            />
          </Link>

          <nav className="ml-auto hidden items-center gap-7 lg:flex">
            {MENU.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-semibold transition ${
                  ehAtual(item.href)
                    ? "texto-ouro"
                    : "texto-suave hover:text-white"
                }`}
              >
                {item.nome}
              </Link>
            ))}
          </nav>

          <a
            href={linkWhatsApp(CONVITE_GERAL)}
            target="_blank"
            rel="noopener noreferrer"
            className="botao-ouro ml-auto flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold lg:ml-6 lg:px-6 lg:py-3"
          >
            <IconeWhatsApp className="h-4 w-4" />
            <span className="hidden sm:inline">
              Fale no WhatsApp
            </span>
            <span className="sm:hidden">WhatsApp</span>
          </a>

          {/* Lugar reservado para o botão do menu. */}
          <span
            aria-hidden="true"
            className="h-[42px] w-[42px] shrink-0 lg:hidden"
          />
        </div>

        <details className="group lg:hidden">
          <summary
            aria-label="Menu"
            className="botao-vidro absolute right-4 top-3 flex h-[42px] w-[42px] cursor-pointer list-none items-center justify-center rounded-xl [&::-webkit-details-marker]:hidden"
          >
            <Menu size={20} className="group-open:hidden" />
            <X
              size={20}
              className="hidden group-open:block"
            />
          </summary>

          <nav className="border-t border-white/[.07] bg-[#0e0e12] px-3 py-2">
            {MENU.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-xl px-4 py-3.5 text-sm font-semibold transition ${
                  ehAtual(item.href)
                    ? "bg-white/[.06] texto-ouro"
                    : "texto-claro"
                }`}
              >
                {item.nome}
              </Link>
            ))}
          </nav>
        </details>
      </div>
    </header>
  );
}
