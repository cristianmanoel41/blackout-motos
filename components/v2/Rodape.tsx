import Image from "next/image";
import Link from "next/link";
import { Phone } from "lucide-react";
import {
  ENDERECO_COMPLETO,
  LOJA,
  MAPA,
  MENU,
  REDES,
  WAZE,
  linkWhatsApp,
  CONVITE_GERAL,
} from "@/lib/dados/loja";
import { IconeRede } from "@/components/site/IconeRede";
import {
  IconeGoogleMaps,
  IconeWaze,
} from "@/components/site/IconeMapa";
import { IconeWhatsApp } from "@/components/site/IconeWhatsApp";

/*
 * O rodapé da versão 2.
 *
 * Só entra a rede que tem endereço preenchido: ícone que não
 * leva a lugar nenhum passa a impressão de loja abandonada. O
 * YouTube fica de fora até a loja abrir o canal - basta
 * preencher em lib/dados/loja.ts que ele aparece aqui e no
 * site no ar de uma vez.
 *
 * Endereço, telefone e menu saem do mesmo arquivo que o
 * cabeçalho e os dados que o Google lê.
 */

const INICIO = "/";

export default function Rodape() {
  const redes = REDES.filter((rede) => rede.url);

  return (
    <footer className="border-t border-white/[.07] bg-[#0a0a0d]">
      <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr_1fr]">
          <div>
            <Image
              src="/logo-blackout-marca.png"
              alt={LOJA.nome}
              width={995}
              height={425}
              className="h-12 w-auto"
            />

            <p className="mt-5 max-w-xs text-[13px] leading-7 suave">
              {ENDERECO_COMPLETO}
            </p>

            <p className="mt-3 flex items-center gap-4">
              <a
                href={MAPA}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[13px] font-bold ouro transition hover:text-white"
              >
                <IconeGoogleMaps className="h-3.5 w-3.5" />
                Maps
              </a>

              <a
                href={WAZE}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[13px] font-bold ouro transition hover:text-white"
              >
                <IconeWaze className="h-3.5 w-3.5" />
                Waze
              </a>
            </p>

            {redes.length > 0 && (
              <ul className="mt-5 flex gap-2">
                {redes.map((rede) => (
                  <li key={rede.nome}>
                    <a
                      href={rede.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={rede.nome}
                      title={rede.nome}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[.04] transition hover:border-white/25 hover:bg-white/[.09]"
                    >
                      <IconeRede
                        nome={rede.nome}
                        className="h-[22px] w-[22px]"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <nav>
            <p className="rotulo">Navegação</p>

            <ul className="mt-4 space-y-2.5">
              {MENU.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href === "/" ? INICIO : item.href}
                    className="text-[14px] font-medium suave transition hover:text-white"
                  >
                    {item.nome}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="rotulo">Fale com a gente</p>

            {/*
              * O botao vem antes do numero.
              *
              * Quase todo mundo que chega aqui vai falar pelo
              * WhatsApp; o numero escrito serve para quem prefere
              * ligar, ou para anotar. Entao a acao fica no alto e
              * o numero logo abaixo, como alternativa.
              */}
            <a
              href={linkWhatsApp(CONVITE_GERAL)}
              target="_blank"
              rel="noopener noreferrer"
              className="botao-ouro mt-4 inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm"
            >
              <IconeWhatsApp className="h-4 w-4" />
              Fale no WhatsApp
            </a>

            {/*
              * Os dois números, cada um com o que ele é: o
              * WhatsApp e o fixo da loja. Sem a etiqueta, quem
              * liga para o celular achando que é a loja (ou
              * manda WhatsApp para o fixo) não é atendido.
              */}
            <dl className="mt-5 space-y-3">
              <div>
                <dt className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.14em] suave">
                  <IconeWhatsApp className="h-3.5 w-3.5" />
                  WhatsApp
                </dt>
                <dd className="titulo text-[1.6rem] claro">
                  {LOJA.whatsappExibicao}
                </dd>
              </div>

              <div>
                <dt className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.14em] suave">
                  <Phone className="h-3.5 w-3.5" />
                  Telefone da loja
                </dt>
                <dd>
                  <a
                    href={`tel:${LOJA.telefoneLink}`}
                    className="titulo text-[1.6rem] claro transition hover:text-white"
                  >
                    {LOJA.telefone}
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/[.07] pt-6 text-[12px] suave">
          <p>
            © {new Date().getFullYear()} {LOJA.nome}. Todos os
            direitos reservados.
          </p>

          <div className="flex gap-4">
            <Link
              href="/privacidade"
              className="transition hover:text-white"
            >
              Privacidade
            </Link>
            <Link
              href="/termos"
              className="transition hover:text-white"
            >
              Termos
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
