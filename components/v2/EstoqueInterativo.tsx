"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import CardMoto from "@/components/v2/CardMoto";
import {
  CATEGORIAS,
  FAIXAS_DE_PRECO,
  cabeNaFaixa,
  categoriaDaMoto,
  numero,
  tituloDaMoto,
  type Categoria,
  type MotoSite,
} from "@/lib/dados/moto-site";

/*
 * O estoque com filtros - a tela onde o cliente acha a moto.
 *
 * Três camadas, da mais usada para a menos:
 *
 *   1. a busca por texto, sempre à vista;
 *   2. os atalhos de um toque: faixa de preço e tipo de moto;
 *   3. "Mais filtros": marca, modelo, ano, km, cilindrada.
 *
 * No celular a pessoa resolve quase tudo nas duas primeiras sem
 * abrir nada - é o que deixa usar com uma mão só.
 *
 * Tudo é filtrado na tela, sobre a lista que já veio do
 * servidor: são poucas dezenas de motos, e assim cada toque
 * responde na hora, sem ida ao banco.
 *
 * OS FILTROS FICAM NO ENDEREÇO
 *
 * /estoque?preco=ate-20000&tipo=scooter abre já filtrado. É o
 * que deixa o anúncio de "motos até 20 mil" cair na lista
 * certa, e o cliente mandar para alguém exatamente o que está
 * vendo. A troca é feita com replaceState, sem recarregar nem
 * encher o botão "voltar" de passos.
 *
 * As opções saem do pátio de hoje: só aparece "Kawasaki" se
 * houver uma Kawasaki. Filtro que não devolve nada frustra mais
 * do que ajuda.
 */

export type FiltrosIniciais = {
  busca?: string;
  preco?: string;
  tipo?: string;
  marca?: string;
};

type Ordem = "recentes" | "menor-preco" | "maior-preco" | "menor-km" | "mais-novas";

const ORDENS: { chave: Ordem; nome: string }[] = [
  { chave: "recentes", nome: "Chegaram por último" },
  { chave: "menor-preco", nome: "Menor preço" },
  { chave: "maior-preco", nome: "Maior preço" },
  { chave: "menor-km", nome: "Menor km" },
  { chave: "mais-novas", nome: "Ano mais novo" },
];

const KMS = [
  { chave: "", nome: "Qualquer km" },
  { chave: "10000", nome: "Até 10 mil km" },
  { chave: "30000", nome: "Até 30 mil km" },
  { chave: "60000", nome: "Até 60 mil km" },
];

function semAcento(valor: unknown) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function anoDela(moto: MotoSite) {
  return numero(moto.ano_modelo) || numero(moto.ano_fabricacao) || 0;
}

