"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Cliente = {
  id: string;
  nome: string;
  rg: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  telefone: string | null;
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
};

export default function ClienteDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const id = params.id as string;

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [editando, setEditando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    carregarCliente();
  }, [id]);

  async function carregarCliente() {
    setCarregando(true);
    setErro("");

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error(error);
      setErro("Não foi possível carregar os dados do cliente.");
      setCarregando(false);
      return;
    }

    setCliente(data);
    setCarregando(false);
  }

  function atualizarCampo(
    campo: keyof Cliente,
    valor: string
  ) {
    if (!cliente) return;

    setCliente({
      ...cliente,
      [campo]: valor,
    });
  }

  async function salvarAlteracoes() {
    if (!cliente) return;

    setSalvando(true);
    setErro("");
    setMensagem("");

    const { error } = await supabase
      .from("customers")
      .update({
        nome: cliente.nome,
        rg: cliente.rg || null,
        cpf: cliente.cpf || null,
        data_nascimento: cliente.data_nascimento || null,
        telefone: cliente.telefone || null,
        rua: cliente.rua || null,
        numero: cliente.numero || null,
        bairro: cliente.bairro || null,
        cidade: cliente.cidade || null,
        estado: cliente.estado || null,
        cep: cliente.cep || null,
      })
      .eq("id", id);

    if (error) {
      console.error(error);
      setErro(`Erro ao salvar cliente: ${error.message}`);
      setSalvando(false);
      return;
    }

    setMensagem("Dados do cliente atualizados com sucesso.");
    setEditando(false);
    setSalvando(false);
  }

  if (carregando) {
    return (
      <div className="p-6 text-texto-suave">
        Carregando cliente...
      </div>
    );
  }

  if (erro && !cliente) {
    return (
      <div className="p-6">
        <p className="text-red-400">{erro}</p>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="p-6">
        <p className="text-texto-suave">
          Cliente não encontrado.
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-preto text-texto">
      <div className="mx-auto max-w-5xl p-4 md:p-8">

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-dourado">
              BLACKOUT MOTOS
            </p>

            <h1 className="mt-2 text-3xl font-bold text-white">
              Ficha do Cliente
            </h1>

            <p className="mt-1 text-sm text-texto-suave">
              Visualize e altere os dados completos do cliente.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push("/clientes")}
              className="rounded-lg border border-grafite-claro px-4 py-2 text-sm font-semibold text-texto hover:border-dourado"
            >
              Voltar
            </button>

            {!editando ? (
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="rounded-lg bg-dourado px-4 py-2 text-sm font-bold text-preto hover:bg-dourado-claro"
              >
                Editar Cliente
              </button>
            ) : (
              <button
                type="button"
                onClick={salvarAlteracoes}
                disabled={salvando}
                className="rounded-lg bg-dourado px-4 py-2 text-sm font-bold text-preto hover:bg-dourado-claro disabled:opacity-50"
              >
                {salvando ? "Salvando..." : "Salvar Alterações"}
              </button>
            )}
          </div>
        </div>

        {mensagem && (
          <div className="mb-6 rounded-xl border border-green-700 bg-green-950/30 p-4 text-green-300">
            {mensagem}
          </div>
        )}

        {erro && (
          <div className="mb-6 rounded-xl border border-red-700 bg-red-950/30 p-4 text-red-300">
            {erro}
          </div>
        )}

        <div className="rounded-2xl border border-grafite-claro bg-grafite p-5 md:p-8">

          <div className="grid gap-5 md:grid-cols-2">

            <Campo
              label="Nome completo"
              value={cliente.nome || ""}
              editando={editando}
              onChange={(valor) =>
                atualizarCampo("nome", valor)
              }
            />

            <Campo
              label="RG"
              value={cliente.rg || ""}
              editando={editando}
              onChange={(valor) =>
                atualizarCampo("rg", valor)
              }
            />

            <Campo
              label="CPF"
              value={cliente.cpf || ""}
              editando={editando}
              onChange={(valor) =>
                atualizarCampo("cpf", valor)
              }
            />

            <Campo
              label="Data de nascimento"
              value={cliente.data_nascimento || ""}
              editando={editando}
              type="date"
              onChange={(valor) =>
                atualizarCampo("data_nascimento", valor)
              }
            />

            <Campo
              label="Telefone"
              value={cliente.telefone || ""}
              editando={editando}
              onChange={(valor) =>
                atualizarCampo("telefone", valor)
              }
            />

            <Campo
              label="CEP"
              value={cliente.cep || ""}
              editando={editando}
              onChange={(valor) =>
                atualizarCampo("cep", valor)
              }
            />

            <Campo
              label="Rua"
              value={cliente.rua || ""}
              editando={editando}
              onChange={(valor) =>
                atualizarCampo("rua", valor)
              }
            />

            <Campo
              label="Número"
              value={cliente.numero || ""}
              editando={editando}
              onChange={(valor) =>
                atualizarCampo("numero", valor)
              }
            />

            <Campo
              label="Bairro"
              value={cliente.bairro || ""}
              editando={editando}
              onChange={(valor) =>
                atualizarCampo("bairro", valor)
              }
            />

            <Campo
              label="Cidade"
              value={cliente.cidade || ""}
              editando={editando}
              onChange={(valor) =>
                atualizarCampo("cidade", valor)
              }
            />

            <Campo
              label="Estado"
              value={cliente.estado || ""}
              editando={editando}
              onChange={(valor) =>
                atualizarCampo("estado", valor)
              }
            />

          </div>
        </div>
      </div>
    </main>
  );
}

type CampoProps = {
  label: string;
  value: string;
  editando: boolean;
  type?: string;
  onChange: (valor: string) => void;
};

function Campo({
  label,
  value,
  editando,
  type = "text",
  onChange,
}: CampoProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-texto-suave">
        {label}
      </label>

      {editando ? (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-grafite-claro bg-preto px-4 py-3 text-white outline-none transition focus:border-dourado"
        />
      ) : (
        <div className="min-h-[48px] rounded-xl border border-grafite-claro bg-preto px-4 py-3 text-white">
          {value || "Não informado"}
        </div>
      )}
    </div>
  );
}