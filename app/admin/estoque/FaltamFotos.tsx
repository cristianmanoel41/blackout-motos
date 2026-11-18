"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/*
 * As motos que faltam foto para ir ao site (pedido de
 * 18/11/2026).
 *
 * O site só mostra moto disponível com pelo menos uma foto
 * (lib/dados/estoque-site): vídeo sozinho não conta, porque o
 * card precisa de imagem. Então moto disponível sem foto está
 * no pátio, mas invisível para o cliente - e ninguém percebia.
 *
 * Cada linha leva para a ficha da moto, onde as fotos sobem.
 * Quando a última recebe foto, a parte some.
 */

type MotoDaLista = {
  id: string | number;
  marca?: string | null;
  modelo?: string | null;
  versao?: string | null;
  ano_modelo?: number | string | null;
  placa?: string | null;
  status?: string | null;
  data_entrada?: string | null;
};

const supabase = createClient();

function ehVideo(foto: { arquivo_tipo?: string | null; arquivo_nome?: string | null }) {
  return (
    (foto.arquivo_tipo || "").startsWith("video/") ||
    /\.(mp4|mov|webm)$/i.test(foto.arquivo_nome || "")
  );
}

export default function FaltamFotos({
  motos,
  className = "",
}: {
  motos: MotoDaLista[];
  className?: string;
}) {
  const disponiveis = useMemo(
    () => motos.filter((m) => m.status === "disponivel"),
    [motos]
  );
  const chaveIds = disponiveis.map((m) => String(m.id)).join(",");

  const [comFoto, setComFoto] = useState<Set<string> | null>(null);

  useEffect(() => {
    const ids = chaveIds ? chaveIds.split(",") : [];
    if (ids.length === 0) return;

    let cancelado = false;

    supabase
      .from("motorcycle_photos")
      .select("motorcycle_id, url, arquivo_tipo, arquivo_nome")
      .in("motorcycle_id", ids)
      .then(({ data, error }) => {
        if (cancelado || error) {
          if (error) console.error(error);
          return;
        }
        const achadas = new Set<string>();
        (data || []).forEach((foto) => {
          if (foto.url && !ehVideo(foto)) achadas.add(String(foto.motorcycle_id));
        });
        setComFoto(achadas);
      });

    return () => {
      cancelado = true;
    };
  }, [chaveIds]);

  if (!comFoto) return null;

  const faltam = disponiveis.filter((m) => !comFoto.has(String(m.id)));
  if (faltam.length === 0) return null;

  return (
    <section className={className}>
      <div className="flex items-center gap-2">
        <Camera size={17} className="text-[#a97800]" />
        <h2 className="font-semibold text-black">
          {faltam.length === 1
            ? "1 moto sem foto - não está no site"
            : `${faltam.length} motos sem foto - não estão no site`}
        </h2>
      </div>
      <p className="mt-1 text-xs text-black/70">
        Estão disponíveis, mas o site só mostra moto com pelo menos uma foto. Clique para abrir a ficha e subir as fotos.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {faltam.map((moto) => {
          const nome =
            [moto.marca, moto.modelo, moto.versao, moto.ano_modelo]
              .map((p) => String(p || "").trim())
              .filter(Boolean)
              .join(" ") || "Moto";
          return (
            <Link
              key={String(moto.id)}
              href={`/motos/${moto.id}`}
              className="rounded-xl border border-amber-400/60 px-3 py-2 text-sm font-bold text-black transition hover:bg-amber-400/10"
            >
              {nome}
              {moto.placa ? (
                <span className="ml-2 text-[11px] font-bold text-black/50">
                  {String(moto.placa).toUpperCase()}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
