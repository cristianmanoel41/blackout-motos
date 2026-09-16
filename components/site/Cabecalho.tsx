"use client";

import { useState } from "react";
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
 * a um toque. No celular o menu vira gaveta, senão os cinco
 * itens espremem a logo.
 */

export default function Cabecalho() {
  const [aberto, setAberto] = useState(false);
  const caminho = usePathname();

  function ehAtual(href: string) {
    if (href === "/") return caminho === "/";

    return caminho.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/[.07] bg-[#0a0a0c]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
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
          className="botao-ouro ml-auto hidden items-center gap-2 rounded-full px-6 py-3 text-sm font-bold lg:ml-6 lg:flex"
        >
          <IconeWhatsApp className="h-4 w-4" />
          Fale no WhatsApp
        </a>

        <button
          type="button"
          onClick={() => setAberto((estava) => !estava)}
          aria-label={aberto ? "Fechar menu" : "Abrir menu"}
          aria-expanded={aberto}
          className="botao-vidro ml-auto rounded-xl p-2.5 lg:hidden"
        >
          {aberto ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {aberto && (
        <nav className="border-t border-white/[.07] px-4 py-3 lg:hidden">
          {MENU.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setAberto(false)}
              className={`block border-b border-white/[.05] py-3.5 text-sm font-semibold transition ${
                ehAtual(item.href)
                  ? "texto-ouro"
                  : "texto-claro"
              }`}
            >
              {item.nome}
            </Link>
          ))}

          <a
            href={linkWhatsApp(CONVITE_GERAL)}
            target="_blank"
            rel="noopener noreferrer"
            className="botao-ouro mt-4 flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold"
          >
            <IconeWhatsApp className="h-4 w-4" />
            Fale no WhatsApp
          </a>
        </nav>
      )}
    </header>
  );
}
