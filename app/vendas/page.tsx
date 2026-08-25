"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type Moto = {
  id: string | number;
  marca?: string;
  modelo?: string;
  versao?: string;
  ano?: string | number;
  ano_modelo?: string | number;
  placa?: string;
  status?: string;
};

function hoje() {
  const data = new Date();

  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

export default function VendasPage() {
  const [motos, setMotos] = useState<Moto[]>([]);
  const [carregandoMotos, setCarregandoMotos] = useState(true);

  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  const [dataVenda, setDataVenda] = useState(hoje());
  const [motoId, setMotoId] = useState("");

  const [cliente, setCliente] = useState("");
  const [telefone, setTelefone] = useState("");
const [vendedor, setVendedor] = useState("");
  const [valorVenda, setValorVenda] = useState("");
  const [entrada, setEntrada] = useState("");

  const [banco, setBanco] = useState("");

  const [transferenciaCliente, setTransferenciaCliente] = useState("");
  const [transferenciaLoja, setTransferenciaLoja] = useState("");

  const [observacoes, setObservacoes] = useState("");

  const valorFinanciado = useMemo(() => {
    const venda = Number(valorVenda) || 0;
    const valorEntrada = Number(entrada) || 0;

    return Math.max(venda - valorEntrada, 0);
  }, [valorVenda, entrada]);

  
    async function carregarMotos() {
  setCarregandoMotos(true);

  const { data, error } = await supabase
    .from("motorcycles")
    .select("*")
    .eq("status", "disponivel")
    .order("criado_em", { ascending: false });

    if (error) {
      console.error(error);
      setErro(
        "Não foi possível carregar as motos do estoque. Verifique a tabela motos no Supabase."
      );
      setCarregandoMotos(false);
      return;
    }

    setMotos(data || []);
    setCarregandoMotos(false);
  }

  useEffect(() => {
    carregarMotos();
  }, []);

  function limparFormulario() {
    setDataVenda(hoje());
    setMotoId("");
    setCliente("");
    setTelefone("");
    setValorVenda("");
    setEntrada("");
    setBanco("");
    setTransferenciaCliente("");
    setTransferenciaLoja("");
    setObservacoes("");
  }

  async function salvarVenda(event: FormEvent) {
    event.preventDefault();

    setErro("");
    setMensagem("");

    if (!motoId) {
      setErro("Selecione a moto vendida.");
      return;
    }

    if (!cliente.trim()) {
      setErro("Informe o nome do cliente.");
      return;
    }

    if (!valorVenda || Number(valorVenda) <= 0) {
      setErro("Informe o valor da venda.");
      return;
    }

    setSalvando(true);

    try {
      const { error: vendaError } = await supabase.from("sales").insert({
        data_venda: dataVenda,
        motorcycle_id: motoId,
        cliente: cliente.trim(),
        telefone: telefone.trim(),
        vendedor: vendedor,
        valor_venda: Number(valorVenda) || 0,
        valor_total_venda: Number(valorVenda) || 0,
        entrada: Number(entrada) || 0,
        valor_financiado: valorFinanciado,
        banco: banco.trim(),
        transferencia_cliente: Number(transferenciaCliente) || 0,
        transferencia_loja: Number(transferenciaLoja) || 0,
        observacoes: observacoes.trim(),
      });

      if (vendaError) {
        throw vendaError;
      }

      const { error: motoError } = await supabase
  .from("motorcycles")
  .update({
    status: "vendida",
  })
  .eq("id", motoId);

      if (motoError) {
        throw motoError;
      }

      setMensagem("Venda registrada com sucesso!");

      limparFormulario();
      await carregarMotos();
    } catch (error: any) {
  const mensagemErro = [
    error?.message,
    error?.details,
    error?.hint,
    error?.code ? `Código: ${error.code}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  setErro(
    mensagemErro ||
      "Não foi possível registrar a venda. Erro desconhecido."
  );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Cabeçalho */}

        <div className="mb-8">
          <p className="mb-1 text-sm font-semibold uppercase tracking-[0.25em] text-yellow-500">
            Blackout Motos
          </p>

          <h1 className="text-3xl font-bold md:text-4xl">
            Registrar Venda
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Preencha os dados abaixo para registrar a venda da moto.
          </p>
        </div>

        {/* Mensagens */}

        {mensagem && (
          <div className="mb-6 rounded-xl border border-green-700 bg-green-950/40 p-4 text-green-300">
            {mensagem}
          </div>
        )}

        {erro && (
          <div className="mb-6 rounded-xl border border-red-700 bg-red-950/40 p-4 text-red-300">
            {erro}
          </div>
        )}

        <form
          onSubmit={salvarVenda}
          className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl md:p-8"
        >
          {/* Venda */}

          <section>
            <h2 className="mb-4 border-b border-zinc-800 pb-3 text-lg font-semibold text-yellow-500">
              Dados da Venda
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Data da venda
                </label>

                <input
                  type="date"
                  value={dataVenda}
                  onChange={(e) => setDataVenda(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Moto vendida *
                </label>

                <select
                  value={motoId}
                  onChange={(e) => setMotoId(e.target.value)}
                  disabled={carregandoMotos}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                >
                  <option value="">
                    {carregandoMotos
                      ? "Carregando motos..."
                      : "Selecione a moto"}
                  </option>

                  {motos.map((moto) => (
                    <option key={moto.id} value={moto.id}>
                      {moto.marca || ""} {moto.modelo || ""}{" "}
                      {moto.versao || ""}
                      {moto.ano_modelo || moto.ano
                        ? ` - ${moto.ano_modelo || moto.ano}`
                        : ""}
                      {moto.placa ? ` - ${moto.placa}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Cliente */}

          <section>
            <h2 className="mb-4 border-b border-zinc-800 pb-3 text-lg font-semibold text-yellow-500">
              Cliente
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Nome do cliente *
                </label>

                <input
                  type="text"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Nome completo"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Telefone
                </label>

                <input
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(12) 99999-9999"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                />
              </div>
            </div>
          </section>

          {/* Valores */}

          <section>
            <h2 className="mb-4 border-b border-zinc-800 pb-3 text-lg font-semibold text-yellow-500">
              Valores
            </h2>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Valor da venda *
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorVenda}
                  onChange={(e) => setValorVenda(e.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Entrada
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={entrada}
                  onChange={(e) => setEntrada(e.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Valor financiado
                </label>

                <div className="flex min-h-[50px] items-center rounded-xl border border-yellow-600/50 bg-yellow-500/10 px-4 py-3 text-lg font-bold text-yellow-500">
                  {moeda(valorFinanciado)}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm text-zinc-300">
                Banco / Financeira
              </label>

              <input
                type="text"
                value={banco}
                onChange={(e) => setBanco(e.target.value)}
                placeholder="Ex.: Banco Pan, Santander..."
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
              />
            </div>
          </section>

          {/* Transferência */}

          <section>
            <h2 className="mb-4 border-b border-zinc-800 pb-3 text-lg font-semibold text-yellow-500">
              Transferência
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Transferência paga pelo cliente
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={transferenciaCliente}
                  onChange={(e) => setTransferenciaCliente(e.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                />

                <p className="mt-2 text-xs text-zinc-500">
                  Use quando o cliente pagar a transferência.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Transferência paga pela loja
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={transferenciaLoja}
                  onChange={(e) => setTransferenciaLoja(e.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                />

                <p className="mt-2 text-xs text-zinc-500">
                  Use quando a loja der a transferência grátis.
                </p>
              </div>
            </div>
          </section>

          {/* Observações */}

          <section>
            <label className="mb-2 block text-sm text-zinc-300">
              Observações
            </label>

            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={4}
              placeholder="Informações adicionais da venda..."
              className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
            />
          </section>

          {/* Resumo */}

          <section className="rounded-xl border border-zinc-800 bg-black p-5">
            <h3 className="mb-4 font-semibold text-yellow-500">
              Resumo da Venda
            </h3>

            <div className="grid gap-3 text-sm md:grid-cols-3">
              <div>
                <p className="text-zinc-500">Valor da venda</p>
                <p className="mt-1 text-lg font-semibold">
                  {moeda(Number(valorVenda))}
                </p>
              </div>

              <div>
                <p className="text-zinc-500">Entrada</p>
                <p className="mt-1 text-lg font-semibold">
                  {moeda(Number(entrada))}
                </p>
              </div>

              <div>
                <p className="text-zinc-500">Financiamento</p>
                <p className="mt-1 text-lg font-semibold text-yellow-500">
                  {moeda(valorFinanciado)}
                </p>
              </div>
            </div>
          </section>

          {/* Botão */}

          <button
            type="submit"
            disabled={salvando}
            className="w-full rounded-xl bg-yellow-500 px-6 py-4 text-base font-bold text-black transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {salvando ? "Salvando venda..." : "Registrar Venda"}
          </button>
        </form>
      </div>
    </main>
  );
}