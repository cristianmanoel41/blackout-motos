import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import {
  CONVITE_GERAL,
  linkWhatsApp,
  LOJA,
  MENU,
} from "@/lib/dados/loja";
import { IconeWhatsApp } from "@/components/site/IconeWhatsApp";

/*
 * Cabeçalho da versão trabalhada.
 *
 * As opções são as mesmas do site no ar - saem da mesma lista
 * em lib/dados/loja.ts, então menu novo entra nas duas versões
 * de uma vez.
 *
 * No celular o menu é <details>, recurso do próprio navegador,
 * e NÃO estado em JavaScript: num aparelho onde o script não
 * roda, botão com onClick não responde - foi o que aconteceu
 * no celular da loja.
 *
 * Sem "use client": esta página é servida pronta, e nada aqui
 * precisa do navegador para funcionar.
 */

/*
 * Enquanto esta versão mora em /novo, o "Início" volta para
 * cá. No dia em que ela virar o site, é trocar por "/".
 */
const INICIO = "/novo";

function enderecoDoItem(href: string) {
  return href === "/" ? INICIO : href;
}

export default function CabecalhoNovo() {
  return (
    <header className="relative z-30 mx-auto max-w-[1400px] px-5 sm:px-8">
      <div className="flex items-center gap-4 py-6">
        <Link
          href={INICIO}
          className="shrink-0"
          aria-label={LOJA.nome}
        >
          <Image
            src="/logo-blackout-site.png"
            alt={LOJA.nome}
            width={1774}
            height={887}
            priority
            className="h-11 w-auto"
          />
        </Link>

        <nav className="ml-auto hidden items-center gap-8 lg:flex">
          {MENU.map((item) => (
            <Link
              key={item.href}
              href={enderecoDoItem(item.href)}
              /* Só a capa é a página de agora. */
              aria-current={item.href === "/" ? "page" : undefined}
              className={`text-sm font-semibold transition ${
                item.href === "/"
                  ? "ouro"
                  : "suave hover:text-white"
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
          className="botao ml-auto flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm lg:ml-8"
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
          className="absolute right-5 top-6 flex h-[42px] w-[42px] cursor-pointer list-none items-center justify-center border border-white/15 text-white/80 sm:right-8 [&::-webkit-details-marker]:hidden">
          <Menu size={20} className="group-open:hidden" />
          <X size={20} className="hidden group-open:block" />
        </summary>

        <nav className="cartao-relevo mb-4 px-2 py-2">
          {MENU.map((item) => (
            <Link
              key={item.href}
              href={enderecoDoItem(item.href)}
              className={`block px-4 py-3.5 text-sm font-semibold ${
                item.href === "/" ? "ouro" : "claro"
              }`}
            >
              {item.nome}
            </Link>
          ))}
        </nav>
      </details>
    </header>
  );
}
