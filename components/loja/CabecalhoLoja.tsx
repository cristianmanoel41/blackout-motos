import Link from "next/link";
import {
  ENDERECO_COMPLETO,
  linkWhatsApp,
  LOJA,
} from "@/lib/dados/loja";

/*
 * Cabeçalho e rodapé do site, iguais em toda página.
 *
 * São <header> e <footer> de propósito: o tema do painel pinta
 * de preto qualquer div com borda e canto arredondado, e numa
 * página clara isso vira um bloco escuro no meio do branco.
 * Elemento semântico passa limpo.
 */

const CONVITE =
  "Olá! Vi o site da Blackout Motos e quero falar sobre uma moto.";

export function CabecalhoLoja() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white/95 backdrop-blur">
      <div className="h-1 bg-gradient-to-r from-[#bd8700] via-[#e0b129] to-[#bd8700]" />

      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/loja" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-blackout-menu.png"
            alt={LOJA.nome}
            className="h-10 w-auto object-contain sm:h-12"
          />
        </Link>

        <a
          href={linkWhatsApp(CONVITE)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-95"
        >
          WhatsApp
        </a>
      </div>
    </header>
  );
}

export function RodapeLoja() {
  return (
    <footer className="mt-12 border-t border-black/10 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-blackout-menu.png"
          alt={LOJA.nome}
          className="mx-auto h-12 w-auto object-contain"
        />

        <p className="mt-5 text-sm font-semibold text-[#0b0b0d]">
          Venha conhecer a loja
        </p>

        <p className="mt-2 text-sm leading-6 text-black/60">
          {ENDERECO_COMPLETO}
          <br />
          CEP {LOJA.cep}
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <a
            href={linkWhatsApp(CONVITE)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-[#25D366] px-6 py-3 text-sm font-bold text-white transition hover:brightness-95"
          >
            Falar no WhatsApp
          </a>

          <a
            href="tel:+551239173777"
            className="rounded-xl border border-black/15 px-6 py-3 text-sm font-bold text-[#0b0b0d] transition hover:border-black/40"
          >
            {LOJA.telefone}
          </a>
        </div>

        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${LOJA.endereco}, ${LOJA.cidade} ${LOJA.estado}`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-block text-sm font-semibold text-[#a97800] underline underline-offset-4"
        >
          Como chegar
        </a>

        <p className="mt-8 text-xs text-black/40">
          {LOJA.nome} · {LOJA.cidade}/{LOJA.estado}
        </p>
      </div>
    </footer>
  );
}
