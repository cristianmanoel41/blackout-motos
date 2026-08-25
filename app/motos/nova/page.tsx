"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  FileSignature,
  Save,
  Warehouse,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type TipoEntrada =
  | "estoque_inicial"
  | "compra_nova"
  | "troca";

type StatusMoto =
  | "disponivel"
  | "reservada"
  | "manutencao";

type FormMoto = {
  data_entrada: string;
  tipo_entrada: TipoEntrada;

  marca: string;
  modelo: string;
  versao: string;
  ano_fabricacao: string;
  ano_modelo: string;
  cor: string;
  placa: string;
  renavam: string;
  chassi: string;
  quilometragem: string;

  valor_compra: string;
  preco_anunciado: string;
  forma_pagamento_compra: string;

  fornecedor_nome: string;
  fornecedor_telefone: string;
  fornecedor_cpf: string;
  fornecedor_rg: string;
  fornecedor_rua: string;
  fornecedor_numero: string;
  fornecedor_bairro: string;
  fornecedor_cidade: string;
  fornecedor_estado: string;
  fornecedor_cep: string;

  status: StatusMoto;
  observacoes: string;
};

function hoje() {
  const data = new Date();

  const ano = data.getFullYear();
  const mes = String(
    data.getMonth() + 1
  ).padStart(2, "0");
  const dia = String(
    data.getDate()
  ).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

const formInicial: FormMoto = {
  data_entrada: hoje(),
  tipo_entrada: "compra_nova",

  marca: "",
  modelo: "",
  versao: "",
  ano_fabricacao: "",
  ano_modelo: "",
  cor: "",
  placa: "",
  renavam: "",
  chassi: "",
  quilometragem: "",

  valor_compra: "",
  preco_anunciado: "",
  forma_pagamento_compra: "",

  fornecedor_nome: "",
  fornecedor_telefone: "",
  fornecedor_cpf: "",
  fornecedor_rg: "",
  fornecedor_rua: "",
  fornecedor_numero: "",
  fornecedor_bairro: "",
  fornecedor_cidade: "",
  fornecedor_estado: "",
  fornecedor_cep: "",

  status: "disponivel",
  observacoes: "",
};

function moeda(valor: number) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  ).format(valor || 0);
}