export default function EstoqueInterativo({
  motos,
  slugs,
  capas,
  totalFotos,
  totalVideos,
  iniciais = {},
}: {
  motos: MotoSite[];
  slugs: Record<string, string>;
  capas: Record<string, string>;
  totalFotos: Record<string, number>;
  totalVideos: Record<string, number>;
  iniciais?: FiltrosIniciais;
}) {
  const [busca, setBusca] = useState(iniciais.busca || "");
  const [preco, setPreco] = useState(
    FAIXAS_DE_PRECO.some((f) => f.chave === iniciais.preco)
      ? iniciais.preco!
      : ""
  );
  const [tipo, setTipo] = useState<Categoria>(
    CATEGORIAS.some((c) => c.chave === iniciais.tipo)
      ? (iniciais.tipo as Categoria)
      : "todas"
  );
  const [marca, setMarca] = useState(iniciais.marca || "");
  const [modelo, setModelo] = useState("");
  const [anoMinimo, setAnoMinimo] = useState("");
  const [kmMaximo, setKmMaximo] = useState("");
  const [cilindrada, setCilindrada] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("recentes");
  const [abertos, setAbertos] = useState(
    Boolean(iniciais.marca)
  );

  /* As opções, montadas do que está no pátio hoje. */
  const opcoes = useMemo(() => {
    const unicos = (valores: unknown[]) =>
      Array.from(
        new Set(
          valores
            .map((valor) => String(valor || "").trim())
            .filter(Boolean)
        )
      );

    const daMarca = marca
      ? motos.filter((m) => semAcento(m.marca) === semAcento(marca))
      : motos;

    return {
      marcas: unicos(motos.map((m) => tituloDaMoto(m.marca || ""))).sort(),
      modelos: unicos(daMarca.map((m) => tituloDaMoto(m.modelo || ""))).sort(),
      anos: unicos(motos.map(anoDela).filter(Boolean))
        .map(Number)
        .sort((a, b) => b - a),
      cilindradas: unicos(motos.map((m) => numero(m.cilindrada)))
        .map(Number)
        .sort((a, b) => a - b),
      tipos: CATEGORIAS.filter(
        (item) =>
          item.chave === "todas" ||
          motos.some((m) => categoriaDaMoto(m) === item.chave)
      ),
      faixas: FAIXAS_DE_PRECO.filter((faixa) =>
        motos.some((m) => cabeNaFaixa(m, faixa.chave))
      ),
    };
  }, [motos, marca]);

  const filtradas = useMemo(() => {
    const termos = semAcento(busca).split(/\s+/).filter(Boolean);

    const lista = motos.filter((moto) => {
      const texto = semAcento(
        [moto.marca, moto.modelo, moto.versao, moto.cor, anoDela(moto)]
          .filter(Boolean)
          .join(" ")
      );

      /* "mt 03" acha "MT-03": compara sem hífen também. */
      const colado = texto.replace(/[^a-z0-9]/g, "");

      if (
        !termos.every(
          (t) => texto.includes(t) || colado.includes(t.replace(/[^a-z0-9]/g, ""))
        )
      ) {
        return false;
      }

      if (preco && !cabeNaFaixa(moto, preco)) return false;
      if (tipo !== "todas" && categoriaDaMoto(moto) !== tipo) return false;
      if (marca && semAcento(moto.marca) !== semAcento(marca)) return false;
      if (modelo && semAcento(moto.modelo) !== semAcento(modelo)) return false;
      if (anoMinimo && anoDela(moto) < Number(anoMinimo)) return false;

      if (kmMaximo) {
        const km = numero(moto.quilometragem);
        if (km === null || km > Number(kmMaximo)) return false;
      }

      if (cilindrada && numero(moto.cilindrada) !== Number(cilindrada)) {
        return false;
      }

      return true;
    });

    /* Sem preço vai para o fim em qualquer ordem de preço. */
    const precoOu = (m: MotoSite, vazio: number) =>
      numero(m.preco_anunciado) ?? vazio;

    switch (ordem) {
      case "menor-preco":
        return [...lista].sort((a, b) => precoOu(a, Infinity) - precoOu(b, Infinity));
      case "maior-preco":
        return [...lista].sort((a, b) => precoOu(b, -1) - precoOu(a, -1));
      case "menor-km":
        return [...lista].sort(
          (a, b) =>
            (numero(a.quilometragem) ?? Infinity) -
            (numero(b.quilometragem) ?? Infinity)
        );
      case "mais-novas":
        return [...lista].sort((a, b) => anoDela(b) - anoDela(a));
      default:
        /* A lista já vem da mais nova entrada para a mais antiga. */
        return lista;
    }
  }, [motos, busca, preco, tipo, marca, modelo, anoMinimo, kmMaximo, cilindrada, ordem]);

  /* Os filtros principais vão para o endereço. */
  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search);

    const definir = (chave: string, valor: string) => {
      if (valor) parametros.set(chave, valor);
      else parametros.delete(chave);
    };

    definir("busca", busca.trim());
    definir("preco", preco);
    definir("tipo", tipo === "todas" ? "" : tipo);
    definir("marca", marca);

    const texto = parametros.toString();
    const novo = `${window.location.pathname}${texto ? `?${texto}` : ""}`;

    if (novo !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(window.history.state, "", novo);
    }
  }, [busca, preco, tipo, marca]);

  const extras = [marca, modelo, anoMinimo, kmMaximo, cilindrada].filter(Boolean).length;

  const temFiltro = Boolean(busca || preco || tipo !== "todas" || extras);

  function limpar() {
    setBusca("");
    setPreco("");
    setTipo("todas");
    setMarca("");
    setModelo("");
    setAnoMinimo("");
    setKmMaximo("");
    setCilindrada("");
  }

  const seletor = "min-h-11 w-full rounded-xl border px-3 py-2.5 text-sm outline-none";

  return (
    <>
      <div className="vidro mb-7 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <label htmlFor="busca-estoque" className="sr-only">
              Procurar moto
            </label>

            <Search
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"
            />

            <input
              id="busca-estoque"
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Procure: CG 160, Biz, XRE, Yamaha..."
              className="min-h-12 w-full rounded-xl border py-3 pl-11 pr-4 text-[15px] outline-none"
            />
          </div>

          <div className="flex gap-2">
            <label htmlFor="ordem-estoque" className="sr-only">
              Ordenar
            </label>

            <select
              id="ordem-estoque"
              value={ordem}
              onChange={(e) => setOrdem(e.target.value as Ordem)}
              className="min-h-12 flex-1 rounded-xl border px-3 text-sm outline-none sm:w-52 sm:flex-none"
            >
              {ORDENS.map((item) => (
                <option key={item.chave} value={item.chave}>
                  {item.nome}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setAbertos((estava) => !estava)}
              aria-expanded={abertos}
              aria-controls="mais-filtros"
              className="botao-vidro flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold"
            >
              <SlidersHorizontal size={16} />
              Filtros
              {extras > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e0b129] px-1.5 text-[11px] font-black text-black">
                  {extras}
                </span>
              )}
            </button>
          </div>
        </div>

        {/*
          * Os atalhos de um toque.
          *
          * No celular a fileira rola de lado em vez de quebrar em
          * três linhas: o polegar arrasta melhor do que procura.
          */}
        {opcoes.faixas.length > 0 && (
          <div
            role="group"
            aria-label="Faixa de preço"
            className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 [scrollbar-width:none]"
          >
            {opcoes.faixas.map((faixa) => (
              <button
                key={faixa.chave}
                type="button"
                aria-pressed={preco === faixa.chave}
                onClick={() => setPreco((atual) => (atual === faixa.chave ? "" : faixa.chave))}
                className={`min-h-10 shrink-0 whitespace-nowrap rounded-full px-4 text-[13px] ${
                  preco === faixa.chave ? "pilula pilula-ligada" : "pilula"
                }`}
              >
                {faixa.nome}
              </button>
            ))}
          </div>
        )}

        {opcoes.tipos.length > 2 && (
          <div
            role="group"
            aria-label="Tipo de moto"
            className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 [scrollbar-width:none]"
          >
            {opcoes.tipos.map((item) => (
              <button
                key={item.chave}
                type="button"
                aria-pressed={tipo === item.chave}
                onClick={() => setTipo(item.chave)}
                className={`min-h-10 shrink-0 whitespace-nowrap rounded-full px-4 text-[13px] ${
                  tipo === item.chave ? "pilula pilula-ligada" : "pilula"
                }`}
              >
                {item.nome}
              </button>
            ))}
          </div>
        )}

        {abertos && (
          <div
            id="mais-filtros"
            className="mt-4 grid gap-3 border-t border-white/[.07] pt-4 sm:grid-cols-2 lg:grid-cols-5"
          >
            <select
              value={marca}
              onChange={(e) => {
                setMarca(e.target.value);
                setModelo("");
              }}
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
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              className={seletor}
              aria-label="Modelo"
            >
              <option value="">Todos os modelos</option>
              {opcoes.modelos.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={anoMinimo}
              onChange={(e) => setAnoMinimo(e.target.value)}
              className={seletor}
              aria-label="Ano mínimo"
            >
              <option value="">Qualquer ano</option>
              {opcoes.anos.map((item) => (
                <option key={item} value={item}>
                  {item} ou mais nova
                </option>
              ))}
            </select>

            <select
              value={kmMaximo}
              onChange={(e) => setKmMaximo(e.target.value)}
              className={seletor}
              aria-label="Quilometragem"
            >
              {KMS.map((item) => (
                <option key={item.chave} value={item.chave}>
                  {item.nome}
                </option>
              ))}
            </select>

            {/* Cilindrada só quando o cadastro tem: senão é filtro vazio. */}
            {opcoes.cilindradas.length > 0 && (
              <select
                value={cilindrada}
                onChange={(e) => setCilindrada(e.target.value)}
                className={seletor}
                aria-label="Cilindrada"
              >
                <option value="">Qualquer cilindrada</option>
                {opcoes.cilindradas.map((item) => (
                  <option key={item} value={item}>
                    {item} cc
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[.07] pt-4">
          <p className="text-sm suave" aria-live="polite">
            <span className="font-bold ouro">{filtradas.length}</span>{" "}
            {temFiltro ? `de ${motos.length} ` : ""}
            moto{filtradas.length === 1 ? "" : "s"}
            {temFiltro ? " encontradas" : " disponíveis"}
          </p>

          {temFiltro && (
            <button
              type="button"
              onClick={limpar}
              className="flex min-h-10 items-center gap-1.5 text-sm font-semibold suave transition hover:text-white"
            >
              <X size={14} />
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {filtradas.length === 0 ? (
        <article className="vidro p-10 text-center text-sm suave">
          Nenhuma moto com esses filtros agora. Tente afrouxar a
          busca - ou chame no WhatsApp: a gente avisa quando chegar
          a que você procura.
        </article>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtradas.map((moto, posicao) => (
            <CardMoto
              key={moto.id}
              moto={moto}
              slug={slugs[moto.id]}
              foto={capas[moto.id]}
              fotos={totalFotos[moto.id] || 0}
              videos={totalVideos[moto.id] || 0}
              prioridade={posicao < 4}
            />
          ))}
        </div>
      )}
    </>
  );
}
