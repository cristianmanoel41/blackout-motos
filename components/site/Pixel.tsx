"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/*
 * O pixel do Meta, e o aviso de cookies que ele exige.
 *
 * O pixel é o que faz o anúncio deixar de entregar clique e
 * passar a entregar conversa: com ele o Meta sabe quem olhou
 * ficha de moto, quem chamou no WhatsApp e quem entrou na
 * lista - e passa a procurar mais gente parecida com quem
 * fez isso.
 *
 * Ele usa cookie e segue a pessoa fora do site, então aqui a
 * escolha é opt-in de verdade: nada carrega antes do
 * "Aceitar". Quem recusa navega igual, só não é medido. É o
 * que a LGPD pede, e é o que eu faria mesmo sem lei.
 *
 * Sem NEXT_PUBLIC_META_PIXEL_ID no ambiente, este componente
 * não existe: nenhum script, nenhuma tarja. O site fica como
 * era antes.
 */

const PIXEL = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";

/*
 * O Google Ads vai no mesmo aceite: também usa cookie e também
 * segue a pessoa, então só carrega depois do "Aceitar".
 *
 * NEXT_PUBLIC_GOOGLE_ADS_ID é o "AW-..." da conta. O rótulo da
 * conversão (NEXT_PUBLIC_GOOGLE_ADS_ZAP, o que vem depois da
 * barra no "AW-.../xxxx") é opcional: com ele, o clique no
 * WhatsApp vira conversão no Google. Sem nenhum dos dois, nada
 * muda.
 */
const ADS = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "";

const ADS_ZAP = process.env.NEXT_PUBLIC_GOOGLE_ADS_ZAP || "";

/* Há algo que precisa do aceite? */
const MEDE = Boolean(PIXEL || ADS);

const CHAVE = "blackout-cookies";

/* Avisa a página que o pixel subiu, para os eventos que
   aconteceram antes do aceite não se perderem. */
export const PRONTO = "meta-pixel-pronto";

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function carregarGoogleAds() {
  if (typeof window === "undefined" || !ADS) return;
  if (typeof window.gtag === "function") return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    // O gtag lê o `arguments` original, não um array.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };

  const script = document.createElement("script");

  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ADS)}`;

  document.head.appendChild(script);

  window.gtag("js", new Date());
  window.gtag("config", ADS);
}

function carregarTudo() {
  carregarPixel();
  carregarGoogleAds();
}

/*
 * Dispara um evento, se houver pixel e consentimento.
 *
 * Quem chama não precisa saber de nada disso: sem pixel, a
 * função simplesmente não faz nada.
 */
export function rastrear(
  evento: string,
  dados?: Record<string, unknown>
) {
  if (typeof window === "undefined") return;
  if (typeof window.fbq !== "function") return;

  window.fbq("track", evento, dados);
}

function carregarPixel() {
  if (typeof window === "undefined" || !PIXEL) return;
  if (typeof window.fbq === "function") return;

  /* O carregador do Meta, escrito à mão para não depender de
     script de terceiro além do deles. */
  const fila: any = function (...args: any[]) {
    fila.callMethod
      ? fila.callMethod.apply(fila, args)
      : fila.queue.push(args);
  };

  fila.queue = [];
  fila.loaded = true;
  fila.version = "2.0";
  fila.push = fila;

  window.fbq = fila;
  window._fbq = fila;

  const script = document.createElement("script");

  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";

  document.head.appendChild(script);

  window.fbq("init", PIXEL);
  window.fbq("track", "PageView");

  window.dispatchEvent(new Event(PRONTO));
}

export default function Pixel() {
  const [decidiu, setDecidiu] = useState(true);

  useEffect(() => {
    if (!MEDE) return;

    let escolha = "";

    try {
      escolha = localStorage.getItem(CHAVE) || "";
    } catch {
      /* Navegador com armazenamento bloqueado: trata como
         quem ainda não decidiu, e não mede nada. */
    }

    if (escolha === "sim") {
      carregarTudo();
      return;
    }

    if (escolha !== "nao") setDecidiu(false);
  }, []);

  /*
   * Clique em qualquer link de WhatsApp vira um evento.
   *
   * Escutar no documento inteiro, em vez de mexer em cada
   * botão: eles estão no cabeçalho, nos cards, na galeria, no
   * rodapé e no financiamento. Um lugar só para manter.
   */
  useEffect(() => {
    if (!MEDE) return;

    function aoClicar(evento: MouseEvent) {
      const alvo = (evento.target as HTMLElement)?.closest?.(
        "a[href*='wa.me'], a[href*='api.whatsapp.com']"
      );

      if (!alvo) return;

      rastrear("Contact");

      if (ADS && ADS_ZAP && typeof window.gtag === "function") {
        window.gtag("event", "conversion", {
          send_to: `${ADS}/${ADS_ZAP}`,
        });
      }
    }

    document.addEventListener("click", aoClicar);

    return () =>
      document.removeEventListener("click", aoClicar);
  }, []);

  function responder(aceitou: boolean) {
    try {
      localStorage.setItem(CHAVE, aceitou ? "sim" : "nao");
    } catch {
      /* Sem armazenamento, a escolha vale só nesta visita. */
    }

    setDecidiu(true);

    if (aceitou) carregarTudo();
  }

  if (!MEDE || decidiu) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4">
      <div className="cartao-3d mx-auto flex max-w-4xl flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center">
        <p className="flex-1 text-sm leading-6 texto-suave">
          Usamos cookies para entender quais motos são mais
          vistas e mostrar nossos anúncios a quem procura
          moto. Você pode recusar e continuar navegando
          normalmente.{" "}
          <Link
            href="/privacidade"
            className="font-bold texto-ouro underline"
          >
            Saiba mais
          </Link>
          .
        </p>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => responder(false)}
            className="botao-vidro rounded-full px-5 py-2.5 text-sm font-bold"
          >
            Recusar
          </button>

          <button
            type="button"
            onClick={() => responder(true)}
            className="botao-ouro rounded-full px-6 py-2.5 text-sm font-bold"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}
