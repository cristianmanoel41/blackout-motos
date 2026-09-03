"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import { OPERADORA_CARTAO } from "@/lib/dados/financeiras";
import {
  CUSTOS_PADRAO_VENDA,
  TOTAL_PADRAO_VENDA,
  empresaDoTipo,
  valorPadraoDoTipo,
} from "@/lib/dados/documentacao";

const supabase = createClient();

/*
 * O cliente entrega um valor para a loja cuidar da
 * documentacao. Esse dinheiro nao e lucro: ele existe para
 * pagar estes custos. O que sobrar e que e da loja.
 */
const tiposCustoDocumentacao = [
  {
    chave: "vistoria",
    nome: "Vistoria de transferência",
  },
  { chave: "taxas", nome: "Emissão de recibo" },
  { chave: "detran", nome: "Taxas do Detran" },
  {
    chave: "despachante",
    nome: "Entrada na documentação",
  },
  { chave: "outros", nome: "Outros custos" },
];

function nomeTipoCusto(chave: string) {
  return (
    tiposCustoDocumentacao.find(
      (item) => item.chave === chave
    )?.nome || chave
  );
}

const formasPagamento = [
  "Pix",
  "Dinheiro",
  "Transferência",
  "Cartão",
  "Financiamento",
];

function moeda(valor: number) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  ).format(valor || 0);
}

