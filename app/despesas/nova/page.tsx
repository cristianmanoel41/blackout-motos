"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  Bike,
  Building2,
  Search,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type TipoLancamento =
  | "loja"
  | "moto";

type Moto = {
  id: string | number;
  codigo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  versao?: string | null;
  placa?: string | null;
  status?: string | null;
};

const categoriasLoja = [
  "Aluguel",
  "Água",
  "Energia",
  "Internet",
  "Funcionários",
  "Comissão",
  "Contador",
  "Impostos",
  "Anúncios",
  "Combustível",
  "Materiais",
  "Manutenção",
  "Alimentação",
  "Outros",
];

const categoriasMoto = [
  "Documentação",
  "Vistoria",
  "Mecânica",
  "Peças",
  "Pneu",
  "Óleo",
  "Revisão",
  "Elétrica",
  "Funilaria / Pintura",
  "Lavagem / Estética",
  "Transporte",
  "Combustível",
  "Outros",
];

function hoje() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function normalizar(valor: unknown) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim();
}

function descricaoMoto(
  moto?: Moto | null
) {
  if (!moto) {
    return "";
  }

  const nome = [
    moto.codigo,
    moto.marca,
    moto.modelo,
    moto.versao,
  ]
    .filter(Boolean)
    .join(" - ");

  return `${nome}${
    moto.placa
      ? ` - ${moto.placa}`
      : ""
  }`;
}

