"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileDown, List, X } from "lucide-react";
import {
  agruparPorCilindrada,
  anosDaMoto,
  nomeDaMoto,
  quilometros,
  valorDaLista,
  type MotoDaLista,
} from "@/lib/dados/lista-estoque";

/*
 * A LISTA DO ESTOQUE NA PRÓPRIA TELA
 *
 * A "Lista do Estoque" abre a folha para imprimir ou baixar
 * em Word. Para só consultar - um cliente no telefone
 * perguntando o que tem de 160 - sair do sistema e esperar o
 * Word montar era demais. Esta janela mostra a mesma lista,
 * na mesma ordem, com as motos que a tela do estoque já
 * carregou. O botão de imprimir continua lá fora, e aqui
 * dentro também.
 *
 * Só as disponíveis, como na folha. A janela vai para o body
 * pelo mesmo motivo do MandarParabens: o painel tem efeitos
 * que prendem o "fixed".
 */
export default function ListaDoEstoqueNaTela({
  motos,
  className,
}: {
  motos: Array<MotoDaLista & { id: string | number; status?: string | null }>;
  className: string;
}) {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);

  const disponiveis = useMemo(
    () => motos.filter((moto) => moto.status === "disponivel"),
    [motos]
  );

  const grupos = useMemo(
    () => agruparPorCilindrada(disponiveis),
    [disponiveis]
  );

  /* Esc fecha, e a página de trás não rola junto. */
  useEffect(() => {
    if (!aberta) return;

    function tecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAberta(false);
    }

    const rolagem = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", tecla);

    return () => {
      document.body.style.overflow = rolagem;
      window.removeEventListener("keydown", tecla);
    };
  }, [aberta]);

  const hoje = new Date().toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        className={className}
      >
        <List size={18} />
        Ver Lista na Tela
      </button>

      {aberta &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-2 sm:p-4"
            onClick={() => setAberta(false)}
          >
            <div
              role="dialog"
              aria-label="Lista do estoque"
              className="flex max-h-full w-full max-w-4xl flex-col rounded-2xl border border-grafite-claro bg-grafite text-left text-texto shadow-2xl"
              onClick={(evento) => evento.stopPropagation()}
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-grafite-claro p-4 sm:p-5">
                <div>
                  <h2 className="text-lg font-bold text-dourado">
                    Lista do Estoque
                  </h2>
                  <p className="text-xs text-texto-suave">
                    {disponiveis.length}{" "}
                    {disponiveis.length === 1
                      ? "moto disponível"
                      : "motos disponíveis"}
                    {"  ·  "}
                    {hoje}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/documentos/estoque/lista"
                    className="inline-flex items-center gap-2 rounded-xl border border-grafite-claro px-3 py-2 text-sm font-bold text-texto transition hover:border-dourado hover:text-dourado"
                  >
                    <FileDown size={16} />
                    Imprimir / Word
                  </Link>

                  <button
                    type="button"
                    onClick={() => setAberta(false)}
                    aria-label="Fechar"
                    className="rounded-lg p-2 text-texto-suave transition hover:bg-white/10 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto p-2 sm:p-4">
                {disponiveis.length === 0 ? (
                  <p className="px-4 py-12 text-center text-sm text-texto-suave">
                    Nenhuma moto disponível no estoque agora.
                  </p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-grafite text-xs uppercase tracking-wider text-texto-suave">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Moto</th>
                        <th className="px-3 py-2 font-semibold">Placa</th>
                        <th className="px-3 py-2 font-semibold">Ano</th>
                        <th className="px-3 py-2 text-right font-semibold">KM</th>
                        <th className="px-3 py-2 text-right font-semibold">Valor</th>
                      </tr>
                    </thead>

                    {grupos.map((grupo) => (
                      <tbody key={grupo.cc}>
                        <tr>
                          <td
                            colSpan={5}
                            className="px-3 pb-1.5 pt-4 text-xs font-black uppercase tracking-[.14em] text-dourado"
                          >
                            {grupo.rotulo}
                            <span className="ml-2 font-bold text-texto-suave">
                              ({grupo.motos.length})
                            </span>
                          </td>
                        </tr>

                        {grupo.motos.map((moto) => {
                          const valor = valorDaLista(moto.preco_anunciado);

                          return (
                            <tr
                              key={moto.id}
                              onClick={() => router.push(`/motos/${moto.id}`)}
                              title="Abrir a ficha da moto"
                              className="cursor-pointer border-t border-grafite-claro/60 transition hover:bg-white/[.04]"
                            >
                              <td className="px-3 py-2 font-semibold text-white">
                                {nomeDaMoto(moto)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 font-mono text-zinc-300">
                                {String(moto.placa || "").toUpperCase()}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-zinc-300">
                                {anosDaMoto(moto)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-right text-zinc-300">
                                {quilometros(moto.quilometragem)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-right font-bold text-dourado">
                                {valor === "A consultar" ? valor : `R$ ${valor}`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    ))}
                  </table>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
