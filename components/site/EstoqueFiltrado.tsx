"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import CardMoto from "@/components/site/CardMoto";
import {
  numero,
  type MotoSite,
} from "@/lib/dados/moto-site";

/*
 * A lista do estoque com filtros.
 *
 * Os filtros são montados a partir do que existe no pátio
 * hoje: só aparece "Kawasaki" se houver uma Kawasaki no
 * estoque. Filtro que não devolve nada frustra mais do que
 * ajuda.
 */

function semAcento(valor: unknown) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

const FAIXAS = [
  { chave: "", nome: "Qualquer preço" },
  { chave: "0-15000", nome: "Até R$ 15 mil" },
  { chave: "15000-25000", nome: "R$ 15 a 25 mil" },
  { chave: "25000-40000", nome: "R$ 25 a 40 mil" },
  { chave: "40000-0", nome: "Acima de R$ 40 mil" },
];

const KMS = [
  { chave: "", nome: "Qualquer km" },
  { chave: "0-10000", nome: "Até 10 mil km" },
  { chave: "10000-30000", nome: "10 a 30 mil km" },
  { chave: "30000-60000", nome: "30 a 60 mil km" },
  { chave: "60000-0", nome: "Acima de 60 mil km" },
];

function dentroDaFaixa(
  valor: number | null,
  faixa: string
) {
  if (!faixa) return true;
  if (valor === null) return false;

  const [de, ate] = faixa.split("-").map(Number);

  if (ate === 0) return valor >= de;

  return valor >= de && valor < ate;
}

export default function EstoqueFiltrado({
  motos,
  slugs,
  capas,
  totalFotos,
}: {
  motos: MotoSite[];
  slugs: Record<string, string>;
  capas: Record<string, string>;
  totalFotos: Record<string, number>;
}) {
  const [busca, setBusca] = useState("");
  const [marca, setMarca] = useState("");
  const [ano, setAno] = useState("");
  const [preco, setPreco] = useState("");
  const [km, setKm] = useState("");
  const [cilindrada, setCilindrada] = useState("");
  const [abertos, setAbertos] = useState(false);

  const opcoes = useMemo(() => {
    const unicos = (valores: unknown[]) =>
      Array.from(
        new Set(
          valores
            .map((valor) => String(valor || "").trim())
            .filter(Boolean)
        )
      ).sort();

    return {
      marcas: unicos(motos.map((m) => m.marca)),

      anos: unicos(
        motos.map(
          (m) =>
            numero(m.ano_modelo) ||
            numero(m.ano_fabricacao)
        )
      ).reverse(),

      cilindradas: unicos(
        motos.map((m) => numero(m.cilindrada))
      ).sort((a, b) => Number(a) - Number(b)),
    };
  }, [motos]);

  const filtradas = useMemo(() => {
    const termos = semAcento(busca)
      .split(/\s+/)
      .filter(Boolean);

    return motos.filter((moto) => {
      const texto = semAcento(
        [
          moto.marca,
          moto.modelo,
          moto.versao,
          moto.cor,
        ]
          .filter(Boolean)
          .join(" ")
      );

      if (!termos.every((t) => texto.includes(t))) {
        return false;
      }

      if (
        marca &&
        semAcento(moto.marca) !== semAcento(marca)
      ) {
        return false;
      }

      if (
        cilindrada &&
        String(numero(moto.cilindrada)) !== cilindrada
      ) {
        return false;
      }

      if (ano) {
        const dela = String(
          numero(moto.ano_modelo) ||
            numero(moto.ano_fabricacao)
        );

        if (dela !== ano) return false;
      }

      if (
        !dentroDaFaixa(numero(moto.preco_anunciado), preco)
      ) {
        return false;
      }

      if (!dentroDaFaixa(numero(moto.quilometragem), km)) {
        return false;
      }

      return true;
    });
  }, [
    motos,
    busca,
    marca,
    ano,
    preco,
    km,
    cilindrada,
  ]);

  const temFiltro =
    !!busca ||
    !!marca ||
    !!ano ||
    !!preco ||
    !!km ||
    !!cilindrada;

  function limpar() {
    setBusca("");
    setMarca("");
    setAno("");
    setPreco("");
    setKm("");
    setCilindrada("");
  }

  const seletor =
    "w-full rounded-xl border px-3 py-2.5 text-sm outline-none";

  return (
    <>
      <div className="cartao-3d mb-7 rounded-2xl p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35"
            />

            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Procurar por marca ou modelo"
              className="w-full rounded-xl border py-3 pl-10 pr-4 text-sm outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setAbertos((estava) => !estava)}
            aria-expanded={abertos}
            className="botao-vidro flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold"
          >
            <SlidersHorizontal size={16} />
            Filtros
          </button>
        </div>

        {abertos && (
          <div className="mt-4 grid gap-3 border-t border-white/[.07] pt-4 sm:grid-cols-2 lg:grid-cols-3">
            <select
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              className={seletor}
              aria-label="Marca"
            >
              <option value="">Todas as marcas</option>

              {opcoes.marcas.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={ano}
              onChange={(e) => setAno(e.target.value)}
              className={seletor}
              aria-label="Ano"
            >
              <option value="">Qualquer ano</option>

              {opcoes.anos.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              className={seletor}
              aria-label="Faixa de preço"
            >
              {FAIXAS.map((item) => (
                <option key={item.chave} value={item.chave}>
                  {item.nome}
                </option>
              ))}
            </select>

            <select
              value={km}
              onChange={(e) => setKm(e.target.value)}
              className={seletor}
              aria-label="Quilometragem"
            >
              {KMS.map((item) => (
                <option key={item.chave} value={item.chave}>
                  {item.nome}
                </option>
              ))}
            </select>

            {opcoes.cilindradas.length > 0 && (
              <select
                value={cilindrada}
                onChange={(e) =>
                  setCilindrada(e.target.value)
                }
                className={seletor}
                aria-label="Cilindrada"
              >
                <option value="">
                  Qualquer cilindrada
                </option>

                {opcoes.cilindradas.map((item) => (
                  <option key={item} value={item}>
                    {item} cc
                  </option>
                ))}
              </select>
            )}


          </div>
        )}

        {temFiltro && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[.07] pt-4">
            <p className="text-sm texto-suave">
              <span className="font-bold texto-ouro">
                {filtradas.length}
              </span>{" "}
              de {motos.length} moto
              {motos.length === 1 ? "" : "s"}
            </p>

            <button
              type="button"
              onClick={limpar}
              className="flex items-center gap-1.5 text-sm font-semibold texto-suave transition hover:text-white"
            >
              <X size={14} />
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {filtradas.length === 0 ? (
        <article className="cartao-3d rounded-2xl p-10 text-center text-sm texto-suave">
          Nenhuma moto encontrada com esses filtros. Tente
          afrouxar a busca ou fale com a gente no WhatsApp.
        </article>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtradas.map((moto, posicao) => (
            <CardMoto
              key={moto.id}
              moto={moto}
              slug={slugs[moto.id]}
              capa={capas[moto.id]}
              fotos={totalFotos[moto.id] || 0}
              prioridade={posicao < 4}
            />
          ))}
        </div>
      )}
    </>
  );
}
