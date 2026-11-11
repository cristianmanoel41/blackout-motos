"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, ChevronRight, Sparkles, X } from "lucide-react";
import { linkWhatsApp } from "@/lib/dados/loja";
import { IconeWhatsApp } from "@/components/site/IconeWhatsApp";

/*
 * "ACHE SUA MOTO" - O CHAT DO SITE
 *
 * Um botão no canto da tela, em todas as páginas do site. A
 * pessoa escreve do jeito dela ("quero uma moto até 20 mil") e
 * recebe as motos do estoque de hoje, com foto, preço e o
 * caminho para a ficha. Quem responde é /api/chat-estoque.
 *
 * Nada é gravado: a conversa vive só nesta aba.
 */

type MotoDoChat = {
  id: string;
  nome: string;
  ano: string;
  km: string;
  preco: string;
  slug: string;
  capa: string;
};

type Mensagem = {
  quem: "cliente" | "loja";
  texto: string;
  motos?: MotoDoChat[];
};

const SUGESTOES = [
  "Moto até R$ 15 mil",
  "Até 20 mil",
  "Quero uma automática",
  "Uma 160 pra trabalhar",
  "Honda com pouco km",
];

const BOAS_VINDAS: Mensagem = {
  quem: "loja",
  texto:
    "Oi! Me diz o que você procura, um valor, modelo ou marca, que eu procuro no estoque de hoje.",
};