export default function NovaMotoPage() {
  const supabase = createClient();

  const [form, setForm] =
    useState<FormMoto>(formInicial);

  const [salvando, setSalvando] =
    useState(false);

  const [erro, setErro] =
    useState("");

  const [mensagem, setMensagem] =
    useState("");

  const [
    motoCriadaId,
    setMotoCriadaId,
  ] = useState("");

  const [
    retornoVendaTroca,
    setRetornoVendaTroca,
  ] = useState(false);

  const ehEstoqueInicial =
    form.tipo_entrada ===
    "estoque_inicial";

  const ehTroca =
    form.tipo_entrada ===
    "troca";

  const valorCompraNumero =
    useMemo(
      () =>
        Number(
          form.valor_compra
        ) || 0,
      [form.valor_compra]
    );

  useEffect(() => {
    const parametros =
      new URLSearchParams(
        window.location.search
      );

    const retorno =
      parametros.get("retorno");

    if (
      retorno ===
      "venda-troca"
    ) {
      setRetornoVendaTroca(true);

      setForm(
        (anterior) => ({
          ...anterior,
          tipo_entrada:
            "troca",
          data_entrada:
            hoje(),
        })
      );
    }
  }, []);

  function atualizarCampo(
    campo: keyof FormMoto,
    valor: string
  ) {
    setForm((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  function limpar() {
    setForm({
      ...formInicial,
      data_entrada: hoje(),
    });

    setMotoCriadaId("");
    setErro("");
    setMensagem("");
  }

  async function salvarMoto(
    event: FormEvent
  ) {
    event.preventDefault();

    setErro("");
    setMensagem("");

    if (!form.data_entrada) {
      setErro(
        "Informe a data de entrada/compra da moto."
      );
      return;
    }

    if (!form.marca.trim()) {
      setErro(
        "Informe a marca da moto."
      );
      return;
    }

    if (!form.modelo.trim()) {
      setErro(
        "Informe o modelo da moto."
      );
      return;
    }

    if (
      !form.valor_compra ||
      valorCompraNumero <= 0
    ) {
      setErro(
        "Informe o valor de compra da moto."
      );
      return;
    }

    if (
      !ehEstoqueInicial &&
      !form.fornecedor_nome.trim()
    ) {
      setErro(
        "Informe o nome de quem vendeu a moto para a loja."
      );
      return;
    }

    setSalvando(true);

    try {
      const {
        data: motoCriada,
        error: motoError,
      } = await supabase
        .from("motorcycles")
        .insert({
          data_entrada:
            form.data_entrada,

          tipo_entrada:
            form.tipo_entrada,

          marca:
            form.marca.trim(),

          modelo:
            form.modelo.trim(),

          versao:
            form.versao.trim() ||
            null,

          ano_fabricacao:
            form.ano_fabricacao
              ? Number(
                  form.ano_fabricacao
                )
              : null,

          ano_modelo:
            form.ano_modelo
              ? Number(
                  form.ano_modelo
                )
              : null,

          cor:
            form.cor.trim() ||
            null,

          placa:
            form.placa
              .trim()
              .toUpperCase() ||
            null,

          renavam:
            form.renavam.trim() ||
            null,

          chassi:
            form.chassi
              .trim()
              .toUpperCase() ||
            null,

          quilometragem:
            form.quilometragem
              ? Number(
                  form.quilometragem
                )
              : 0,

          valor_compra:
            valorCompraNumero,

          preco_anunciado:
            form.preco_anunciado
              ? Number(
                  form.preco_anunciado
                )
              : null,

          forma_pagamento_compra:
            form.forma_pagamento_compra ||
            null,

          fornecedor_nome:
            form.fornecedor_nome.trim() ||
            null,

          fornecedor_telefone:
            form.fornecedor_telefone.trim() ||
            null,

          fornecedor_cpf:
            form.fornecedor_cpf.trim() ||
            null,

          fornecedor_rg:
            form.fornecedor_rg.trim() ||
            null,

          fornecedor_rua:
            form.fornecedor_rua.trim() ||
            null,

          fornecedor_numero:
            form.fornecedor_numero.trim() ||
            null,

          fornecedor_bairro:
            form.fornecedor_bairro.trim() ||
            null,

          fornecedor_cidade:
            form.fornecedor_cidade.trim() ||
            null,

          fornecedor_estado:
            form.fornecedor_estado
              .trim()
              .toUpperCase() ||
            null,

          fornecedor_cep:
            form.fornecedor_cep.trim() ||
            null,

          status: form.status,

          observacoes:
            form.observacoes.trim() ||
            null,
        })
        .select("id, codigo")
        .single();

      if (
        motoError ||
        !motoCriada
      ) {
        throw (
          motoError ||
          new Error(
            "Não foi possível cadastrar a moto."
          )
        );
      }

      /*
       * ESTOQUE INICIAL:
       * não gera saída no caixa.
       *
       * COMPRA NOVA:
       * registra automaticamente uma saída.
       *
       * Usamos origem "outro", que já é utilizada
       * pelo sistema, e identificamos a compra
       * pela descrição.
       */
      if (
        form.tipo_entrada ===
        "compra_nova"
      ) {
        const {
          error: caixaError,
        } = await supabase
          .from(
            "cash_transactions"
          )
          .insert({
            data:
              form.data_entrada,

            tipo: "saida",

            origem: "outro",

            origem_id:
              motoCriada.id,

            valor:
              valorCompraNumero,

            descricao:
              `Compra de moto - ${
                motoCriada.codigo ||
                `${form.marca} ${form.modelo}`
              }`,
          });

        if (caixaError) {
          /*
           * Se falhar o caixa, remove a moto criada
           * para não deixar a operação pela metade.
           */
          await supabase
            .from("motorcycles")
            .delete()
            .eq(
              "id",
              motoCriada.id
            );

          throw caixaError;
        }
      }

      setMotoCriadaId(
        String(motoCriada.id)
      );

      if (
        retornoVendaTroca ||
        ehTroca
      ) {
        const descricao =
          `${form.marca.trim()} ${form.modelo.trim()}${
            form.ano_modelo
              ? ` ${form.ano_modelo}`
              : ""
          }`;

        const parametros =
          new URLSearchParams();

        parametros.set(
          "trocaMoto",
          String(motoCriada.id)
        );

        parametros.set(
          "trocaValor",
          String(valorCompraNumero)
        );

        parametros.set(
          "trocaDescricao",
          descricao
        );

        window.location.href =
          `/vendas?${parametros.toString()}`;

        return;
      }

      setMensagem(
        ehEstoqueInicial
          ? "Moto cadastrada como estoque inicial. O valor de compra será usado no custo e no lucro, mas não foi lançado como saída no caixa."
          : "Compra cadastrada com sucesso. A moto entrou no estoque e o valor da compra foi lançado como saída no caixa."
      );
    } catch (error: any) {
      console.error(error);

      const mensagemErro = [
        error?.message,
        error?.details,
        error?.hint,
        error?.code
          ? `Código: ${error.code}`
          : null,
      ]
        .filter(Boolean)
        .join(" | ");

      setErro(
        mensagemErro ||
          "Não foi possível cadastrar a moto."
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="min-h-screen bg-preto text-texto">
      <div className="mx-auto w-full max-w-6xl p-4 md:p-8">

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-dourado">
              BLACKOUT MOTOS
            </p>

            <h1 className="mt-2 text-3xl font-bold text-white">
              Comprar / Cadastrar Moto
            </h1>

            <p className="mt-2 text-sm text-texto-suave">
              {retornoVendaTroca
                ? "Cadastre a moto recebida na troca. Ao salvar, ela será vinculada à venda em andamento."
                : "Registre a entrada da moto na loja. Você pode usar a data real da compra, inclusive datas retroativas."}
            </p>
          </div>

          <Link
            href="/estoque"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-grafite-claro px-4 py-3 font-semibold text-texto transition hover:border-dourado hover:text-dourado"
          >
            <Warehouse size={18} />
            Ver Estoque
          </Link>
        </div>

        {erro && (
          <div className="mb-6 rounded-xl border border-red-700 bg-red-950/30 p-4 text-red-300">
            {erro}
          </div>
        )}

        {mensagem && (
          <div className="mb-6 rounded-xl border border-green-700 bg-green-950/30 p-4 text-green-300">
            {mensagem}

            {motoCriadaId && (
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={`/motos/${motoCriadaId}`}
                  className="rounded-lg border border-green-700 px-4 py-2 text-sm font-semibold text-green-300 transition hover:bg-green-900/30"
                >
                  Ver Moto Cadastrada
                </Link>

                <button
                  type="button"
                  disabled
                  title="A procuração será ativada quando o modelo Word for configurado."
                  className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-dourado px-4 py-2 text-sm font-bold text-preto opacity-50"
                >
                  <FileSignature size={17} />
                  Gerar Procuração
                </button>

                <button
                  type="button"
                  onClick={limpar}
                  className="rounded-lg border border-grafite-claro px-4 py-2 text-sm font-semibold text-texto hover:border-dourado"
                >
                  Cadastrar Outra Moto
                </button>
              </div>
            )}
          </div>
        )}

        <form
          onSubmit={salvarMoto}
          className="space-y-6"
        >

          {/* ENTRADA / COMPRA */}

          <section className="rounded-2xl border border-grafite-claro bg-grafite p-5 md:p-7">
            <h2 className="mb-5 border-b border-grafite-claro pb-3 text-lg font-semibold text-dourado">
              Entrada da Moto
            </h2>

            <div className="grid gap-5 md:grid-cols-2">
              <CampoSelect
                label="Tipo de entrada *"
                value={form.tipo_entrada}
                onChange={(valor) =>
                  atualizarCampo(
                    "tipo_entrada",
                    valor
                  )
                }
                disabled={
                  retornoVendaTroca
                }
                opcoes={[
                  {
                    valor:
                      "compra_nova",
                    nome:
                      "Compra nova",
                  },
                  {
                    valor:
                      "estoque_inicial",
                    nome:
                      "Estoque inicial",
                  },
                  {
                    valor:
                      "troca",
                    nome:
                      "Moto recebida na troca",
                  },
                ]}
              />

              <Campo
                label="Data de entrada / compra *"
                type="date"
                value={
                  form.data_entrada
                }
                onChange={(valor) =>
                  atualizarCampo(
                    "data_entrada",
                    valor
                  )
                }
              />
            </div>

            <div
              className={`mt-5 rounded-xl border p-4 text-sm ${
                ehEstoqueInicial
                  ? "border-blue-800 bg-blue-950/20 text-blue-300"
                  : "border-yellow-800 bg-yellow-950/20 text-yellow-300"
              }`}
            >
              {ehEstoqueInicial
                ? "Estoque inicial: use para motos que já pertenciam à loja antes de você começar a usar o sistema. Pode colocar a data real, mesmo retroativa. O valor não gera saída nova no caixa."
                : ehTroca
                  ? "Moto na troca: o valor informado será o valor considerado na negociação. A moto entra no estoque, mas não gera saída de dinheiro no caixa."
                  : "Compra nova: use para motos compradas pela loja. O valor de compra será lançado como saída no caixa na data informada."}
            </div>
          </section>

          {/* MOTO */}

          <section className="rounded-2xl border border-grafite-claro bg-grafite p-5 md:p-7">
            <h2 className="mb-5 border-b border-grafite-claro pb-3 text-lg font-semibold text-dourado">
              Dados da Moto
            </h2>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <Campo
                label="Marca *"
                value={form.marca}
                onChange={(valor) =>
                  atualizarCampo(
                    "marca",
                    valor
                  )
                }
                placeholder="Honda"
              />

              <Campo
                label="Modelo *"
                value={form.modelo}
                onChange={(valor) =>
                  atualizarCampo(
                    "modelo",
                    valor
                  )
                }
                placeholder="Fan 160"
              />

              <Campo
                label="Versão"
                value={form.versao}
                onChange={(valor) =>
                  atualizarCampo(
                    "versao",
                    valor
                  )
                }
                placeholder="ABS, DLX..."
              />

              <Campo
                label="Ano fabricação"
                type="number"
                value={
                  form.ano_fabricacao
                }
                onChange={(valor) =>
                  atualizarCampo(
                    "ano_fabricacao",
                    valor
                  )
                }
                placeholder="2024"
              />

              <Campo
                label="Ano modelo"
                type="number"
                value={
                  form.ano_modelo
                }
                onChange={(valor) =>
                  atualizarCampo(
                    "ano_modelo",
                    valor
                  )
                }
                placeholder="2025"
              />

              <Campo
                label="Cor"
                value={form.cor}
                onChange={(valor) =>
                  atualizarCampo(
                    "cor",
                    valor
                  )
                }
                placeholder="Preta"
              />

              <Campo
                label="Placa"
                value={form.placa}
                onChange={(valor) =>
                  atualizarCampo(
                    "placa",
                    valor
                  )
                }
                placeholder="ABC1D23"
              />

              <Campo
                label="Renavam"
                value={form.renavam}
                onChange={(valor) =>
                  atualizarCampo(
                    "renavam",
                    valor
                  )
                }
                placeholder="Renavam"
              />

              <Campo
                label="Chassi"
                value={form.chassi}
                onChange={(valor) =>
                  atualizarCampo(
                    "chassi",
                    valor
                  )
                }
                placeholder="Chassi"
              />

              <Campo
                label="Quilometragem"
                type="number"
                value={
                  form.quilometragem
                }
                onChange={(valor) =>
                  atualizarCampo(
                    "quilometragem",
                    valor
                  )
                }
                placeholder="15000"
              />

              <CampoSelect
                label="Status"
                value={form.status}
                onChange={(valor) =>
                  atualizarCampo(
                    "status",
                    valor
                  )
                }
                opcoes={[
                  {
                    valor:
                      "disponivel",
                    nome:
                      "Disponível",
                  },
                  {
                    valor:
                      "reservada",
                    nome:
                      "Reservada",
                  },
                  {
                    valor:
                      "manutencao",
                    nome:
                      "Em manutenção",
                  },
                ]}
              />
            </div>
          </section>

          {/* VALORES */}

          <section className="rounded-2xl border border-grafite-claro bg-grafite p-5 md:p-7">
            <h2 className="mb-5 border-b border-grafite-claro pb-3 text-lg font-semibold text-dourado">
              Valores da Compra
            </h2>

            <div className="grid gap-5 md:grid-cols-3">
              <Campo
                label={
                  ehTroca
                    ? "Valor considerado na troca *"
                    : "Valor de compra *"
                }
                type="number"
                step="0.01"
                value={
                  form.valor_compra
                }
                onChange={(valor) =>
                  atualizarCampo(
                    "valor_compra",
                    valor
                  )
                }
                placeholder="0,00"
              />

              <Campo
                label="Preço anunciado"
                type="number"
                step="0.01"
                value={
                  form.preco_anunciado
                }
                onChange={(valor) =>
                  atualizarCampo(
                    "preco_anunciado",
                    valor
                  )
                }
                placeholder="0,00"
              />

              <CampoSelect
                label="Forma de pagamento da compra"
                value={
                  form.forma_pagamento_compra
                }
                onChange={(valor) =>
                  atualizarCampo(
                    "forma_pagamento_compra",
                    valor
                  )
                }
                opcoes={[
                  {
                    valor: "",
                    nome:
                      "Selecione",
                  },
                  {
                    valor:
                      "Pix",
                    nome: "Pix",
                  },
                  {
                    valor:
                      "Dinheiro",
                    nome:
                      "Dinheiro",
                  },
                  {
                    valor:
                      "Transferência",
                    nome:
                      "Transferência",
                  },
                  {
                    valor:
                      "Cartão",
                    nome:
                      "Cartão",
                  },
                  {
                    valor:
                      "Outro",
                    nome:
                      "Outro",
                  },
                ]}
              />
            </div>

            <div className="mt-5 rounded-xl border border-grafite-claro bg-preto p-4">
              <p className="text-xs text-texto-suave">
                Valor da compra
              </p>
              <p className="mt-1 text-xl font-bold text-dourado">
                {moeda(
                  valorCompraNumero
                )}
              </p>
            </div>
          </section>

          {/* VENDEDOR / FORNECEDOR */}

          <section className="rounded-2xl border border-grafite-claro bg-grafite p-5 md:p-7">
            <div className="mb-5 border-b border-grafite-claro pb-3">
              <h2 className="text-lg font-semibold text-dourado">
                Dados de Quem Vendeu a Moto
              </h2>

              <p className="mt-1 text-xs text-texto-suave">
                Estes dados também serão usados futuramente para gerar a procuração.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Campo
                label={
                  ehEstoqueInicial
                    ? "Nome do vendedor / fornecedor"
                    : "Nome completo do vendedor *"
                }
                value={
                  form.fornecedor_nome
                }
                onChange={(valor) =>
                  atualizarCampo(
                    "fornecedor_nome",
                    valor
                  )
                }
                placeholder="Nome completo"
              />

              <Campo
                label="Telefone / WhatsApp"
                value={
                  form.fornecedor_telefone
                }
                onChange={(valor) =>
                  atualizarCampo(
                    "fornecedor_telefone",
                    valor
                  )
                }
                placeholder="(12) 99999-9999"
              />

              <Campo
                label="CPF"
                value={
                  form.fornecedor_cpf
                }
                onChange={(valor) =>
                  atualizarCampo(
                    "fornecedor_cpf",
                    valor
                  )
                }
                placeholder="000.000.000-00"
              />

              <Campo
                label="RG"
                value={
                  form.fornecedor_rg
                }
                onChange={(valor) =>
                  atualizarCampo(
                    "fornecedor_rg",
                    valor
                  )
                }
                placeholder="RG"
              />

              <Campo
                label="CEP"
                value={
                  form.fornecedor_cep
                }
                onChange={(valor) =>
                  atualizarCampo(
                    "fornecedor_cep",
                    valor
                  )
                }
                placeholder="00000-000"
              />

              <Campo
                label="Rua"
                value={
                  form.fornecedor_rua
                }
                onChange={(valor) =>
                  atualizarCampo(
                    "fornecedor_rua",
                    valor
                  )
                }
                placeholder="Nome da rua"
              />

              <Campo
                label="Número"
                value={
                  form.fornecedor_numero
                }
                onChange={(valor) =>
                  atualizarCampo(
                    "fornecedor_numero",
                    valor
                  )
                }
                placeholder="Número"
              />

              <Campo
                label="Bairro"
                value={
                  form.fornecedor_bairro
                }
                onChange={(valor) =>
                  atualizarCampo(
                    "fornecedor_bairro",
                    valor
                  )
                }
                placeholder="Bairro"
              />

              <Campo
                label="Cidade"
                value={
                  form.fornecedor_cidade
                }
                onChange={(valor) =>
                  atualizarCampo(
                    "fornecedor_cidade",
                    valor
                  )
                }
                placeholder="Cidade"
              />

              <Campo
                label="Estado"
                value={
                  form.fornecedor_estado
                }
                onChange={(valor) =>
                  atualizarCampo(
                    "fornecedor_estado",
                    valor
                  )
                }
                placeholder="SP"
              />
            </div>
          </section>

          {/* OBSERVAÇÕES */}

          <section className="rounded-2xl border border-grafite-claro bg-grafite p-5 md:p-7">
            <label className="mb-2 block text-sm font-medium text-texto-suave">
              Observações
            </label>

            <textarea
              value={
                form.observacoes
              }
              onChange={(e) =>
                atualizarCampo(
                  "observacoes",
                  e.target.value
                )
              }
              rows={4}
              placeholder="Informações adicionais sobre a compra ou a moto..."
              className="w-full resize-none rounded-xl border border-grafite-claro bg-preto px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-dourado"
            />
          </section>

          {/* AÇÕES */}

          <div className="flex flex-col gap-3 md:flex-row md:justify-end">
            <button
              type="button"
              disabled
              title="A procuração será ativada quando o modelo Word for configurado."
              className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-dourado px-6 py-3 font-semibold text-dourado opacity-40"
            >
              <FileSignature size={18} />
              Gerar Procuração
            </button>

            <button
              type="submit"
              disabled={salvando}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-dourado px-6 py-3 font-bold text-preto transition hover:bg-dourado-claro disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={18} />

              {salvando
                ? "Salvando..."
                : ehTroca
                  ? "Cadastrar Moto da Troca"
                  : ehEstoqueInicial
                    ? "Cadastrar no Estoque"
                    : "Registrar Compra"}
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
  onChange: (
    valor: string
  ) => void;
  placeholder?: string;
  type?: string;
  step?: string;
};

function Campo({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
  step,
}: CampoProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-texto-suave">
        {label}
      </label>

      <input
        type={type}
        step={step}
        min={
          type === "number"
            ? "0"
            : undefined
        }
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        placeholder={placeholder}
        className="w-full rounded-xl border border-grafite-claro bg-preto px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-dourado"
      />
    </div>
  );
}

type Opcao = {
  valor: string;
  nome: string;
};

type CampoSelectProps = {
  label: string;
  value: string;
  onChange: (
    valor: string
  ) => void;
  opcoes: Opcao[];
  disabled?: boolean;
};

function CampoSelect({
  label,
  value,
  onChange,
  opcoes,
  disabled = false,
}: CampoSelectProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-texto-suave">
        {label}
      </label>

      <select
        value={value}
        disabled={disabled}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        className="w-full rounded-xl border border-grafite-claro bg-preto px-4 py-3 text-white outline-none transition focus:border-dourado"
      >
        {opcoes.map(
          (opcao) => (
            <option
              key={
                opcao.valor ||
                "vazio"
              }
              value={
                opcao.valor
              }
            >
              {
                opcao.nome
              }
            </option>
          )
        )}
      </select>
    </div>
  );
}