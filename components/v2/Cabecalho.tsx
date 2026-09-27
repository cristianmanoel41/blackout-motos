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
import Busca, { type MotoBusca } from "@/components/v2/Busca";

/*
 * O cabeçalho da versão 2.
 *
 * Grudado no topo porque o WhatsApp é o caminho principal de
 * contato: em qualquer ponto da página ele está a um toque.
 * Por isso o botão aparece também no celular, fora do menu.
 *
 * O menu do celular é <details>, recurso do próprio navegador,
 * e NÃO estado em JavaScript: em aparelho onde o script não
 * roda, botão com clique programado não responde - foi o que
 * já aconteceu no celular da loja.
 *
 * As opções saem da mesma lista do site no ar, então opção
 * nova entra nas duas versões de uma vez.
 */

/* Enquanto a versão 2 mora em /v2, o "Início" volta para cá. */
const INICIO = "/v2";

function endereco(href: string) {
  return href === "/" ? INICIO : href;
}

export default function Cabecalho({
  motos,
}: {
  motos: MotoBusca[];
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[.07] bg-[#08080a]/90 backdrop-blur-md">
      <div className="relative mx-auto max-w-[1400px]">
        <div className="flex items-center gap-4 px-4 py-3 sm:px-6">
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
              className="h-10 w-auto sm:h-12"
            />
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {MENU.map((item) => (
              <Link
                key={item.href}
                href={endereco(item.href)}
                aria-current={
                  item.href === "/" ? "page" : undefined
                }
                className={`text-[13px] font-semibold transition ${
                  item.href === "/"
                    ? "ouro"
                    : "suave hover:text-white"
                }`}
              >
                {item.nome}
              </Link>
            ))}
          </nav>

          <Busca
            motos={motos}
            className="ml-auto hidden w-64 xl:block"
          />

          <a
            href={linkWhatsApp(CONVITE_GERAL)}
            target="_blank"
            rel="noopener noreferrer"
            className="botao-ouro ml-auto flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-[13px] xl:ml-4 xl:px-5"
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
            className="botao-vidro absolute right-4 top-3 flex h-[42px] w-[42px] cursor-pointer list-none items-center justify-center rounded-xl sm:right-6 [&::-webkit-details-marker]:hidden"
          >
            <Menu size={20} className="group-open:hidden" />
            <X size={20} className="hidden group-open:block" />
          </summary>

          <div className="border-t border-white/[.07] bg-[#0c0c10] px-4 py-3 sm:px-6">
            <Busca motos={motos} className="xl:hidden" />

            <nav className="mt-2">
              {MENU.map((item) => (
                <Link
                  key={item.href}
                  href={endereco(item.href)}
                  className={`block rounded-xl px-4 py-3.5 text-sm font-semibold ${
                    item.href === "/" ? "ouro" : "claro"
                  }`}
                >
                  {item.nome}
                </Link>
              ))}
            </nav>
          </div>
        </details>
      </div>
    </header>
  );
}