export default function NovaDespesaPage() {
  const router = useRouter();
  const supabase = createClient();

  const [
    tipoLancamento,
    setTipoLancamento,
  ] =
    useState<TipoLancamento>(
      "loja"
    );

  const [motos, setMotos] =
    useState<Moto[]>([]);

  const [
    carregandoMotos,
    setCarregandoMotos,
  ] = useState(false);

  const [
    buscaMoto,
    setBuscaMoto,
  ] = useState("");

  const [motoId, setMotoId] =
    useState("");

  const [erro, setErro] =
    useState("");

  const [salvando, setSalvando] =
    useState(false);

  const [form, setForm] =
    useState({
      data: hoje(),
      categoria: "Aluguel",
      descricao: "",
      valor: "",
      forma_pagamento:
        "Dinheiro",
      pago: true,
      data_pagamento: hoje(),
      observacoes: "",
    });

  useEffect(() => {
    async function carregarMotos() {
      setCarregandoMotos(true);

      const {
        data,
        error,
      } = await supabase
        .from("motorcycles")
        .select(
          "id, codigo, marca, modelo, versao, placa, status"
        )
        .order("codigo", {
          ascending: true,
        });

      if (error) {
        console.error(error);
        setErro(
          "Não foi possível carregar as motos cadastradas."
        );
        setCarregandoMotos(false);
        return;
      }

      setMotos(
        (data ||
          []) as unknown as Moto[]
      );

      setCarregandoMotos(false);
    }

    carregarMotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const motosFiltradas =
    useMemo(() => {
      const termos =
        normalizar(buscaMoto)
          .split(/\s+/)
          .filter(Boolean);

      if (
        termos.length === 0
      ) {
        return motos;
      }

      return motos.filter(
        (moto) => {
          const texto =
            normalizar(
              [
                moto.codigo,
                moto.marca,
                moto.modelo,
                moto.versao,
                moto.placa,
              ]
                .filter(Boolean)
                .join(" ")
            );

          return termos.every(
            (termo) =>
              texto.includes(
                termo
              )
          );
        }
      );
    }, [motos, buscaMoto]);

  const motoSelecionada =
    useMemo(
      () =>
        motos.find(
          (moto) =>
            String(moto.id) ===
            String(motoId)
        ) || null,
      [motos, motoId]
    );

  function mudarTipo(
    tipo: TipoLancamento
  ) {
    setTipoLancamento(tipo);
    setErro("");
    setMotoId("");
    setBuscaMoto("");

    setForm(
      (anterior) => ({
        ...anterior,
        categoria:
          tipo === "loja"
            ? "Aluguel"
            : "Documentação",
      })
    );
  }

  function handleChange(
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLSelectElement>
      | React.ChangeEvent<HTMLTextAreaElement>
  ) {
    const {
      name,
      value,
      type,
    } = e.target;

    const checked = (
      e.target as HTMLInputElement
    ).checked;

    setForm((anterior) => ({
      ...anterior,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  }

  async function salvarDespesaLoja() {
    const {
      data: despesa,
      error,
    } = await supabase
      .from("store_expenses")
      .insert({
        data: form.data,
        categoria:
          form.categoria,
        descricao:
          form.descricao.trim() ||
          null,
        valor: Number(
          form.valor
        ),
        forma_pagamento:
          form.forma_pagamento,
        pago: form.pago,
        data_pagamento:
          form.pago
            ? form.data_pagamento
            : null,
        observacoes:
          form.observacoes.trim() ||
          null,
      })
      .select("id")
      .single();

    if (error || !despesa) {
      throw (
        error ||
        new Error(
          "Não foi possível registrar a despesa."
        )
      );
    }

    if (form.pago) {
      const {
        error: caixaError,
      } = await supabase
        .from(
          "cash_transactions"
        )
        .insert({
          data:
            form.data_pagamento ||
            form.data,
          tipo: "saida",
          origem:
            "despesa_loja",
          origem_id:
            despesa.id,
          valor: Number(
            form.valor
          ),
          descricao: `${
            form.categoria
          } - ${
            form.descricao.trim() ||
            "Despesa da loja"
          }`,
        });

      if (caixaError) {
        await supabase
          .from(
            "store_expenses"
          )
          .delete()
          .eq(
            "id",
            despesa.id
          );

        throw caixaError;
      }
    }
  }

  async function salvarGastoMoto() {
    if (!motoId) {
      throw new Error(
        "Selecione a moto do gasto."
      );
    }

    const descricaoBase =
      form.descricao.trim() ||
      form.categoria;

    const descricaoCompleta =
      form.observacoes.trim()
        ? `${descricaoBase} | Obs.: ${form.observacoes.trim()}`
        : descricaoBase;

    /*
     * A tabela motorcycle_expenses já é usada
     * pelo sistema para compor o custo real
     * da moto e o lucro da venda.
     */
    const {
      data: gasto,
      error,
    } = await supabase
      .from(
        "motorcycle_expenses"
      )
      .insert({
        motorcycle_id:
          motoId,
        data: form.data,
        categoria:
          form.categoria,
        descricao:
          descricaoCompleta,
        forma_pagamento:
          form.forma_pagamento,
        valor: Number(
          form.valor
        ),
      })
      .select("id")
      .single();

    if (error || !gasto) {
      throw (
        error ||
        new Error(
          "Não foi possível registrar o gasto da moto."
        )
      );
    }

    /*
     * Se já foi pago, também registra
     * a saída de dinheiro no caixa.
     *
     * "outro" já é uma origem utilizada
     * pelo sistema para saídas operacionais
     * que não são venda/despesa da loja.
     */
    if (form.pago) {
      const {
        error: caixaError,
      } = await supabase
        .from(
          "cash_transactions"
        )
        .insert({
          data:
            form.data_pagamento ||
            form.data,
          tipo: "saida",
          origem: "outro",
          origem_id:
            gasto.id,
          valor: Number(
            form.valor
          ),
          descricao:
            `Gasto da moto - ${
              descricaoMoto(
                motoSelecionada
              ) ||
              "Moto"
            } - ${
              form.categoria
            }`,
        });

      if (caixaError) {
        await supabase
          .from(
            "motorcycle_expenses"
          )
          .delete()
          .eq(
            "id",
            gasto.id
          );

        throw caixaError;
      }
    }
  }

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();
    setErro("");

    if (
      !form.data
    ) {
      setErro(
        "Informe a data do lançamento."
      );
      return;
    }

    if (
      !form.valor ||
      Number(form.valor) <= 0
    ) {
      setErro(
        "Informe um valor válido."
      );
      return;
    }

    if (
      tipoLancamento ===
        "moto" &&
      !motoId
    ) {
      setErro(
        "Selecione a moto do gasto."
      );
      return;
    }

    if (
      form.pago &&
      !form.data_pagamento
    ) {
      setErro(
        "Informe a data do pagamento."
      );
      return;
    }

    setSalvando(true);

    try {
      if (
        tipoLancamento ===
        "loja"
      ) {
        await salvarDespesaLoja();
      } else {
        await salvarGastoMoto();
      }

      if (
        tipoLancamento ===
        "moto"
      ) {
        router.push(
          "/gastos"
        );
      } else {
        router.push(
          "/despesas"
        );
      }

      router.refresh();
    } catch (error: any) {
      console.error(error);

      const mensagem = [
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
        mensagem ||
          "Erro ao registrar o lançamento."
      );
    } finally {
      setSalvando(false);
    }
  }

  const categorias =
    tipoLancamento === "loja"
      ? categoriasLoja
      : categoriasMoto;

  const inputClass =
    "w-full rounded-lg bg-grafite-claro border border-grafite-claro text-texto px-4 py-3 outline-none focus:border-dourado transition";

  const labelClass =
    "block text-sm font-medium text-texto mb-1";

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dourado">
          Novo Lançamento
        </h1>

        <p className="mt-1 text-sm text-texto-suave">
          Registre uma despesa da loja ou um gasto vinculado a uma moto.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() =>
            mudarTipo("loja")
          }
          className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
            tipoLancamento ===
            "loja"
              ? "border-dourado bg-dourado/10 text-dourado"
              : "border-grafite-claro bg-grafite text-texto hover:border-dourado/50"
          }`}
        >
          <Building2
            size={22}
          />

          <div>
            <p className="font-semibold">
              Despesa da loja
            </p>

            <p className="mt-1 text-xs text-texto-suave">
              Aluguel, energia, internet, funcionários e outros.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            mudarTipo("moto")
          }
          className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
            tipoLancamento ===
            "moto"
              ? "border-dourado bg-dourado/10 text-dourado"
              : "border-grafite-claro bg-grafite text-texto hover:border-dourado/50"
          }`}
        >
          <Bike size={22} />

          <div>
            <p className="font-semibold">
              Gasto de uma moto
            </p>

            <p className="mt-1 text-xs text-texto-suave">
              Peças, revisão, documentação, pneu, óleo e outros.
            </p>
          </div>
        </button>
      </div>

      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-4 rounded-xl border border-grafite-claro bg-grafite p-5"
      >
        {tipoLancamento ===
          "moto" && (
          <div className="rounded-xl border border-dourado/30 bg-preto/30 p-4">
            <p className="mb-3 font-semibold text-dourado">
              Moto do gasto
            </p>

            <div className="relative mb-3">
              <Search
                size={17}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-texto-suave"
              />

              <input
                type="text"
                value={
                  buscaMoto
                }
                onChange={(e) =>
                  setBuscaMoto(
                    e.target.value
                  )
                }
                placeholder="Buscar por código, marca, modelo ou placa..."
                className={`${inputClass} pl-11`}
              />
            </div>

            <select
              value={motoId}
              onChange={(e) =>
                setMotoId(
                  e.target.value
                )
              }
              className={
                inputClass
              }
              disabled={
                carregandoMotos
              }
            >
              <option value="">
                {carregandoMotos
                  ? "Carregando motos..."
                  : "Selecione a moto"}
              </option>

              {motosFiltradas.map(
                (moto) => (
                  <option
                    key={String(
                      moto.id
                    )}
                    value={String(
                      moto.id
                    )}
                  >
                    {descricaoMoto(
                      moto
                    )}
                    {moto.status
                      ? ` (${moto.status})`
                      : ""}
                  </option>
                )
              )}
            </select>

            {motoSelecionada && (
              <div className="mt-3 rounded-lg border border-grafite-claro bg-grafite-claro/40 px-4 py-3">
                <p className="text-xs text-texto-suave">
                  Moto selecionada
                </p>

                <p className="mt-1 font-semibold text-white">
                  {descricaoMoto(
                    motoSelecionada
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              className={
                labelClass
              }
            >
              Data
            </label>

            <input
              type="date"
              name="data"
              value={form.data}
              onChange={
                handleChange
              }
              className={
                inputClass
              }
            />
          </div>

          <div>
            <label
              className={
                labelClass
              }
            >
              Categoria
            </label>

            <select
              name="categoria"
              value={
                form.categoria
              }
              onChange={
                handleChange
              }
              className={
                inputClass
              }
            >
              {categorias.map(
                (categoria) => (
                  <option
                    key={
                      categoria
                    }
                    value={
                      categoria
                    }
                  >
                    {categoria}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        <div>
          <label
            className={
              labelClass
            }
          >
            Descrição
          </label>

          <input
            name="descricao"
            value={
              form.descricao
            }
            onChange={
              handleChange
            }
            className={
              inputClass
            }
            placeholder={
              tipoLancamento ===
              "moto"
                ? "Ex.: Troca do pneu traseiro"
                : "Ex.: Conta de energia de agosto"
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              className={
                labelClass
              }
            >
              Valor (R$) *
            </label>

            <input
              type="number"
              step="0.01"
              min="0"
              name="valor"
              value={
                form.valor
              }
              onChange={
                handleChange
              }
              className={
                inputClass
              }
            />
          </div>

          <div>
            <label
              className={
                labelClass
              }
            >
              Forma de pagamento
            </label>

            <select
              name="forma_pagamento"
              value={
                form.forma_pagamento
              }
              onChange={
                handleChange
              }
              className={
                inputClass
              }
            >
              <option>
                Dinheiro
              </option>
              <option>
                Pix
              </option>
              <option>
                Cartão
              </option>
              <option>
                Transferência
              </option>
              <option>
                Boleto
              </option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="pago"
            checked={
              form.pago
            }
            onChange={
              handleChange
            }
            className="h-4 w-4 accent-yellow-500"
          />

          <label className="text-sm text-texto">
            Já foi pago
          </label>
        </div>

        {form.pago && (
          <div>
            <label
              className={
                labelClass
              }
            >
              Data do pagamento
            </label>

            <input
              type="date"
              name="data_pagamento"
              value={
                form.data_pagamento
              }
              onChange={
                handleChange
              }
              className={
                inputClass
              }
            />
          </div>
        )}

        <div>
          <label
            className={
              labelClass
            }
          >
            Observações
          </label>

          <textarea
            name="observacoes"
            value={
              form.observacoes
            }
            onChange={
              handleChange
            }
            className={
              inputClass
            }
            rows={2}
          />
        </div>

        {erro && (
          <div className="rounded-lg border border-red-700 bg-red-950 px-4 py-3 text-sm text-red-300">
            {erro}
          </div>
        )}

        <button
          type="submit"
          disabled={
            salvando
          }
          className="rounded-lg bg-dourado px-8 py-3 font-semibold text-preto transition hover:bg-dourado-claro disabled:opacity-60"
        >
          {salvando
            ? "Salvando..."
            : tipoLancamento ===
                "moto"
              ? "Registrar Gasto da Moto"
              : "Registrar Despesa"}
        </button>
      </form>
    </div>
  );
}
