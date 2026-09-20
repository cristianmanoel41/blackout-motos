import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  ClipboardCheck,
  FileCheck2,
  Headset,
  KeyRound,
  MapPin,
  Repeat2,
  ShieldCheck,
  Wallet,
  Wrench,
} from "lucide-react";
import { estoqueDoSite } from "@/lib/dados/estoque-site";
import CardNovo from "@/components/novo/CardNovo";
import { IconeWhatsApp } from "@/components/site/IconeWhatsApp";
import {
  IconeGoogleMaps,
  IconeWaze,
} from "@/components/site/IconeMapa";
import {
  CONVITE_GERAL,
  ENDERECO_COMPLETO,
  GOOGLE,
  HORARIOS,
  linkWhatsApp,
  LOJA,
  MAPA,
  MENU,
  WAZE,
} from "@/lib/dados/loja";

/*
 * Versão nova do site - só no localhost, em /novo.
 *
 * O que muda em relação ao que está no ar: fundo com halos
 * dourados em movimento lento no lugar de preto chapado, cards
 * com profundidade de verdade, blocos que entram ao rolar,
 * esteira de marcas e o processo da loja em linha do tempo.
 *
 * O conteúdo é o mesmo e vem do mesmo lugar: o estoque sai de
 * estoque_publico, e nenhum dado novo foi inventado para
 * encher a tela.
 */

export const dynamic = "force-dynamic";

const GARANTIAS = [
  {
    Icone: ShieldCheck,
    titulo: "Motos revisadas",
    texto: "Segurança e procedência",
  },
  {
    Icone: Wallet,
    titulo: "Financiamento",
    texto: "As melhores condições",
  },
  {
    Icone: Repeat2,
    titulo: "Aceitamos troca",
    texto: "Mais valor no seu usado",
  },
  {
    Icone: Headset,
    titulo: "Atendimento",
    texto: "Do início ao fim",
  },
];

const ETAPAS = [
  {
    Icone: ClipboardCheck,
    titulo: "Perícia cautelar",
    texto:
      "Só entra no pátio com o laudo aprovado. Chassi, numeração e histórico conferidos.",
  },
  {
    Icone: Wrench,
    titulo: "Revisão mecânica",
    texto:
      "O que precisa de reparo é resolvido antes de ser anunciada.",
  },
  {
    Icone: FileCheck2,
    titulo: "Documentação",
    texto:
      "Débitos e restrições conferidos. A transferência sai pela loja.",
  },
  {
    Icone: KeyRound,
    titulo: "Pronta para rodar",
    texto:
      "Fotografada e anunciada com o preço na tela. O que você vê está no pátio.",
  },
];

const MARCAS = [
  "Honda",
  "Yamaha",
  "Kawasaki",
  "Suzuki",
  "BMW",
  "Dafra",
  "Royal Enfield",
];

