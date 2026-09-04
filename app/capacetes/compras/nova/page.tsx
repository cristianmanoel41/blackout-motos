"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CampoPagamentoFeito from "@/components/CampoPagamentoFeito";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import { Plus, Receipt, Trash2 } from "lucide-react";
import CampoMoeda from "@/components/CampoMoeda";

const supabase = createClient();

type Modelo = {
  id: string;
  produto: string;
  marca: string;
  modelo: string;
  cor: string;
  tamanho: string;
  preco_venda_padrao: number;
  custo_medio: number;
  estoque_atual: number;
};

type ItemNota = {
  idLocal: string;
  modeloId: string;
  novoProduto: string;
  novoMarca: string;
  novoModelo: string;
  novoCor: string;
  novoTamanho: string;
  novoPrecoVenda: string;
  quantidade: string;
  custoUnitario: string;
};

function hoje() {
  const data = new Date();
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function novoIdLocal() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function itemVazio(): ItemNota {
  return {
    idLocal: novoIdLocal(),
    modeloId: "",
    novoProduto: "Capacete",
    novoMarca: "",
    novoModelo: "",
    novoCor: "",
    novoTamanho: "",
    novoPrecoVenda: "",
    quantidade: "1",
    custoUnitario: "",
  };
}

export default function NovaNotaCapacetesPage() {
  const router = useRouter();

  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [dataCompra, setDataCompra] = useState(hoje());
  const [numeroNota, setNumeroNota] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [lancarCaixa, setLancarCaixa] = useState(true);

  /*
   * Nota de capacete costuma ser paga depois. Quando ainda não
   * foi, a saída entra pendente no caixa em vez de sumir.
   */
  const [previsaoNota, setPrevisaoNota] = useState(hoje());
  const [observacoes, setObservacoes] = useState("");

  const [itens, setItens] = useState<ItemNota[]>([itemVazio()]);

  useEffect(() => {
    carregarModelos();
  }, []);

  async function carregarModelos() {
    setCarregando(true);

    const { data, error } = await supabase
      .from("helmet_models")
      .select(
        "id, produto, marca, modelo, cor, tamanho, preco_venda_padrao, custo_medio, estoque_atual"
      )
      .order("marca", { ascending: true })
      .order("modelo", { ascending: true })
      .order("tamanho", { ascending: true });

    if (error) {
      setErro(
        `Não foi possível carregar os modelos: ${error.message}`
      );
      setCarregando(false);
      return;
    }

    setModelos((data as Modelo[]) || []);
    setCarregando(false);
  }

  const total = useMemo(() => {
    return itens.reduce(
      (soma, item) =>
        soma +
        (Number(item.quantidade) || 0) *
          (Number(item.custoUnitario) || 0),
      0
    );
  }, [itens]);

  const quantidadeTotal = useMemo(() => {
    return itens.reduce(
      (soma, item) => soma + (Number(item.quantidade) || 0),
      0
    );
  }, [itens]);

  function alterarItem(
    idLocal: string,
    campo: keyof ItemNota,
    valor: string
  ) {
    setItens((atuais) =>
      atuais.map((item) =>
        item.idLocal === idLocal
          ? { ...item, [campo]: valor }
          : item
      )
    );
  }

  function removerItem(idLocal: string) {
    setItens((atuais) =>
      atuais.length === 1
        ? atuais
        : atuais.filter((item) => item.idLocal !== idLocal)
    );
  }

  async function salvar(event: FormEvent) {
    event.preventDefault();
    setErro("");

    if (!dataCompra) {
      setErro("Informe a data da nota.");
      return;
    }

    for (const item of itens) {
      const quantidade = Number(item.quantidade) || 0;
      const custo = Number(item.custoUnitario) || 0;

      if (item.modeloId === "novo") {
        if (!item.novoMarca.trim() || !item.novoModelo.trim()) {
          setErro(
            "Preencha a marca e o modelo dos capacetes novos."
          );
          return;
        }
      } else if (!item.modeloId) {
        setErro("Escolha o capacete de cada item da nota.");
        return;
      }

      if (quantidade <= 0) {
        setErro("A quantidade de cada item precisa ser maior que zero.");
        return;
      }

      if (custo <= 0) {
        setErro("Informe o custo unitário de cada item da nota.");
        return;
      }
    }

    setSalvando(true);

    let notaId = "";

    try {
      /*
       * 1. Cria os modelos que ainda não existem.
       */
      const itensResolvidos: {
        modeloId: string;
        quantidade: number;
        custo: number;
      }[] = [];

      for (const item of itens) {
        let modeloId = item.modeloId;

        if (modeloId === "novo") {
          const { data: criado, error: erroModelo } =
            await supabase
              .from("helmet_models")
              .insert({
                produto:
                  item.novoProduto.trim() || "Capacete",
                marca: item.novoMarca.trim(),
                modelo: item.novoModelo.trim(),
                cor:
                  item.novoCor.trim() || "Não informada",
                tamanho: item.novoTamanho.trim() || "Único",
                preco_venda_padrao:
                  Number(item.novoPrecoVenda) || 0,
              })
              .select("id")
              .single();

          if (erroModelo || !criado) {
            throw (
              erroModelo ||
              new Error("Falha ao cadastrar o capacete novo.")
            );
          }

          modeloId = criado.id;
        }

        itensResolvidos.push({
          modeloId,
          quantidade: Number(item.quantidade) || 0,
          custo: Number(item.custoUnitario) || 0,
        });
      }

      /*
       * 2. Cabeçalho da nota.
       */
      const { data: nota, error: erroNota } = await supabase
        .from("helmet_purchases")
        .insert({
          data_compra: dataCompra,
          numero_nota: numeroNota.trim() || null,
          fornecedor: fornecedor.trim() || null,
          valor_total: total,
          lancar_caixa: lancarCaixa,
          observacoes: observacoes.trim() || null,
        })
        .select("id")
        .single();

      if (erroNota || !nota) {
        throw erroNota || new Error("Falha ao salvar a nota.");
      }

      notaId = nota.id;

      /*
       * 3. Itens (o estoque e o custo médio são
       *    atualizados automaticamente pelo banco).
       */
      const { error: erroItens } = await supabase
        .from("helmet_purchase_items")
        .insert(
          itensResolvidos.map((item) => ({
            purchase_id: nota.id,
            helmet_model_id: item.modeloId,
            quantidade: item.quantidade,
            custo_unitario: item.custo,
          }))
        );

      if (erroItens) throw erroItens;

      /*
       * 4. Saída no caixa.
       */
      if (total > 0) {
        const { error: erroCaixa } = await supabase
          .from("cash_transactions")
          .insert({
            data: lancarCaixa
              ? dataCompra
              : previsaoNota,
            tipo: "saida",
            origem: "compra_capacete",
            origem_id: nota.id,
            valor: total,
            descricao: `Compra de capacetes${
              numeroNota.trim() ? ` - NF ${numeroNota.trim()}` : ""
            }${fornecedor.trim() ? ` - ${fornecedor.trim()}` : ""}`,
            confirmado: lancarCaixa,
            data_confirmacao: lancarCaixa
              ? dataCompra
              : null,
          });

        if (erroCaixa) throw erroCaixa;
      }

      router.push("/capacetes/compras");
      router.refresh();
    } catch (error: any) {
      console.error(error);

      if (notaId) {
        await supabase
          .from("helmet_purchases")
          .delete()
          .eq("id", notaId);
      }

      setErro(
        [error?.message, error?.details, error?.hint]
          .filter(Boolean)
          .join(" | ") || "Não foi possível salvar a nota."
      );

      setSalvando(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-grafite-claro bg-grafite-claro px-4 py-3 text-texto outline-none transition focus:border-dourado";

  const labelClass = "mb-1 block text-sm font-medium text-texto";

  return (
    <div className="w-full max-w-4xl">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-dourado">
          <Receipt size={24} />
          Nota de Compra de Capacetes
        </h1>

        <p className="mt-1 text-sm text-texto-suave">
          Lance a nota fiscal do fornecedor. O estoque e o custo
          médio de cada modelo são atualizados sozinhos.
        </p>
      </div>

      <form
        onSubmit={salvar}
        className="space-y-6 rounded-xl border border-grafite-claro bg-grafite p-5"
      >
        {/* CABEÇALHO DA NOTA */}

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Data da nota *</label>

            <input
              type="date"
              value={dataCompra}
              onChange={(e) => setDataCompra(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Número da nota</label>

            <input
              value={numeroNota}
              onChange={(e) => setNumeroNota(e.target.value)}
              placeholder="Ex.: 12345"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Fornecedor</label>

            <input
              value={fornecedor}
              onChange={(e) => setFornecedor(e.target.value)}
              placeholder="Ex.: Distribuidora Pro Tork"
              className={inputClass}
            />
          </div>
        </div>

        {/* ITENS */}

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-dourado">
              Itens da nota
            </h2>

            <button
              type="button"
              onClick={() =>
                setItens((atuais) => [...atuais, itemVazio()])
              }
              className="flex items-center gap-2 rounded-lg border border-grafite-claro px-3 py-2 text-sm font-semibold text-texto transition hover:border-dourado hover:text-dourado"
            >
              <Plus size={16} />
              Adicionar item
            </button>
          </div>

          {carregando && (
            <p className="text-sm text-texto-suave">
              Carregando capacetes cadastrados...
            </p>
          )}

          <div className="space-y-3">
            {itens.map((item, indice) => {
              const modelo = modelos.find(
                (m) => m.id === item.modeloId
              );

              const subtotal =
                (Number(item.quantidade) || 0) *
                (Number(item.custoUnitario) || 0);

              return (
                <div
                  key={item.idLocal}
                  className="rounded-xl border border-grafite-claro bg-preto/40 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-texto-suave">
                      Item {indice + 1}
                    </span>

                    {itens.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removerItem(item.idLocal)}
                        className="rounded-lg p-2 text-red-300 transition hover:bg-red-950/40"
                        aria-label="Remover item"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className={labelClass}>
                        Capacete *
                      </label>

                      <select
                        value={item.modeloId}
                        onChange={(e) =>
                          alterarItem(
                            item.idLocal,
                            "modeloId",
                            e.target.value
                          )
                        }
                        className={inputClass}
                      >
                        <option value="">Selecione</option>

                        {modelos.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.produto} {m.marca} {m.modelo} ·{" "}
                            {m.cor} · {m.tamanho} · estoque{" "}
                            {m.estoque_atual}
                          </option>
                        ))}

                        <option value="novo">
                          + Cadastrar capacete novo
                        </option>
                      </select>
                    </div>

                    {item.modeloId === "novo" && (
                      <>
                        <div>
                          <label className={labelClass}>
                            Produto
                          </label>

                          <input
                            value={item.novoProduto}
                            onChange={(e) =>
                              alterarItem(
                                item.idLocal,
                                "novoProduto",
                                e.target.value
                              )
                            }
                            placeholder="Capacete"
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label className={labelClass}>
                            Marca *
                          </label>

                          <input
                            value={item.novoMarca}
                            onChange={(e) =>
                              alterarItem(
                                item.idLocal,
                                "novoMarca",
                                e.target.value
                              )
                            }
                            placeholder="Ex.: Pro Tork"
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label className={labelClass}>
                            Modelo *
                          </label>

                          <input
                            value={item.novoModelo}
                            onChange={(e) =>
                              alterarItem(
                                item.idLocal,
                                "novoModelo",
                                e.target.value
                              )
                            }
                            placeholder="Ex.: New Liberty Four"
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label className={labelClass}>Cor</label>

                          <input
                            value={item.novoCor}
                            onChange={(e) =>
                              alterarItem(
                                item.idLocal,
                                "novoCor",
                                e.target.value
                              )
                            }
                            placeholder="Ex.: Preto"
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label className={labelClass}>
                            Tamanho
                          </label>

                          <input
                            value={item.novoTamanho}
                            onChange={(e) =>
                              alterarItem(
                                item.idLocal,
                                "novoTamanho",
                                e.target.value
                              )
                            }
                            placeholder="Ex.: 58"
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label className={labelClass}>
                            Valor padrão de venda (R$)
                          </label>

                          <CampoMoeda
                            value={item.novoPrecoVenda}
                            onChange={(valorDigitado) =>
                              alterarItem(
                                item.idLocal,
                                "novoPrecoVenda",
                                valorDigitado
                              )
                            }
                            placeholder="0,00"
                            className={inputClass}
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label className={labelClass}>
                        Quantidade *
                      </label>

                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantidade}
                        onChange={(e) =>
                          alterarItem(
                            item.idLocal,
                            "quantidade",
                            e.target.value
                          )
                        }
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>
                        Custo unitário (R$) *
                      </label>

                      <CampoMoeda
                        value={item.custoUnitario}
                        onChange={(valorDigitado) =>
                          alterarItem(
                            item.idLocal,
                            "custoUnitario",
                            valorDigitado
                          )
                        }
                        placeholder="0,00"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-texto-suave">
                      Subtotal do item
                    </span>

                    <span className="font-semibold text-dourado">
                      {formatarMoeda(subtotal)}
                    </span>
                  </div>

                  {modelo && (
                    <p className="mt-2 text-xs text-texto-suave">
                      Custo médio atual{" "}
                      {formatarMoeda(modelo.custo_medio)} · valor
                      padrão de venda{" "}
                      {formatarMoeda(modelo.preco_venda_padrao)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* TOTAIS */}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-grafite-claro bg-preto/40 p-4">
            <p className="text-xs text-texto-suave">
              Capacetes na nota
            </p>

            <p className="mt-1 text-2xl font-bold text-texto">
              {quantidadeTotal}
            </p>
          </div>

          <div className="rounded-xl border border-grafite-claro bg-preto/40 p-4">
            <p className="text-xs text-texto-suave">
              Total da nota
            </p>

            <p className="mt-1 text-2xl font-bold text-dourado">
              {formatarMoeda(total)}
            </p>
          </div>
        </div>

        <CampoPagamentoFeito
          titulo="Esta nota já foi paga?"
          pago={lancarCaixa}
          aoMudarPago={setLancarCaixa}
          dataPrevista={previsaoNota}
          aoMudarDataPrevista={setPrevisaoNota}
          rotuloPago="Já paguei"
          rotuloPendente="Ainda vou pagar"
          ajudaPendente="A saída fica pendente no caixa até você dar baixa."
        />

        <div>
          <label className={labelClass}>Observações</label>

          <textarea
            rows={2}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            className={inputClass}
          />
        </div>

        {erro && (
          <div className="rounded-lg border border-red-700 bg-red-950 px-4 py-3 text-sm text-red-300">
            {erro}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={salvando}
            className="rounded-lg bg-dourado px-8 py-3 font-semibold text-preto transition hover:bg-dourado-claro disabled:opacity-60"
          >
            {salvando ? "Salvando..." : "Salvar Nota"}
          </button>

          <Link
            href="/capacetes"
            className="rounded-lg border border-grafite-claro px-8 py-3 font-semibold text-texto-suave transition hover:text-texto"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
