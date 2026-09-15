"use client";

import { useMemo, useState } from "react";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import { Bike, Search } from "lucide-react";

/*
 * Lista de motos da vitrine compartilhada, com busca.
 *
 * Recebe as motos já filtradas pelo banco: aqui só chega o
 * que a função de vitrine devolveu, então não há como a busca
 * revelar algo que a outra loja não deveria ver.
 */

export type MotoVitrine = {
  id: string;
  codigo: string | null;
  marca: string | null;
  modelo: string | null;
  versao: string | null;
  cor: string | null;
  ano_fabricacao: number | null;
  ano_modelo: number | null;
  quilometragem: number | null;
  preco_anunciado: number | null;
};

function semAcento(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function anos(moto: MotoVitrine) {
  const fabricacao = moto.ano_fabricacao;
  const modelo = moto.ano_modelo;

  if (fabricacao && modelo) {
    return `${fabricacao}/${modelo}`;
  }

  return String(fabricacao || modelo || "—");
}

function quilometragem(valor: number | null) {
  if (valor === null || valor === undefined) return "—";

  return `${new Intl.NumberFormat("pt-BR").format(
    valor
  )} km`;
}

export default function VitrineLista({
  motos,
  capas,
  galerias,
}: {
  motos: MotoVitrine[];
  /* Endereço da foto de capa, por moto. */
  capas?: Record<string, string>;
  /* Todas as fotos, na ordem, por moto. */
  galerias?: Record<string, string[]>;
}) {
  const [busca, setBusca] = useState("");

  /* Qual moto esta com as fotos abertas. */
  const [aberta, setAberta] = useState("");

  /* A foto em tela cheia: a lista e onde estamos nela. */
  const [ampliada, setAmpliada] = useState<{
    fotos: string[];
    indice: number;
  } | null>(null);

  function passar(quanto: number) {
    setAmpliada((atual) => {
      if (!atual) return atual;

      const total = atual.fotos.length;

      /* Vai do fim para o comeco e vice-versa. */
      const proximo =
        (atual.indice + quanto + total) % total;

      return { ...atual, indice: proximo };
    });
  }

  const filtradas = useMemo(() => {
    const termo = semAcento(busca);

    if (!termo) return motos;

    /*
     * Cada palavra digitada precisa aparecer em algum lugar
     * da moto: "honda 160" acha a CG 160 da Honda.
     */
    const termos = termo.split(/\s+/).filter(Boolean);

    return motos.filter((moto) => {
      const texto = semAcento(
        [
          moto.codigo,
          moto.marca,
          moto.modelo,
          moto.versao,
          moto.cor,
          moto.ano_fabricacao,
          moto.ano_modelo,
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
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-black/35"
          />

          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Procurar por marca, modelo, cor ou ano"
            className="w-full rounded-xl border border-black/10 bg-white py-2.5 pl-10 pr-4 text-sm text-black outline-none transition focus:border-black/40"
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
        <div className="rounded-2xl border border-black/10 bg-white p-10 text-center text-sm text-black/60">
          Nenhuma moto encontrada com esse termo.
        </div>
      )}

      {filtradas.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtradas.map((moto) => {
            const fotos = galerias?.[moto.id] || [];
            const capa = capas?.[moto.id] || fotos[0];
            const abertaAgora = aberta === moto.id;

            const nome = [
              moto.marca,
              moto.modelo,
              moto.versao,
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <article
                key={moto.id}
                className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() =>
                    fotos.length > 0 &&
                    setAmpliada({ fotos, indice: 0 })
                  }
                  className="block w-full"
                  aria-label={`Ver fotos de ${nome}`}
                >
                  {capa ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={capa}
                        alt={nome}
                        className="aspect-[4/3] w-full object-cover"
                      />

                      {fotos.length > 1 && (
                        <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white">
                          {fotos.length} fotos
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
                </button>

                <div className="p-4">
                  <h3 className="text-base font-bold leading-tight text-black">
                    {nome || "Moto"}
                  </h3>

                  <p className="mt-2 text-xl font-bold text-black">
                    {moto.preco_anunciado
                      ? formatarMoeda(moto.preco_anunciado)
                      : "Consultar"}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-black/60">
                    <span className="rounded-full bg-black/[.05] px-2.5 py-1">
                      {anos(moto)}
                    </span>

                    <span className="rounded-full bg-black/[.05] px-2.5 py-1">
                      {quilometragem(moto.quilometragem)}
                    </span>

                    {moto.cor && (
                      <span className="rounded-full bg-black/[.05] px-2.5 py-1">
                        {moto.cor}
                      </span>
                    )}
                  </div>

                  {fotos.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setAberta(
                          abertaAgora ? "" : moto.id
                        )
                      }
                      className="mt-3 text-sm font-semibold text-black/70 underline underline-offset-4 hover:text-black"
                    >
                      {abertaAgora
                        ? "Esconder fotos"
                        : "Ver todas as fotos"}
                    </button>
                  )}

                  {abertaAgora && fotos.length > 0 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto">
                      {fotos.map((endereco, indice) => (
                        <button
                          key={endereco}
                          type="button"
                          onClick={() =>
                            setAmpliada({ fotos, indice })
                          }
                          className="shrink-0"
                          aria-label={`Abrir foto ${
                            indice + 1
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={endereco}
                            alt={`Foto ${indice + 1}`}
                            className="h-24 w-32 rounded-lg border border-black/10 object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {ampliada && (
        <div
          onClick={() => setAmpliada(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        >
          <button
            type="button"
            onClick={() => setAmpliada(null)}
            aria-label="Fechar"
            className="absolute right-4 top-4 rounded-full bg-white/10 px-4 py-2 text-lg font-bold text-white hover:bg-white/20"
          >
            ✕
          </button>

          {ampliada.fotos.length > 1 && (
            <button
              type="button"
              onClick={(evento) => {
                evento.stopPropagation();
                passar(-1);
              }}
              aria-label="Foto anterior"
              className="absolute left-2 rounded-full bg-white/10 px-4 py-3 text-2xl text-white hover:bg-white/20 sm:left-6"
            >
              ‹
            </button>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ampliada.fotos[ampliada.indice]}
            alt=""
            onClick={(evento) => evento.stopPropagation()}
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
          />

          {ampliada.fotos.length > 1 && (
            <button
              type="button"
              onClick={(evento) => {
                evento.stopPropagation();
                passar(1);
              }}
              aria-label="Próxima foto"
              className="absolute right-2 rounded-full bg-white/10 px-4 py-3 text-2xl text-white hover:bg-white/20 sm:right-6"
            >
              ›
            </button>
          )}

          <span className="absolute bottom-5 rounded-full bg-white/10 px-4 py-1.5 text-sm text-white">
            {ampliada.indice + 1} de {ampliada.fotos.length}
          </span>
        </div>
      )}
    </>
  );
}