export default async function NovoPage() {
  const { motos, fotos, slugs } = await estoqueDoSite();

  const destaques = motos.slice(0, 4);

  return (
    <>
      {/* ---------- CABEÇALHO ---------- */}

      <header className="sticky top-0 z-50 border-b border-white/[.06] bg-[#08080a]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link href="/novo" className="shrink-0">
            <Image
              src="/logo-blackout-site.png"
              alt={LOJA.nome}
              width={1774}
              height={887}
              priority
              className="h-11 w-auto sm:h-14"
            />
          </Link>

          <nav className="ml-auto hidden items-center gap-8 lg:flex">
            {MENU.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group relative text-sm font-semibold suave transition hover:text-white"
              >
                {item.nome}

                {/* O risco cresce do centro ao passar o mouse. */}
                <span className="risco absolute -bottom-1.5 left-1/2 h-px w-0 -translate-x-1/2 transition-all duration-300 group-hover:left-0 group-hover:w-full group-hover:translate-x-0" />
              </Link>
            ))}
          </nav>

          <a
            href={linkWhatsApp(CONVITE_GERAL)}
            target="_blank"
            rel="noopener noreferrer"
            className="ouro-cheio ml-auto flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold lg:ml-8 lg:px-6 lg:py-3"
          >
            <IconeWhatsApp className="h-4 w-4" />
            <span className="hidden sm:inline">
              Fale no WhatsApp
            </span>
            <span className="sm:hidden">WhatsApp</span>
          </a>
        </div>
      </header>

      <main>
        {/* ---------- CAPA ---------- */}

        <section className="aurora border-b border-white/[.06]">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:py-28 lg:py-32">
            <div className="max-w-2xl">
              <span className="vidro inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] ouro">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#e0b129] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#e0b129]" />
                </span>
                {motos.length} motos à pronta entrega
              </span>

              <h1 className="mt-7 text-[2.6rem] font-black uppercase leading-[0.98] tracking-tight claro sm:text-7xl">
                Sua próxima
                <br />
                <span className="ouro">moto</span> está aqui
              </h1>

              <p className="mt-6 max-w-lg text-sm leading-7 suave sm:text-base">
                Qualidade, procedência e o melhor
                atendimento. Perícia cautelar aprovada,
                garantia de 3 meses e documentação resolvida
                pela loja.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="#estoque"
                  className="ouro-cheio flex items-center justify-center gap-2 rounded-full px-8 py-4 text-sm font-bold"
                >
                  Ver estoque
                  <ArrowRight size={16} />
                </Link>

                <a
                  href={linkWhatsApp(CONVITE_GERAL)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="vidro flex items-center justify-center gap-2 rounded-full px-8 py-4 text-sm font-bold"
                >
                  <IconeWhatsApp className="h-4 w-4" />
                  Falar agora
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- GARANTIAS ---------- */}

        <section className="mx-auto max-w-7xl px-4 py-10">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {GARANTIAS.map(
              ({ Icone, titulo, texto }, posicao) => (
                <article
                  key={titulo}
                  className="cartao sobe flex items-center gap-3.5 px-5 py-5"
                  style={{
                    animationDelay: `${posicao * 60}ms`,
                  }}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e0b129]/10 ring-1 ring-[#e0b129]/25">
                    <Icone size={20} className="ouro" />
                  </span>

                  <span className="min-w-0">
                    <span className="block text-sm font-bold leading-tight claro">
                      {titulo}
                    </span>
                    <span className="mt-0.5 block text-xs suave">
                      {texto}
                    </span>
                  </span>
                </article>
              )
            )}
          </div>
        </section>

        {/* ---------- ESTOQUE ---------- */}

        <section
          id="estoque"
          className="mx-auto max-w-7xl scroll-mt-24 px-4 py-14"
        >
          <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
            <div className="sobe">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] ouro">
                Estoque
              </p>

              <h2 className="mt-2 text-3xl font-black uppercase leading-none claro sm:text-4xl">
                Motos em{" "}
                <span className="ouro">destaque</span>
              </h2>

              <p className="mt-2.5 text-sm suave">
                As últimas que chegaram, prontas para rodar.
              </p>
            </div>

            <Link
              href="/estoque"
              className="vidro group flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold"
            >
              Ver as {motos.length} motos
              <ArrowUpRight
                size={15}
                className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>
          </div>

          {destaques.length === 0 ? (
            <article className="cartao p-12 text-center text-sm suave">
              Estamos renovando o estoque. Fale com a gente no
              WhatsApp: chega moto nova toda semana.
            </article>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {destaques.map((moto, posicao) => (
                <CardNovo
                  key={moto.id}
                  moto={moto}
                  slug={slugs[moto.id]}
                  capa={fotos.capas[moto.id]}
                  fotos={
                    (fotos.galerias[moto.id] || []).length
                  }
                  posicao={posicao}
                  destaque={posicao === 0}
                />
              ))}
            </div>
          )}
        </section>

        {/* ---------- PROCESSO ---------- */}

        <section className="aurora border-y border-white/[.06] bg-[#0b0b0f]">
          <div className="mx-auto max-w-7xl px-4 py-16 lg:py-20">
            <div className="sobe text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] ouro">
                Nosso processo
              </p>

              <h2 className="mt-2 text-3xl font-black uppercase leading-none claro sm:text-4xl">
                Como a moto chega até você
              </h2>

              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 suave">
                Nenhuma moto é anunciada antes de cumprir
                estas quatro etapas.
              </p>
            </div>

            <ol className="relative mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {ETAPAS.map(
                ({ Icone, titulo, texto }, posicao) => (
                  <li
                    key={titulo}
                    className="cartao sobe p-6"
                    style={{
                      animationDelay: `${posicao * 90}ms`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e0b129]/10 ring-1 ring-[#e0b129]/25">
                        <Icone size={21} className="ouro" />
                      </span>

                      <span className="text-4xl font-black leading-none text-white/[.06]">
                        {posicao + 1}
                      </span>
                    </div>

                    <h3 className="mt-5 text-base font-bold claro">
                      {titulo}
                    </h3>

                    <p className="mt-2 text-sm leading-6 suave">
                      {texto}
                    </p>
                  </li>
                )
              )}
            </ol>
          </div>
        </section>

        {/* ---------- MARCAS ---------- */}

        <section className="overflow-hidden border-b border-white/[.06] py-10">
          <div className="esteira gap-14 px-7">
            {[...MARCAS, ...MARCAS].map((marca, indice) => (
              <span
                key={`${marca}-${indice}`}
                className="whitespace-nowrap text-xl font-black uppercase tracking-wider text-white/25 transition hover:text-white/70 sm:text-2xl"
              >
                {marca}
              </span>
            ))}
          </div>
        </section>

        {/* ---------- AVALIAÇÕES ---------- */}

        <section className="mx-auto max-w-4xl px-4 py-16 text-center">
          <div className="sobe">
            <h2 className="text-3xl font-black uppercase leading-none claro sm:text-4xl">
              O que dizem{" "}
              <span className="ouro">sobre a gente</span>
            </h2>

            <p className="mx-auto mt-4 max-w-lg text-sm leading-7 suave">
              A confiança de quem já comprou é o que nos move.
              Veja no Google a experiência de quem passou pela{" "}
              {LOJA.nome}.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href={GOOGLE.perfil}
                target="_blank"
                rel="noopener noreferrer"
                className="ouro-cheio flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-bold"
              >
                Ver avaliações no Google
                <ArrowRight size={15} />
              </a>

              <a
                href={GOOGLE.avaliar}
                target="_blank"
                rel="noopener noreferrer"
                className="vidro flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-bold"
              >
                Avaliar a loja
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ---------- RODAPÉ ---------- */}

      <footer className="border-t border-white/[.06] bg-[#060608]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Image
              src="/logo-blackout-site.png"
              alt={LOJA.nome}
              width={1774}
              height={887}
              className="h-16 w-auto"
            />

            <p className="mt-5 max-w-xs text-sm leading-6 suave">
              Motos seminovas selecionadas, com procedência e
              documentação resolvida pela loja.
            </p>
          </div>

          <nav>
            <p className="text-sm font-bold claro">
              Navegação
            </p>

            <ul className="mt-4 space-y-2.5">
              {MENU.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm suave transition hover:text-white"
                  >
                    {item.nome}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="text-sm font-bold claro">
              Onde estamos
            </p>

            <p className="mt-4 flex gap-2.5 text-sm leading-6 suave">
              <MapPin
                size={17}
                className="mt-0.5 shrink-0 ouro"
              />
              {ENDERECO_COMPLETO}
            </p>

            <div className="mt-4 flex gap-2">
              <a
                href={MAPA}
                target="_blank"
                rel="noopener noreferrer"
                className="vidro flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold"
              >
                <IconeGoogleMaps className="h-3.5 w-3.5" />
                Maps
              </a>

              <a
                href={WAZE}
                target="_blank"
                rel="noopener noreferrer"
                className="vidro flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold"
              >
                <IconeWaze className="h-3.5 w-3.5" />
                Waze
              </a>
            </div>
          </div>

          <div>
            <p className="text-sm font-bold claro">
              Atendimento
            </p>

            <ul className="mt-4 space-y-1.5">
              {HORARIOS.map((item) => (
                <li
                  key={item.texto}
                  className="flex justify-between gap-3 text-sm suave"
                >
                  <span>{item.texto}</span>
                  <span className="font-semibold claro">
                    {item.horas}
                  </span>
                </li>
              ))}
            </ul>

            <a
              href={linkWhatsApp(CONVITE_GERAL)}
              target="_blank"
              rel="noopener noreferrer"
              className="ouro-cheio mt-5 flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold"
            >
              <IconeWhatsApp className="h-4 w-4" />
              {LOJA.whatsappExibicao}
            </a>
          </div>
        </div>

        <div className="risco h-px" />

        <p className="mx-auto max-w-7xl px-4 py-5 text-center text-xs suave">
          © {new Date().getFullYear()} {LOJA.nome} · Versão
          nova, só no localhost
        </p>
      </footer>
    </>
  );
}
