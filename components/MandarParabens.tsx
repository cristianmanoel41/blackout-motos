"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, X } from "lucide-react";
import { linkWhatsapp } from "@/components/CardWhatsapp";
import { MENSAGENS_DE_ANIVERSARIO } from "@/lib/dados/mensagem-aniversario";

/*
 * O botão de parabéns do painel e da ficha do cliente.
 *
 * Em vez de abrir o WhatsApp direto, abre uma janela com as
 * mensagens prontas. A loja escolhe uma, mexe no texto se
 * quiser, e só então envia. A janela vai para o body porque o
 * painel do dashboard tem efeitos que prendem o "fixed".
 */
export default function MandarParabens({
  nome,
  telefone,
  className,
  children,
}: {
  nome: string;
  telefone: string | null;
  className: string;
  children: React.ReactNode;
}) {
  const [aberta, setAberta] = useState(false);
  const [escolhida, setEscolhida] = useState(0);
  const [texto, setTexto] = useState("");

  /* Sem telefone que preste, sem botão. */
  if (!linkWhatsapp(telefone, "")) return null;

  function abrir() {
    setEscolhida(0);
    setTexto(MENSAGENS_DE_ANIVERSARIO[0].texto(nome));
    setAberta(true);
  }

  function escolher(indice: number) {
    setEscolhida(indice);
    setTexto(MENSAGENS_DE_ANIVERSARIO[indice].texto(nome));
  }

  const link = linkWhatsapp(telefone, texto);

  return (
    <>
      <button type="button" onClick={abrir} className={className}>
        {children}
      </button>

      {aberta &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
            onClick={() => setAberta(false)}
          >
            <div
              role="dialog"
              aria-label="Mensagem de aniversário"
              className="w-full max-w-lg rounded-2xl border border-grafite-claro bg-grafite p-5 text-left text-texto shadow-2xl"
              onClick={(evento) => evento.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-dourado">
                    Mandar parabéns
                  </h2>
                  <p className="text-xs text-texto-suave">{nome}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setAberta(false)}
                  aria-label="Fechar"
                  className="rounded-lg p-1 text-texto-suave transition hover:bg-white/10 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                {MENSAGENS_DE_ANIVERSARIO.map((opcao, indice) => (
                  <button
                    key={opcao.nome}
                    type="button"
                    onClick={() => escolher(indice)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                      escolhida === indice
                        ? "border-dourado bg-dourado text-black"
                        : "border-grafite-claro text-texto hover:border-dourado"
                    }`}
                  >
                    {opcao.nome}
                  </button>
                ))}
              </div>

              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-texto-suave">
                Mensagem (pode editar antes de enviar)
              </label>

              <textarea
                value={texto}
                onChange={(evento) => setTexto(evento.target.value)}
                rows={8}
                className="w-full resize-y rounded-xl border border-grafite-claro bg-preto p-3 text-sm leading-6 text-white outline-none focus:border-dourado"
              />

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAberta(false)}
                  className="rounded-xl border border-grafite-claro px-4 py-2.5 text-sm font-bold text-texto transition hover:bg-white/5"
                >
                  Cancelar
                </button>

                <a
                  href={link || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setAberta(false)}
                  aria-disabled={!texto.trim()}
                  className={`inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-black text-black transition hover:bg-emerald-400 ${
                    texto.trim() ? "" : "pointer-events-none opacity-40"
                  }`}
                >
                  <MessageCircle size={16} />
                  Enviar no WhatsApp
                </a>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
