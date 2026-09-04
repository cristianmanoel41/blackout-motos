"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  Bike,
  Building2,
  Search,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import CampoMoeda from "@/components/CampoMoeda";

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

/*
 * Só duas: o total gasto no dia e os funcionários. A loja
 * lança o dia fechado, sem abrir item por item - o que é de
 * moto tem lugar próprio e não entra aqui.
 */
const categoriasLoja = [
  "Gastos do dia",
  "Funcionários",
];

const categoriasMoto = [
  "Documentação",
  "Vistoria",
  "Mecânica",
  "Peças",
  "Mão de obra",
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
  return (
    <Suspense
      fallback={
        <div className="p-6 text-texto-suave">
          Carregando...
        </div>
      }
    >
      <FormularioNovaDespesa />
    </Suspense>
  );
}

function FormularioNovaDespesa() {
  const router = useRouter();
  const parametros = useSearchParams();
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

  /*
   * Chegando pela ficha da moto, a tela e so daquela moto:
   * nao faz sentido oferecer despesa da loja nem deixar
   * trocar de moto no meio do caminho.
   *
   * Vem da URL a cada render, e nao de um estado preenchido
   * depois, para os cartoes de escolha nao piscarem na tela
   * antes de sumir.
   */
  const motoFixada =
    parametros.get("moto") || "";

  const [erro, setErro] =
    useState("");

  const [salvando, setSalvando] =
    useState(false);

  const [
    dataInicioCaixa,
    setDataInicioCaixa,
  ] = useState("");

  const [
    modoGastoMoto,
    setModoGastoMoto,
  ] = useState<
    "simples" | "mecanica"
  >("simples");

  const [
    valorPecas,
    setValorPecas,
  ] = useState("");

  const [
    valorMaoObra,
    setValorMaoObra,
  ] = useState("");

  const [
    mecanicoOficina,
    setMecanicoOficina,
  ] = useState("");

  const [form, setForm] =
    useState({
      data: hoje(),
      categoria: "Aluguel",
      descricao: "",
      valor: "",
      forma_pagamento:
        "Pix",
      pago: true,
      data_pagamento: hoje(),
      observacoes: "",
    });

  useEffect(() => {
    async function carregarControleCaixa() {
      const {
        data,
        error,
      } = await supabase
        .from(
          "cash_control_settings"
        )
        .select("data_inicio")
        .eq("id", "principal")
        .maybeSingle();

      if (error) {
        console.error(
          "Não foi possível carregar a data de início do caixa:",
          error
        );
        return;
      }

      setDataInicioCaixa(
        data?.data_inicio || ""
      );
    }

    carregarControleCaixa();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const motoRecebida =
      parametros.get("moto") || "";

    if (motoRecebida) {
      setTipoLancamento("moto");
      setMotoId(motoRecebida);
      /* Categoria de loja nao serve para gasto de moto. */
      setForm((anterior) => ({
        ...anterior,
        categoria: "Documentação",
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setModoGastoMoto(
      "simples"
    );
    setValorPecas("");
    setValorMaoObra("");
    setMecanicoOficina("");

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

  const totalMecanica =
    (Number(valorPecas) || 0) +
    (Number(valorMaoObra) || 0);

  const dataEfetivaPagamento =
    form.data_pagamento ||
    form.data;

  /* Dia em que a saída deve aparecer no caixa. */
  const dataCaixaLancamento = () =>
    form.pago
      ? form.data_pagamento ||
        form.data
      : form.data;

  const confirmacaoLancamento = () =>
    form.pago
      ? form.data_pagamento ||
        form.data
      : null;

  const pagamentoAntesDoControle =
    Boolean(
      form.pago &&
        dataInicioCaixa &&
        dataEfetivaPagamento &&
        dataEfetivaPagamento <
          dataInicioCaixa
    );

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

    if (!pagamentoAntesDoControle) {
      const {
        error: caixaError,
      } = await supabase
        .from(
          "cash_transactions"
        )
        .insert({
          data:
            dataCaixaLancamento(),
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
          confirmado: form.pago,
          data_confirmacao:
            confirmacaoLancamento(),
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

    if (
      modoGastoMoto ===
      "mecanica"
    ) {
      const pecas =
        Number(valorPecas) || 0;

      const maoObra =
        Number(valorMaoObra) || 0;

      if (
        pecas <= 0 &&
        maoObra <= 0
      ) {
        throw new Error(
          "Informe o valor das peças ou da mão de obra."
        );
      }

      const descricaoServico =
        form.descricao.trim() ||
        "Serviço de mecânica";

      const observacao =
        form.observacoes.trim();

      const mecanico =
        mecanicoOficina.trim();

      const lancamentos: {
        motorcycle_id: string;
        data: string;
        categoria: string;
        descricao: string;
        forma_pagamento: string;
        valor: number;
      }[] = [];

      if (pecas > 0) {
        lancamentos.push({
          motorcycle_id:
            motoId,
          data: form.data,
          categoria: "Peças",
          descricao: [
            descricaoServico,
            "Peças",
            observacao
              ? `Obs.: ${observacao}`
              : "",
          ]
            .filter(Boolean)
            .join(" | "),
          forma_pagamento:
            form.forma_pagamento,
          valor: pecas,
        });
      }

      if (maoObra > 0) {
        lancamentos.push({
          motorcycle_id:
            motoId,
          data: form.data,
          categoria:
            "Mão de obra",
          descricao: [
            descricaoServico,
            mecanico
              ? `Mecânico/Oficina: ${mecanico}`
              : "Mão de obra",
            observacao
              ? `Obs.: ${observacao}`
              : "",
          ]
            .filter(Boolean)
            .join(" | "),
          forma_pagamento:
            form.forma_pagamento,
          valor: maoObra,
        });
      }

      const {
        data: gastos,
        error,
      } = await supabase
        .from(
          "motorcycle_expenses"
        )
        .insert(lancamentos)
        .select(
          "id, categoria, valor"
        );

      if (
        error ||
        !gastos ||
        gastos.length === 0
      ) {
        throw (
          error ||
          new Error(
            "Não foi possível registrar o serviço de mecânica."
          )
        );
      }

      if (!pagamentoAntesDoControle) {
        const saidasCaixa =
          gastos.map(
            (gasto: any) => ({
              data:
                dataCaixaLancamento(),
              tipo: "saida",
              origem: "gasto_moto",
              confirmado: form.pago,
              data_confirmacao:
                confirmacaoLancamento(),
              origem_id:
                gasto.id,
              valor: Number(
                gasto.valor
              ),
              descricao:
                `Gasto da moto - ${
                  descricaoMoto(
                    motoSelecionada
                  ) || "Moto"
                } - ${
                  gasto.categoria
                }${
                  gasto.categoria ===
                    "Mão de obra" &&
                  mecanico
                    ? ` - ${mecanico}`
                    : ""
                }`,
            })
          );

        const {
          error: caixaError,
        } = await supabase
          .from(
            "cash_transactions"
          )
          .insert(
            saidasCaixa
          );

        if (caixaError) {
          const ids =
            gastos.map(
              (gasto: any) =>
                gasto.id
            );

          await supabase
            .from(
              "motorcycle_expenses"
            )
            .delete()
            .in("id", ids);

          throw caixaError;
        }
      }

      return;
    }

    const descricaoBase =
      form.descricao.trim() ||
      form.categoria;

    const descricaoCompleta =
      form.observacoes.trim()
        ? `${descricaoBase} | Obs.: ${form.observacoes.trim()}`
        : descricaoBase;

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

    if (!pagamentoAntesDoControle) {
      const {
        error: caixaError,
      } = await supabase
        .from(
          "cash_transactions"
        )
        .insert({
          data:
            dataCaixaLancamento(),
          tipo: "saida",
          origem: "gasto_moto",
          confirmado: form.pago,
          data_confirmacao:
            confirmacaoLancamento(),
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
      !(
        tipoLancamento ===
          "moto" &&
        modoGastoMoto ===
          "mecanica"
      ) &&
      (
        !form.valor ||
        Number(form.valor) <= 0
      )
    ) {
      setErro(
        "Informe um valor válido."
      );
      return;
    }

    if (
      tipoLancamento ===
        "moto" &&
      modoGastoMoto ===
        "mecanica" &&
      totalMecanica <= 0
    ) {
      setErro(
        "Informe o valor das peças ou da mão de obra."
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
          {motoFixada
            ? "Novo Gasto da Moto"
            : "Novo Lançamento"}
        </h1>

        <p className="mt-1 text-sm text-texto-suave">
          {motoFixada
            ? "Peças, mão de obra, documentação e o que mais entrar no custo desta moto."
            : "Registre uma despesa da loja ou um gasto vinculado a uma moto."}
        </p>
      </div>

      {dataInicioCaixa && (
        <div className="mb-5 rounded-xl border border-dourado/30 bg-dourado/5 p-4 text-sm text-texto">
          <p className="font-semibold text-dourado">
            Controle financeiro iniciado em{" "}
            {new Date(
              `${dataInicioCaixa}T12:00:00`
            ).toLocaleDateString(
              "pt-BR"
            )}
          </p>

          <p className="mt-1 text-xs leading-5 text-texto-suave">
            Gastos pagos antes dessa data continuam entrando no custo da moto ou no histórico da loja, mas não criam uma nova saída no caixa atual.
          </p>
        </div>
      )}

      {pagamentoAntesDoControle && (
        <div className="mb-5 rounded-xl border border-blue-800 bg-blue-950/20 p-4 text-sm text-blue-200">
          <strong>
            Gasto histórico:
          </strong>{" "}
          este lançamento será salvo normalmente, porém não reduzirá o saldo atual do caixa.
        </div>
      )}

      {!motoFixada && (
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
      )}

      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-4 rounded-xl border border-grafite-claro bg-grafite p-5"
      >
        {tipoLancamento === "moto" &&
          motoFixada && (
          <div className="rounded-xl border border-dourado/30 bg-preto/30 p-4">
            <p className="text-xs text-texto-suave">
              Gasto desta moto
            </p>

            <p className="mt-1 font-semibold text-white">
              {motoSelecionada
                ? descricaoMoto(motoSelecionada)
                : "Carregando..."}
            </p>
          </div>
        )}

        {tipoLancamento === "moto" &&
          !motoFixada && (
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

        {tipoLancamento ===
          "moto" && (
          <div className="rounded-xl border border-grafite-claro bg-preto/20 p-4">
            <p className="mb-3 font-semibold text-dourado">
              Como deseja lançar o gasto?
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setModoGastoMoto(
                    "simples"
                  );
                  setErro("");
                }}
                className={`rounded-xl border p-4 text-left transition ${
                  modoGastoMoto ===
                  "simples"
                    ? "border-dourado bg-dourado/10"
                    : "border-grafite-claro bg-grafite"
                }`}
              >
                <p className="font-semibold text-white">
                  Gasto simples
                </p>

                <p className="mt-1 text-xs leading-5 text-texto-suave">
                  Pneu, óleo, documentação, lavagem, peça avulsa e outros gastos com um único valor.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setModoGastoMoto(
                    "mecanica"
                  );
                  setForm(
                    (anterior) => ({
                      ...anterior,
                      categoria:
                        "Mecânica",
                    })
                  );
                  setErro("");
                }}
                className={`rounded-xl border p-4 text-left transition ${
                  modoGastoMoto ===
                  "mecanica"
                    ? "border-dourado bg-dourado/10"
                    : "border-grafite-claro bg-grafite"
                }`}
              >
                <p className="font-semibold text-white">
                  Peças + mão de obra
                </p>

                <p className="mt-1 text-xs leading-5 text-texto-suave">
                  Separa automaticamente o valor das peças e o pagamento do mecânico sem duplicar a despesa.
                </p>
              </button>
            </div>
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

          {!(
            tipoLancamento ===
              "moto" &&
            modoGastoMoto ===
              "mecanica"
          ) ? (
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
          ) : (
            <div>
              <label
                className={
                  labelClass
                }
              >
                Tipo
              </label>

              <div className="flex min-h-[50px] items-center rounded-lg border border-dourado/30 bg-dourado/5 px-4 py-3 font-semibold text-dourado">
                Serviço de mecânica
              </div>
            </div>
          )}
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
                "moto" &&
              modoGastoMoto ===
                "mecanica"
                ? "Ex.: Revisão, troca de relação, serviço no motor..."
                : tipoLancamento ===
                  "moto"
                ? "Ex.: Troca do pneu traseiro"
                : "Ex.: Conta de energia de agosto"
            }
          />
        </div>

        {tipoLancamento ===
          "moto" &&
        modoGastoMoto ===
          "mecanica" ? (
          <div className="rounded-xl border border-dourado/30 bg-dourado/5 p-4">
            <div className="mb-4">
              <p className="font-semibold text-dourado">
                Separação do serviço
              </p>

              <p className="mt-1 text-xs leading-5 text-texto-suave">
                Preencha separado. O sistema salvará as peças e a mão de obra como dois custos da mesma moto.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  className={
                    labelClass
                  }
                >
                  Valor das peças (R$)
                </label>

                <CampoMoeda
                  value={
                    valorPecas
                  }
                  onChange={(valorDigitado) =>
                    setValorPecas(
                      valorDigitado
                    )
                  }
                  className={
                    inputClass
                  }
                  placeholder="0,00"
                />
              </div>

              <div>
                <label
                  className={
                    labelClass
                  }
                >
                  Mão de obra (R$)
                </label>

                <CampoMoeda
                  value={
                    valorMaoObra
                  }
                  onChange={(valorDigitado) =>
                    setValorMaoObra(
                      valorDigitado
                    )
                  }
                  className={
                    inputClass
                  }
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="mt-4">
              <label
                className={
                  labelClass
                }
              >
                Mecânico / Oficina
              </label>

              <input
                type="text"
                value={
                  mecanicoOficina
                }
                onChange={(e) =>
                  setMecanicoOficina(
                    e.target.value
                  )
                }
                className={
                  inputClass
                }
                placeholder="Ex.: João Mecânico, Oficina Silva..."
              />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-grafite-claro bg-preto/40 p-3">
                <p className="text-xs text-texto-suave">
                  Peças
                </p>
                <p className="mt-1 font-bold text-white">
                  {new Intl.NumberFormat(
                    "pt-BR",
                    {
                      style:
                        "currency",
                      currency:
                        "BRL",
                    }
                  ).format(
                    Number(
                      valorPecas
                    ) || 0
                  )}
                </p>
              </div>

              <div className="rounded-lg border border-grafite-claro bg-preto/40 p-3">
                <p className="text-xs text-texto-suave">
                  Mão de obra
                </p>
                <p className="mt-1 font-bold text-white">
                  {new Intl.NumberFormat(
                    "pt-BR",
                    {
                      style:
                        "currency",
                      currency:
                        "BRL",
                    }
                  ).format(
                    Number(
                      valorMaoObra
                    ) || 0
                  )}
                </p>
              </div>

              <div className="rounded-lg border border-dourado/40 bg-preto/40 p-3">
                <p className="text-xs text-texto-suave">
                  Total do serviço
                </p>
                <p className="mt-1 font-bold text-dourado">
                  {new Intl.NumberFormat(
                    "pt-BR",
                    {
                      style:
                        "currency",
                      currency:
                        "BRL",
                    }
                  ).format(
                    totalMecanica
                  )}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-green-900 bg-green-950/20 p-3 text-xs leading-5 text-green-300">
              A mão de obra ficará registrada como custo desta moto. Não lance o mesmo valor novamente em “Despesa da loja”.
            </div>
          </div>
        ) : (
          <div>
            <label
              className={
                labelClass
              }
            >
              Valor (R$) *
            </label>

            <CampoMoeda
              name="valor"
              value={
                form.valor
              }
              onChange={(valorDigitado) =>
                handleChange({
                  target: {
                    name: "valor",
                    value: valorDigitado,
                  },
                } as never)
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
