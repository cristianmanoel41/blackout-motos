"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import { formatarData } from "@/lib/formatadores/data";
import Vistorias from "@/components/Vistorias";
import ConferenciaCrlv from "@/components/ConferenciaCrlv";
import FotosMoto from "@/components/FotosMoto";
import MotoNaCapa from "@/components/MotoNaCapa";
import LegendaPost from "@/components/LegendaPost";
import RegistradoPor from "@/components/RegistradoPor";
import CampoMoeda from "@/components/CampoMoeda";
import ProprietarioDoDocumento from "@/components/ProprietarioDoDocumento";
import {
  colunasDoProprietario,
  proprietarioDaMoto,
  proprietarioVazio,
  temOutroProprietario,
} from "@/lib/dados/proprietario";

const statusLabel: Record<string, string> = {
  disponivel: "Disponível",
  reservada: "Reservada",
  vendida: "Vendida",
  manutencao: "Manutenção",
  arquivada: "Arquivada",
};

const tipoEntradaLabel: Record<string, string> = {
  compra_nova: "Comprada",
  troca: "Recebida na troca",
  estoque_inicial: "Estoque inicial",
  outra_loja: "De outra loja",
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
  tipo_entrada: string | null;
  placa: string | null;
  renavam: string | null;
  chassi: string | null;
  valor_compra: number | null;
  preco_anunciado: number | null;
  fornecedor_nome: string | null;
  fornecedor_telefone: string | null;
  fornecedor_cpf: string | null;
  fornecedor_rg: string | null;
  fornecedor_rua: string | null;
  fornecedor_numero: string | null;
  fornecedor_bairro: string | null;
  fornecedor_cidade: string | null;
  fornecedor_estado: string | null;
  fornecedor_cep: string | null;
  observacoes: string | null;
  status: string;
  possui_manual: boolean | null;
  possui_chave_reserva: boolean | null;
  unico_dono: boolean | null;
};

/* Os mesmos itens marcados no cadastro, para ver e corrigir
   aqui na ficha. Antes só apareciam no "Comprar / Cadastrar". */
