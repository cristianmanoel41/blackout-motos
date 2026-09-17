import Image from "next/image";
import Link from "next/link";
import { Clock, MapPin, Phone } from "lucide-react";
import { IconeRede } from "@/components/site/IconeRede";
import {
  HORARIOS,
  LOJA,
  MAPA,
  MENU,
  REDES,
} from "@/lib/dados/loja";

/*
 * Rodapé do site.
 *
 * As redes sociais só aparecem quando têm endereço em
 * lib/dados/loja.ts: ícone que não leva a lugar nenhum passa a
 * impressão de site abandonado. Quando a loja mandar os links,
 * é só preencher lá e eles surgem aqui.
 */

const ANO = new Date().getFullYear();

export default function Rodape() {
  const redes = REDES.filter((rede) => rede.url);

  return (
    <footer className="border-t border-white/[.07] bg-[#08080a]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Image
            src="/logo-blackout-site.png"
            alt={LOJA.nome}
            width={1774}
            height={887}
            className="h-16 w-auto"
          />

          <p className="mt-4 max-w-xs text-sm leading-6 texto-suave">
            Motos seminovas selecionadas, com procedência e
            documentação resolvida pela loja.
          </p>
        </div>

        <nav>
          <p className="text-sm font-bold texto-claro">
            Navegação
          </p>

          <ul className="mt-4 space-y-2.5">
            {MENU.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm texto-suave transition hover:text-white"
                >
                  {item.nome}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="text-sm font-bold texto-claro">
            Contato
          </p>

          <ul className="mt-4 space-y-3.5 text-sm texto-suave">
            <li className="flex gap-2.5">
              <MapPin
                size={17}
                className="mt-0.5 shrink-0 texto-ouro"
              />

              <a
                href={MAPA}
                target="_blank"
                rel="noopener noreferrer"
                className="leading-6 transition hover:text-white"
              >
                {LOJA.endereco}
                <br />
                {LOJA.bairro}
                <br />
                {LOJA.cidade} - {LOJA.estado}
              </a>
            </li>

            <li className="flex items-center gap-2.5">
              <Phone
                size={17}
                className="shrink-0 texto-ouro"
              />

              <a
                href={`https://wa.me/${LOJA.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-white"
              >
                {LOJA.whatsappExibicao}
              </a>
            </li>

            <li className="flex gap-2.5">
              <Clock
                size={17}
                className="mt-0.5 shrink-0 texto-ouro"
              />

              <span className="leading-6">
                {HORARIOS.map((item) => (
                  <span key={item.texto} className="block">
                    {item.texto}: {item.horas}
                  </span>
                ))}
              </span>
            </li>


          </ul>
        </div>

        <div>
          <p className="text-sm font-bold texto-claro">
            Redes sociais
          </p>

          {redes.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2.5">
              {redes.map((rede) => (
                <li key={rede.nome}>
                  <a
                    href={rede.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={rede.nome}
                    title={rede.nome}
                    className="botao-vidro flex h-11 w-11 items-center justify-center rounded-xl"
                  >
                    <IconeRede nome={rede.nome} />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm leading-6 texto-suave">
              Em breve. Enquanto isso, fale com a gente
              pelo WhatsApp.
            </p>
          )}
        </div>
      </div>

      <div className="faixa-ouro h-px" />

      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-center text-xs texto-suave sm:flex-row sm:justify-between sm:text-left">
        <p>
          © {ANO} {LOJA.nome}. Todos os direitos
          reservados.
        </p>

        <p>Qualidade hoje. Liberdade sempre.</p>
      </div>
    </footer>
  );
}
