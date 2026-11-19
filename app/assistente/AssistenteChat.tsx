"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, Sparkles, User } from "lucide-react";

/*
 * O ASSISTENTE DO SISTEMA (pedido de 19/11/2026)
 *
 * Chat simples: a tela guarda a conversa em memória (sai se
 * recarregar a página, de propósito - não é histórico para
 * guardar, é conversa do momento) e manda para app/api/assistente.
 */

type Mensagem = { papel: "usuario" | "assistente"; texto: string };

export default function AssistenteChat() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [rascunho, setRascunho] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const fimDaLista = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimDaLista.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, enviando]);

  async function enviar() {
    const texto = rascunho.trim();
    if (!texto || enviando) return;

    const historico = [...mensagens, { papel: "usuario" as const, texto }];

    setMensagens(historico);
    setRascunho("");
    setErro("");
    setEnviando(true);

    try {
      const resposta = await fetch("/api/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagens: historico }),
      });

      const dados = await resposta.json().catch(() => null);

      if (!resposta.ok || !dados?.texto) {
        setErro(dados?.error || "Não consegui responder agora. Tente de novo.");
        return;
      }

      setMensagens([
        ...historico,
        { papel: "assistente", texto: dados.texto },
      ]);
    } catch {
      setErro("Sem conexão com o servidor. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  function aoDigitar(evento: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (evento.key === "Enter" && !evento.shiftKey) {
      evento.preventDefault();
      enviar();
    }
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <div className="mb-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-dourado">
          <Sparkles size={24} />
          Assistente
        </h1>

        <p className="mt-1 text-sm text-texto-suave">
          Converse direto com a IA. Ela não enxerga estoque, caixa
          ou clientes - é só conversa.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-dourado/40 bg-grafite">
        <div className="flex-1 overflow-y-auto p-5">
          {mensagens.length === 0 && (
            <p className="text-sm text-texto-suave">
              Escreva ali embaixo para começar a conversa.
            </p>
          )}

          <div className="space-y-4">
            {mensagens.map((mensagem, indice) => (
              <div
                key={indice}
                className={`flex gap-3 ${
                  mensagem.papel === "usuario" ? "flex-row-reverse" : ""
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    mensagem.papel === "usuario"
                      ? "bg-dourado text-preto"
                      : "bg-grafite-claro text-dourado"
                  }`}
                >
                  {mensagem.papel === "usuario" ? (
                    <User size={16} />
                  ) : (
                    <Bot size={16} />
                  )}
                </div>

                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-xl px-4 py-2.5 text-sm ${
                    mensagem.papel === "usuario"
                      ? "bg-dourado text-preto"
                      : "bg-grafite-claro text-white"
                  }`}
                >
                  {mensagem.texto}
                </div>
              </div>
            ))}

            {enviando && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-grafite-claro text-dourado">
                  <Bot size={16} />
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-grafite-claro px-4 py-2.5 text-sm text-texto-suave">
                  <Loader2 size={14} className="animate-spin" />
                  Pensando...
                </div>
              </div>
            )}
          </div>

          <div ref={fimDaLista} />
        </div>

        {erro && (
          <div className="mx-5 mb-3 rounded-lg border border-red-700 bg-red-950/40 px-4 py-2 text-sm text-red-300">
            {erro}
          </div>
        )}

        <div className="flex items-end gap-3 border-t border-grafite-claro p-4">
          <textarea
            value={rascunho}
            onChange={(evento) => setRascunho(evento.target.value)}
            onKeyDown={aoDigitar}
            placeholder="Escreva sua pergunta... (Enter envia, Shift+Enter quebra linha)"
            rows={1}
            className="max-h-32 flex-1 resize-none rounded-lg border border-grafite-claro bg-preto px-3 py-2.5 text-sm text-white outline-none transition focus:border-dourado"
          />

          <button
            onClick={enviar}
            disabled={!rascunho.trim() || enviando}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-dourado text-preto transition hover:opacity-90 disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
