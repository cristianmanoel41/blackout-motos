"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Link2, Music2 } from "lucide-react";

/*
 * Liga a conta do TikTok da loja ao sistema.
 *
 * A autorização é feita uma vez e vale um ano. Dali em diante,
 * na ficha da moto, cada vídeo ganha o botão "Mandar ao
 * TikTok": o arquivo vai para os rascunhos da conta e o post
 * é terminado no aplicativo, onde se escolhe som, capa e
 * texto.
 *
 * O sistema não publica nada sozinho - de propósito. É isso
 * que dispensa a auditoria do TikTok, e é onde o post fica
 * melhor: som e efeito escolhidos na hora rendem mais.
 *
 * O token nunca chega ao navegador: quem guarda e usa é o
 * servidor.
 */

const RECADOS: Record<string, string> = {
  ok: "Conta do TikTok conectada.",
  cancelado:
    "A autorização foi cancelada no TikTok. Nada foi ligado.",
  estado:
    "A volta do TikTok não confere. Comece de novo por segurança.",
  falhou:
    "O TikTok recusou a autorização. Tente de novo em instantes.",
};

type Situacao = {
  configurado: boolean;
  conectado: boolean;
  vencida: boolean;
  conectadoEm: string | null;
  valeAte: string | null;
};

export default function ConexaoTikTok() {
  const parametros = useSearchParams();

  const [situacao, setSituacao] =
    useState<Situacao | null>(null);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const recado = RECADOS[parametros.get("tiktok") || ""];

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);

    try {
      const resposta = await fetch("/api/tiktok/conta");
      setSituacao(await resposta.json());
    } catch {
      setErro("Não deu para ver a conexão com o TikTok.");
    } finally {
      setCarregando(false);
    }
  }

  async function desligar() {
    const confirmar = window.confirm(
      "Desligar o TikTok? Os rascunhos já enviados continuam lá; o sistema é que deixa de mandar."
    );

    if (!confirmar) return;

    await fetch("/api/tiktok/conta", { method: "DELETE" });

    await carregar();
  }

  function emData(texto: string | null) {
    if (!texto) return "";

    return new Date(texto).toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });
  }

  return (
    <section className="rounded-2xl border border-grafite-claro bg-grafite p-5 md:p-7">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-dourado/10 text-dourado">
          <Music2 size={22} />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white">
            TikTok da loja
          </h2>

          <p className="text-sm text-texto-suave">
            Manda o vídeo da ficha da moto para os rascunhos.
            O post você termina no aplicativo.
          </p>
        </div>
      </div>

      {recado && (
        <p className="mb-4 rounded-xl border border-grafite-claro bg-preto/40 px-4 py-3 text-sm text-texto-suave">
          {recado}
        </p>
      )}

      {erro && (
        <p className="mb-4 rounded-xl border border-red-700 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {erro}
        </p>
      )}

      {carregando ? (
        <p className="text-sm text-texto-suave">
          Carregando...
        </p>
      ) : !situacao?.configurado ? (
        <div className="space-y-3 text-sm leading-6 text-texto-suave">
          <p>
            Falta cadastrar o aplicativo da loja no TikTok.
            Esse passo é uma vez só:
          </p>

          <ol className="list-decimal space-y-1.5 pl-5">
            <li>
              Em developers.tiktok.com, crie um app e peça o
              produto <strong>Content Posting API</strong>,
              com o escopo <code>video.upload</code>.
            </li>

            <li>
              Cadastre o endereço de volta:{" "}
              <code className="break-all text-white">
                https://blackoutmotos.com.br/api/tiktok/retorno
              </code>
            </li>

            <li>
              Guarde a <strong>client key</strong> e a{" "}
              <strong>client secret</strong> como
              TIKTOK_CLIENT_KEY e TIKTOK_CLIENT_SECRET - sem
              passar por conversa, que secret é senha.
            </li>
          </ol>
        </div>
      ) : situacao.conectado ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-green-400">
            <Check size={16} />
            Conectado
            {situacao.valeAte
              ? ` · autorização vale até ${emData(
                  situacao.valeAte
                )}`
              : ""}
          </p>

          <button
            type="button"
            onClick={desligar}
            className="rounded-lg border border-grafite-claro px-4 py-2 text-sm font-semibold text-texto-suave transition hover:border-red-700 hover:text-red-300"
          >
            Desligar
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-texto-suave">
            {situacao.vencida
              ? "A autorização venceu. Conecte de novo para voltar a mandar vídeo."
              : "Ainda não conectado."}
          </p>

          <a
            href="/api/tiktok/entrar"
            className="inline-flex items-center gap-2 rounded-lg bg-dourado px-5 py-2.5 text-sm font-bold text-preto transition hover:opacity-90"
          >
            <Link2 size={16} />
            Conectar TikTok
          </a>
        </div>
      )}
    </section>
  );
}
