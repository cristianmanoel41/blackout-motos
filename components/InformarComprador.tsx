"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserPlus } from "lucide-react";

/*
 * O COMPRADOR QUE CHEGA DEPOIS
 *
 * Moto nossa vendida na loja parceira sai sem cliente: o
 * dinheiro vem no repasse e os dados de quem comprou chegam
 * quando a outra loja manda. Este quadro fica na ficha da
 * venda ate o comprador ser escolhido - entre os clientes ja
 * cadastrados ou cadastrando um novo, que volta direto para ca.
 *
 * Escolhido o comprador, a venda passa a ter cliente como
 * qualquer outra: contrato de venda, procuracao e lista de
 * aniversario usam os dados dele.
 */

const supabase = createClient();

type Cliente = {
  id: string;
  nome: string;
  telefone?: string | null;
  cpf?: string | null;
};

function normalizar(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export default function InformarComprador({
  vendaId,
  lojaParceira,
  aoInformar,
}: {
  vendaId: string;
  lojaParceira?: string | null;
  aoInformar: () => void;
}) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [escolhido, setEscolhido] = useState<Cliente | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregar() {
      const { data, error } = await supabase
        .from("customers")
        .select("id, nome, telefone, cpf")
        .order("nome", { ascending: true });

      if (error) {
        setErro(`Não foi possível carregar os clientes: ${error.message}`);
        return;
      }

      const lista = (data as Cliente[]) || [];
      setClientes(lista);

      /* Volta do cadastro de cliente: ja vem escolhido. */
      const recemCadastrado = new URLSearchParams(window.location.search).get(
        "comprador",
      );
      const achado = lista.find((c) => String(c.id) === recemCadastrado);

      if (achado) {
        setEscolhido(achado);
        setBusca(achado.nome);
      }
    }

    carregar();
  }, []);

  const sugestoes = useMemo(() => {
    const texto = normalizar(busca);
    const numeros = busca.replace(/\D/g, "");

    if (!texto && !numeros) return [];

    return clientes
      .filter((c) => {
        const nome = normalizar(c.nome || "");
        const cpf = (c.cpf || "").replace(/\D/g, "");

        return (
          (texto.length > 0 && nome.includes(texto)) ||
          (numeros.length > 0 && cpf.includes(numeros))
        );
      })
      .slice(0, 10);
  }, [busca, clientes]);

  async function confirmar() {
    if (!escolhido) return;

    setSalvando(true);
    setErro("");

    const { error } = await supabase
      .from("sales")
      .update({
        customer_id: escolhido.id,
        cliente: escolhido.nome.trim(),
        telefone: escolhido.telefone?.trim() || "",
      })
      .eq("id", vendaId);

    setSalvando(false);

    if (error) {
      setErro(`Não foi possível salvar o comprador: ${error.message}`);
      return;
    }

    window.history.replaceState({}, "", `/vendas/${vendaId}`);
    aoInformar();
  }

  const cadastrarNovo = `/clientes/novo?retorno=comprador&venda=${encodeURIComponent(
    vendaId,
  )}`;

  return (
    <div className="mb-5 rounded-xl border border-yellow-600/60 bg-yellow-500/5 p-4">
      <p className="font-semibold text-yellow-400">Comprador pendente</p>

      <p className="mt-1 text-sm text-zinc-300">
        {lojaParceira
          ? `Moto vendida pela loja do ${lojaParceira}. `
          : ""}
        Quando chegarem os dados de quem comprou, escolha o cliente aqui. O
        contrato de venda só sai com o comprador informado.
      </p>

      <div className="relative mt-4">
        <input
          type="text"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            if (escolhido && e.target.value !== escolhido.nome) {
              setEscolhido(null);
            }
          }}
          placeholder="Digite o nome ou CPF do comprador..."
          autoComplete="off"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
        />

        {busca.trim() && !escolhido && (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl">
            {sugestoes.length > 0 ? (
              sugestoes.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setEscolhido(c);
                    setBusca(c.nome);
                  }}
                  className="block w-full border-b border-zinc-800 px-4 py-3 text-left hover:bg-zinc-900"
                >
                  <p className="font-semibold">{c.nome}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {c.cpf ? `CPF: ${c.cpf}` : ""}
                    {c.telefone ? ` · ${c.telefone}` : ""}
                  </p>
                </button>
              ))
            ) : (
              <div className="p-4 text-sm text-yellow-300">
                Nenhum cliente encontrado. Cadastre o comprador.
              </div>
            )}
          </div>
        )}
      </div>

      {erro && <p className="mt-3 text-sm text-red-400">{erro}</p>}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={confirmar}
          disabled={!escolhido || salvando}
          className="rounded-xl bg-yellow-500 px-5 py-3 font-bold text-black hover:bg-yellow-400 disabled:opacity-40"
        >
          {salvando ? "Salvando..." : "Confirmar comprador"}
        </button>

        <a
          href={cadastrarNovo}
          className="inline-flex items-center gap-2 rounded-xl border border-yellow-500 px-5 py-3 font-semibold text-yellow-400 hover:bg-yellow-500 hover:text-black"
        >
          <UserPlus size={16} />
          Cadastrar comprador
        </a>
      </div>
    </div>
  );
}
