"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Check, Link2, Megaphone } from "lucide-react";

/*
 * Liga a conta da OLX ao sistema.
 *
 * A autorizacao e feita uma vez. Dai em diante o sistema manda
 * o estoque, e a OLX publica, atualiza preco e tira do ar
 * quando a moto sai - sem ninguem lembrar de baixar anuncio.
 *
 * O token nunca chega ao navegador: quem guarda e usa e o
 * servidor.
 */

const supabase = createClient();

const RECADOS: Record<string, string> = {
  conectado: "Conta da OLX conectada.",
  recusado:
    "A autorização foi recusada na OLX. Nada foi ligado.",
  sem_codigo:
    "A OLX não devolveu a autorização. Tente de novo.",
  estado_invalido:
    "A volta da OLX não confere. Comece de novo por segurança.",
};

export default function ConexaoOlx() {
  const parametros = useSearchParams();

  const [conectado, setConectado] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const resultado = parametros.get("olx");
  const motivo = parametros.get("motivo");

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase
        .from("olx_conta")
        .select("access_token")
        .eq("id", "principal")
        .maybeSingle();

      setConectado(Boolean(data?.access_token));
      setCarregando(false);
    }

    carregar();
  }, [resultado]);

  return (
    <section className="rounded-2xl border border-grafite-claro bg-grafite p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-dourado">
        <Megaphone size={20} />
        OLX
      </h2>

      <p className="mt-2 text-sm text-texto-suave">
        Conecte a conta da loja para anunciar as motos do
        estoque. Depois de ligado, o anúncio acompanha o
        sistema: muda o preço aqui, muda lá; vendeu, sai do ar.
      </p>

      {resultado && (
        <div
          className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
            resultado === "conectado"
              ? "border-green-700 bg-green-950/30 text-green-300"
              : "border-red-700 bg-red-950/40 text-red-300"
          }`}
        >
          {RECADOS[resultado] ||
            `Não foi possível conectar${
              motivo ? `: ${motivo}` : "."
            }`}
        </div>
      )}

      <div className="mt-5">
        {carregando ? (
          <p className="text-sm text-texto-suave">
            Verificando...
          </p>
        ) : conectado ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-grafite-claro bg-preto/40 px-4 py-3">
            <span className="flex items-center gap-2 text-sm text-texto">
              <Check
                size={16}
                className="text-green-400"
              />
              Conectado
            </span>

            <a
              href="/api/olx/login"
              className="rounded-lg border border-grafite-claro px-3 py-2 text-xs font-semibold text-texto-suave transition hover:border-dourado hover:text-dourado"
            >
              Conectar de novo
            </a>
          </div>
        ) : (
          <a
            href="/api/olx/login"
            className="inline-flex items-center gap-2 rounded-lg bg-dourado px-5 py-3 text-sm font-bold text-preto transition hover:opacity-90"
          >
            <Link2 size={16} />
            Conectar conta da OLX
          </a>
        )}
      </div>
    </section>
  );
}
