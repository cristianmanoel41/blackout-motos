"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

/*
 * A busca do cabeçalho.
 *
 * Procura no que a loja tem agora, e não na internet inteira:
 * a lista de motos vem pronta do servidor, então digitar não
 * custa nenhuma ida ao banco e o resultado aparece a cada
 * letra.
 *
 * Compara sem acento e sem caixa - "mt 03" acha "MT-03" -, e
 * só com duas letras ou mais, senão a primeira tecla já
 * abriria a lista inteira.
 *
 * Sem resultado não some a caixa: some o menu e fica o aviso,
 * porque lista que desaparece deixa a pessoa achando que
 * quebrou.
 */

export type MotoBusca = {
  nome: string;
  slug: string;
  ano: string;
};

function semAcento(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export default function Busca({
  motos,
  className = "",
}: {
  motos: MotoBusca[];
  className?: string;
}) {
  const router = useRouter();
  const caixa = useRef<HTMLDivElement>(null);

  const [texto, setTexto] = useState("");
  const [aberta, setAberta] = useState(false);

  const termos = semAcento(texto)
    .split(/[^a-z0-9]+/)
    .filter((palavra) => palavra.length > 0);

  const achadas =
    semAcento(texto).trim().length < 2
      ? []
      : motos
          .filter((moto) => {
            const alvo = semAcento(
              `${moto.nome} ${moto.ano}`
            );

            return termos.every((palavra) =>
              alvo.includes(palavra)
            );
          })
          .slice(0, 6);

  function abrir(slug: string) {
    setAberta(false);
    setTexto("");
    router.push(`/estoque/${slug}`);
  }

  return (
    <div
      ref={caixa}
      className={`relative ${className}`}
      onBlur={(evento) => {
        /* Só fecha quando o foco sai da caixa inteira. */
        if (
          !caixa.current?.contains(
            evento.relatedTarget as Node
          )
        ) {
          setAberta(false);
        }
      }}
    >
      <form
        onSubmit={(evento) => {
          evento.preventDefault();

          if (achadas.length > 0) {
            abrir(achadas[0].slug);
            return;
          }

          router.push("/estoque");
        }}
        role="search"
      >
        <label htmlFor="busca-v2" className="sr-only">
          Buscar motos
        </label>

        <Search
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6b7079]"
        />

        <input
          id="busca-v2"
          type="search"
          autoComplete="off"
          value={texto}
          onChange={(evento) => {
            setTexto(evento.target.value);
            setAberta(true);
          }}
          onFocus={() => setAberta(true)}
          placeholder="Buscar motos, ex: CB 500, MT-03..."
          className="w-full rounded-full py-2.5 pl-10 pr-4 text-[13px]"
        />
      </form>

      {aberta && semAcento(texto).trim().length >= 2 && (
        <div className="vidro absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden p-1.5">
          {achadas.length > 0 ? (
            <ul>
              {achadas.map((moto) => (
                <li key={moto.slug}>
                  <button
                    type="button"
                    onClick={() => abrir(moto.slug)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] claro hover:bg-white/[.06]"
                  >
                    <span>{moto.nome}</span>
                    <span className="shrink-0 text-xs suave">
                      {moto.ano}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-3 text-[13px] suave">
              Nenhuma moto com esse nome no pátio agora.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
