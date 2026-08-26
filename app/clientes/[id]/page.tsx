"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bike,
  FileSignature,
  FileText,
  ReceiptText,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import CardWhatsapp from "@/components/CardWhatsapp";

type Cliente = {
  id: string;
  nome: string;
  rg: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  telefone: string | null;
  email: string | null;
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
};

type MotoCompradaPelaLoja = {
  id: string;
  codigo: string | null;
  marca: string | null;
  modelo: string | null;
  versao: string | null;
  ano_fabricacao: number | null;
  ano_modelo: number | null;
  placa: string | null;
  cor: string | null;
  valor_compra: number | null;
  data_entrada: string | null;
  status: string | null;
};

type VendaCliente = {
  id: string;
  data_venda: string | null;
  valor_venda: number | null;
  valor_total_venda: number | null;
  motorcycle_id: string | null;
  moto?: {
    id: string;
    codigo: string | null;
    marca: string | null;
    modelo: string | null;
    versao: string | null;
    ano_modelo: number | null;
    placa: string | null;
  } | null;
};

function moeda(valor: number | null | undefined) {
  return formatarMoeda(valor);
}

function dataBrasil(data: string | null | undefined) {
  if (!data) return "Não informada";

  const [ano, mes, dia] = data.split("-");

  if (!ano || !mes || !dia) {
    return data;
  }

  return `${dia}/${mes}/${ano}`;
}

function nomeMotoCompra(moto: MotoCompradaPelaLoja) {
  return [
    moto.marca,
    moto.modelo,
    moto.versao,
  ]
    .filter(Boolean)
    .join(" ");
}

function nomeMotoVenda(venda: VendaCliente) {
  if (!venda.moto) {
    return "Moto não encontrada";
  }

  return [
    venda.moto.marca,
    venda.moto.modelo,
    venda.moto.versao,
  ]
    .filter(Boolean)
    .join(" ");
}

