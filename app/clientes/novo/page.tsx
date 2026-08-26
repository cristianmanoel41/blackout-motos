"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type FormCliente = {
  nome: string;
  rg: string;
  cpf: string;
  data_nascimento: string;
  telefone: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
};

const formInicial: FormCliente = {
  nome: "",
  rg: "",
  cpf: "",
  data_nascimento: "",
  telefone: "",
  rua: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "",
  cep: "",
};

export default function NovoClientePage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState<FormCliente>(formInicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [retorno, setRetorno] = useState("");
  const [motoRetorno, setMotoRetorno] = useState("");

  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search);

    setRetorno(parametros.get("retorno") || "");
    setMotoRetorno(parametros.get("moto") || "");
  }, []);

  function atualizarCampo(
    campo: keyof FormCliente,
    valor: string
  ) {
    setForm((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setErro("");

    if (!form.nome.trim()) {
      setErro("Informe o nome completo do cliente.");
      return;
    }

    setSalvando(true);

    const { data: clienteCriado, error } = await supabase
      .from("customers")
      .insert({
        nome: form.nome.trim(),
        rg: form.rg.trim() || null,
        cpf: form.cpf.trim() || null,
        data_nascimento: form.data_nascimento || null,
        telefone: form.telefone.trim() || null,
        rua: form.rua.trim() || null,
        numero: form.numero.trim() || null,
        bairro: form.bairro.trim() || null,
        cidade: form.cidade.trim() || null,
        estado: form.estado.trim() || null,
        cep: form.cep.trim() || null,
      })
      .select("id")
      .single();

    if (error || !clienteCriado) {
      console.error(error);

      if (error?.code === "23505") {
        setErro("Já existe um cliente cadastrado com esse CPF.");
      } else {
        setErro(
          `Erro ao cadastrar cliente: ${
            error?.message || "Erro desconhecido"
          }`
        );
      }

      setSalvando(false);
      return;
    }

    if (retorno === "venda") {
      const parametros = new URLSearchParams();

      parametros.set("cliente", String(clienteCriado.id));

      if (motoRetorno) {
        parametros.set("moto", motoRetorno);
      }

      router.replace(`/vendas?${parametros.toString()}`);
router.refresh();
return;
    }

    if (retorno === "capacete") {
      router.replace(
        `/capacetes/vendas/nova?cliente=${encodeURIComponent(
          String(clienteCriado.id)
        )}`
      );
      router.refresh();
      return;
    }

    router.push("/clientes");
    router.refresh();
  }

  function cancelar() {
    if (retorno === "capacete") {
      router.push("/capacetes/vendas/nova");
      return;
    }

    if (retorno === "venda") {
      if (motoRetorno) {
        router.push(
          `/vendas?moto=${encodeURIComponent(motoRetorno)}`
        );
      } else {
        router.push("/vendas");
      }

      return;
    }

    router.push("/clientes");
  }

  return (
    <main className="min-h-screen bg-preto text-texto">
      <div className="mx-auto max-w-5xl p-4 md:p-8">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-dourado">
            BLACKOUT MOTOS
          </p>

          <h1 className="mt-2 text-3xl font-bold text-white">
            Novo Cliente
          </h1>

          <p className="mt-2 text-sm text-texto-suave">
            {retorno === "venda" || retorno === "capacete"
              ? "Cadastre o cliente e volte automaticamente para concluir a venda."
              : "Preencha os dados completos do cliente."}
          </p>
        </div>

        {(retorno === "venda" ||
          retorno === "capacete") && (
          <div className="mb-6 rounded-xl border border-dourado/40 bg-dourado/5 p-4 text-sm text-texto">
            Este cliente será usado na venda que você está registrando.
          </div>
        )}

        {erro && (
          <div className="mb-6 rounded-xl border border-red-700 bg-red-950/30 p-4 text-red-300">
            {erro}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-grafite-claro bg-grafite p-5 md:p-8"
        >
          <section>
            <h2 className="mb-5 border-b border-grafite-claro pb-3 text-lg font-semibold text-dourado">
              Dados Pessoais
            </h2>

            <div className="grid gap-5 md:grid-cols-2">
              <Campo
                label="Nome completo *"
                value={form.nome}
                onChange={(valor) =>
                  atualizarCampo("nome", valor)
                }
                placeholder="Nome completo"
              />

              <Campo
                label="RG"
                value={form.rg}
                onChange={(valor) =>
                  atualizarCampo("rg", valor)
                }
                placeholder="RG"
              />

              <Campo
                label="CPF"
                value={form.cpf}
                onChange={(valor) =>
                  atualizarCampo("cpf", valor)
                }
                placeholder="000.000.000-00"
              />

              <Campo
                label="Data de nascimento"
                value={form.data_nascimento}
                onChange={(valor) =>
                  atualizarCampo("data_nascimento", valor)
                }
                type="date"
              />

              <Campo
                label="Telefone / WhatsApp"
                value={form.telefone}
                onChange={(valor) =>
                  atualizarCampo("telefone", valor)
                }
                placeholder="(12) 99999-9999"
              />
            </div>
          </section>

          <section>
            <h2 className="mb-5 border-b border-grafite-claro pb-3 text-lg font-semibold text-dourado">
              Endereço
            </h2>

            <div className="grid gap-5 md:grid-cols-2">
              <Campo
                label="CEP"
                value={form.cep}
                onChange={(valor) =>
                  atualizarCampo("cep", valor)
                }
                placeholder="00000-000"
              />

              <Campo
                label="Rua"
                value={form.rua}
                onChange={(valor) =>
                  atualizarCampo("rua", valor)
                }
                placeholder="Nome da rua"
              />

              <Campo
                label="Número"
                value={form.numero}
                onChange={(valor) =>
                  atualizarCampo("numero", valor)
                }
                placeholder="Número"
              />

              <Campo
                label="Bairro"
                value={form.bairro}
                onChange={(valor) =>
                  atualizarCampo("bairro", valor)
                }
                placeholder="Bairro"
              />

              <Campo
                label="Cidade"
                value={form.cidade}
                onChange={(valor) =>
                  atualizarCampo("cidade", valor)
                }
                placeholder="Cidade"
              />

              <Campo
                label="Estado"
                value={form.estado}
                onChange={(valor) =>
                  atualizarCampo("estado", valor)
                }
                placeholder="SP"
              />
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
            <button
              type="button"
              onClick={cancelar}
              className="rounded-xl border border-grafite-claro px-6 py-3 font-semibold text-texto hover:border-dourado"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={salvando}
              className="rounded-xl bg-dourado px-6 py-3 font-bold text-preto transition hover:bg-dourado-claro disabled:opacity-50"
            >
              {salvando
                ? "Salvando..."
                : retorno === "venda" || retorno === "capacete"
                  ? "Cadastrar e Voltar para Venda"
                  : "Cadastrar Cliente"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

type CampoProps = {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  type?: string;
};

function Campo({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
}: CampoProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-texto-suave">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-grafite-claro bg-preto px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-dourado"
      />
    </div>
  );
}