const ITENS_DA_MOTO = [
  { campo: "possui_manual", rotulo: "Possui manual" },
  { campo: "possui_chave_reserva", rotulo: "Chave reserva" },
  { campo: "unico_dono", rotulo: "Único dono" },
] as const;

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
  const [excluindo, setExcluindo] = useState(false);

  /* Moto no nome de outra pessoa (lib/dados/proprietario). */
  const [outroProprietario, setOutroProprietario] = useState(false);
  const [proprietario, setProprietario] = useState(proprietarioVazio);

  function lerProprietario(dados: Moto) {
    const linha = dados as unknown as Record<string, unknown>;

    setOutroProprietario(temOutroProprietario(linha));
    setProprietario(proprietarioDaMoto(linha));
  }
  const [versaoAnexos, setVersaoAnexos] = useState(0);

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
    lerProprietario(motoData);
    setTotalGastos(total);
    setCarregando(false);
  }

  /*
   * Apagar a moto. Serve para o cadastro feito errado ou de
   * teste - nao para dar baixa de moto vendida, que precisa
   * continuar no historico.
   *
   * Antes de apagar, sai tudo que aponta para ela: os gastos
   * e as saidas que eles geraram no caixa, mais a saida da
   * propria compra. Senao ficam lancamentos orfaos, somando
   * dinheiro de uma moto que nao existe mais.
   */
  async function excluirMoto() {
    if (!moto) return;

    setErro("");
    setMensagem("");

    const { data: vendas } = await supabase
      .from("sales")
      .select("id")
      .eq("motorcycle_id", id)
      .limit(1);

    if (vendas && vendas.length > 0) {
      setErro(
        "Esta moto tem venda registrada e por isso não pode ser apagada. Apague a venda antes, se ela também for teste."
      );
      return;
    }

    const nome = [moto.marca, moto.modelo]
      .filter(Boolean)
      .join(" ");

    const confirmar = window.confirm(
      `Apagar definitivamente a moto ${nome || "sem nome"}? Os gastos dela e os lançamentos do caixa ligados a ela também saem. Não dá para desfazer.`
    );

    if (!confirmar) return;

    setExcluindo(true);

    const { data: gastos } = await supabase
      .from("motorcycle_expenses")
      .select("id")
      .eq("motorcycle_id", id);

    const idsGastos = (gastos || []).map(
      (gasto: any) => String(gasto.id)
    );

    if (idsGastos.length > 0) {
      await supabase
        .from("cash_transactions")
        .delete()
        .in("origem", ["outro", "gasto_moto"])
        .in("origem_id", idsGastos);

      await supabase
        .from("motorcycle_expenses")
        .delete()
        .eq("motorcycle_id", id);
    }

    await supabase
      .from("cash_transactions")
      .delete()
      .in("origem", ["outro", "compra_moto"])
      .eq("origem_id", String(id));

    const { data: apagadas, error } = await supabase
      .from("motorcycles")
      .delete()
      .eq("id", id)
      .select("id");

    setExcluindo(false);

    if (error) {
      setErro(`Não foi possível apagar: ${error.message}`);
      return;
    }

    /*
     * Sem politica de exclusao no banco, o Postgres nao
     * devolve erro: ele so nao apaga. O select no fim mostra
     * o que saiu de verdade.
     */
    if (!apagadas || apagadas.length === 0) {
      setErro(
        "A moto não foi apagada: seu usuário não tem permissão de exclusão em motos no banco. Me avise que eu passo o SQL para liberar."
      );
      return;
    }

    window.location.href = "/admin/estoque";
  }

  function alterarCampo(
    campo: keyof Moto,
    valor: string | number | boolean | null
  ) {
    if (!form) return;

    setForm({
      ...form,
      [campo]: valor,
    });
  }

  function cancelarEdicao() {
    setForm(moto);
    if (moto) lerProprietario(moto);
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

    /* A coluna só existe depois da migração 0041. Sem ela, a
       ficha salva o resto como antes. */
    const temColunaDoProprietario = Boolean(
      moto && "proprietario_nome" in moto
    );

    if (outroProprietario) {
      if (!temColunaDoProprietario) {
        setErro(
          "Falta rodar a migração 0041_proprietario_do_documento.sql no Supabase para guardar o proprietário do documento."
        );
        return;
      }

      if (!proprietario.proprietario_nome.trim()) {
        setErro(
          "Informe o nome de quem está no documento da moto, ou desmarque a opção da moto no nome de outra pessoa."
        );
        return;
      }
    }

    const colunasProprietario = temColunaDoProprietario
      ? colunasDoProprietario(proprietario, outroProprietario)
      : {};

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

        tipo_entrada:
          form.tipo_entrada || "compra_nova",

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

        fornecedor_cpf:
          form.fornecedor_cpf?.trim() || null,

        fornecedor_rg:
          form.fornecedor_rg?.trim() || null,

        fornecedor_rua:
          form.fornecedor_rua?.trim() || null,

        fornecedor_numero:
          form.fornecedor_numero?.trim() || null,

        fornecedor_bairro:
          form.fornecedor_bairro?.trim() || null,

        fornecedor_cidade:
          form.fornecedor_cidade?.trim() || null,

        fornecedor_estado:
          form.fornecedor_estado?.trim() || null,

        fornecedor_cep:
          form.fornecedor_cep?.trim() || null,

        observacoes:
          form.observacoes?.trim() || null,

        possui_manual: Boolean(form.possui_manual),
        possui_chave_reserva: Boolean(
          form.possui_chave_reserva
        ),
        unico_dono: Boolean(form.unico_dono),

        ...colunasProprietario,

        status: form.status,
      })
      .eq("id", id);

    if (error) {
      console.error(error);
      setErro(`Erro ao salvar alterações: ${error.message}`);
      setSalvando(false);
      return;
    }

    const salva = { ...form, ...colunasProprietario } as Moto;

    setMoto(salva);
    setForm(salva);
    lerProprietario(salva);
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

  const linkGasto = `/despesas/nova?moto=${moto.id}`;
  const linkVender = `/vendas?moto=${moto.id}`

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

          <div className="mt-2">
            <RegistradoPor registro={moto as any} />
          </div>
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

            <a
              href={`/documentos/procuracao/${moto.id}`}
              className="rounded-lg border border-grafite-claro px-4 py-2 text-sm font-semibold text-texto transition hover:border-dourado hover:text-dourado"
            >
              Procuração
            </a>

            <a
              href={`/documentos/contrato-compra/${moto.id}`}
              className="rounded-lg border border-grafite-claro px-4 py-2 text-sm font-semibold text-texto transition hover:border-dourado hover:text-dourado"
            >
              Contrato de Compra
            </a>

            <button
              type="button"
              disabled={excluindo}
              onClick={excluirMoto}
              className="ml-auto rounded-lg border border-grafite-claro px-4 py-2 text-sm font-semibold text-red-300 transition hover:border-red-700 hover:bg-red-950/30 disabled:opacity-50"
            >
              {excluindo ? "Apagando..." : "Apagar Moto"}
            </button>
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

          <div>
            <p className="mb-2 text-xs text-texto-suave">
              Forma de entrada
            </p>

            {editando ? (
              <select
                value={
                  form.tipo_entrada ||
                  "compra_nova"
                }
                onChange={(e) =>
                  alterarCampo(
                    "tipo_entrada",
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-grafite-claro bg-preto px-3 py-2 text-texto outline-none focus:border-dourado"
              >
                <option value="compra_nova">
                  Comprada
                </option>

                <option value="troca">
                  Recebida na troca
                </option>

                <option value="estoque_inicial">
                  Estoque inicial
                </option>

                <option value="outra_loja">
                  De outra loja
                </option>
              </select>
            ) : (
              <p className="font-medium text-texto">
                {tipoEntradaLabel[
                  form.tipo_entrada || ""
                ] || "—"}
              </p>
            )}

            {editando &&
              form.tipo_entrada === "outra_loja" && (
                <p className="mt-2 text-xs text-dourado">
                  A moto não é da loja: deixe o valor de compra
                  zerado e informe a loja parceira em Fornecedor.
                  Ela fica fora do faturamento, e o repasse entra
                  como gasto quando a moto for vendida.
                </p>
              )}
          </div>

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

        <div className="mt-5 border-t border-grafite-claro pt-4">
          <p className="mb-3 text-xs text-texto-suave">
            Itens da moto
          </p>

          <div className="flex flex-wrap gap-3">
            {ITENS_DA_MOTO.map(({ campo, rotulo }) => {
              const marcado = Boolean(form[campo]);

              return editando ? (
                <label
                  key={campo}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                    marcado
                      ? "border-dourado bg-dourado/10 text-dourado"
                      : "border-grafite-claro text-texto"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={marcado}
                    onChange={(e) =>
                      alterarCampo(campo, e.target.checked)
                    }
                    className="h-4 w-4 accent-yellow-500"
                  />
                  <span className="font-semibold">{rotulo}</span>
                </label>
              ) : (
                <span
                  key={campo}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                    marcado
                      ? "border-dourado bg-dourado/10 text-dourado"
                      : "border-grafite-claro text-texto-suave line-through opacity-60"
                  }`}
                >
                  {marcado ? "✓ " : ""}
                  {rotulo}
                </span>
              );
            })}
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
            type="moeda"
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
            type="moeda"
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

          <Campo
            label="CPF"
            value={form.fornecedor_cpf || ""}
            editando={editando}
            onChange={(v) =>
              alterarCampo(
                "fornecedor_cpf",
                v
              )
            }
          />

          <Campo
            label="RG"
            value={form.fornecedor_rg || ""}
            editando={editando}
            onChange={(v) =>
              alterarCampo(
                "fornecedor_rg",
                v
              )
            }
          />

          <Campo
            label="Rua"
            value={form.fornecedor_rua || ""}
            editando={editando}
            onChange={(v) =>
              alterarCampo(
                "fornecedor_rua",
                v
              )
            }
          />

          <Campo
            label="Número"
            value={form.fornecedor_numero || ""}
            editando={editando}
            onChange={(v) =>
              alterarCampo(
                "fornecedor_numero",
                v
              )
            }
          />

          <Campo
            label="Bairro"
            value={form.fornecedor_bairro || ""}
            editando={editando}
            onChange={(v) =>
              alterarCampo(
                "fornecedor_bairro",
                v
              )
            }
          />

          <Campo
            label="Cidade"
            value={form.fornecedor_cidade || ""}
            editando={editando}
            onChange={(v) =>
              alterarCampo(
                "fornecedor_cidade",
                v
              )
            }
          />

          <Campo
            label="Estado"
            value={form.fornecedor_estado || ""}
            editando={editando}
            onChange={(v) =>
              alterarCampo(
                "fornecedor_estado",
                v
              )
            }
          />

          <Campo
            label="CEP"
            value={form.fornecedor_cep || ""}
            editando={editando}
            onChange={(v) =>
              alterarCampo(
                "fornecedor_cep",
                v
              )
            }
          />

        </div>

        <p className="mt-4 text-xs text-texto-suave">
          Esses dados são usados no contrato de compra desta
          moto e, se ela estiver no nome de quem vendeu, na
          procuração.
        </p>
      </div>

      {/* PROPRIETÁRIO NO DOCUMENTO */}

      <div className="mb-4 rounded-xl border border-grafite-claro bg-grafite p-5">
        <h2 className="mb-4 font-semibold text-dourado">
          Proprietário no Documento
        </h2>

        <ProprietarioDoDocumento
          editando={editando}
          ligado={outroProprietario}
          aoLigar={setOutroProprietario}
          dados={proprietario}
          aoMudar={(parcial) =>
            setProprietario((anterior) => ({
              ...anterior,
              ...parcial,
            }))
          }
        />

        {outroProprietario && !editando && (
          <p className="mt-4 text-xs text-texto-suave">
            A procuração sai no nome desta pessoa. O contrato
            de compra continua com quem vendeu e cita o
            proprietário.
          </p>
        )}
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

      {/* CONFERÊNCIA COM O CRLV */}

      {moto && (
        <div className="mt-6">
          <ConferenciaCrlv
            motorcycleId={String(id)}
            moto={moto}
            versao={versaoAnexos}
          />
        </div>
      )}

      {/* FOTOS */}

      <div className="mt-6">
        <FotosMoto motorcycleId={String(id)} />
      </div>

      {/* CAPA DO SITE */}

      <div className="mt-6">
        <MotoNaCapa motorcycleId={String(id)} />
      </div>

      {/* LEGENDA DO POST */}

      <div className="mt-6">
        <LegendaPost motorcycleId={String(id)} />
      </div>

      {/* VISTORIAS */}

      <div className="mt-6">
        <Vistorias
          motorcycleId={String(id)}
          aoMudar={() => setVersaoAnexos((v) => v + 1)}
        />
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
        type === "moeda" ? (
          <CampoMoeda
            value={value}
            onChange={onChange}
            className="w-full rounded-lg border border-grafite-claro bg-preto px-3 py-2 text-texto outline-none focus:border-dourado"
          />
        ) : (
          <input
            type={type}
            step={step}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-lg border border-grafite-claro bg-preto px-3 py-2 text-texto outline-none focus:border-dourado"
          />
        )
      ) : (
        <p className="font-medium text-texto">
          {exibicao || value || "—"}
        </p>
      )}
    </div>
  );
}