export default function ChatEstoque() {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>([BOAS_VINDAS]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  /* No celular o botão vira só o ícone enquanto a pessoa desce a página. */
  const [recolhido, setRecolhido] = useState(false);
  const fim = useRef<HTMLDivElement>(null);
  const ultima = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  /*
   * Resposta com motos: a janela para no começo da resposta,
   * para a frase não sumir acima dos cards. O resto desce até
   * o fim, como em qualquer conversa.
   */
  useEffect(() => {
    const ult = mensagens[mensagens.length - 1];
    if (!pensando && ult?.quem === "loja" && ult.motos?.length) {
      ultima.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      fim.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [mensagens, pensando]);

  useEffect(() => {
    if (!aberto) return;
    campo.current?.focus({ preventScroll: true });

    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [aberto]);

  /*
   * Descendo a página, o botão encolhe para o ícone e deixa o
   * conteúdo à vista; subindo (ou no topo), volta com o nome.
   * A classe só pesa no celular - no computador há espaço.
   */
  useEffect(() => {
    let antes = window.scrollY;
    function rolou() {
      const agora = window.scrollY;
      if (agora < 120) setRecolhido(false);
      else if (agora > antes + 6) setRecolhido(true);
      else if (agora < antes - 6) setRecolhido(false);
      antes = agora;
    }
    window.addEventListener("scroll", rolou, { passive: true });
    return () => window.removeEventListener("scroll", rolou);
  }, []);

  /* Outras partes do site podem abrir o chat: window.dispatchEvent(new Event("abrir-chat-estoque")). */
  useEffect(() => {
    const abrir = () => setAberto(true);
    window.addEventListener("abrir-chat-estoque", abrir);
    return () => window.removeEventListener("abrir-chat-estoque", abrir);
  }, []);

  async function enviar(frase: string) {
    const limpa = frase.trim();
    if (!limpa || pensando) return;

    const historico = mensagens
      .filter((m) => m !== BOAS_VINDAS)
      .map((m) => ({ quem: m.quem, texto: m.texto }));

    setMensagens((atual) => [...atual, { quem: "cliente", texto: limpa }]);
    setTexto("");
    setPensando(true);

    try {
      const resposta = await fetch("/api/chat-estoque", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: limpa, historico }),
      });
      const corpo = await resposta.json().catch(() => null);

      setMensagens((atual) => [
        ...atual,
        {
          quem: "loja",
          texto:
            corpo?.resposta ||
            corpo?.error ||
            "Não consegui procurar agora. Tente de novo ou chame no WhatsApp.",
          motos: Array.isArray(corpo?.motos) ? corpo.motos : [],
        },
      ]);
    } catch {
      setMensagens((atual) => [
        ...atual,
        {
          quem: "loja",
          texto: "Sem conexão agora. Tente de novo em instantes.",
        },
      ]);
    } finally {
      setPensando(false);
    }
  }

  const soBoasVindas = mensagens.length === 1;

  return (
    <>
      {!aberto && (
        <button
          type="button"
          data-chat-botao
          data-recolhido={recolhido ? "sim" : undefined}
          onClick={() => setAberto(true)}
          className={`fixed bottom-4 right-4 z-40 flex h-12 items-center gap-2 rounded-full bg-[#e0b129] text-[14px] font-semibold text-black shadow-[0_10px_30px_-8px_rgba(0,0,0,.7)] transition-all hover:bg-[#ecc24a] sm:bottom-6 sm:right-6 sm:pl-4 sm:pr-5 ${
            recolhido ? "max-sm:w-12 max-sm:justify-center" : "pl-4 pr-5"
          }`}
          aria-label="Abrir o chat para achar sua moto"
        >
          <Sparkles size={18} strokeWidth={2.2} className="shrink-0" />
          <span className={recolhido ? "max-sm:hidden" : ""}>Ache sua moto</span>
        </button>
      )}

      {aberto && (
        <div
          role="dialog"
          aria-label="Ache sua moto"
          data-chat-janela
          className="fixed inset-x-0 bottom-0 z-[55] flex h-[85dvh] flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#0e0e11] shadow-[0_20px_60px_-10px_rgba(0,0,0,.8)] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[min(640px,calc(100dvh-48px))] sm:w-[400px] sm:rounded-2xl"
        >
          <header className="flex items-center gap-3 border-b border-white/[.07] px-4 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e0b129]/12 text-[#e0b129]">
              <Sparkles size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14.5px] font-semibold text-white">Ache sua moto</p>
              <p className="flex items-center gap-1.5 text-xs text-white/50">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80]" />
                Procura no estoque de hoje
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="rounded-lg p-2 text-white/50 hover:bg-white/5 hover:text-white"
              aria-label="Fechar o chat"
            >
              <X size={19} />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4" aria-live="polite">
            {mensagens.map((m, i) => (
              <div
                key={i}
                ref={i === mensagens.length - 1 ? ultima : undefined}
                className={`scroll-mt-2 ${m.quem === "cliente" ? "flex justify-end" : ""}`}
              >
                <p
                  className={
                    m.quem === "cliente"
                      ? "max-w-[85%] rounded-2xl rounded-br-md bg-[#e0b129] px-3.5 py-2 text-[14px] text-black"
                      : "max-w-[92%] rounded-2xl rounded-bl-md bg-white/[.06] px-3.5 py-2 text-[14px] leading-relaxed text-white/90"
                  }
                >
                  {m.texto}
                </p>

                {m.motos && m.motos.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {m.motos.map((moto) => (
                      <CartaoDoChat key={moto.id} moto={moto} />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {pensando && (
              <div className="flex w-fit gap-1 rounded-2xl rounded-bl-md bg-white/[.06] px-4 py-3" aria-label="Procurando">
                {[0, 1, 2].map((n) => (
                  <span
                    key={n}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50"
                    style={{ animationDelay: `${n * 120}ms` }}
                  />
                ))}
              </div>
            )}

            {soBoasVindas && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGESTOES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => enviar(s)}
                    className="rounded-full border border-white/12 px-3 py-1.5 text-[13px] text-white/80 hover:border-[#e0b129]/60 hover:text-white"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={fim} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar(texto);
            }}
            className="flex items-center gap-2 border-t border-white/[.07] p-3 pb-[max(.75rem,env(safe-area-inset-bottom))]"
          >
            <input
              ref={campo}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={300}
              placeholder="Ex.: quero uma moto até 20 mil"
              aria-label="O que você procura"
              className="h-11 min-w-0 flex-1 rounded-full border border-white/10 bg-white/[.04] px-4 text-[16px] text-white placeholder:text-white/35 focus:border-[#e0b129]/60 focus:outline-none sm:text-[14px]"
            />
            <button
              type="submit"
              disabled={!texto.trim() || pensando}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#e0b129] text-black disabled:opacity-40"
              aria-label="Enviar"
            >
              <ArrowUp size={19} strokeWidth={2.4} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function CartaoDoChat({ moto }: { moto: MotoDoChat }) {
  const convite = `Olá, tenho interesse na ${moto.nome} ${moto.ano} (${moto.preco}) que vi no site.`;

  return (
    <div className="flex gap-3 rounded-xl border border-white/[.08] bg-white/[.03] p-2">
      <Link
        href={`/estoque/${moto.slug}`}
        className="relative h-[72px] w-[96px] shrink-0 overflow-hidden rounded-lg bg-black"
      >
        {moto.capa ? (
          <Image src={moto.capa} alt={moto.nome} fill sizes="96px" quality={75} className="object-cover" />
        ) : null}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <Link href={`/estoque/${moto.slug}`} className="block">
          <p className="truncate text-[13.5px] font-semibold text-white">{moto.nome}</p>
          <p className="text-xs text-white/50">
            {moto.ano} · {moto.km}
          </p>
        </Link>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[15px] font-bold tabular-nums text-[#e0b129]">{moto.preco}</span>
          <span className="flex items-center gap-1">
            <a
              href={linkWhatsApp(convite)}
              target="_blank"
              rel="noopener noreferrer"
              className="grid h-7 w-7 place-items-center rounded-full bg-[#25d366]/15 text-[#25d366]"
              aria-label={`Chamar no WhatsApp sobre a ${moto.nome}`}
            >
              <IconeWhatsApp className="h-3.5 w-3.5" />
            </a>
            <Link
              href={`/estoque/${moto.slug}`}
              className="flex items-center rounded-full bg-white/[.07] py-1 pl-2.5 pr-1.5 text-xs font-medium text-white/85 hover:bg-white/[.12]"
            >
              Ver <ChevronRight size={14} />
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}
