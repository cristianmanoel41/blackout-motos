"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronRight, MessageCircleMore, SendHorizontal, X } from "lucide-react";
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
 * Desenhado como janela de conversa (11/11/2026, a pedido da
 * loja): cabeçalho com a foto da loja e "online", balões com
 * hora, fundo de conversa diferente do site e o botão redondo
 * virando X para fechar. Antes era uma folha escura da cor do
 * site e, no celular, parecia mais um pedaço da página.
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
  hora: string;
  motos?: MotoDoChat[];
};

const SUGESTOES = [
  "Moto até R$ 15 mil",
  "Até 20 mil",
  "Quero uma automática",
  "Uma 160 pra trabalhar",
  "Honda com pouco km",
];

const BOAS_VINDAS =
  "Oi! 👋 Me diz o que você procura, um valor, modelo ou marca, que eu procuro no estoque de hoje.";

function agora() {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* A foto da loja, como num contato de conversa. */
function FotoDaLoja({ tamanho }: { tamanho: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-black ring-1 ring-white/15"
      style={{ width: tamanho, height: tamanho }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-blackout-site.png"
        alt=""
        className="h-[88%] w-[88%] object-contain"
      />
    </span>
  );
}

export default function ChatEstoque() {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  /* No celular o botão só aparece depois que a pessoa sai da primeira tela. */
  const [passouDoTopo, setPassouDoTopo] = useState(false);
  /* O balão "Procurando moto? Me pergunte aqui", uma vez por visita. */
  const [convite, setConvite] = useState(false);
  const fim = useRef<HTMLDivElement>(null);
  const ultima = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  function abrir() {
    /* A saudação nasce na primeira vez que abre, com a hora de agora. */
    setMensagens((atual) =>
      atual.length > 0 ? atual : [{ quem: "loja", texto: BOAS_VINDAS, hora: agora() }]
    );
    setAberto(true);
    setConvite(false);
  }

  /*
   * O CONVITE
   *
   * Um botão redondo no canto não diz "isto é uma conversa". Na
   * primeira vez que ele aparece, sai dele um balão de fala - como
   * os chats de atendimento fazem - e some sozinho. Só uma vez por
   * visita (sessionStorage), para não virar incômodo.
   */
  useEffect(() => {
    const noComputador = window.matchMedia("(min-width: 640px)").matches;
    if (!(passouDoTopo || noComputador)) return;

    try {
      if (sessionStorage.getItem("chat-convite")) return;
    } catch {
      return;
    }

    const entra = setTimeout(() => {
      setConvite(true);
      try {
        sessionStorage.setItem("chat-convite", "1");
      } catch {}
    }, noComputador ? 4000 : 600);
    const sai = setTimeout(() => setConvite(false), (noComputador ? 4000 : 600) + 9000);

    return () => {
      clearTimeout(entra);
      clearTimeout(sai);
    };
  }, [passouDoTopo]);

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
    /* No celular, focar abre o teclado e esconde as sugestões: só no computador. */
    if (window.matchMedia("(min-width: 640px)").matches) {
      campo.current?.focus({ preventScroll: true });
    }

    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [aberto]);

  /*
   * No celular, a primeira tela tem os botões grandes (ver o
   * estoque, chamar no WhatsApp) e o chat ficava por cima deles.
   * Então ele só entra depois que a pessoa rola um pouco.
   */
  useEffect(() => {
    function rolou() {
      setPassouDoTopo(window.scrollY > 320);
    }
    rolou();
    window.addEventListener("scroll", rolou, { passive: true });
    return () => window.removeEventListener("scroll", rolou);
  }, []);

  /* Outras partes do site podem abrir o chat: window.dispatchEvent(new Event("abrir-chat-estoque")). */
  useEffect(() => {
    window.addEventListener("abrir-chat-estoque", abrir);
    return () => window.removeEventListener("abrir-chat-estoque", abrir);
  }, []);

  async function enviar(frase: string) {
    const limpa = frase.trim();
    if (!limpa || pensando) return;

    /* A saudação não vai para o servidor: é só da tela. */
    const historico = mensagens
      .slice(1)
      .map((m) => ({ quem: m.quem, texto: m.texto }));

    setMensagens((atual) => [...atual, { quem: "cliente", texto: limpa, hora: agora() }]);
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
          hora: agora(),
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
          hora: agora(),
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
      {/*
        * O botão redondo: abre o chat e, aberto, vira o X que fecha.
        * No celular é só o círculo com o ícone (o nome escrito cobria
        * o texto da página); no computador, com o nome ao lado.
        */}
      <button
        type="button"
        data-chat-botao
        data-aberto={aberto ? "sim" : undefined}
        onClick={() => (aberto ? setAberto(false) : abrir())}
        className={`fixed bottom-4 right-4 z-[56] flex h-12 items-center justify-center gap-2 rounded-full bg-[#e0b129] text-[14.5px] font-bold text-black shadow-[0_8px_24px_-6px_rgba(0,0,0,.85)] ring-2 ring-black/40 transition-all duration-300 hover:bg-[#ecc24a] sm:bottom-6 sm:right-6 ${
          aberto ? "w-12" : "pl-3.5 pr-4"
        } ${
          !aberto && !passouDoTopo
            ? "max-sm:pointer-events-none max-sm:translate-y-4 max-sm:scale-75 max-sm:opacity-0"
            : ""
        }`}
        aria-label={aberto ? "Fechar o chat" : "Abrir o chat para achar sua moto"}
      >
        {aberto ? (
          <X size={22} strokeWidth={2.4} />
        ) : (
          <>
            {/* Balão de conversa com a bolinha verde de "online". */}
            <span className="relative shrink-0">
              <MessageCircleMore size={22} strokeWidth={2.1} />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#16a34a] ring-2 ring-[#e0b129]" />
            </span>
            <span className="sm:hidden">Chat</span>
            <span className="max-sm:hidden">Chat · Ache sua moto</span>
          </>
        )}
      </button>

      {convite && !aberto && (
        <div
          data-chat-convite
          className="fixed bottom-[72px] right-4 z-[56] flex max-w-[250px] items-start gap-2 rounded-2xl rounded-br-sm bg-white py-2.5 pl-3.5 pr-2 shadow-[0_12px_32px_-8px_rgba(0,0,0,.8)] sm:bottom-[84px] sm:right-6"
          style={{ color: "#111" }}
        >
          <button type="button" onClick={abrir} className="text-left text-[13.5px] leading-snug" style={{ color: "#111" }}>
            <strong className="block" style={{ color: "#111" }}>Oi! 👋 Procurando moto?</strong>
            Me pergunte aqui no chat, eu procuro no estoque.
          </button>
          <button
            type="button"
            onClick={() => setConvite(false)}
            aria-label="Fechar o aviso"
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full hover:bg-black/5"
            style={{ color: "#666" }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* No celular o site escurece por trás; tocar fora fecha. */}
      {aberto && (
        <button
          type="button"
          aria-label="Fechar o chat"
          tabIndex={-1}
          onClick={() => setAberto(false)}
          className="fixed inset-0 z-[54] bg-black/55 sm:hidden"
        />
      )}

      {aberto && (
        <div
          role="dialog"
          aria-label="Chat Ache sua moto"
          data-chat-janela
          className="fixed bottom-[76px] left-3 right-3 z-[55] flex h-[min(600px,calc(100dvh-150px))] flex-col overflow-hidden rounded-2xl bg-[#0b0b0d] shadow-[0_24px_70px_-10px_rgba(0,0,0,.95)] ring-1 ring-white/15 sm:bottom-[92px] sm:left-auto sm:right-6 sm:h-[min(600px,calc(100dvh-170px))] sm:w-[380px]"
        >
          {/* Cabeçalho de conversa: quem está do outro lado. */}
          <header className="flex items-center gap-3 bg-[#e0b129] px-3.5 py-2.5 text-black">
            <FotoDaLoja tamanho={38} />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold leading-tight">Blackout Motos</p>
              {/* Cor no style: o tema do sistema (blackout-brand-final.css)
                  troca text-black/70 por cinza-claro em todo o site. */}
              <p className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: "rgba(0,0,0,.68)" }}>
                <span className="h-2 w-2 rounded-full bg-[#15803d] ring-2 ring-[#e0b129]" />
                Online · procura no estoque de hoje
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="grid h-8 w-8 place-items-center rounded-full hover:bg-black/10"
              style={{ color: "#000" }}
              aria-label="Fechar o chat"
            >
              <X size={19} strokeWidth={2.4} />
            </button>
          </header>

          {/*
            * O fundo da conversa, com uma trama de pontos: é o que
            * separa, de olhada, a conversa do resto do site.
            */}
          <div
            className="flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-3 py-4"
            style={{
              backgroundColor: "#141417",
              backgroundImage:
                "radial-gradient(rgba(224,177,41,.07) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
            aria-live="polite"
          >
            <p className="mx-auto w-fit rounded-full bg-black/40 px-3 py-1 text-[11px] text-white/55">
              Hoje
            </p>

            {mensagens.map((m, i) => {
              const daLoja = m.quem === "loja";
              /* A foto só no primeiro balão de uma sequência da loja. */
              const comFoto = daLoja && mensagens[i - 1]?.quem !== "loja";

              return (
                <div
                  key={i}
                  ref={i === mensagens.length - 1 ? ultima : undefined}
                  className="scroll-mt-3"
                >
                  <div className={`flex items-end gap-2 ${daLoja ? "" : "justify-end"}`}>
                    {daLoja &&
                      (comFoto ? <FotoDaLoja tamanho={26} /> : <span className="w-[26px] shrink-0" />)}

                    <div
                      className={
                        daLoja
                          ? "max-w-[82%] rounded-2xl rounded-bl-sm bg-[#26262c] px-3 py-2 text-white shadow-sm"
                          : "max-w-[82%] rounded-2xl rounded-br-sm bg-[#e0b129] px-3 py-2 text-black shadow-sm"
                      }
                    >
                      <p className="whitespace-pre-line text-[14px] leading-snug">{m.texto}</p>
                      <p
                        className={`mt-0.5 text-right text-[10.5px] ${
                          daLoja ? "text-white/40" : ""
                        }`}
                        style={daLoja ? undefined : { color: "rgba(0,0,0,.55)" }}
                      >
                        {m.hora}
                      </p>
                    </div>
                  </div>

                  {m.motos && m.motos.length > 0 && (
                    <div className="mt-2 space-y-1.5 pl-[34px]">
                      {m.motos.map((moto) => (
                        <CartaoDoChat key={moto.id} moto={moto} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {pensando && (
              <div className="flex items-end gap-2">
                <span className="w-[26px] shrink-0" />
                <div
                  className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-[#26262c] px-3.5 py-3"
                  aria-label="Digitando"
                >
                  {[0, 1, 2].map((n) => (
                    <span
                      key={n}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/60"
                      style={{ animationDelay: `${n * 120}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {soBoasVindas && !pensando && (
              <div className="flex flex-wrap gap-1.5 pl-[34px] pt-1">
                {SUGESTOES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => enviar(s)}
                    className="rounded-full border border-[#e0b129]/45 bg-[#e0b129]/[.08] px-3 py-1.5 text-[13px] font-medium text-[#f0c94d] hover:bg-[#e0b129]/15"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={fim} />
          </div>

          {/* A barra de escrever, como em qualquer conversa. */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar(texto);
            }}
            className="flex items-center gap-2 border-t border-white/10 bg-[#0b0b0d] p-2.5"
          >
            <input
              ref={campo}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={300}
              placeholder="Escreva uma mensagem…"
              aria-label="O que você procura"
              enterKeyHint="send"
              className="h-11 min-w-0 flex-1 rounded-full bg-[#1f1f24] px-4 text-[16px] text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-[#e0b129]/60 sm:text-[14px]"
            />
            <button
              type="submit"
              disabled={!texto.trim() || pensando}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#e0b129] text-black transition disabled:opacity-40"
              aria-label="Enviar"
            >
              <SendHorizontal size={19} strokeWidth={2.2} />
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
    <div className="flex gap-2.5 rounded-xl bg-[#26262c] p-1.5 shadow-sm">
      <Link
        href={`/estoque/${moto.slug}`}
        className="relative h-[58px] w-[78px] shrink-0 overflow-hidden rounded-lg bg-black"
      >
        {moto.capa ? (
          <Image src={moto.capa} alt={moto.nome} fill sizes="80px" quality={75} className="object-cover" />
        ) : null}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col justify-between pr-0.5">
        <Link href={`/estoque/${moto.slug}`} className="block">
          <p className="truncate text-[13px] font-semibold text-white">{moto.nome}</p>
          <p className="text-[11.5px] text-white/50">
            {moto.ano} · {moto.km}
          </p>
        </Link>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[14px] font-bold tabular-nums text-[#e0b129]">{moto.preco}</span>
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
              className="flex items-center rounded-full bg-white/[.08] py-1 pl-2.5 pr-1.5 text-xs font-medium text-white/85 hover:bg-white/[.14]"
            >
              Ver <ChevronRight size={14} />
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}