export default function ClienteDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const id = params.id as string;

  const [cliente, setCliente] =
    useState<Cliente | null>(null);

  const [
    motosVendidasParaLoja,
    setMotosVendidasParaLoja,
  ] = useState<MotoCompradaPelaLoja[]>([]);

  const [
    vendasDoCliente,
    setVendasDoCliente,
  ] = useState<VendaCliente[]>([]);

  const [editando, setEditando] =
    useState(false);

  const [carregando, setCarregando] =
    useState(true);

  const [salvando, setSalvando] =
    useState(false);

  const [erro, setErro] =
    useState("");

  const [mensagem, setMensagem] =
    useState("");

  useEffect(() => {
    carregarDados();
  }, [id]);

  async function carregarDados() {
    setCarregando(true);
    setErro("");

    const [
      resultadoCliente,
      resultadoMotosFornecedor,
      resultadoVendas,
    ] = await Promise.all([
      supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single(),

      supabase
        .from("motorcycles")
        .select(`
          id,
          codigo,
          marca,
          modelo,
          versao,
          ano_fabricacao,
          ano_modelo,
          placa,
          cor,
          valor_compra,
          data_entrada,
          status
        `)
        .eq("fornecedor_customer_id", id)
        .order("data_entrada", {
          ascending: false,
        }),

      supabase
        .from("sales")
        .select(`
          id,
          data_venda,
          valor_venda,
          valor_total_venda,
          motorcycle_id
        `)
        .eq("customer_id", id)
        .order("data_venda", {
          ascending: false,
        }),
    ]);

    if (resultadoCliente.error) {
      console.error(
        resultadoCliente.error
      );

      setErro(
        "Não foi possível carregar os dados do cliente."
      );

      setCarregando(false);
      return;
    }

    setCliente(
      resultadoCliente.data
    );

    if (resultadoMotosFornecedor.error) {
      console.error(
        resultadoMotosFornecedor.error
      );

      setErro(
        `Cliente carregado, mas não foi possível carregar as motos vendidas para a loja: ${resultadoMotosFornecedor.error.message}`
      );
    } else {
      setMotosVendidasParaLoja(
        resultadoMotosFornecedor.data || []
      );
    }

    if (resultadoVendas.error) {
      console.error(
        resultadoVendas.error
      );

      setErro(
        `Cliente carregado, mas não foi possível carregar as vendas vinculadas: ${resultadoVendas.error.message}`
      );

      setCarregando(false);
      return;
    }

    const vendas = resultadoVendas.data || [];

    const idsMotos = vendas
      .map(
        (venda) =>
          venda.motorcycle_id
      )
      .filter(
        (motoId): motoId is string =>
          Boolean(motoId)
      );

    let mapaMotos = new Map<
      string,
      VendaCliente["moto"]
    >();

    if (idsMotos.length > 0) {
      const {
        data: motosVenda,
        error: motosVendaError,
      } = await supabase
        .from("motorcycles")
        .select(`
          id,
          codigo,
          marca,
          modelo,
          versao,
          ano_modelo,
          placa
        `)
        .in("id", idsMotos);

      if (motosVendaError) {
        console.error(
          motosVendaError
        );
      } else {
        mapaMotos = new Map(
          (motosVenda || []).map(
            (moto) => [
              String(moto.id),
              moto,
            ]
          )
        );
      }
    }

    const vendasComMoto =
      vendas.map(
        (venda) => ({
          ...venda,
          moto:
            venda.motorcycle_id
              ? mapaMotos.get(
                  String(
                    venda.motorcycle_id
                  )
                ) || null
              : null,
        })
      );

    setVendasDoCliente(
      vendasComMoto
    );

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
        nome:
          cliente.nome.trim(),

        rg:
          cliente.rg?.trim() ||
          null,

        cpf:
          cliente.cpf?.trim() ||
          null,

        data_nascimento:
          cliente.data_nascimento ||
          null,

        telefone:
          cliente.telefone?.trim() ||
          null,

        email:
          cliente.email?.trim() ||
          null,

        rua:
          cliente.rua?.trim() ||
          null,

        numero:
          cliente.numero?.trim() ||
          null,

        bairro:
          cliente.bairro?.trim() ||
          null,

        cidade:
          cliente.cidade?.trim() ||
          null,

        estado:
          cliente.estado
            ?.trim()
            .toUpperCase() ||
          null,

        cep:
          cliente.cep?.trim() ||
          null,
      })
      .eq("id", id);

    if (error) {
      console.error(error);

      setErro(
        `Erro ao salvar cliente: ${error.message}`
      );

      setSalvando(false);
      return;
    }

    setMensagem(
      "Dados do cliente atualizados com sucesso."
    );

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
        <p className="text-red-400">
          {erro}
        </p>
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
      <div className="mx-auto max-w-6xl p-4 md:p-8">

        {/* CABEÇALHO */}

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-dourado">
              BLACKOUT MOTOS
            </p>

            <h1 className="mt-2 text-3xl font-bold text-white">
              Ficha do Cliente
            </h1>

            <p className="mt-1 text-sm text-texto-suave">
              Visualize os dados do cliente, compras, vendas e documentos.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/clientes"
                )
              }
              className="rounded-lg border border-grafite-claro px-4 py-2 text-sm font-semibold text-texto hover:border-dourado"
            >
              Voltar
            </button>

            {!editando ? (
              <button
                type="button"
                onClick={() =>
                  setEditando(true)
                }
                className="rounded-lg bg-dourado px-4 py-2 text-sm font-bold text-preto hover:bg-dourado-claro"
              >
                Editar Cliente
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditando(false);
                    carregarDados();
                  }}
                  className="rounded-lg border border-grafite-claro px-4 py-2 text-sm font-semibold text-texto"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={
                    salvarAlteracoes
                  }
                  disabled={
                    salvando
                  }
                  className="rounded-lg bg-dourado px-4 py-2 text-sm font-bold text-preto hover:bg-dourado-claro disabled:opacity-50"
                >
                  {salvando
                    ? "Salvando..."
                    : "Salvar Alterações"}
                </button>
              </>
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

        {/* WHATSAPP */}

        <div className="mb-6">
          <CardWhatsapp
            telefone={cliente.telefone}
            nome={cliente.nome}
          />
        </div>

        {/* DADOS DO CLIENTE */}

        <section className="rounded-2xl border border-grafite-claro bg-grafite p-5 md:p-8">
          <div className="mb-6 border-b border-grafite-claro pb-4">
            <h2 className="text-xl font-bold text-dourado">
              Dados do Cliente
            </h2>

            <p className="mt-1 text-sm text-texto-suave">
              Cadastro utilizado nas compras e vendas da loja.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Campo
              label="Nome completo"
              value={
                cliente.nome || ""
              }
              editando={
                editando
              }
              onChange={(valor) =>
                atualizarCampo(
                  "nome",
                  valor
                )
              }
            />

            <Campo
              label="RG"
              value={
                cliente.rg || ""
              }
              editando={
                editando
              }
              onChange={(valor) =>
                atualizarCampo(
                  "rg",
                  valor
                )
              }
            />

            <Campo
              label="CPF"
              value={
                cliente.cpf || ""
              }
              editando={
                editando
              }
              onChange={(valor) =>
                atualizarCampo(
                  "cpf",
                  valor
                )
              }
            />

            <Campo
              label="Data de nascimento"
              value={
                cliente.data_nascimento ||
                ""
              }
              editando={
                editando
              }
              type="date"
              onChange={(valor) =>
                atualizarCampo(
                  "data_nascimento",
                  valor
                )
              }
            />

            <Campo
              label="Telefone"
              value={
                cliente.telefone ||
                ""
              }
              editando={
                editando
              }
              onChange={(valor) =>
                atualizarCampo(
                  "telefone",
                  valor
                )
              }
            />

            <Campo
              label="E-mail"
              value={
                cliente.email || ""
              }
              editando={
                editando
              }
              type="email"
              onChange={(valor) =>
                atualizarCampo(
                  "email",
                  valor
                )
              }
            />

            <Campo
              label="CEP"
              value={
                cliente.cep || ""
              }
              editando={
                editando
              }
              onChange={(valor) =>
                atualizarCampo(
                  "cep",
                  valor
                )
              }
            />

            <Campo
              label="Rua"
              value={
                cliente.rua || ""
              }
              editando={
                editando
              }
              onChange={(valor) =>
                atualizarCampo(
                  "rua",
                  valor
                )
              }
            />

            <Campo
              label="Número"
              value={
                cliente.numero ||
                ""
              }
              editando={
                editando
              }
              onChange={(valor) =>
                atualizarCampo(
                  "numero",
                  valor
                )
              }
            />

            <Campo
              label="Bairro"
              value={
                cliente.bairro ||
                ""
              }
              editando={
                editando
              }
              onChange={(valor) =>
                atualizarCampo(
                  "bairro",
                  valor
                )
              }
            />

            <Campo
              label="Cidade"
              value={
                cliente.cidade ||
                ""
              }
              editando={
                editando
              }
              onChange={(valor) =>
                atualizarCampo(
                  "cidade",
                  valor
                )
              }
            />

            <Campo
              label="Estado"
              value={
                cliente.estado ||
                ""
              }
              editando={
                editando
              }
              onChange={(valor) =>
                atualizarCampo(
                  "estado",
                  valor
                )
              }
            />
          </div>
        </section>

        {/* MOTOS VENDIDAS PARA A BLACKOUT */}

        <section className="mt-6 rounded-2xl border border-grafite-claro bg-grafite p-5 md:p-8">
          <div className="mb-6 flex flex-col gap-3 border-b border-grafite-claro pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-dourado">
                Motos Vendidas para a Blackout
              </h2>

              <p className="mt-1 text-sm text-texto-suave">
                Motos que este cliente vendeu ou entregou para a loja.
              </p>
            </div>

            <div className="rounded-lg border border-grafite-claro bg-preto px-4 py-2 text-sm">
              <span className="text-texto-suave">
                Total:
              </span>{" "}
              <strong className="text-dourado">
                {
                  motosVendidasParaLoja.length
                }
              </strong>
            </div>
          </div>

          {motosVendidasParaLoja.length ===
          0 ? (
            <div className="rounded-xl border border-grafite-claro bg-preto p-6 text-center">
              <Bike
                size={32}
                className="mx-auto mb-3 text-texto-suave"
              />

              <p className="font-semibold text-white">
                Nenhuma moto vendida para a loja vinculada a este cliente.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {motosVendidasParaLoja.map(
                (moto) => (
                  <div
                    key={moto.id}
                    className="rounded-xl border border-grafite-claro bg-preto p-5"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-white">
                            {nomeMotoCompra(
                              moto
                            ) ||
                              "Moto"}
                          </h3>

                          {moto.codigo && (
                            <span className="rounded-md border border-dourado/40 bg-dourado/10 px-2 py-1 text-xs font-bold text-dourado">
                              {
                                moto.codigo
                              }
                            </span>
                          )}
                        </div>

                        <div className="mt-3 grid gap-x-8 gap-y-2 text-sm text-texto-suave sm:grid-cols-2 lg:grid-cols-4">
                          <p>
                            <span className="text-zinc-500">
                              Ano:
                            </span>{" "}
                            {moto.ano_fabricacao ||
                              "-"}
                            /
                            {moto.ano_modelo ||
                              "-"}
                          </p>

                          <p>
                            <span className="text-zinc-500">
                              Placa:
                            </span>{" "}
                            {moto.placa ||
                              "Não informada"}
                          </p>

                          <p>
                            <span className="text-zinc-500">
                              Entrada:
                            </span>{" "}
                            {dataBrasil(
                              moto.data_entrada
                            )}
                          </p>

                          <p>
                            <span className="text-zinc-500">
                              Compra:
                            </span>{" "}
                            <strong className="text-white">
                              {moeda(
                                moto.valor_compra
                              )}
                            </strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
                        <Link
                          href={`/motos/${moto.id}`}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-grafite-claro px-4 py-2 text-sm font-semibold text-texto transition hover:border-dourado hover:text-dourado"
                        >
                          <Bike
                            size={16}
                          />
                          Ver Moto
                        </Link>

                        <a
                          href={`/api/contratos/procuracao/${moto.id}`}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-dourado px-4 py-2 text-sm font-bold text-preto transition hover:bg-dourado-claro"
                        >
                          <FileSignature
                            size={16}
                          />
                          Gerar Procuração
                        </a>

                        <a
                          href={`/api/contratos/compra/${moto.id}`}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-dourado px-4 py-2 text-sm font-bold text-dourado transition hover:bg-dourado hover:text-preto"
                        >
                          <FileText
                            size={16}
                          />
                          Gerar Contrato de Compra
                        </a>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* MOTOS COMPRADAS DA BLACKOUT */}

        <section className="mt-6 rounded-2xl border border-grafite-claro bg-grafite p-5 md:p-8">
          <div className="mb-6 flex flex-col gap-3 border-b border-grafite-claro pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-dourado">
                Motos Compradas da Blackout
              </h2>

              <p className="mt-1 text-sm text-texto-suave">
                Vendas da loja vinculadas a este cliente.
              </p>
            </div>

            <div className="rounded-lg border border-grafite-claro bg-preto px-4 py-2 text-sm">
              <span className="text-texto-suave">
                Total:
              </span>{" "}
              <strong className="text-dourado">
                {
                  vendasDoCliente.length
                }
              </strong>
            </div>
          </div>

          {vendasDoCliente.length ===
          0 ? (
            <div className="rounded-xl border border-grafite-claro bg-preto p-6 text-center">
              <ReceiptText
                size={32}
                className="mx-auto mb-3 text-texto-suave"
              />

              <p className="font-semibold text-white">
                Nenhuma venda vinculada a este cliente.
              </p>

              <p className="mt-2 text-sm text-texto-suave">
                O contrato de venda só aparece quando existe uma venda registrada com este cliente.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {vendasDoCliente.map(
                (venda) => (
                  <div
                    key={venda.id}
                    className="rounded-xl border border-grafite-claro bg-preto p-5"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-white">
                            {nomeMotoVenda(
                              venda
                            )}
                          </h3>

                          {venda.moto?.codigo && (
                            <span className="rounded-md border border-dourado/40 bg-dourado/10 px-2 py-1 text-xs font-bold text-dourado">
                              {
                                venda.moto.codigo
                              }
                            </span>
                          )}
                        </div>

                        <div className="mt-3 grid gap-x-8 gap-y-2 text-sm text-texto-suave sm:grid-cols-2 lg:grid-cols-4">
                          <p>
                            <span className="text-zinc-500">
                              Data:
                            </span>{" "}
                            {dataBrasil(
                              venda.data_venda
                            )}
                          </p>

                          <p>
                            <span className="text-zinc-500">
                              Placa:
                            </span>{" "}
                            {venda.moto?.placa ||
                              "Não informada"}
                          </p>

                          <p>
                            <span className="text-zinc-500">
                              Ano:
                            </span>{" "}
                            {venda.moto?.ano_modelo ||
                              "-"}
                          </p>

                          <p>
                            <span className="text-zinc-500">
                              Venda:
                            </span>{" "}
                            <strong className="text-white">
                              {moeda(
                                venda.valor_total_venda ??
                                  venda.valor_venda
                              )}
                            </strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
                        <Link
                          href={`/vendas/${venda.id}`}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-grafite-claro px-4 py-2 text-sm font-semibold text-texto transition hover:border-dourado hover:text-dourado"
                        >
                          <ReceiptText
                            size={16}
                          />
                          Ver Venda
                        </Link>

                        <a
                          href={`/api/contratos/venda/${venda.id}`}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-dourado px-4 py-2 text-sm font-bold text-preto transition hover:bg-dourado-claro"
                        >
                          <FileText
                            size={16}
                          />
                          Gerar Contrato de Venda
                        </a>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

type CampoProps = {
  label: string;
  value: string;
  editando: boolean;
  type?: string;
  onChange: (
    valor: string
  ) => void;
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
          onChange={(e) =>
            onChange(
              e.target.value
            )
          }
          className="w-full rounded-xl border border-grafite-claro bg-preto px-4 py-3 text-white outline-none transition focus:border-dourado"
        />
      ) : (
        <div className="min-h-[48px] rounded-xl border border-grafite-claro bg-preto px-4 py-3 text-white">
          {value ||
            "Não informado"}
        </div>
      )}
    </div>
  );
}