export default function EditarVendaPage() {
  const params = useParams();
  const router = useRouter();

  const id = params.id as string;

  const [carregando, setCarregando] =
    useState(true);

  const [salvando, setSalvando] =
    useState(false);

  const [excluindo, setExcluindo] =
    useState(false);

  const [erro, setErro] =
    useState("");

  const [mensagem, setMensagem] =
    useState("");

  const [dataVenda, setDataVenda] =
    useState("");

  const [horaVenda, setHoraVenda] =
    useState("");

  const [cliente, setCliente] =
    useState("");

  const [telefone, setTelefone] =
    useState("");

  const [vendedor, setVendedor] =
    useState("");

  const [
    formaPagamento,
    setFormaPagamento,
  ] = useState("");

  const [valorVenda, setValorVenda] =
    useState("");

  const [entrada, setEntrada] =
    useState("");

  const [banco, setBanco] =
    useState("");

  const [
    transferenciaCliente,
    setTransferenciaCliente,
  ] = useState("");

  const [
    transferenciaLoja,
    setTransferenciaLoja,
  ] = useState("");

  const [
    observacoes,
    setObservacoes,
  ] = useState("");

  const [motoNome, setMotoNome] =
    useState("");

  const [motorcycleId, setMotorcycleId] =
    useState("");

  const [
    capacetesVinculados,
    setCapacetesVinculados,
  ] = useState<any[]>([]);

  /*
   * Composicao do pagamento: pix, dinheiro, cartao, moto na
   * troca. Ficava so na criacao da venda; se o cliente
   * trocasse a forma depois, nao havia onde corrigir.
   */
  const [componentes, setComponentes] =
    useState<any[]>([]);

  /* Custos da documentação desta venda. */
  const [custosDoc, setCustosDoc] =
    useState<any[]>([]);

  const [docConcluida, setDocConcluida] =
    useState(false);

  /*
   * Quanto desta venda ja caiu na conta e quanto ainda vai
   * cair. Vem dos lancamentos do caixa, nao do que foi
   * combinado - o combinado esta nos campos da venda.
   */
  const [caixaDaVenda, setCaixaDaVenda] = useState({
    confirmado: 0,
    pendente: 0,
  });

  const [novoCusto, setNovoCusto] = useState({
    tipo: "vistoria",
    descricao: "",
    valor: "",
    data: "",
  });

  const ehFinanciamento =
    formaPagamento ===
    "Financiamento";

  const valorFinanciado =
    useMemo(() => {
      if (!ehFinanciamento) {
        return 0;
      }

      const venda =
        Number(valorVenda) || 0;

      const valorEntrada =
        Number(entrada) || 0;

      return Math.max(
        venda - valorEntrada,
        0
      );
    }, [
      valorVenda,
      entrada,
      ehFinanciamento,
    ]);


  const totalCapacetesVinculados =
    useMemo(() => {
      return capacetesVinculados.reduce(
        (total, item) =>
          total +
          Number(
            item.valor_recebido || 0
          ),
        0
      );
    }, [capacetesVinculados]);

  const totalCapacetesJaIncluidos =
    useMemo(() => {
      return capacetesVinculados
        .filter(
          (item) =>
            item.ja_incluido_na_venda
        )
        .reduce(
          (total, item) =>
            total +
            Number(
              item.valor_recebido ||
                0
            ),
          0
        );
    }, [capacetesVinculados]);

  const totalCapacetesRecebidosDepois =
    useMemo(() => {
      return capacetesVinculados
        .filter(
          (item) =>
            !item.ja_incluido_na_venda
        )
        .reduce(
          (total, item) =>
            total +
            Number(
              item.valor_recebido ||
                0
            ),
          0
        );
    }, [capacetesVinculados]);

  const totalComponentes =
    useMemo(() => {
      return componentes.reduce(
        (total, item) =>
          total +
          (Number(item.valor) || 0),
        0
      );
    }, [componentes]);

  /* Quanto vai para cada empresa. */
  const custosPorEmpresa = useMemo(() => {
    const mapa: Record<string, number> = {};

    custosDoc.forEach((item) => {
      const empresa = empresaDoTipo(item.tipo);

      mapa[empresa] =
        (mapa[empresa] || 0) +
        (Number(item.valor) || 0);
    });

    return mapa;
  }, [custosDoc]);

  /*
   * Dinheiro que entra na conta por causa desta moto. A
   * moto na troca fica de fora: ela e mercadoria, nao
   * dinheiro.
   */
  const pagamentosDoCliente = useMemo(() => {
    return componentes
      .filter(
        (item) => item.tipo !== "Moto na troca"
      )
      .reduce(
        (total, item) =>
          total + (Number(item.valor) || 0),
        0
      );
  }, [componentes]);

  const totalCustosDoc = useMemo(() => {
    return custosDoc.reduce(
      (total, item) =>
        total + (Number(item.valor) || 0),
      0
    );
  }, [custosDoc]);

  /*
   * Sobrou dinheiro da documentação, vira lucro da loja.
   * Faltou, sai do lucro. Mas só depois de concluída: até lá
   * ainda pode aparecer custo.
   */
  const resultadoDoc =
    (Number(transferenciaCliente) || 0) -
    totalCustosDoc;

  const totalFinanceiroOperacao =
    (Number(valorVenda) || 0) +
    totalCapacetesRecebidosDepois;

  useEffect(() => {
    carregarVenda();
  }, [id]);

  async function carregarVenda() {
    setCarregando(true);
    setErro("");

    // 1. Carrega a venda SEM embed de motorcycles
    const {
      data: venda,
      error: vendaError,
    } = await supabase
      .from("sales")
      .select("*")
      .eq("id", id)
      .single();

    if (
      vendaError ||
      !venda
    ) {
      console.error(vendaError);

      setErro(
        vendaError?.message ||
          "Não foi possível carregar os dados da venda."
      );

      setCarregando(false);
      return;
    }

    setDataVenda(
      venda.data_venda || ""
    );

    setHoraVenda(
      venda.hora_venda
        ? String(
            venda.hora_venda
          ).slice(0, 5)
        : ""
    );

    setCliente(
      venda.cliente || ""
    );

    setTelefone(
      venda.telefone || ""
    );

    setVendedor(
      venda.vendedor || ""
    );

    setFormaPagamento(
      venda.forma_pagamento ||
        (Number(
          venda.valor_financiado
        ) > 0
          ? "Financiamento"
          : "")
    );

    setValorVenda(
      String(
        venda.valor_total_venda ??
          venda.valor_venda ??
          ""
      )
    );

    setEntrada(
      String(
        venda.entrada_total ??
          venda.entrada ??
          ""
      )
    );

    setBanco(
      venda.banco || ""
    );

    setTransferenciaCliente(
      String(
        venda.transferencia_cliente ??
          ""
      )
    );

    setTransferenciaLoja(
      String(
        venda.transferencia_loja ??
          ""
      )
    );

    setObservacoes(
      venda.observacoes || ""
    );

    setDocConcluida(
      Boolean(venda.documentacao_concluida)
    );

    setNovoCusto((atual) => ({
      ...atual,
      data:
        atual.data ||
        venda.data_venda ||
        "",
    }));

    const { data: custosData } = await supabase
      .from("sale_documentation_costs")
      .select("*")
      .eq("sale_id", id)
      .order("data", { ascending: true });

    setCustosDoc(custosData || []);

    const { data: lancamentosCaixa } = await supabase
      .from("cash_transactions")
      .select("valor, confirmado")
      .eq("origem", "venda")
      .eq("origem_id", id)
      .eq("tipo", "entrada");

    setCaixaDaVenda(
      (lancamentosCaixa || []).reduce(
        (resumo, item: any) => {
          const valor = Number(item.valor || 0);

          return item.confirmado === false
            ? {
                ...resumo,
                pendente: resumo.pendente + valor,
              }
            : {
                ...resumo,
                confirmado:
                  resumo.confirmado + valor,
              };
        },
        { confirmado: 0, pendente: 0 }
      )
    );

    const {
      data: componentesData,
      error: componentesError,
    } = await supabase
      .from(
        "sale_payment_components"
      )
      .select("*")
      .eq("sale_id", id)
      .order("criado_em", {
        ascending: true,
      });

    if (componentesError) {
      console.error(
        componentesError
      );
    }

    setComponentes(
      (componentesData || []).map(
        (item: any) => ({
          idLocal: String(item.id),
          tipo: item.tipo || "Pix",
          destino:
            item.destino ===
            "capacete"
              ? "capacete"
              : "moto",
          valor: String(
            item.valor ?? ""
          ),
          parcelas: String(
            item.parcelas ?? "1"
          ),
          valorParcela:
            item.valor_parcela === null ||
            item.valor_parcela === undefined
              ? ""
              : String(item.valor_parcela),
          motorcycle_id:
            item.motorcycle_id ||
            null,
          observacoes:
            item.observacoes || null,
        })
      )
    );

    const idMoto =
      venda.motorcycle_id
        ? String(
            venda.motorcycle_id
          )
        : "";

    setMotorcycleId(
      idMoto
    );

    // 2. Carrega a moto separadamente
    if (idMoto) {
      const {
        data: moto,
        error: motoError,
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
        .eq(
          "id",
          idMoto
        )
        .single();

      if (
        motoError ||
        !moto
      ) {
        console.error(
          motoError
        );

        setMotoNome(
          "Moto não encontrada"
        );
      } else {
        setMotoNome(
          [
            moto.codigo,
            moto.marca,
            moto.modelo,
            moto.versao,
            moto.ano_modelo,
            moto.placa,
          ]
            .filter(Boolean)
            .join(" · ")
        );
      }
    } else {
      setMotoNome(
        "Moto não encontrada"
      );
    }

    try {
      const respostaCapacetes =
        await fetch(
          `/api/vendas/${encodeURIComponent(
            id
          )}/capacetes`,
          {
            cache: "no-store",
          }
        );

      if (respostaCapacetes.ok) {
        const dadosCapacetes =
          await respostaCapacetes.json();

        setCapacetesVinculados(
          Array.isArray(
            dadosCapacetes?.lancamentos
          )
            ? dadosCapacetes.lancamentos
            : []
        );
      } else {
        const dadosErro =
          await respostaCapacetes
            .json()
            .catch(() => null);

        console.error(
          "Não foi possível carregar os capacetes vinculados:",
          dadosErro
        );

        setCapacetesVinculados(
          []
        );
      }
    } catch (error) {
      console.error(
        "Erro ao carregar capacetes vinculados:",
        error
      );

      setCapacetesVinculados([]);
    }

    setCarregando(false);
  }

  function atualizarComponente(
    idLocal: string,
    campo: string,
    valor: string
  ) {
    setComponentes((atuais) =>
      atuais.map((item) =>
        item.idLocal === idLocal
          ? { ...item, [campo]: valor }
          : item
      )
    );
  }

  function adicionarComponente() {
    setComponentes((atuais) => [
      ...atuais,
      {
        idLocal: `novo-${Date.now()}-${atuais.length}`,
        tipo: "Pix",
        destino: "moto",
        valor: "",
        parcelas: "1",
        valorParcela: "",
        motorcycle_id: null,
        observacoes: null,
      },
    ]);
  }

  function removerComponente(
    idLocal: string
  ) {
    setComponentes((atuais) =>
      atuais.filter(
        (item) =>
          item.idLocal !== idLocal
      )
    );
  }

  /*
   * A composicao e regravada inteira: apaga o que estava e
   * insere o que esta na tela. E o mesmo caminho da criacao da
   * venda, entao os dois lugares gravam igual.
   */
  async function regravarComponentes() {
    const { error: erroApagar } =
      await supabase
        .from(
          "sale_payment_components"
        )
        .delete()
        .eq("sale_id", id);

    if (erroApagar) throw erroApagar;

    const validos = componentes.filter(
      (item) =>
        Number(item.valor) > 0
    );

    if (validos.length === 0) return;

    const linhas = validos.map(
      (item) => {
        const valor =
          Number(item.valor) || 0;

        const parcelas =
          item.tipo === "Cartão"
            ? Number(item.parcelas) || 1
            : null;

        return {
          sale_id: id,
          tipo: item.tipo,
          destino:
            item.destino ===
            "capacete"
              ? "capacete"
              : "moto",
          valor,
          parcelas,
          /*
           * A maquininha cobra juros: a parcela quase nunca
           * e o valor dividido em partes iguais. Quando o
           * valor e digitado, e ele que vale.
           */
          valor_parcela: parcelas
            ? Number(item.valorParcela) ||
              valor / parcelas
            : null,
          motorcycle_id:
            item.motorcycle_id ||
            null,
          observacoes:
            item.observacoes || null,
        };
      }
    );

    const { error: erroInserir } =
      await supabase
        .from(
          "sale_payment_components"
        )
        .insert(linhas);

    if (erroInserir) throw erroInserir;
  }

  /*
   * O caixa tem que acompanhar: se o valor da venda muda, o
   * lancamento antigo fica mentindo. A baixa ja dada e
   * preservada - so o valor e a descricao sao corrigidos.
   */
  async function sincronizarCaixa() {
    const recebidoDoCliente =
      componentes
        .filter(
          (item) =>
            item.tipo !==
            "Moto na troca"
        )
        .reduce(
          (total, item) =>
            total +
            (Number(item.valor) || 0),
          0
        ) +
      (Number(transferenciaCliente) ||
        0);

    const { data: lancamentos } =
      await supabase
        .from("cash_transactions")
        .select("id, valor, descricao, tipo")
        .eq("origem", "venda")
        .eq("origem_id", id)
        .eq("tipo", "entrada")
        .order("criado_em", {
          ascending: true,
        });

    const lista = lancamentos || [];

    const doBanco = lista.find((item: any) =>
      String(item.descricao || "").startsWith(
        "Financiamento"
      )
    );

    const doCliente = lista.find(
      (item: any) => item !== doBanco
    );

    if (doCliente) {
      await supabase
        .from("cash_transactions")
        .update({
          valor: recebidoDoCliente,
        })
        .eq("id", doCliente.id);
    }

    if (doBanco) {
      await supabase
        .from("cash_transactions")
        .update({
          valor: valorFinanciado,
        })
        .eq("id", doBanco.id);
    }
  }

  /*
   * Apagar a venda. Serve para a venda lancada errado ou de
   * teste: enquanto ela existe, conta no faturamento do mes
   * e a moto fica presa como vendida.
   *
   * Sai tudo que aponta para ela - composicao do pagamento e
   * lancamentos do caixa - e a moto volta para o estoque.
   */
  async function apagarVenda() {
    setErro("");
    setMensagem("");

    if (capacetesVinculados.length > 0) {
      setErro(
        "Esta venda tem capacete vinculado. Remova os capacetes primeiro, para o estoque deles voltar certo."
      );
      return;
    }

    const confirmar = window.confirm(
      `Apagar definitivamente esta venda${
        motoNome ? ` (${motoNome})` : ""
      }? A moto volta para o estoque e os lançamentos dela saem do caixa. Não dá para desfazer.`
    );

    if (!confirmar) return;

    setExcluindo(true);

    const { data: custosDaVenda } = await supabase
      .from("sale_documentation_costs")
      .select("id")
      .eq("sale_id", id);

    const idsCustos = (custosDaVenda || []).map(
      (custo: any) => String(custo.id)
    );

    if (idsCustos.length > 0) {
      await supabase
        .from("cash_transactions")
        .delete()
        .in("origem", ["documentacao", "vistoria"])
        .in("origem_id", idsCustos);
    }

    await supabase
      .from("cash_transactions")
      .delete()
      .eq("origem", "venda")
      .eq("origem_id", id);

    await supabase
      .from("sale_payment_components")
      .delete()
      .eq("sale_id", id);

    const { data: apagadas, error } = await supabase
      .from("sales")
      .delete()
      .eq("id", id)
      .select("id");

    if (error) {
      setExcluindo(false);
      setErro(
        `Não foi possível apagar a venda: ${error.message}`
      );
      return;
    }

    /*
     * Sem politica de exclusao no banco o Postgres nao
     * devolve erro: ele so nao apaga. O select mostra o que
     * saiu de verdade.
     */
    if (!apagadas || apagadas.length === 0) {
      setExcluindo(false);
      setErro(
        "A venda não foi apagada: seu usuário não tem permissão de exclusão em vendas no banco. Me avise que eu passo o SQL para liberar."
      );
      return;
    }

    /* A moto so volta ao estoque depois que a venda sai. */
    if (motorcycleId) {
      await supabase
        .from("motorcycles")
        .update({ status: "disponivel" })
        .eq("id", motorcycleId);
    }

    setExcluindo(false);

    window.location.href = "/vendas/historico";
  }

  /*
   * Cada custo da documentação sai do caixa de verdade,
   * entao ele nasce com o lancamento junto. Nao vai para
   * store_expenses: la ele seria descontado do lucro uma
   * segunda vez.
   */
  async function adicionarCusto() {
    setErro("");

    const valor = Number(novoCusto.valor);

    if (!novoCusto.valor || valor <= 0) {
      setErro("Informe o valor do custo.");
      return;
    }

    if (!novoCusto.data) {
      setErro("Informe a data do custo.");
      return;
    }

    setSalvando(true);

    const { data: criado, error } = await supabase
      .from("sale_documentation_costs")
      .insert({
        sale_id: id,
        tipo: novoCusto.tipo,
        descricao:
          novoCusto.descricao.trim() || null,
        valor,
        data: novoCusto.data,
      })
      .select("*")
      .single();

    if (error || !criado) {
      setSalvando(false);
      setErro(
        `Não foi possível lançar o custo: ${
          error?.message || ""
        }`
      );
      return;
    }

    const { error: erroCaixa } = await supabase
      .from("cash_transactions")
      .insert({
        data: novoCusto.data,
        tipo: "saida",
        origem:
          novoCusto.tipo === "vistoria"
            ? "vistoria"
            : "documentacao",
        origem_id: criado.id,
        valor,
        descricao: `${
          novoCusto.descricao.trim() ||
          nomeTipoCusto(novoCusto.tipo)
        } - ${motoNome || "Venda"}`,
        /*
         * Nasce pendente: o dinheiro so sai quando a
         * documentacao vai para o despachante. A baixa e dada
         * no Caixa, na data do pagamento.
         */
        confirmado: false,
        data_confirmacao: null,
      });

    setSalvando(false);

    if (erroCaixa) {
      setErro(
        `Custo lançado, mas não entrou no caixa: ${erroCaixa.message}`
      );
    }

    setCustosDoc((atuais) => [
      ...atuais,
      criado,
    ]);

    setNovoCusto((atual) => ({
      ...atual,
      descricao: "",
      valor: "",
    }));
  }

  /*
   * Toda venda tem a vistoria de transferencia e o honorario
   * do despachante. Em vez de digitar os dois toda vez, o
   * botao lanca o par de uma vez, e o que ja estiver lancado
   * nao repete.
   */
  async function lancarCustosPadrao() {
    setErro("");

    const faltando = CUSTOS_PADRAO_VENDA.filter(
      (padrao) =>
        !custosDoc.some(
          (item) => item.tipo === padrao.tipo
        )
    );

    if (faltando.length === 0) {
      setErro(
        "Os custos padrão desta venda já estão lançados."
      );
      return;
    }

    const data =
      novoCusto.data ||
      dataVenda ||
      new Date().toISOString().slice(0, 10);

    setSalvando(true);

    const { data: criados, error } = await supabase
      .from("sale_documentation_costs")
      .insert(
        faltando.map((padrao) => ({
          sale_id: id,
          tipo: padrao.tipo,
          descricao: padrao.descricao,
          valor: padrao.valor,
          data,
        }))
      )
      .select("*");

    if (error || !criados) {
      setSalvando(false);
      setErro(
        `Não foi possível lançar: ${error?.message || ""}`
      );
      return;
    }

    const { error: erroCaixa } = await supabase
      .from("cash_transactions")
      .insert(
        criados.map((custo: any) => ({
          data,
          tipo: "saida",
          origem:
            custo.tipo === "vistoria"
              ? "vistoria"
              : "documentacao",
          origem_id: custo.id,
          valor: Number(custo.valor) || 0,
          descricao: `${
            custo.descricao ||
            nomeTipoCusto(custo.tipo)
          } - ${motoNome || "Venda"}`,
          confirmado: false,
          data_confirmacao: null,
        }))
      );

    setSalvando(false);

    if (erroCaixa) {
      setErro(
        `Custos lançados, mas não entraram no caixa: ${erroCaixa.message}`
      );
    }

    setCustosDoc((atuais) => [
      ...atuais,
      ...criados,
    ]);
  }

  async function removerCusto(custo: any) {
    const confirmar = window.confirm(
      `Remover ${nomeTipoCusto(custo.tipo)} de ${formatarMoeda(
        custo.valor
      )}? A saída do caixa sai junto.`
    );

    if (!confirmar) return;

    setSalvando(true);

    await supabase
      .from("cash_transactions")
      .delete()
      .in("origem", ["documentacao", "vistoria"])
      .eq("origem_id", custo.id);

    const { error } = await supabase
      .from("sale_documentation_costs")
      .delete()
      .eq("id", custo.id);

    setSalvando(false);

    if (error) {
      setErro(
        `Não foi possível remover: ${error.message}`
      );
      return;
    }

    setCustosDoc((atuais) =>
      atuais.filter(
        (item) => item.id !== custo.id
      )
    );
  }

  async function alternarConclusaoDoc() {
    const novoEstado = !docConcluida;

    setSalvando(true);

    const { error } = await supabase
      .from("sales")
      .update({
        documentacao_concluida: novoEstado,
        documentacao_concluida_em: novoEstado
          ? new Date()
              .toISOString()
              .slice(0, 10)
          : null,
      })
      .eq("id", id);

    setSalvando(false);

    if (error) {
      setErro(
        `Não foi possível concluir: ${error.message}`
      );
      return;
    }

    setDocConcluida(novoEstado);
  }

  async function salvarAlteracoes() {
    setErro("");
    setMensagem("");

    if (!dataVenda) {
      setErro(
        "Informe a data da venda."
      );
      return;
    }

    if (!horaVenda) {
      setErro(
        "Informe a hora da venda."
      );
      return;
    }

    if (!cliente.trim()) {
      setErro(
        "Informe o nome do cliente."
      );
      return;
    }

    if (!vendedor) {
      setErro(
        "Selecione o vendedor."
      );
      return;
    }

    if (!formaPagamento) {
      setErro(
        "Selecione a forma de pagamento."
      );
      return;
    }

    if (
      !valorVenda ||
      Number(valorVenda) <= 0
    ) {
      setErro(
        "Informe o valor da venda."
      );
      return;
    }

    if (
      ehFinanciamento &&
      Number(entrada || 0) >
        Number(valorVenda)
    ) {
      setErro(
        "A entrada não pode ser maior que o valor da venda."
      );
      return;
    }

    if (
      ehFinanciamento &&
      !banco.trim()
    ) {
      setErro(
        "Informe o banco ou financeira."
      );
      return;
    }

    const confirmar =
      window.confirm(
        "Deseja salvar as alterações desta venda?"
      );

    if (!confirmar) {
      return;
    }

    setSalvando(true);

    const valorVendaNumero =
      Number(valorVenda) || 0;

    const entradaFinal =
      ehFinanciamento
        ? Number(entrada) || 0
        : valorVendaNumero;

    const { error } =
      await supabase
        .from("sales")
        .update({
          data_venda:
            dataVenda,

          hora_venda:
            horaVenda,

          cliente:
            cliente.trim(),

          telefone:
            telefone.trim(),

          vendedor,

          forma_pagamento:
            formaPagamento,

          valor_venda:
            valorVendaNumero,

          valor_total_venda:
            valorVendaNumero,

          entrada:
            entradaFinal,

          entrada_total:
            entradaFinal,

          valor_financiado:
            valorFinanciado,

          banco:
            ehFinanciamento
              ? banco.trim()
              : null,

          transferencia_cliente:
            Number(
              transferenciaCliente
            ) || 0,

          transferencia_loja:
            Number(
              transferenciaLoja
            ) || 0,

          observacoes:
            observacoes.trim(),
        })
        .eq("id", id);

    if (error) {
      console.error(error);

      setErro(
        `Não foi possível salvar: ${error.message}`
      );

      setSalvando(false);
      return;
    }

    try {
      await regravarComponentes();
      await sincronizarCaixa();
    } catch (erroComposicao: any) {
      console.error(erroComposicao);

      setErro(
        `A venda foi salva, mas a composição do pagamento não: ${
          erroComposicao?.message || ""
        }`
      );

      setSalvando(false);
      return;
    }

    setMensagem(
      "Venda atualizada com sucesso!"
    );

    setSalvando(false);

    setTimeout(() => {
      router.push(
        "/vendas/historico"
      );

      router.refresh();
    }, 800);
  }

  if (carregando) {
    return (
      <div className="p-6 text-zinc-400">
        Carregando venda...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-5xl">

        {/* CABEÇALHO */}

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-1 text-sm font-semibold uppercase tracking-[0.25em] text-yellow-500">
              Blackout Motos
            </p>

            <h1 className="text-3xl font-bold">
              Editar Venda
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Corrija os dados da venda registrada.
            </p>
          </div>

          <Link
            href="/vendas/historico"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-yellow-500 hover:text-yellow-500"
          >
            Voltar ao Histórico
          </Link>
        </div>

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

        <div className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 md:p-8">

          {/* DADOS */}

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
                  onChange={(e) =>
                    setDataVenda(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Hora da venda
                </label>

                <input
                  type="time"
                  value={horaVenda}
                  onChange={(e) =>
                    setHoraVenda(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-zinc-300">
                  Moto
                </label>

                <div className="min-h-[50px] rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-300">
                  {motoNome}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Vendedor *
                </label>

                <select
                  value={vendedor}
                  onChange={(e) =>
                    setVendedor(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                >
                  <option value="">
                    Selecione
                  </option>

                  <option value="Cristian">
                    Cristian
                  </option>

                  <option value="Bruno">
                    Bruno
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Forma de pagamento *
                </label>

                <select
                  value={
                    formaPagamento
                  }
                  onChange={(e) => {
                    const forma =
                      e.target.value;

                    setFormaPagamento(
                      forma
                    );

                    if (
                      forma !==
                      "Financiamento"
                    ) {
                      setBanco("");
                    }
                  }}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                >
                  <option value="">
                    Selecione
                  </option>

                  {formasPagamento.map(
                    (forma) => (
                      <option
                        key={forma}
                        value={forma}
                      >
                        {forma}
                      </option>
                    )
                  )}
                </select>
              </div>

            </div>
          </section>

          {/* CLIENTE */}

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
                  onChange={(e) =>
                    setCliente(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Telefone
                </label>

                <input
                  type="text"
                  value={telefone}
                  onChange={(e) =>
                    setTelefone(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                />
              </div>

            </div>
          </section>

          {/* VALORES */}

          <section>
            <h2 className="mb-4 border-b border-zinc-800 pb-3 text-lg font-semibold text-yellow-500">
              Valores
            </h2>

            <div
              className={`grid gap-4 ${
                ehFinanciamento
                  ? "md:grid-cols-3"
                  : "md:grid-cols-2"
              }`}
            >

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Valor da venda *
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorVenda}
                  onChange={(e) =>
                    setValorVenda(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                />
              </div>

              {ehFinanciamento && (
                <div>
                  <label className="mb-2 block text-sm text-zinc-300">
                    Entrada
                  </label>

                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={entrada}
                    onChange={(e) =>
                      setEntrada(
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Valor financiado
                </label>

                <div className="flex min-h-[50px] items-center rounded-xl border border-yellow-600/50 bg-yellow-500/10 px-4 py-3 text-lg font-bold text-yellow-500">
                  {moeda(
                    valorFinanciado
                  )}
                </div>
              </div>

            </div>

            {ehFinanciamento && (
              <div className="mt-4">
                <label className="mb-2 block text-sm text-zinc-300">
                  Banco / Financeira *
                </label>

                <input
                  type="text"
                  value={banco}
                  onChange={(e) =>
                    setBanco(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                />
              </div>
            )}

            {!ehFinanciamento &&
              formaPagamento && (
                <div className="mt-4 rounded-xl border border-green-800 bg-green-950/20 p-4 text-sm text-green-300">
                  Venda à vista por{" "}
                  <strong>
                    {formaPagamento}
                  </strong>
                  . Valor financiado será
                  R$ 0,00.
                </div>
              )}
          </section>

          {/* COMPOSIÇÃO DO PAGAMENTO */}

          <section>
            <div className="mb-4 flex flex-col gap-3 border-b border-zinc-800 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-yellow-500">
                  Composição do pagamento
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Como o cliente pagou. Corrija aqui se a forma
                  mudou depois da venda fechada.
                </p>
              </div>

              <button
                type="button"
                onClick={adicionarComponente}
                className="rounded-xl border border-yellow-600/60 px-4 py-2 text-sm font-semibold text-yellow-400 transition hover:bg-yellow-500/10"
              >
                + Adicionar pagamento
              </button>
            </div>

            {componentes.length === 0 ? (
              <p className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400">
                Nenhum pagamento detalhado nesta venda.
              </p>
            ) : (
              <div className="space-y-3">
                {componentes.map((item) => {
                  const ehTroca =
                    item.tipo === "Moto na troca";

                  return (
                    <div
                      key={item.idLocal}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
                    >
                      <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto]">
                        <div>
                          <label className="mb-1 block text-xs text-zinc-400">
                            Forma
                          </label>

                          <select
                            value={item.tipo}
                            disabled={ehTroca}
                            onChange={(e) =>
                              atualizarComponente(
                                item.idLocal,
                                "tipo",
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm outline-none focus:border-yellow-500 disabled:opacity-60"
                          >
                            <option>Pix</option>
                            <option>Dinheiro</option>
                            <option>Transferência</option>
                            <option>Cartão</option>
                            <option>Moto na troca</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs text-zinc-400">
                            Valor
                          </label>

                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.valor}
                            onChange={(e) =>
                              atualizarComponente(
                                item.idLocal,
                                "valor",
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm outline-none focus:border-yellow-500"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs text-zinc-400">
                            Refere-se a
                          </label>

                          <select
                            value={item.destino}
                            onChange={(e) =>
                              atualizarComponente(
                                item.idLocal,
                                "destino",
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm outline-none focus:border-yellow-500"
                          >
                            <option value="moto">Moto</option>
                            <option value="capacete">
                              Capacete
                            </option>
                          </select>
                        </div>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() =>
                              removerComponente(
                                item.idLocal
                              )
                            }
                            className="w-full rounded-lg border border-zinc-700 px-3 py-2.5 text-sm text-red-300 transition hover:border-red-700 hover:bg-red-950/30 md:w-auto"
                          >
                            Remover
                          </button>
                        </div>
                      </div>

                      {item.tipo === "Cartão" && (
                        <div className="mt-3 grid gap-3 border-t border-zinc-800 pt-3 md:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-xs text-zinc-400">
                              Parcelas
                            </label>

                            <input
                              type="number"
                              min="1"
                              value={item.parcelas}
                              onChange={(e) =>
                                atualizarComponente(
                                  item.idLocal,
                                  "parcelas",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm outline-none focus:border-yellow-500"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs text-zinc-400">
                              Valor da parcela
                            </label>

                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.valorParcela || ""}
                              onChange={(e) =>
                                atualizarComponente(
                                  item.idLocal,
                                  "valorParcela",
                                  e.target.value
                                )
                              }
                              placeholder={(
                                (Number(item.valor) || 0) /
                                (Number(item.parcelas) || 1)
                              ).toFixed(2)}
                              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm outline-none focus:border-yellow-500"
                            />
                          </div>

                          <div className="flex flex-col justify-end">
                            <p className="text-xs text-yellow-400">
                              {Number(item.parcelas) || 1}x de{" "}
                              {formatarMoeda(
                                Number(item.valorParcela) ||
                                  (Number(item.valor) || 0) /
                                    (Number(item.parcelas) || 1)
                              )}
                            </p>

                            <p className="mt-1 text-xs text-zinc-500">
                              Operadora: {OPERADORA_CARTAO}
                            </p>
                          </div>
                        </div>
                      )}

                      {ehTroca && item.observacoes && (
                        <p className="mt-2 text-xs text-zinc-500">
                          {item.observacoes}
                        </p>
                      )}
                    </div>
                  );
                })}

                <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm">
                  <span className="text-zinc-400">
                    Total da composição
                  </span>

                  <strong
                    className={
                      Math.abs(
                        totalComponentes -
                          (Number(valorVenda) || 0)
                      ) < 0.01
                        ? "text-green-400"
                        : "text-yellow-400"
                    }
                  >
                    {formatarMoeda(totalComponentes)}
                  </strong>
                </div>

                {Math.abs(
                  totalComponentes -
                    (Number(valorVenda) || 0)
                ) >= 0.01 && (
                  <p className="text-xs text-yellow-400">
                    A composição soma{" "}
                    {formatarMoeda(totalComponentes)} e o valor
                    da venda é{" "}
                    {formatarMoeda(Number(valorVenda) || 0)}.
                    Confira antes de salvar.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* CAPACETES VINCULADOS À VENDA */}

          <section>
            <div className="mb-4 flex flex-col gap-3 border-b border-zinc-800 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-yellow-500">
                  Capacetes vinculados à venda
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Aqui aparece separado o que é valor da moto e o que é valor de capacete.
                </p>
              </div>

              <Link
                href={`/vendas/${id}/capacete`}
                className="inline-flex items-center justify-center rounded-lg border border-yellow-500 px-4 py-2 text-sm font-semibold text-yellow-500 transition hover:bg-yellow-500 hover:text-black"
              >
                Adicionar capacete
              </Link>
            </div>

            {capacetesVinculados.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-black/40 p-4 text-sm text-zinc-400">
                Nenhum capacete foi vinculado a esta venda.
              </div>
            ) : (
              <div className="space-y-3">
                {capacetesVinculados.map(
                  (item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-zinc-800 bg-black/40 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold text-white">
                            Capacete / acessório
                          </p>

                          <p className="mt-1 text-sm text-zinc-400">
                            {item.observacoes ||
                              "Capacete antigo sem cadastro de estoque"}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full bg-zinc-800 px-2 py-1 text-zinc-300">
                              {item.forma_pagamento ||
                                "Pagamento não informado"}
                            </span>

                            {item.ja_incluido_na_venda ? (
                              <span className="rounded-full bg-green-950 px-2 py-1 font-semibold text-green-300">
                                Já incluído no valor da venda
                              </span>
                            ) : (
                              <span className="rounded-full bg-yellow-950 px-2 py-1 font-semibold text-yellow-300">
                                Recebido depois da venda
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="text-xs uppercase tracking-wide text-zinc-500">
                            Valor do capacete
                          </p>

                          <p className="mt-1 text-xl font-bold text-yellow-500">
                            {moeda(
                              Number(
                                item.valor_recebido ||
                                  0
                              )
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                )}

                <div className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs text-zinc-500">
                      Valor registrado da venda
                    </p>

                    <p className="mt-1 font-bold text-white">
                      {moeda(
                        Number(valorVenda)
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500">
                      Capacetes vinculados
                    </p>

                    <p className="mt-1 font-bold text-yellow-500">
                      {moeda(
                        totalCapacetesVinculados
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500">
                      Deste total, já estava na venda
                    </p>

                    <p className="mt-1 font-bold text-green-400">
                      {moeda(
                        totalCapacetesJaIncluidos
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500">
                      Total financeiro da operação
                    </p>

                    <p className="mt-1 font-bold text-yellow-500">
                      {moeda(
                        totalFinanceiroOperacao
                      )}
                    </p>
                  </div>
                </div>

                {/* ENTRA NO CAIXA */}

                <div className="rounded-xl border border-green-800/50 bg-green-950/10 p-4">
                  <p className="text-sm font-semibold text-green-300">
                    Entra no caixa por esta moto
                  </p>

                  <div className="mt-3 space-y-1.5 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-zinc-400">
                        Pago pelo cliente
                      </span>

                      <span className="text-zinc-200">
                        {moeda(pagamentosDoCliente)}
                      </span>
                    </div>

                    {Number(transferenciaCliente) > 0 && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-zinc-400">
                          Documentação
                        </span>

                        <span className="text-zinc-200">
                          {moeda(
                            Number(transferenciaCliente) || 0
                          )}
                        </span>
                      </div>
                    )}

                    {valorFinanciado > 0 && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-zinc-400">
                          Financiamento{" "}
                          {banco ? `(${banco})` : ""}
                        </span>

                        <span className="text-zinc-200">
                          {moeda(valorFinanciado)}
                        </span>
                      </div>
                    )}

                    {totalCapacetesRecebidosDepois > 0 && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-zinc-400">
                          Capacete recebido depois
                        </span>

                        <span className="text-zinc-200">
                          {moeda(
                            totalCapacetesRecebidosDepois
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-green-800/40 pt-3">
                    <span className="font-bold text-white">
                      Total
                    </span>

                    <span className="text-xl font-black text-green-400">
                      {moeda(
                        pagamentosDoCliente +
                          (Number(transferenciaCliente) ||
                            0) +
                          valorFinanciado +
                          totalCapacetesRecebidosDepois
                      )}
                    </span>
                  </div>

                  {/* O que ja caiu e o que falta cair. */}
                  <div className="mt-3 flex flex-wrap gap-4 text-xs">
                    <span className="text-zinc-400">
                      Já na conta{" "}
                      <strong className="text-green-400">
                        {moeda(caixaDaVenda.confirmado)}
                      </strong>
                    </span>

                    {caixaDaVenda.pendente > 0 && (
                      <span className="text-zinc-400">
                        Ainda vai entrar{" "}
                        <strong className="text-yellow-400">
                          {moeda(caixaDaVenda.pendente)}
                        </strong>
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-xs text-zinc-500">
                    A moto recebida na troca não entra: ela é
                    mercadoria, não dinheiro. E a documentação
                    entra no caixa, mas não é lucro - ela paga a
                    vistoria e o despachante.
                  </p>
                </div>

                {totalCapacetesRecebidosDepois >
                  0 && (
                  <div className="rounded-xl border border-yellow-800/60 bg-yellow-950/20 p-4 text-sm text-yellow-200">
                    Recebido depois da venda:{" "}
                    <strong>
                      {moeda(
                        totalCapacetesRecebidosDepois
                      )}
                    </strong>
                    . Esse valor é somado ao total financeiro da operação porque foi uma entrada nova no caixa.
                  </div>
                )}

                {totalCapacetesJaIncluidos >
                  0 && (
                  <p className="text-xs leading-5 text-zinc-500">
                    Os capacetes marcados como “já incluído no valor da venda” aparecem separados para conferência, mas não são somados novamente ao total para não duplicar o dinheiro.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* CONTROLE DA DOCUMENTAÇÃO */}

          <section>
            <div className="mb-4 border-b border-zinc-800 pb-3">
              <h2 className="text-lg font-semibold text-yellow-500">
                Controle da Documentação
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                O valor recebido do cliente entra no caixa, mas
                não é lucro: ele paga vistoria, taxas e
                despachante. O lucro é o que sobra.
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                Cada custo lançado aqui fica pendente no caixa
                e recebe baixa quando a documentação for para o
                despachante.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Valor recebido para documentação
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={
                    transferenciaCliente
                  }
                  onChange={(e) =>
                    setTransferenciaCliente(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Transferência paga pela loja
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={
                    transferenciaLoja
                  }
                  onChange={(e) =>
                    setTransferenciaLoja(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                />

                <p className="mt-1 text-xs text-zinc-500">
                  Campo antigo. Se você lançar os custos abaixo,
                  deixe este zerado para não sair do caixa duas
                  vezes.
                </p>
              </div>

            </div>

            {/* A CONTA */}

            <div className="mt-5 rounded-xl border border-yellow-700/40 bg-yellow-950/10 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-zinc-300">
                  Recebido do cliente
                </span>

                <strong className="text-lg text-green-400">
                  {formatarMoeda(
                    Number(transferenciaCliente) || 0
                  )}
                </strong>
              </div>

              {Object.entries(custosPorEmpresa).map(
                ([empresa, total]) => (
                  <div
                    key={empresa}
                    className="mt-2 flex flex-wrap items-center justify-between gap-3"
                  >
                    <span className="text-sm text-zinc-300">
                      Pago à {empresa.toLowerCase()}
                    </span>

                    <strong className="text-lg text-red-300">
                      - {formatarMoeda(total)}
                    </strong>
                  </div>
                )
              )}

              {custosDoc.length === 0 && (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm text-zinc-300">
                    Gasto com a documentação
                  </span>

                  <strong className="text-lg text-red-300">
                    - {formatarMoeda(0)}
                  </strong>
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-yellow-700/30 pt-3">
                <span className="font-bold text-white">
                  {resultadoDoc >= 0
                    ? "Sobra para a loja"
                    : "Faltou, sai do lucro"}
                </span>

                <strong
                  className={
                    resultadoDoc >= 0
                      ? "text-2xl font-black text-green-400"
                      : "text-2xl font-black text-red-400"
                  }
                >
                  {formatarMoeda(resultadoDoc)}
                </strong>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={salvando}
                  onClick={alternarConclusaoDoc}
                  className={
                    docConcluida
                      ? "rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:border-yellow-500 hover:text-yellow-400 disabled:opacity-50"
                      : "rounded-lg bg-yellow-500 px-4 py-2.5 text-sm font-bold text-black transition hover:bg-yellow-400 disabled:opacity-50"
                  }
                >
                  {docConcluida
                    ? "Reabrir documentação"
                    : "Concluir documentação"}
                </button>

                <p className="text-xs text-zinc-500">
                  {docConcluida
                    ? "Concluída: a sobra já entra no lucro."
                    : "Enquanto estiver em aberto, a sobra não entra no lucro."}
                </p>
              </div>
            </div>
            {/* DETALHE DOS CUSTOS */}

            <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-zinc-200">
                  Custos da documentação
                </p>

                <button
                  type="button"
                  disabled={salvando}
                  onClick={lancarCustosPadrao}
                  className="rounded-lg border border-yellow-600/60 px-3 py-1.5 text-xs font-semibold text-yellow-400 transition hover:bg-yellow-500/10 disabled:opacity-50"
                >
                  Lançar custos padrão ({formatarMoeda(
                    TOTAL_PADRAO_VENDA
                  )})
                </button>
              </div>

              {custosDoc.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  Nenhum custo lançado ainda.
                </p>
              ) : (
                <div className="mb-4 space-y-2">
                  {custosDoc.map((custo) => (
                    <div
                      key={custo.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-semibold text-zinc-200">
                          {nomeTipoCusto(custo.tipo)}
                        </p>

                        <p className="text-xs text-zinc-500">
                          {String(custo.data)
                            .slice(0, 10)
                            .split("-")
                            .reverse()
                            .join("/")}
                          {custo.descricao
                            ? ` · ${custo.descricao}`
                            : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-red-300">
                          - {formatarMoeda(custo.valor)}
                        </span>

                        <button
                          type="button"
                          disabled={salvando}
                          onClick={() =>
                            removerCusto(custo)
                          }
                          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-red-300 transition hover:border-red-700 hover:bg-red-950/30 disabled:opacity-50"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-[1.1fr_1.4fr_0.8fr_0.9fr_auto]">
                <select
                  value={novoCusto.tipo}
                  onChange={(e) => {
                    /*
                     * A tabela de valores e fixa, entao o campo
                     * ja vem preenchido. Continua editavel: o
                     * valor sugerido nao trava nada.
                     */
                    const padrao = valorPadraoDoTipo(
                      e.target.value
                    );

                    setNovoCusto({
                      ...novoCusto,
                      tipo: e.target.value,
                      valor: padrao
                        ? String(padrao)
                        : novoCusto.valor,
                    });
                  }}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm outline-none focus:border-yellow-500"
                >
                  {tiposCustoDocumentacao.map((item) => (
                    <option
                      key={item.chave}
                      value={item.chave}
                    >
                      {item.nome}
                    </option>
                  ))}
                </select>

                <input
                  value={novoCusto.descricao}
                  onChange={(e) =>
                    setNovoCusto({
                      ...novoCusto,
                      descricao: e.target.value,
                    })
                  }
                  placeholder="Descrição (opcional)"
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm outline-none focus:border-yellow-500"
                />

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={novoCusto.valor}
                  onChange={(e) =>
                    setNovoCusto({
                      ...novoCusto,
                      valor: e.target.value,
                    })
                  }
                  placeholder="Valor"
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm outline-none focus:border-yellow-500"
                />

                <input
                  type="date"
                  value={novoCusto.data}
                  onChange={(e) =>
                    setNovoCusto({
                      ...novoCusto,
                      data: e.target.value,
                    })
                  }
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm outline-none focus:border-yellow-500"
                />

                <button
                  type="button"
                  disabled={salvando}
                  onClick={adicionarCusto}
                  className="rounded-lg border border-yellow-600/60 px-4 py-2.5 text-sm font-semibold text-yellow-400 transition hover:bg-yellow-500/10 disabled:opacity-50"
                >
                  Lançar
                </button>
              </div>
            </div>

          </section>

          <section>
            <label className="mb-2 block text-sm text-zinc-300">
              Observações
            </label>

            <textarea
              value={observacoes}
              onChange={(e) =>
                setObservacoes(
                  e.target.value
                )
              }
              rows={4}
              className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
            />
          </section>

          {/* RESUMO */}

          <section className="rounded-xl border border-zinc-800 bg-black p-5">
            <h3 className="mb-4 font-semibold text-yellow-500">
              Resumo Atualizado
            </h3>

            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs text-zinc-500">
                  Pagamento
                </p>

                <p className="mt-1 font-semibold">
                  {formaPagamento ||
                    "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-zinc-500">
                  Venda
                </p>

                <p className="mt-1 font-semibold">
                  {moeda(
                    Number(valorVenda)
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-zinc-500">
                  Recebido / Entrada
                </p>

                <p className="mt-1 font-semibold">
                  {moeda(
                    ehFinanciamento
                      ? Number(
                          entrada
                        )
                      : Number(
                          valorVenda
                        )
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-zinc-500">
                  Financiado
                </p>

                <p className="mt-1 font-semibold text-yellow-500">
                  {moeda(
                    valorFinanciado
                  )}
                </p>
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-3 md:flex-row">

            <button
              type="button"
              onClick={
                salvarAlteracoes
              }
              disabled={salvando}
              className="flex-1 rounded-xl bg-yellow-500 px-6 py-4 font-bold text-black transition hover:bg-yellow-400 disabled:opacity-50"
            >
              {salvando
                ? "Salvando..."
                : "Salvar Alterações"}
            </button>

            <Link
              href="/vendas/historico"
              className="rounded-xl border border-zinc-700 px-6 py-4 text-center font-semibold text-zinc-300"
            >
              Voltar
            </Link>

            <button
              type="button"
              disabled={excluindo || salvando}
              onClick={apagarVenda}
              className="rounded-xl border border-zinc-700 px-6 py-4 font-semibold text-red-300 transition hover:border-red-700 hover:bg-red-950/30 disabled:opacity-50"
            >
              {excluindo
                ? "Apagando..."
                : "Apagar Venda"}
            </button>

          </div>

        </div>
      </div>
    </main>
  );
}