"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import { formatarData } from "@/lib/formatadores/data";

const statusLabel: Record<string, string> = {
  disponivel: "Disponível",
  reservada: "Reservada",
  vendida: "Vendida",
  manutencao: "Manutenção",
  arquivada: "Arquivada",
};

type Moto = {
  id: string;
  codigo: string | null;
  marca: string | null;
  modelo: string | null;
  versao: string | null;
  cor: string | null;
  ano_fabricacao: number | null;
  ano_modelo: number | null;
  quilometragem: number | null;
  data_entrada: string | null;
  placa: string | null;
  renavam: string | null;
  chassi: string | null;
  valor_compra: number | null;
  preco_anunciado: number | null;
  fornecedor_nome: string | null;
  fornecedor_telefone: string | null;
  observacoes: string | null;
  status: string;
};

export default function DetalheMotoPage() {
  const params = useParams();
  const id = params.id as string;

  const supabase = createClient();

  const [moto, setMoto] = useState<Moto | null>(null);
  const [form, setForm] = useState<Moto | null>(null);

  const [totalGastos, setTotalGastos] = useState(0);

  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    carregarDados();
  }, [id]);

  async function carregarDados() {
    setCarregando(true);
    setErro("");

    const { data: motoData, error: motoError } = await supabase
      .from("motorcycles")
      .select("*")
      .eq("id", id)
      .single();

    if (motoError || !motoData) {
      setErro("Não foi possível carregar os dados da moto.");
      setCarregando(false);
      return;
    }

    const { data: gastos } = await supabase
      .from("motorcycle_expenses")
      .select("valor")
      .eq("motorcycle_id", id);

    const total =
      gastos?.reduce(
        (soma, gasto) => soma + Number(gasto.valor || 0),
        0
      ) ?? 0;

    setMoto(motoData);
    setForm(motoData);
    setTotalGastos(total);
    setCarregando(false);
  }

  function alterarCampo(
    campo: keyof Moto,
    valor: string | number | null
  ) {
    if (!form) return;

    setForm({
      ...form,
      [campo]: valor,
    });
  }

  function cancelarEdicao() {
    setForm(moto);
    setEditando(false);
    setErro("");
  }

  async function salvarAlteracoes() {
    if (!form) return;

    if (!form.marca?.trim()) {
      setErro("Informe a marca da moto.");
      return;
    }

    if (!form.modelo?.trim()) {
      setErro("Informe o modelo da moto.");
      return;
    }

    const confirmar = window.confirm(
      "Deseja salvar as alterações desta moto?"
    );

    if (!confirmar) return;

    setSalvando(true);
    setErro("");
    setMensagem("");

    const { error } = await supabase
      .from("motorcycles")
      .update({
        marca: form.marca?.trim(),
        modelo: form.modelo?.trim(),
        versao: form.versao?.trim() || null,
        cor: form.cor?.trim() || null,

        ano_fabricacao: form.ano_fabricacao
          ? Number(form.ano_fabricacao)
          : null,

        ano_modelo: form.ano_modelo
          ? Number(form.ano_modelo)
          : null,

        quilometragem:
          form.quilometragem !== null
            ? Number(form.quilometragem)
            : null,

        data_entrada: form.data_entrada || null,

        placa: form.placa?.trim() || null,
        renavam: form.renavam?.trim() || null,
        chassi: form.chassi?.trim() || null,

        valor_compra:
          form.valor_compra !== null
            ? Number(form.valor_compra)
            : 0,

        preco_anunciado:
          form.preco_anunciado !== null
            ? Number(form.preco_anunciado)
            : null,

        fornecedor_nome:
          form.fornecedor_nome?.trim() || null,

        fornecedor_telefone:
          form.fornecedor_telefone?.trim() || null,

        observacoes:
          form.observacoes?.trim() || null,

        status: form.status,
      })
      .eq("id", id);

    if (error) {
      console.error(error);
      setErro(`Erro ao salvar alterações: ${error.message}`);
      setSalvando(false);
      return;
    }

    setMoto(form);
    setEditando(false);
    setSalvando(false);

    setMensagem("Dados da moto atualizados com sucesso.");

    setTimeout(() => {
      setMensagem("");
    }, 3000);
  }

  if (carregando) {
    return (
      <div className="p-6 text-texto-suave">
        Carregando moto...
      </div>
    );
  }

  if (!moto || !form) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-700 bg-red-950/30 p-4 text-red-300">
          {erro || "Moto não encontrada."}
        </div>
      </div>
    );
  }

  const custoTotal =
    Number(moto.valor_compra || 0) + totalGastos;

  const linkGasto = `/motos/${moto.id}/gasto`;
  const linkVender = `/motos/${moto.id}/vender`;

  return (
    <div className="max-w-5xl">

      {/* CABEÇALHO */}

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="font-mono text-xs text-texto-suave">
            {moto.codigo}
          </span>

          <h1 className="text-2xl font-bold text-dourado">
            {moto.marca} {moto.modelo}
          </h1>
        </div>

        <span className="w-fit rounded-full border border-dourado px-3 py-1 text-sm text-dourado">
          {statusLabel[moto.status] || moto.status}
        </span>
      </div>

      {/* MENSAGENS */}

      {mensagem && (
        <div className="mb-5 rounded-xl border border-green-700 bg-green-950/30 p-4 text-green-300">
          {mensagem}
        </div>
      )}

      {erro && (
        <div className="mb-5 rounded-xl border border-red-700 bg-red-950/30 p-4 text-red-300">
          {erro}
        </div>
      )}

      {/* BOTÕES */}

      <div className="mb-6 flex flex-wrap gap-3">

        {!editando && (
          <>
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="rounded-lg bg-dourado px-4 py-2 text-sm font-semibold text-preto transition hover:bg-dourado-claro"
            >
              Editar Moto
            </button>

            <Link
              href={linkGasto}
              className="rounded-lg bg-grafite-claro px-4 py-2 text-sm text-texto transition hover:bg-grafite"
            >
              Registrar Gasto
            </Link>

            {moto.status !== "vendida" && (
              <Link
                href={linkVender}
                className="rounded-lg border border-dourado px-4 py-2 text-sm font-semibold text-dourado transition hover:bg-dourado hover:text-preto"
              >
                Vender Moto
              </Link>
            )}
          </>
        )}

        {editando && (
          <>
            <button
              type="button"
              onClick={salvarAlteracoes}
              disabled={salvando}
              className="rounded-lg bg-dourado px-5 py-2 text-sm font-bold text-preto transition hover:bg-dourado-claro disabled:opacity-50"
            >
              {salvando
                ? "Salvando..."
                : "Salvar Alterações"}
            </button>

            <button
              type="button"
              onClick={cancelarEdicao}
              disabled={salvando}
              className="rounded-lg border border-grafite-claro px-5 py-2 text-sm font-semibold text-texto"
            >
              Cancelar
            </button>
          </>
        )}

      </div>

      {/* DADOS DA MOTO */}

      <div className="mb-4 rounded-xl border border-grafite-claro bg-grafite p-5">
        <h2 className="mb-4 font-semibold text-dourado">
          Dados da Moto
        </h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

          <Campo
            label="Marca"
            value={form.marca || ""}
            editando={editando}
            onChange={(v) => alterarCampo("marca", v)}
          />

          <Campo
            label="Modelo"
            value={form.modelo || ""}
            editando={editando}
            onChange={(v) => alterarCampo("modelo", v)}
          />

          <Campo
            label="Versão"
            value={form.versao || ""}
            editando={editando}
            onChange={(v) => alterarCampo("versao", v)}
          />

          <Campo
            label="Cor"
            value={form.cor || ""}
            editando={editando}
            onChange={(v) => alterarCampo("cor", v)}
          />

          <Campo
            label="Ano fabricação"
            value={form.ano_fabricacao?.toString() || ""}
            editando={editando}
            type="number"
            onChange={(v) =>
              alterarCampo(
                "ano_fabricacao",
                v ? Number(v) : null
              )
            }
          />

          <Campo
            label="Ano modelo"
            value={form.ano_modelo?.toString() || ""}
            editando={editando}
            type="number"
            onChange={(v) =>
              alterarCampo(
                "ano_modelo",
                v ? Number(v) : null
              )
            }
          />

          <Campo
            label="Quilometragem"
            value={form.quilometragem?.toString() || ""}
            exibicao={
              form.quilometragem
                ? `${form.quilometragem} km`
                : "—"
            }
            editando={editando}
            type="number"
            onChange={(v) =>
              alterarCampo(
                "quilometragem",
                v ? Number(v) : null
              )
            }
          />

          <Campo
            label="Data de entrada"
            value={form.data_entrada || ""}
            exibicao={
              form.data_entrada
                ? formatarData(form.data_entrada)
                : "—"
            }
            editando={editando}
            type="date"
            onChange={(v) =>
              alterarCampo("data_entrada", v)
            }
          />

          <Campo
            label="Placa"
            value={form.placa || ""}
            editando={editando}
            onChange={(v) => alterarCampo("placa", v)}
          />

          <Campo
            label="Renavam"
            value={form.renavam || ""}
            editando={editando}
            onChange={(v) =>
              alterarCampo("renavam", v)
            }
          />

          <Campo
            label="Chassi"
            value={form.chassi || ""}
            editando={editando}
            onChange={(v) =>
              alterarCampo("chassi", v)
            }
          />

          <div>
            <p className="mb-2 text-xs text-texto-suave">
              Status
            </p>

            {editando ? (
              <select
                value={form.status}
                onChange={(e) =>
                  alterarCampo("status", e.target.value)
                }
                className="w-full rounded-lg border border-grafite-claro bg-preto px-3 py-2 text-texto outline-none focus:border-dourado"
              >
                <option value="disponivel">
                  Disponível
                </option>

                <option value="reservada">
                  Reservada
                </option>

                <option value="vendida">
                  Vendida
                </option>

                <option value="manutencao">
                  Manutenção
                </option>

                <option value="arquivada">
                  Arquivada
                </option>
              </select>
            ) : (
              <p className="font-medium text-texto">
                {statusLabel[form.status]}
              </p>
            )}
          </div>

        </div>
      </div>

      {/* FINANCEIRO */}

      <div className="mb-4 rounded-xl border border-grafite-claro bg-grafite p-5">
        <h2 className="mb-4 font-semibold text-dourado">
          Financeiro
        </h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

          <Campo
            label="Valor de compra"
            value={form.valor_compra?.toString() || ""}
            exibicao={formatarMoeda(
              form.valor_compra || 0
            )}
            editando={editando}
            type="number"
            step="0.01"
            onChange={(v) =>
              alterarCampo(
                "valor_compra",
                v ? Number(v) : 0
              )
            }
          />

          <div>
            <p className="text-xs text-texto-suave">
              Gastos registrados
            </p>

            <p className="font-medium text-texto">
              {formatarMoeda(totalGastos)}
            </p>
          </div>

          <div>
            <p className="text-xs text-texto-suave">
              Custo total
            </p>

            <p className="font-medium text-texto">
              {formatarMoeda(custoTotal)}
            </p>
          </div>

          <Campo
            label="Preço anunciado"
            value={
              form.preco_anunciado?.toString() || ""
            }
            exibicao={formatarMoeda(
              form.preco_anunciado || 0
            )}
            editando={editando}
            type="number"
            step="0.01"
            onChange={(v) =>
              alterarCampo(
                "preco_anunciado",
                v ? Number(v) : null
              )
            }
          />

        </div>
      </div>

      {/* FORNECEDOR */}

      <div className="mb-4 rounded-xl border border-grafite-claro bg-grafite p-5">
        <h2 className="mb-4 font-semibold text-dourado">
          Fornecedor
        </h2>

        <div className="grid gap-4 md:grid-cols-2">

          <Campo
            label="Nome"
            value={form.fornecedor_nome || ""}
            editando={editando}
            onChange={(v) =>
              alterarCampo("fornecedor_nome", v)
            }
          />

          <Campo
            label="Telefone"
            value={form.fornecedor_telefone || ""}
            editando={editando}
            onChange={(v) =>
              alterarCampo(
                "fornecedor_telefone",
                v
              )
            }
          />

        </div>
      </div>

      {/* OBSERVAÇÕES */}

      <div className="rounded-xl border border-grafite-claro bg-grafite p-5">
        <h2 className="mb-3 font-semibold text-dourado">
          Observações
        </h2>

        {editando ? (
          <textarea
            value={form.observacoes || ""}
            onChange={(e) =>
              alterarCampo(
                "observacoes",
                e.target.value
              )
            }
            rows={4}
            className="w-full resize-none rounded-lg border border-grafite-claro bg-preto px-4 py-3 text-texto outline-none focus:border-dourado"
            placeholder="Observações sobre a moto..."
          />
        ) : (
          <p className="text-sm text-texto-suave">
            {form.observacoes || "Nenhuma observação."}
          </p>
        )}
      </div>

    </div>
  );
}

type CampoProps = {
  label: string;
  value: string;
  exibicao?: string;
  editando: boolean;
  type?: string;
  step?: string;
  onChange: (valor: string) => void;
};

function Campo({
  label,
  value,
  exibicao,
  editando,
  type = "text",
  step,
  onChange,
}: CampoProps) {
  return (
    <div>
      <p className="mb-2 text-xs text-texto-suave">
        {label}
      </p>

      {editando ? (
        <input
          type={type}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-grafite-claro bg-preto px-3 py-2 text-texto outline-none focus:border-dourado"
        />
      ) : (
        <p className="font-medium text-texto">
          {exibicao || value || "—"}
        </p>
      )}
    </div>
  );
}