"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatarData } from "@/lib/formatadores/data";
import {
  Check,
  Copy,
  ExternalLink,
  Link2,
  Plus,
  Power,
} from "lucide-react";

/*
 * Links de compartilhamento do estoque.
 *
 * Cada link tem um código próprio. Quem abre vê só as motos
 * disponíveis, sem login. Desativar corta o acesso na hora,
 * sem precisar avisar ninguém.
 */

const supabase = createClient();

type Compartilhamento = {
  id: string;
  token: string;
  loja: string | null;
  observacao: string | null;
  ativo: boolean;
  criado_em: string;
};

export default function CompartilharEstoquePage() {
  const [links, setLinks] = useState<Compartilhamento[]>(
    []
  );

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState("");

  const [loja, setLoja] = useState("");
  const [observacao, setObservacao] = useState("");

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    setErro("");

    const { data, error } = await supabase
      .from("stock_shares")
      .select("*")
      .order("criado_em", { ascending: false });

    if (error) {
      setErro(
        `Não foi possível carregar os links: ${error.message}`
      );
      setCarregando(false);
      return;
    }

    setLinks((data as Compartilhamento[]) || []);
    setCarregando(false);
  }

  function enderecoDoLink(token: string) {
    if (typeof window === "undefined") return "";

    return `${window.location.origin}/vitrine/${token}`;
  }

  async function criar() {
    setErro("");

    if (!loja.trim()) {
      setErro("Informe para qual loja é este link.");
      return;
    }

    setSalvando(true);

    const { error } = await supabase
      .from("stock_shares")
      .insert({
        loja: loja.trim(),
        observacao: observacao.trim() || null,
      });

    setSalvando(false);

    if (error) {
      setErro(
        `Não foi possível criar o link: ${error.message}`
      );
      return;
    }

    setLoja("");
    setObservacao("");
    await carregar();
  }

  async function alternar(link: Compartilhamento) {
    if (link.ativo) {
      const confirmar = window.confirm(
        `Desativar o link de ${
          link.loja || "esta loja"
        }? Quem tiver o endereço deixa de ver o estoque.`
      );

      if (!confirmar) return;
    }

    const { error } = await supabase
      .from("stock_shares")
      .update({ ativo: !link.ativo })
      .eq("id", link.id);

    if (error) {
      setErro(
        `Não foi possível alterar o link: ${error.message}`
      );
      return;
    }

    await carregar();
  }

  async function copiar(link: Compartilhamento) {
    const endereco = enderecoDoLink(link.token);

    try {
      await navigator.clipboard.writeText(endereco);
      setCopiado(link.id);
      setTimeout(() => setCopiado(""), 2500);
    } catch {
      setErro(
        `Não consegui copiar. O endereço é: ${endereco}`
      );
    }
  }

  const inputClass =
    "w-full rounded-lg border border-grafite-claro bg-grafite-claro px-4 py-3 text-texto outline-none transition focus:border-dourado";

  const labelClass =
    "mb-1 block text-sm font-medium text-texto";

  return (
    <div className="w-full max-w-4xl">
      {/* CABEÇALHO */}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-dourado">
            <Link2 size={24} />
            Compartilhar Estoque
          </h1>

          <p className="mt-1 text-sm text-texto-suave">
            Gere um link para outra loja ver as motos
            disponíveis. Ela não precisa de login e não vê
            valor de compra, gastos nem clientes.
          </p>
        </div>

        <Link
          href="/estoque"
          className="rounded-lg border border-grafite-claro px-4 py-2 text-sm font-semibold text-texto-suave transition hover:border-dourado hover:text-dourado"
        >
          Voltar ao estoque
        </Link>
      </div>

      {erro && (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {erro}
        </div>
      )}

      {/* NOVO LINK */}

      <div className="mb-6 rounded-xl border border-grafite-claro bg-grafite p-5">
        <p className="mb-4 font-semibold text-texto">
          Novo link
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>
              Para qual loja *
            </label>

            <input
              value={loja}
              onChange={(e) => setLoja(e.target.value)}
              placeholder="Ex.: Moto Center SJC"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Observação
            </label>

            <input
              value={observacao}
              onChange={(e) =>
                setObservacao(e.target.value)
              }
              placeholder="Opcional"
              className={inputClass}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={criar}
          disabled={salvando}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-dourado px-6 py-3 text-sm font-semibold text-preto transition hover:bg-dourado-claro disabled:opacity-60"
        >
          <Plus size={17} />
          {salvando ? "Gerando..." : "Gerar link"}
        </button>
      </div>

      {/* LINKS */}

      {carregando && (
        <div className="rounded-xl border border-grafite-claro bg-grafite p-6 text-center text-sm text-texto-suave">
          Carregando links...
        </div>
      )}

      {!carregando && links.length === 0 && (
        <div className="rounded-xl border border-grafite-claro bg-grafite p-8 text-center text-sm text-texto-suave">
          Nenhum link gerado ainda.
        </div>
      )}

      <div className="space-y-3">
        {links.map((link) => (
          <div
            key={link.id}
            className={`rounded-xl border p-4 ${
              link.ativo
                ? "border-grafite-claro bg-grafite"
                : "border-grafite-claro bg-grafite opacity-60"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-texto">
                  {link.loja || "Sem nome"}

                  {!link.ativo && (
                    <span className="ml-2 rounded border border-grafite-claro px-2 py-0.5 text-xs text-texto-suave">
                      desativado
                    </span>
                  )}
                </p>

                <p className="text-xs text-texto-suave">
                  Criado em{" "}
                  {formatarData(
                    link.criado_em.slice(0, 10)
                  )}

                  {link.observacao
                    ? ` · ${link.observacao}`
                    : ""}
                </p>

                <p className="mt-2 break-all rounded-lg border border-grafite-claro bg-preto/40 px-3 py-2 text-xs text-texto-suave">
                  {enderecoDoLink(link.token)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => copiar(link)}
                  className="inline-flex items-center gap-2 rounded-lg border border-grafite-claro px-3 py-2 text-xs font-semibold text-texto transition hover:border-dourado hover:text-dourado"
                >
                  {copiado === link.id ? (
                    <>
                      <Check size={14} />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      Copiar
                    </>
                  )}
                </button>

                <a
                  href={`/vitrine/${link.token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-grafite-claro px-3 py-2 text-xs font-semibold text-texto transition hover:border-dourado hover:text-dourado"
                >
                  <ExternalLink size={14} />
                  Abrir
                </a>

                <button
                  type="button"
                  onClick={() => alternar(link)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                    link.ativo
                      ? "border-red-800 text-red-300 hover:bg-red-950/40"
                      : "border-green-800 text-green-300 hover:bg-green-950/40"
                  }`}
                >
                  <Power size={14} />
                  {link.ativo ? "Desativar" : "Reativar"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
