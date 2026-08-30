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
}: {
  motos: MotoVitrine[];
}) {
  const [busca, setBusca] = useState("");

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
                {filtradas.map((moto) => (
                  <tr
                    key={moto.id}
                    className="border-b border-black/[.06] last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Bike
                          size={16}
                          className="shrink-0 text-black/35"
                        />

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

                          {moto.codigo && (
                            <p className="text-xs text-black/45">
                              {moto.codigo}
                            </p>
                          )}
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
