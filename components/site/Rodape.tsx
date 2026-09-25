import Image from "next/image";
import Link from "next/link";
import { Clock, MapPin, Phone } from "lucide-react";
import { IconeRede } from "@/components/site/IconeRede";
import {
  IconeGoogleMaps,
  IconeWaze,
} from "@/components/site/IconeMapa";
import {
  HORARIOS,
  LOJA,
  MAPA,
  MENU,
  REDES,
  WAZE,
} from "@/lib/dados/loja";

/*
 * Rodapé do site.
 *
 * Três colunas, não quatro: as redes sociais são três ícones e
 * sobravam sozinhas numa coluna inteira, deixando um vazio
 * grande à direita. Agora ficam junto da marca, que é onde
 * fazem sentido.
 *
 * Os títulos são pequenos, em caixa alta e espaçados - rótulo
 * de seção, não concorrente do conteúdo. O que se lê fica
 * maior que eles.
 *
 * Rede social só aparece com endereço preenchido em
 * lib/dados/loja.ts: ícone que não leva a lugar nenhum passa a
 * impressão de site abandonado.
 */

const ANO = new Date().getFullYear();

const TITULO =
  "text-[11px] font-bold uppercase tracking-[0.22em] texto-ouro";

export default function Rodape() {
  const redes = REDES.filter((rede) => rede.url);

  return (
    <footer className="border-t border-white/[.07] bg-[#08080a]">
      <div className="mx-auto grid max-w-7xl gap-x-10 gap-y-9 px-4 py-11 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.8fr_1.2fr]">
        {/* ---------- MARCA ---------- */}

        <div>
          <Image
            src="/logo-blackout-site.png"
            alt={LOJA.nome}
            width={1774}
            height={887}
            className="h-14 w-auto"
          />

          <p className="mt-4 max-w-[34ch] text-[13px] leading-6 texto-suave">
            Motos seminovas selecionadas, com procedência e
            documentação resolvida pela loja.
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

        {/* ---------- NAVEGAÇÃO ---------- */}

        <nav>
          <p className={TITULO}>Navegação</p>

          <ul className="mt-4 space-y-2">
            {MENU.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-[15px] font-medium texto-suave transition hover:texto-claro"
                >
                  {item.nome}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* ---------- CONTATO ---------- */}

        <div>
          <p className={TITULO}>Contato</p>

          <div className="mt-4 space-y-4">
            <div className="flex gap-2.5">
              <MapPin
                size={16}
                className="mt-1 shrink-0 texto-ouro"
              />

              <div>
                <p className="text-[15px] font-semibold leading-6 texto-claro">
                  {LOJA.endereco}
                </p>

                <p className="text-[13px] leading-5 texto-suave">
                  {LOJA.bairro} · {LOJA.cidade}/
                  {LOJA.estado}
                  <br />
                  CEP {LOJA.cep}
                </p>

                <p className="mt-2 flex items-center gap-3">
                  <a
                    href={MAPA}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[13px] font-bold texto-ouro transition hover:text-white"
                  >
                    <IconeGoogleMaps className="h-3.5 w-3.5" />
                    Maps
                  </a>

                  <a
                    href={WAZE}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[13px] font-bold texto-ouro transition hover:text-white"
                  >
                    <IconeWaze className="h-3.5 w-3.5" />
                    Waze
                  </a>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Phone
                size={16}
                className="shrink-0 texto-ouro"
              />

              <a
                href={`https://wa.me/${LOJA.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[15px] font-semibold texto-claro transition hover:texto-ouro"
              >
                {LOJA.whatsappExibicao}
              </a>
            </div>

            <div className="flex gap-2.5">
              <Clock
                size={16}
                className="mt-0.5 shrink-0 texto-ouro"
              />

              {/*
                * Horário em duas colunas: o dia à esquerda e a
                * hora à direita, alinhadas. Em linha corrida a
                * pessoa precisa ler tudo para achar o sábado.
                */}
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
                {HORARIOS.map((item) => (
                  <div
                    key={item.texto}
                    className="contents"
                  >
                    <dt className="texto-suave">
                      {item.texto}
                    </dt>
                    <dd className="font-semibold texto-claro">
                      {item.horas}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="risco-rodape h-px" />

      <div className="mx-auto flex max-w-7xl flex-col gap-1.5 px-4 py-4 text-center text-[11px] tracking-wide texto-suave sm:flex-row sm:justify-between sm:text-left">
        <p>
          © {ANO} {LOJA.nome}. Todos os direitos reservados.
        </p>

        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:justify-start">
          <Link
            href="/privacidade"
            className="transition hover:texto-ouro"
          >
            Privacidade
          </Link>

          <span aria-hidden="true">·</span>

          <Link
            href="/termos"
            className="transition hover:texto-ouro"
          >
            Termos de uso
          </Link>
        </p>

        <p className="texto-ouro">
          Qualidade hoje. Liberdade sempre.
        </p>
      </div>
    </footer>
  );
}
