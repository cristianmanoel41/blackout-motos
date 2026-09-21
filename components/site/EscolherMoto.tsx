"use client";

import { useMemo, useState } from "react";
import { Check, Pencil, Search, X } from "lucide-react";

/*
 * Escolher a moto no formulário de financiamento.
 *
 * Uma lista suspensa com dezessete linhas de texto é ruim no
 * celular: a pessoa rola às cegas e não reconhece a moto pelo
 * nome escrito. Aqui ela vê a foto, o ano e o preço, e toca.
 *
 * Escolhida, some a lista e fica só a moto, com "Trocar" ao
 * lado - o formulário volta a ser curto.
 *
 * "Outra moto" existe para quem quer um modelo que a loja
 * ainda não tem: quem procura não pode ficar preso à lista.
 */

export type MotoDaLista = {
  nome: string;
  preco: string;
  capa: string;
};

function semAcento(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export default function EscolherMoto({
  valor,
  aoEscolher,
  estoque,
}: {
  valor: string;
  aoEscolher: (nome: string) => void;
  estoque: MotoDaLista[];
}) {
  const escolhida = estoque.find(
    (item) => item.nome === valor
  );

  /* Escrita à mão: nome preenchido que não está no pátio. */
  const [escrevendo, setEscrevendo] = useState(
    Boolean(valor) && !escolhida
  );

  const [busca, setBusca] = useState("");

  const encontradas = useMemo(() => {
    const termos = semAcento(busca)
      .split(/\s+/)
      .filter(Boolean);

    if (termos.length === 0) return estoque;

    return estoque.filter((item) => {
      const texto = semAcento(item.nome);

      return termos.every((parte) =>
        texto.includes(parte)
      );
    });
  }, [estoque, busca]);

  /* ---------- já escolheu ---------- */

  if (escolhida) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-[#e0b129]/45 bg-[#e0b129]/[.06] p-2.5">
        {escolhida.capa && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={escolhida.capa}
            alt=""
            className="h-14 w-20 shrink-0 rounded-lg object-cover"
          />
        )}

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold texto-claro">
            {escolhida.nome}
          </span>

          <span className="block text-sm font-bold texto-ouro">
            {escolhida.preco}
          </span>
        </span>

        <button
          type="button"
          onClick={() => {
            aoEscolher("");
            setEscrevendo(false);
            setBusca("");
          }}
          className="botao-vidro shrink-0 rounded-lg px-3 py-2 text-xs font-bold"
        >
          Trocar
        </button>
      </div>
    );
  }

  /* ---------- escrevendo o nome ---------- */

  if (escrevendo) {
    return (
      <div className="flex gap-2">
        <input
          value={valor}
          onChange={(evento) =>
            aoEscolher(evento.target.value)
          }
          placeholder="Ex.: Honda CG 160 Fan 2022"
          className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
        />

        <button
          type="button"
          onClick={() => {
            setEscrevendo(false);
            aoEscolher("");
          }}
          aria-label="Voltar para a lista"
          title="Voltar para a lista"
          className="botao-vidro shrink-0 rounded-xl px-3"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  /* ---------- escolhendo ---------- */

  return (
    <div>
      {estoque.length > 6 && (
        <div className="relative mb-2">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35"
          />

          <input
            value={busca}
            onChange={(evento) =>
              setBusca(evento.target.value)
            }
            placeholder="Procurar por marca ou modelo"
            className="w-full rounded-xl border py-2.5 pl-9 pr-4 text-sm outline-none"
          />
        </div>
      )}

      {/*
        * Altura limitada: a lista rola dentro dela mesma, e o
        * resto do formulário continua à vista. Sem isso, as
        * dezessete motos empurram o botão de enviar para longe.
        */}
      <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
        {encontradas.map((item) => (
          <button
            key={item.nome}
            type="button"
            onClick={() => aoEscolher(item.nome)}
            className="flex w-full items-center gap-3 rounded-xl border border-white/[.07] bg-white/[.02] p-2 text-left transition hover:border-[#e0b129]/50 hover:bg-white/[.05]"
          >
            {item.capa && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={item.capa}
                alt=""
                loading="lazy"
                className="h-12 w-16 shrink-0 rounded-lg object-cover"
              />
            )}

            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold texto-claro">
                {item.nome}
              </span>

              <span className="block text-xs font-bold texto-ouro">
                {item.preco}
              </span>
            </span>

            <Check
              size={16}
              className="shrink-0 text-white/15"
            />
          </button>
        ))}

        {encontradas.length === 0 && (
          <p className="px-1 py-3 text-sm texto-suave">
            Nenhuma moto com esse nome no pátio. Use
            &quot;Outra moto&quot; abaixo.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          setEscrevendo(true);
          aoEscolher("");
        }}
        className="mt-2 flex items-center gap-1.5 text-xs font-semibold texto-suave transition hover:text-white"
      >
        <Pencil size={13} />
        Outra moto, não está na lista
      </button>
    </div>
  );
}
