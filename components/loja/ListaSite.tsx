"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import {
  anosDaMoto,
  kmDaMoto,
  nomeDaMoto,
  type MotoSite,
} from "@/lib/dados/moto-site";
import { Bike, Search } from "lucide-react";

/*
 * A lista do site.
 *
 * Diferente da vitrine por link: aqui o card é um link para a
 * página da moto, e não um atalho para abrir a foto. É essa
 * página que o cliente recebe no WhatsApp.
 */

function semAcento(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function ListaSite({
  motos,
  capas,
  totalFotos,
}: {
  motos: MotoSite[];
  capas: Record<string, string>;
  totalFotos: Record<string, number>;
}) {
  const [busca, setBusca] = useState("");

  const filtradas = useMemo(() => {
    const termos = semAcento(busca)
      .split(/\s+/)
      .filter(Boolean);

    if (termos.length === 0) return motos;

    return motos.filter((moto) => {
      const texto = semAcento(
        [
          moto.marca,
          moto.modelo,
          moto.versao,
          moto.cor,
          moto.ano_fabricacao,
          moto.ano_modelo,
          moto.cilindrada,
        ]
          .filter(Boolean)
          .join(" ")
      );

      return termos.every((parte) =>
        texto.includes(parte)
      );
    });
  }, [motos, busca]);

  return (
    <>
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-black/35"
          />

          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Procurar por marca, modelo, cor ou ano"
            /* campo-claro: sem ela o tema pinta todo input
               dentro de <main> de preto. */
            className="campo-claro w-full rounded-xl border border-black/10 bg-white py-2.5 pl-10 pr-4 text-sm text-black outline-none transition focus:border-black/40"
          />
        </div>

        {busca.trim() && (
          <p className="text-sm text-black/55">
            {filtradas.length} de {motos.length} moto
            {motos.length === 1 ? "" : "s"}
          </p>
        )}
      </div>

      {filtradas.length === 0 && (
        <article className="rounded-2xl border border-black/10 bg-white p-10 text-center text-sm text-black/60">
          Nenhuma moto encontrada com esse termo.
        </article>
      )}

      {filtradas.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtradas.map((moto) => {
            const capa = capas[moto.id];
            const fotos = totalFotos[moto.id] || 0;
            const nome = nomeDaMoto(moto);

            return (
              <article
                key={moto.id}
                className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition hover:shadow-md"
              >
                <Link
                  href={`/loja/${moto.id}`}
                  className="block"
                >
                  {capa ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={capa}
                        alt={nome}
                        className="aspect-[4/3] w-full object-cover"
                      />

                      {fotos > 1 && (
                        <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white">
                          {fotos} fotos
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex aspect-[4/3] w-full items-center justify-center bg-black/[.03]">
                      <Bike
                        size={40}
                        className="text-black/20"
                      />
                    </div>
                  )}

                  <div className="p-4">
                    <h2 className="text-base font-bold leading-tight text-black">
                      {nome}
                    </h2>

                    <p className="mt-2 text-2xl font-bold tracking-tight text-[#0b0b0d]">
                      {moto.preco_anunciado
                        ? formatarMoeda(
                            moto.preco_anunciado
                          )
                        : "Consultar"}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-black/60">
                      <span className="rounded-full bg-black/[.05] px-2.5 py-1">
                        {anosDaMoto(moto)}
                      </span>

                      <span className="rounded-full bg-black/[.05] px-2.5 py-1">
                        {kmDaMoto(moto.quilometragem)}
                      </span>

                      {moto.cor && (
                        <span className="rounded-full bg-black/[.05] px-2.5 py-1">
                          {moto.cor}
                        </span>
                      )}
                    </div>

                    <p className="mt-3 text-sm font-semibold text-[#a97800]">
                      Ver detalhes
                    </p>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
