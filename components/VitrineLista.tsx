"use client";

import { Fragment, useMemo, useState } from "react";
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
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-black/10 bg-[#f7f8fa] text-left text-xs uppercase tracking-wide text-black/50">
                <tr>
                  <th className="px-4 py-3">Moto</th>
                  <th className="px-4 py-3">Cor</th>
                  <th className="px-4 py-3">Ano</th>
                  <th className="px-4 py-3 text-right">Km</th>
                  <th className="px-4 py-3 text-right">
                    Valor
                  </th>
                </tr>
              </thead>

              <tbody>
                {filtradas.map((moto) => {
                  const fotos = galerias?.[moto.id] || [];
                  const abertaAgora = aberta === moto.id;

                  return (
                  <Fragment key={moto.id}>
                  <tr
                    onClick={() =>
                      fotos.length > 0 &&
                      setAberta(
                        abertaAgora ? "" : moto.id
                      )
                    }
                    className={`border-b border-black/[.06] last:border-0 ${
                      fotos.length > 0
                        ? "cursor-pointer hover:bg-black/[.02]"
                        : ""
                    }`}
                    title={
                      fotos.length > 0
                        ? "Clique para ver as fotos"
                        : ""
                    }
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {capas?.[moto.id] ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={capas[moto.id]}
                            alt=""
                            className="h-12 w-16 shrink-0 rounded-md border border-black/10 object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-md border border-dashed border-black/15">
                            <Bike
                              size={16}
                              className="text-black/25"
                            />
                          </div>
                        )}

                        <div>
                          <p className="font-semibold text-black">
                            {[
                              moto.marca,
                              moto.modelo,
                              moto.versao,
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          </p>

                          {/*
                            * O código da moto é controle
                            * interno da loja; para quem abre
                            * o link ele não diz nada e ainda
                            * expõe o tamanho do estoque.
                            */}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-black/70">
                      {moto.cor || "—"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-black/70">
                      {anos(moto)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right text-black/70">
                      {quilometragem(moto.quilometragem)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-black">
                      {moto.preco_anunciado
                        ? formatarMoeda(
                            moto.preco_anunciado
                          )
                        : "Consultar"}

                      {fotos.length > 1 && (
                        <span className="mt-1 block text-[11px] font-normal text-black/45">
                          {abertaAgora
                            ? "fechar fotos"
                            : `ver ${fotos.length} fotos`}
                        </span>
                      )}
                    </td>
                  </tr>

                  {abertaAgora && fotos.length > 0 && (
                    <tr className="border-b border-black/[.06]">
                      <td colSpan={5} className="bg-black/[.02] p-3">
                        <div className="flex gap-2 overflow-x-auto">
                          {fotos.map((endereco, indice) => (
                            <button
                              key={endereco}
                              type="button"
                              onClick={(evento) => {
                                evento.stopPropagation();
                                setAmpliada({
                                  fotos,
                                  indice,
                                });
                              }}
                              className="shrink-0"
                              aria-label={`Abrir foto ${
                                indice + 1
                              }`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={endereco}
                                alt={`Foto ${indice + 1}`}
                                className="h-48 w-auto rounded-lg border border-black/10 object-cover transition hover:brightness-110"
                              />
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
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
