"use client";

import { useMemo, useState } from "react";
import { Check, ListFilter, Pencil, Search, X } from "lucide-react";

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
  rolagemInterna = true,
  comecaFechada = false,
}: {
  valor: string;
  aoEscolher: (nome: string) => void;
  estoque: MotoDaLista[];
  /* No celular, rolagem dentro de rolagem come o primeiro
     toque: o iOS usa ele para parar a inercia, e o clique
     nao acontece. Quem nao precisa da caixa desliga. */
  rolagemInterna?: boolean;
  /* Começa fechada: mostra um botão no lugar da lista, e a
     lista só nasce quando a pessoa pede. */
  comecaFechada?: boolean;
}) {
  const escolhida = estoque.find(
    (item) => item.nome === valor
  );

  /* Escrita à mão: nome preenchido que não está no pátio. */
  const [escrevendo, setEscrevendo] = useState(
    Boolean(valor) && !escolhida
  );

  const [busca, setBusca] = useState("");

  /*
   * A lista inteira esta aberta?
   *
   * Fechada por padrao: vinte e uma motos empilhadas antes de
   * a pessoa decidir qualquer coisa empurram a entrada e as
   * parcelas para longe.
   */
  const [verTodas, setVerTodas] = useState(false);


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

  /*
   * ---------- modo busca ----------
   *
   * A linha de procurar fica sempre à vista, e embaixo dela só
   * a moto escolhida. A lista inteira - vinte e uma - só nasce
   * quando a pessoa digita alguma coisa.
   *
   * É o contrário do que estava: antes a tela mostrava tudo e
   * esperava a pessoa achar a dela no meio. Aqui ela diz o que
   * procura e a tela mostra só isso.
   */
  if (comecaFechada && !escrevendo) {
    const procurando = busca.trim() !== "";

    /*
     * O que aparece embaixo da busca.
     *
     * Procurando, os resultados. Pedindo para ver tudo, o pátio
     * inteiro. Parado, só a moto escolhida - que é o estado em
     * que a tela passa a maior parte do tempo.
     */
    const aMostrar = procurando
      ? encontradas
      : verTodas
        ? estoque
        : escolhida
          ? [escolhida]
          : [];

    return (
      <div>
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35"
          />

          <input
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Procurar por marca ou modelo"
            className="w-full rounded-xl border py-3 pl-9 pr-4 text-sm outline-none"
          />
        </div>

        <div className="mt-2 space-y-1.5">
          {aMostrar.map((item, posicao) => {
            const estaEscolhida = item.nome === valor;

            return (
              <button
                key={`${item.nome}-${posicao}`}
                type="button"
                onClick={() => {
                  aoEscolher(item.nome);
                  /* Escolheu: a busca se apaga e a lista fecha.
                     Sobra na tela só a moto dela, que é o que
                     interessa daqui para a frente. */
                  setBusca("");
                  setVerTodas(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition ${
                  estaEscolhida
                    ? "border-[#e0b129]/45 bg-[#e0b129]/[.06]"
                    : "border-white/[.07] bg-white/[.02]"
                }`}
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
                  className={
                    estaEscolhida
                      ? "shrink-0 texto-ouro"
                      : "shrink-0 text-white/15"
                  }
                />
              </button>
            );
          })}

          {procurando && encontradas.length === 0 && (
            <p className="px-1 py-3 text-sm texto-suave">
              Nenhuma moto com esse nome no pátio. Use
              &quot;Outra moto&quot; abaixo.
            </p>
          )}
        </div>

        {/*
          * Ver o pátio inteiro, para quem não sabe o que quer.
          *
          * Procurar serve a quem já tem um modelo em mente.
          * Quem está só olhando precisa de uma porta que diga
          * "me mostra o que você tem" - e o número ao lado já
          * responde "vinte e uma" antes de ela tocar.
          *
          * Some enquanto a pessoa procura: ali a lista já está
          * na tela, e o botão viraria ruído.
          */}
        {!procurando && (
          <button
            type="button"
            onClick={() => setVerTodas((antes) => !antes)}
            className="mt-2 flex w-full items-center justify-between gap-3 rounded-xl border border-white/[.07] bg-white/[.02] px-4 py-3 text-left text-sm font-bold transition"
          >
            <span className="flex items-center gap-2 texto-claro">
              <ListFilter size={16} className="shrink-0 texto-ouro" />
              {verTodas
                ? "Esconder a lista"
                : "Ver as motos do pátio"}
            </span>

            <span className="shrink-0 text-xs font-bold texto-suave">
              {estoque.length}
            </span>
          </button>
        )}

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
        * motos empurram o botão de enviar para longe.
        *
        * Com `rolagemInterna` desligada, a caixa só existe
        * da tela do computador para cima. No celular a lista
        * cresce e quem rola é a página - é o único jeito de
        * o toque na moto valer sempre no iPhone.
        */}
      <div
        className={
          rolagemInterna
            ? "max-h-64 space-y-1.5 overflow-y-auto pr-1"
            : "space-y-1.5 sm:max-h-80 sm:overflow-y-auto sm:pr-1"
        }
      >
        {/*
          * A chave leva a posição junto do nome.
          *
          * Duas motos iguais no pátio têm o mesmo nome e o
          * mesmo ano - hoje são duas Yamaha YBR 125i Factor ED.
          * Com o nome sozinho como chave, o React tratava as
          * duas como a mesma coisa e podia sumir com uma delas
          * da lista: moto no estoque que o cliente não via.
          */}
        {encontradas.map((item, posicao) => (
          <button
            key={`${item.nome}-${posicao}`}
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
