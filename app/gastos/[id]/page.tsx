"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

const categorias = [
  "Mecânica",
  "Revisão",
  "Óleo",
  "Pneus",
  "Pintura",
  "Lavagem",
  "Documentação",
  "Transferência",
  "Despachante",
  "Peças",
  "Combustível",
  "Transporte",
  "Outros",
];

export default function EditarGastoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [motoNome, setMotoNome] = useState("");

  const [form, setForm] = useState({
    data: "",
    categoria: "Mecânica",
    descricao: "",
    valor: "",
    forma_pagamento: "Dinheiro",
    observacoes: "",
  });

  useEffect(() => {
    carregarGasto();
  }, [id]);

  async function carregarGasto() {
    setCarregando(true);
    setErro("");

    const { data, error } = await supabase
      .from("motorcycle_expenses")
      .select(`
        *,
        motorcycles (
          codigo,
          marca,
          modelo,
          placa
        )
      `)
      .eq("id", id)
      .single();

    if (error || !data) {
      console.error(error);
      setErro(error?.message || "Não foi possível carregar o gasto.");
      setCarregando(false);
      return;
    }

    setForm({
      data: data.data || "",
      categoria: data.categoria || "Mecânica",
      descricao: data.descricao || "",
      valor: String(data.valor ?? ""),
      forma_pagamento: data.forma_pagamento || "Dinheiro",
      observacoes: data.observacoes || "",
    });

    const moto = data.motorcycles;

    if (moto) {
      setMotoNome(
        [moto.codigo, moto.marca, moto.modelo, moto.placa]
          .filter(Boolean)
          .join(" · ")
      );
    } else {
      setMotoNome("Moto não encontrada");
    }

    setCarregando(false);
  }

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function salvarAlteracoes() {
    setErro("");

    if (!form.data) {
      setErro("Informe a data.");
      return;
    }

    if (!form.valor || Number(form.valor) <= 0) {
      setErro("Informe um valor válido.");
      return;
    }

    const confirmar = window.confirm(
      "Deseja salvar as alterações deste gasto?"
    );

    if (!confirmar) return;

    setSalvando(true);

    const { error: gastoError } = await supabase
      .from("motorcycle_expenses")
      .update({
        data: form.data,
        categoria: form.categoria,
        descricao: form.descricao.trim() || null,
        valor: Number(form.valor),
        forma_pagamento: form.forma_pagamento,
        observacoes: form.observacoes.trim() || null,
      })
      .eq("id", id);

    if (gastoError) {
      console.error(gastoError);
      setErro(`Erro ao atualizar gasto: ${gastoError.message}`);
      setSalvando(false);
      return;
    }

    const { error: caixaError } = await supabase
      .from("cash_transactions")
      .update({
        data: form.data,
        tipo: "saida",
        valor: Number(form.valor),
        descricao: `${form.categoria} - ${
          form.descricao.trim() || "Gasto de moto"
        }`,
      })
      .eq("origem", "gasto_moto")
      .eq("origem_id", id);

    if (caixaError) {
      console.error(caixaError);
      setErro(
        `O gasto foi atualizado, mas houve erro ao atualizar o caixa: ${caixaError.message}`
      );
      setSalvando(false);
      return;
    }

    setSalvando(false);
    router.push("/gastos");
    router.refresh();
  }

  if (carregando) {
    return (
      <div className="p-6 text-texto-suave">
        Carregando gasto...
      </div>
    );
  }

  const inputClass =
    "w-full rounded-lg bg-grafite-claro border border-grafite-claro text-texto px-4 py-3 outline-none focus:border-dourado transition";

  const labelClass =
    "block text-sm font-medium text-texto mb-1";

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dourado">
          Editar Gasto
        </h1>

        <p className="mt-1 text-sm text-texto-suave">
          {motoNome}
        </p>
      </div>

      {erro && (
        <div className="mb-5 rounded-lg border border-red-700 bg-red-950 px-4 py-3 text-sm text-red-300">
          {erro}
        </div>
      )}

      <div className="space-y-4 rounded-xl border border-grafite-claro bg-grafite p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Data</label>

            <input
              type="date"
              name="data"
              value={form.data}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Categoria</label>

            <select
              name="categoria"
              value={form.categoria}
              onChange={handleChange}
              className={inputClass}
            >
              {categorias.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Descrição</label>

          <input
            type="text"
            name="descricao"
            value={form.descricao}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Valor (R$) *</label>

            <input
              type="number"
              step="0.01"
              min="0"
              name="valor"
              value={form.valor}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Forma de pagamento
            </label>

            <select
              name="forma_pagamento"
              value={form.forma_pagamento}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="Dinheiro">Dinheiro</option>
              <option value="Pix">Pix</option>
              <option value="Cartão">Cartão</option>
              <option value="Transferência">Transferência</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Observações</label>

          <textarea
            name="observacoes"
            value={form.observacoes}
            onChange={handleChange}
            rows={3}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-3 pt-2 md:flex-row">
          <button
            type="button"
            onClick={salvarAlteracoes}
            disabled={salvando}
            className="rounded-lg bg-dourado px-6 py-3 font-semibold text-preto transition hover:bg-dourado-claro disabled:opacity-60"
          >
            {salvando
              ? "Salvando..."
              : "Salvar Alterações"}
          </button>

          <Link
            href="/gastos"
            className="rounded-lg border border-grafite-claro px-6 py-3 text-center font-semibold text-texto"
          >
            Cancelar
          </Link>
        </div>
      </div>
    </div>
  );
}