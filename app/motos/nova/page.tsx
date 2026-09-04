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
  Search,
  Warehouse,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import CampoPagamentoFeito from "@/components/CampoPagamentoFeito";
import {
  CUSTOS_PADRAO_COMPRA,
  TOTAL_PADRAO_COMPRA,
  fechamentoDaQuinzena,
} from "@/lib/dados/documentacao";
import CampoComBusca from "@/components/CampoComBusca";
import {
  MARCAS,
  modelosDaMarca,
  versoesDoModelo,
} from "@/lib/dados/motos";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import CampoMoeda from "@/components/CampoMoeda";

/*
 * Unica loja parceira hoje. Vira uma lista quando aparecer
 * a segunda.
 */
const LOJA_PARCEIRA = "Edvaldo";

type TipoEntrada =
  | "estoque_inicial"
  | "compra_nova"
  | "troca"
  /*
   * Moto de outra loja do grupo: fica no nosso patio para
   * vender, mas a loja nao pagou nada por ela. O custo e o
   * repasse combinado, pago so depois da venda - por isso
   * ela nao gera saida no caixa ao entrar.
   */
  | "outra_loja";

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
  cilindrada: string;

  possui_manual: boolean;
  possui_chave_reserva: boolean;
  unico_dono: boolean;
  lavagem_padrao: boolean;

  /*
   * Vistoria cautelar e recibo de compra e venda: existem em
   * toda compra, sempre pelo mesmo valor. Entram como gasto
   * da moto, para o custo dela ficar completo.
   */
  documentacao_padrao: boolean;

  /*
   * Débitos que vêm com a moto. Sao obrigatorios de
   * responder: uma moto comprada com IPVA atrasado sem
   * ninguem perceber vira prejuizo escondido no custo dela.
   *
   * "" = ainda nao respondido, e o que trava o salvamento.
   */
  possui_ipva: "" | "sim" | "nao";
  valor_ipva: string;

  possui_multas: "" | "sim" | "nao";
  valor_multas: string;

  possui_licenciamento: "" | "sim" | "nao";
  valor_licenciamento: string;

  valor_compra: string;
  preco_anunciado: string;
  forma_pagamento_compra: string;
  possui_financiamento: boolean;
  valor_quitacao: string;
  financeira_quitacao: string;

  fornecedor_nome: string;
  fornecedor_telefone: string;
  fornecedor_cpf: string;
  fornecedor_rg: string;
  fornecedor_rua: string;
  fornecedor_numero: string;
  fornecedor_complemento: string;
  fornecedor_bairro: string;
  fornecedor_cidade: string;
  fornecedor_estado: string;
  fornecedor_cep: string;

  /*
   * Nem sempre quem entrega a moto é o dono dela. O
   * documento fica no nome de um e a negociação é feita por
   * outro - guardamos com quem a loja realmente tratou.
   */
  intermediador_nome: string;
  intermediador_cpf: string;
  intermediador_rg: string;
  intermediador_telefone: string;
  intermediador_observacoes: string;

  status: StatusMoto;
  observacoes: string;
};

function formatarCep(valor: string) {
  const numeros = valor
    .replace(/\D/g, "")
    .slice(0, 8);

  if (numeros.length <= 5) {
    return numeros;
  }

  return `${numeros.slice(
    0,
    5
  )}-${numeros.slice(5)}`;
}

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
  cilindrada: "",

  possui_manual: false,
  possui_chave_reserva: false,
  unico_dono: false,
  lavagem_padrao: true,
  documentacao_padrao: true,

  possui_ipva: "",
  valor_ipva: "",

  possui_multas: "",
  valor_multas: "",

  possui_licenciamento: "",
  valor_licenciamento: "",

  valor_compra: "",
  preco_anunciado: "",
  forma_pagamento_compra: "",
  possui_financiamento: false,
  valor_quitacao: "",
  financeira_quitacao: "",

  fornecedor_nome: "",
  fornecedor_telefone: "",
  fornecedor_cpf: "",
  fornecedor_rg: "",
  fornecedor_rua: "",
  fornecedor_numero: "",
  fornecedor_complemento: "",
  fornecedor_bairro: "",
  fornecedor_cidade: "",
  fornecedor_estado: "",
  fornecedor_cep: "",

  intermediador_nome: "",
  intermediador_cpf: "",
  intermediador_rg: "",
  intermediador_telefone: "",
  intermediador_observacoes: "",

  status: "disponivel",
  observacoes: "",
};

function moeda(valor: number) {
  return formatarMoeda(valor);
}

export default function NovaMotoPage() {
  const supabase = createClient();

  /*
   * A moto às vezes entra no estoque antes do acerto com o
   * dono. Enquanto não paga, a saída fica pendente no caixa.
   */
  const [pagoCompra, setPagoCompra] =
    useState(true);

  const [
    abrirIntermediador,
    setAbrirIntermediador,
  ] = useState(false);

  const [
    previsaoCompra,
    setPrevisaoCompra,
  ] = useState(hoje());

  const [form, setForm] =
    useState<FormMoto>(formInicial);

  const [salvando, setSalvando] =
    useState(false);

  const [erro, setErro] =
    useState("");

  const [mensagem, setMensagem] =
    useState("");

  const [
    buscandoPlaca,
    setBuscandoPlaca,
  ] = useState(false);

  const [
    mensagemBuscaPlaca,
    setMensagemBuscaPlaca,
  ] = useState("");

  const [
    erroBuscaPlaca,
    setErroBuscaPlaca,
  ] = useState("");

  const [
    buscandoCepFornecedor,
    setBuscandoCepFornecedor,
  ] = useState(false);

  const [
    erroCepFornecedor,
    setErroCepFornecedor,
  ] = useState("");

  const [
    cepFornecedorEncontrado,
    setCepFornecedorEncontrado,
  ] = useState(false);

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

  const ehOutraLoja =
    form.tipo_entrada ===
    "outra_loja";

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

  const valorQuitacaoNumero =
    useMemo(
      () =>
        form.possui_financiamento
          ? Number(
              form.valor_quitacao
            ) || 0
          : 0,
      [
        form.possui_financiamento,
        form.valor_quitacao,
      ]
    );

  const valorLiquidoCliente =
    useMemo(
      () =>
        Math.max(
          valorCompraNumero -
            valorQuitacaoNumero,
          0
        ),
      [
        valorCompraNumero,
        valorQuitacaoNumero,
      ]
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

      // quem entrega a moto na troca é o
      // cliente da venda: puxa os dados dele
      const clienteId =
        parametros.get("cliente");

      if (clienteId) {
        carregarFornecedorDoCliente(
          clienteId
        );
      }
    }
  }, []);

  useEffect(() => {
    const cepNumeros =
      form.fornecedor_cep.replace(
        /\D/g,
        ""
      );

    if (cepNumeros.length !== 8) {
      setErroCepFornecedor("");
      setCepFornecedorEncontrado(
        false
      );
      setBuscandoCepFornecedor(
        false
      );
      return;
    }

    const controlador =
      new AbortController();

    const timer =
      window.setTimeout(
        async () => {
          setBuscandoCepFornecedor(
            true
          );
          setErroCepFornecedor("");
          setCepFornecedorEncontrado(
            false
          );

          try {
            const resposta =
              await fetch(
                `https://viacep.com.br/ws/${cepNumeros}/json/`,
                {
                  signal:
                    controlador.signal,
                }
              );

            if (!resposta.ok) {
              throw new Error(
                "Não foi possível consultar o CEP."
              );
            }

            const dados =
              await resposta.json();

            if (dados?.erro) {
              throw new Error(
                "CEP não encontrado."
              );
            }

            setForm((anterior) => ({
              ...anterior,
              fornecedor_cep:
                dados.cep ||
                formatarCep(
                  cepNumeros
                ),
              fornecedor_rua:
                dados.logradouro ||
                anterior.fornecedor_rua,
              fornecedor_bairro:
                dados.bairro ||
                anterior.fornecedor_bairro,
              fornecedor_cidade:
                dados.localidade ||
                anterior.fornecedor_cidade,
              fornecedor_estado:
                dados.uf ||
                anterior.fornecedor_estado,
            }));

            setCepFornecedorEncontrado(
              true
            );
          } catch (error) {
            if (
              error instanceof DOMException &&
              error.name ===
                "AbortError"
            ) {
              return;
            }

            setErroCepFornecedor(
              error instanceof Error
                ? error.message
                : "Não foi possível consultar o CEP."
            );
          } finally {
            setBuscandoCepFornecedor(
              false
            );
          }
        },
        450
      );

    return () => {
      window.clearTimeout(timer);
      controlador.abort();
    };
  }, [form.fornecedor_cep]);

  async function carregarFornecedorDoCliente(
    clienteId: string
  ) {
    const { data: cliente } =
      await supabase
        .from("customers")
        .select("*")
        .eq("id", clienteId)
        .single();

    if (!cliente) return;

    setForm((anterior) => ({
      ...anterior,
      fornecedor_nome:
        cliente.nome || "",
      fornecedor_telefone:
        cliente.telefone || "",
      fornecedor_cpf:
        cliente.cpf || "",
      fornecedor_rg:
        cliente.rg || "",
      fornecedor_rua:
        cliente.rua || "",
      fornecedor_numero:
        cliente.numero || "",
      fornecedor_complemento:
        cliente.complemento || "",
      fornecedor_bairro:
        cliente.bairro || "",
      fornecedor_cidade:
        cliente.cidade || "",
      fornecedor_estado:
        cliente.estado || "",
      fornecedor_cep:
        cliente.cep || "",
    }));

    setMensagem(
      `Dados de ${
        cliente.nome || "quem entrega a moto"
      } preenchidos automaticamente. Confira antes de salvar — eles vão para a procuração e o contrato de compra.`
    );
  }

  function atualizarCampo(
    campo: keyof FormMoto,
    valor: string | boolean
  ) {
    setForm((anterior) => {
      const atualizado = {
        ...anterior,
        [campo]: valor,
      };

      /*
       * Moto de outra loja nao tem valor de compra: a loja
       * nao pagou nada por ela. O que ela custa e o repasse,
       * lancado como gasto da moto quando for pago - assim o
       * lucro e o caixa ficam certos sozinhos.
       */
      if (
        campo === "tipo_entrada" &&
        valor === "outra_loja"
      ) {
        atualizado.valor_compra = "0";

        if (!atualizado.fornecedor_nome.trim()) {
          atualizado.fornecedor_nome =
            LOJA_PARCEIRA;
        }
      }

      return atualizado;
    });
  }

  async function buscarPlaca() {
    const placa = form.placa
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");

    setMensagemBuscaPlaca("");
    setErroBuscaPlaca("");

    if (placa.length !== 7) {
      setErroBuscaPlaca(
        "Informe uma placa válida com 7 caracteres."
      );
      return;
    }

    setBuscandoPlaca(true);

    try {
      const resposta = await fetch(
        `/api/veiculos/buscar-placa?placa=${encodeURIComponent(
          placa
        )}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          resultado?.error ||
            "Não foi possível consultar a placa."
        );
      }

      setForm((anterior) => ({
        ...anterior,
        placa:
          resultado.placa ||
          placa,
        marca:
          resultado.marca ||
          anterior.marca,
        modelo:
          resultado.modelo ||
          anterior.modelo,
        ano_fabricacao:
          resultado.ano_fabricacao ||
          anterior.ano_fabricacao,
        ano_modelo:
          resultado.ano_modelo ||
          anterior.ano_modelo,
        cor:
          resultado.cor ||
          anterior.cor,
        chassi:
          resultado.chassi ||
          anterior.chassi,
        cilindrada:
          resultado.cilindrada ||
          anterior.cilindrada,
      }));

      setMensagemBuscaPlaca(
        resultado.renavam
          ? "Dados encontrados e preenchidos. Confira as informações antes de salvar."
          : "Dados encontrados e preenchidos. O RENAVAM não é fornecido por esta consulta e deve ser informado manualmente."
      );
    } catch (error) {
      setErroBuscaPlaca(
        error instanceof Error
          ? error.message
          : "Não foi possível consultar a placa."
      );
    } finally {
      setBuscandoPlaca(false);
    }
  }

  function limpar() {
    setForm({
      ...formInicial,
      data_entrada: hoje(),
    });

    setMotoCriadaId("");
    setErro("");
    setMensagem("");
    setMensagemBuscaPlaca("");
    setErroBuscaPlaca("");
    setErroCepFornecedor("");
    setCepFornecedorEncontrado(
      false
    );
    setBuscandoCepFornecedor(
      false
    );
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

    /*
     * Débitos: nao basta deixar em branco. Cada um precisa
     * de um sim ou um nao, e o sim precisa de valor.
     */
    const debitos = [
      {
        possui: form.possui_ipva,
        valor: form.valor_ipva,
        nome: "IPVA",
      },
      {
        possui: form.possui_multas,
        valor: form.valor_multas,
        nome: "multas",
      },
      {
        possui:
          form.possui_licenciamento,
        valor:
          form.valor_licenciamento,
        nome: "licenciamento",
      },
    ];

    for (const debito of debitos) {
      if (!debito.possui) {
        setErro(
          `Informe se a moto tem ${debito.nome} a pagar.`
        );
        return;
      }

      if (
        debito.possui === "sim" &&
        !(Number(debito.valor) > 0)
      ) {
        setErro(
          `Informe o valor de ${debito.nome} a pagar.`
        );
        return;
      }
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
      form.possui_financiamento
    ) {
      if (valorQuitacaoNumero <= 0) {
        setErro(
          "Informe o valor da quitação do financiamento."
        );
        return;
      }

      if (
        valorQuitacaoNumero >
        valorCompraNumero
      ) {
        setErro(
          "O valor da quitação não pode ser maior que o valor considerado na moto. Se houver diferença a pagar pelo cliente, ajuste a negociação antes de cadastrar."
        );
        return;
      }

      if (
        !form.financeira_quitacao.trim()
      ) {
        setErro(
          "Informe o banco ou financeira da quitação."
        );
        return;
      }
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
      // =====================================================
      // 1. CADASTRA / ATUALIZA QUEM VENDEU A MOTO EM CLIENTES
      // =====================================================

      let fornecedorCustomerId: string | null = null;

      const fornecedorNome =
        form.fornecedor_nome.trim();

      const fornecedorCpf =
        form.fornecedor_cpf.trim();

      if (fornecedorNome && fornecedorCpf) {
        const cpfSomenteNumeros =
          fornecedorCpf.replace(/\D/g, "");

        const {
          data: clientesExistentes,
          error: clientesError,
        } = await supabase
          .from("customers")
          .select("id, cpf");

        if (clientesError) {
          throw clientesError;
        }

        const clienteExistente =
          (clientesExistentes || []).find(
            (cliente) =>
              (cliente.cpf || "")
                .replace(/\D/g, "") ===
              cpfSomenteNumeros
          );

        const dadosCliente: Record<string, string> = {
          nome: fornecedorNome,
          cpf: fornecedorCpf,
        };

        if (form.fornecedor_telefone.trim()) {
          dadosCliente.telefone =
            form.fornecedor_telefone.trim();
        }

        if (form.fornecedor_rg.trim()) {
          dadosCliente.rg =
            form.fornecedor_rg.trim();
        }

        if (form.fornecedor_rua.trim()) {
          dadosCliente.rua =
            form.fornecedor_rua.trim();
        }

        if (form.fornecedor_numero.trim()) {
          dadosCliente.numero =
            form.fornecedor_numero.trim();
        }

        if (form.fornecedor_complemento.trim()) {
          dadosCliente.complemento =
            form.fornecedor_complemento.trim();
        }

        if (form.fornecedor_bairro.trim()) {
          dadosCliente.bairro =
            form.fornecedor_bairro.trim();
        }

        if (form.fornecedor_cidade.trim()) {
          dadosCliente.cidade =
            form.fornecedor_cidade.trim();
        }

        if (form.fornecedor_estado.trim()) {
          dadosCliente.estado =
            form.fornecedor_estado
              .trim()
              .toUpperCase();
        }

        if (form.fornecedor_cep.trim()) {
          dadosCliente.cep =
            form.fornecedor_cep.trim();
        }

        if (clienteExistente) {
          fornecedorCustomerId =
            String(clienteExistente.id);

          const { error: atualizarClienteError } =
            await supabase
              .from("customers")
              .update(dadosCliente)
              .eq("id", fornecedorCustomerId);

          if (atualizarClienteError) {
            throw atualizarClienteError;
          }
        } else {
          const {
            data: clienteCriado,
            error: criarClienteError,
          } = await supabase
            .from("customers")
            .insert(dadosCliente)
            .select("id")
            .single();

          if (criarClienteError || !clienteCriado) {
            throw (
              criarClienteError ||
              new Error(
                "Não foi possível cadastrar quem vendeu a moto em Clientes."
              )
            );
          }

          fornecedorCustomerId =
            String(clienteCriado.id);
        }
      }

      // =====================================================
      // 2. CADASTRA A MOTO JÁ VINCULADA AO CLIENTE/FORNECEDOR
      // =====================================================

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

          cilindrada:
            form.cilindrada
              ? Number(
                  form.cilindrada
                )
              : null,

          possui_manual:
            form.possui_manual,

          possui_chave_reserva:
            form.possui_chave_reserva,

          unico_dono:
            form.unico_dono,

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

          possui_financiamento:
            !ehEstoqueInicial &&
            form.possui_financiamento,

          valor_quitacao:
            !ehEstoqueInicial &&
            form.possui_financiamento
              ? valorQuitacaoNumero
              : 0,

          financeira_quitacao:
            !ehEstoqueInicial &&
            form.possui_financiamento
              ? form.financeira_quitacao.trim() ||
                null
              : null,

          quitacao_lancada_no_caixa:
            form.tipo_entrada ===
              "compra_nova" &&
            form.possui_financiamento,

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

          fornecedor_complemento:
            form.fornecedor_complemento.trim() ||
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

          fornecedor_customer_id:
            fornecedorCustomerId,

          intermediador_nome:
            form.intermediador_nome.trim() ||
            null,

          intermediador_cpf:
            form.intermediador_cpf.trim() ||
            null,

          intermediador_rg:
            form.intermediador_rg.trim() ||
            null,

          intermediador_telefone:
            form.intermediador_telefone.trim() ||
            null,

          intermediador_observacoes:
            form.intermediador_observacoes.trim() ||
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
       * COMPRA NOVA SEM FINANCIAMENTO:
       * sai do caixa o valor integral da compra.
       *
       * COMPRA NOVA COM FINANCIAMENTO:
       * registra separadamente a quitação paga ao banco
       * e o valor líquido repassado ao vendedor.
       *
       * MOTO NA TROCA:
       * a quitação só é lançada quando a venda for
       * concluída, porque ela faz parte daquela negociação.
       */
      if (
        form.tipo_entrada ===
        "compra_nova"
      ) {
        const identificacaoMoto =
          motoCriada.codigo ||
          `${form.marca} ${form.modelo}`;

        const movimentacoesCaixa:
          Array<{
            data: string;
            tipo: "saida";
            origem: string;
            origem_id: string;
            valor: number;
            descricao: string;
            confirmado: boolean;
            data_confirmacao:
              | string
              | null;
          }> = [];

        /*
         * Data em que o dinheiro sai: hoje, se já foi pago;
         * a previsão combinada, se ficou para depois.
         */
        const dataCaixaCompra =
          pagoCompra
            ? form.data_entrada
            : previsaoCompra;

        const confirmacaoCompra =
          pagoCompra
            ? form.data_entrada
            : null;

        if (
          form.possui_financiamento
        ) {
          movimentacoesCaixa.push({
            data:
              dataCaixaCompra,
            tipo: "saida",
            origem: "compra_moto",
            origem_id:
              String(motoCriada.id),
            valor:
              valorQuitacaoNumero,
            descricao:
              `Quitação de financiamento - ${identificacaoMoto} - ${form.financeira_quitacao.trim()}`,
            confirmado: pagoCompra,
            data_confirmacao:
              confirmacaoCompra,
          });

          if (
            valorLiquidoCliente > 0
          ) {
            movimentacoesCaixa.push({
              data:
                dataCaixaCompra,
              tipo: "saida",
              origem: "compra_moto",
              origem_id:
                String(motoCriada.id),
              valor:
                valorLiquidoCliente,
              descricao:
                `Repasse ao vendedor - ${identificacaoMoto}`,
              confirmado: pagoCompra,
              data_confirmacao:
                confirmacaoCompra,
            });
          }
        } else {
          movimentacoesCaixa.push({
            data:
              dataCaixaCompra,
            tipo: "saida",
            origem: "compra_moto",
            origem_id:
              String(motoCriada.id),
            valor:
              valorCompraNumero,
            descricao:
              `Compra de moto - ${identificacaoMoto}`,
            confirmado: pagoCompra,
            data_confirmacao:
              confirmacaoCompra,
          });
        }

        const {
          error: caixaError,
        } = await supabase
          .from(
            "cash_transactions"
          )
          .insert(
            movimentacoesCaixa
          );

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

      let lavagemRegistrada = false;
      let lavagemLancadaNoCaixa = false;

      if (form.lavagem_padrao) {
        const {
          data: gastoLavagem,
          error: lavagemError,
        } = await supabase
          .from("motorcycle_expenses")
          .insert({
            motorcycle_id:
              motoCriada.id,
            data:
              form.data_entrada,
            categoria:
              "Lavagem",
            descricao:
              "Lavagem padrão da moto",
            forma_pagamento:
              "Automático na compra",
            valor: 35,
          })
          .select("id")
          .single();

        if (
          lavagemError ||
          !gastoLavagem
        ) {
          console.error(
            "Erro ao lançar lavagem padrão:",
            lavagemError
          );
        } else {
          lavagemRegistrada = true;

          /*
           * A lavagem é um custo real pago pela loja.
           * Para entradas atuais, também sai do caixa
           * automaticamente na mesma data da entrada.
           *
           * Estoque inicial não gera nova saída no caixa,
           * pois representa motos que já estavam na loja.
           */
          if (!ehEstoqueInicial) {
            const {
              error: caixaLavagemError,
            } = await supabase
              .from("cash_transactions")
              .insert({
                data:
                  form.data_entrada,
                tipo:
                  "saida",
                origem:
                  "gasto_moto",
                origem_id:
                  gastoLavagem.id,
                valor: 35,
                descricao:
                  `Lavagem da moto - ${
                    motoCriada.codigo ||
                    `${form.marca} ${form.modelo}`
                  }`,
              });

            if (caixaLavagemError) {
              console.error(
                "Erro ao lançar lavagem no caixa:",
                caixaLavagemError
              );

              await supabase
                .from("motorcycle_expenses")
                .delete()
                .eq(
                  "id",
                  gastoLavagem.id
                );

              lavagemRegistrada = false;
            } else {
              lavagemLancadaNoCaixa = true;
            }
          }
        }
      }

      /*
       * DÉBITOS DA MOTO
       *
       * IPVA, multas e licenciamento entram no custo da moto
       * ja na compra, para o valor dela nascer certo.
       *
       * No caixa eles nascem PENDENTES: sao contas conhecidas,
       * mas o dinheiro so sai quando forem pagas. A baixa e
       * dada no Caixa, na data em que o pagamento acontecer.
       *
       * Por serem pagamento futuro, valem tambem para estoque
       * inicial: nao e dinheiro antigo, e dinheiro que ainda
       * vai sair.
       */
      const debitosDaMoto = [
        {
          possui: form.possui_ipva,
          valor: form.valor_ipva,
          descricao: "IPVA",
        },
        {
          possui: form.possui_multas,
          valor: form.valor_multas,
          descricao: "Multas",
        },
        {
          possui:
            form.possui_licenciamento,
          valor:
            form.valor_licenciamento,
          descricao: "Licenciamento",
        },
      ].filter(
        (debito) =>
          debito.possui === "sim" &&
          Number(debito.valor) > 0
      );

      if (debitosDaMoto.length > 0) {
        /* Identifica a moto no extrato do caixa. */
        const identificacaoDebito = [
          motoCriada.codigo,
          `${form.marca} ${form.modelo}`.trim(),
          form.placa.trim().toUpperCase(),
        ]
          .filter(Boolean)
          .join(" · ");

        const {
          data: gastosDebito,
          error: erroDebito,
        } = await supabase
          .from("motorcycle_expenses")
          .insert(
            debitosDaMoto.map(
              (debito) => ({
                motorcycle_id:
                  motoCriada.id,
                data:
                  form.data_entrada,
                categoria:
                  "Documentação",
                descricao:
                  debito.descricao,
                forma_pagamento:
                  "A pagar",
                valor: Number(
                  debito.valor
                ),
              })
            )
          )
          .select("id, valor, descricao");

        if (erroDebito) {
          console.error(
            "Erro ao lancar os debitos da moto:",
            erroDebito
          );
        } else if (gastosDebito) {
          const {
            error: erroCaixaDebito,
          } = await supabase
            .from("cash_transactions")
            .insert(
              gastosDebito.map(
                (gasto) => ({
                  data:
                    form.data_entrada,
                  tipo: "saida",
                  origem: "gasto_moto",
                  origem_id: gasto.id,
                  valor:
                    Number(gasto.valor) ||
                    0,
                  descricao: `${
                    gasto.descricao
                  } - ${identificacaoDebito}`,
                  confirmado: false,
                  data_confirmacao: null,
                })
              )
            );

          if (erroCaixaDebito) {
            console.error(
              "Erro ao deixar os debitos pendentes no caixa:",
              erroCaixaDebito
            );
          }
        }
      }
      /*
       * Custos fixos da compra. Seguem a mesma regra da
       * lavagem: viram gasto da moto sempre, e so saem do
       * caixa quando a entrada nao e estoque inicial.
       */
      if (form.documentacao_padrao) {
        const {
          data: gastosDoc,
          error: erroDoc,
        } = await supabase
          .from("motorcycle_expenses")
          .insert(
            CUSTOS_PADRAO_COMPRA.map(
              (padrao) => ({
                motorcycle_id:
                  motoCriada.id,
                data:
                  form.data_entrada,
                categoria:
                  padrao.categoria,
                descricao:
                  padrao.descricao,
                forma_pagamento:
                  "Automático na compra",
                valor: padrao.valor,
              })
            )
          )
          .select("id, valor, descricao");

        if (erroDoc) {
          console.error(
            "Erro ao lancar custos padrao da compra:",
            erroDoc
          );
        } else if (
          gastosDoc &&
          !ehEstoqueInicial
        ) {
          const { error: erroCaixaDoc } =
            await supabase
              .from("cash_transactions")
              .insert(
                gastosDoc.map((gasto) => ({
                  data:
                    fechamentoDaQuinzena(
                      form.data_entrada
                    ),
                  tipo: "saida",
                  /* Mesma empresa da vistoria de transferência. */
                  origem: "vistoria",
                  origem_id: gasto.id,
                  valor:
                    Number(gasto.valor) || 0,
                  descricao: `${
                    gasto.descricao
                  } - ${
                    motoCriada.codigo ||
                    `${form.marca} ${form.modelo}`
                  }`,
                  confirmado: false,
                  data_confirmacao: null,
                }))
              );

          if (erroCaixaDoc) {
            console.error(
              "Erro ao lancar no caixa os custos padrao:",
              erroCaixaDoc
            );
          }
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
          String(valorLiquidoCliente)
        );

        parametros.set(
          "trocaAvaliacao",
          String(valorCompraNumero)
        );

        parametros.set(
          "trocaQuitacao",
          String(valorQuitacaoNumero)
        );

        if (
          form.financeira_quitacao.trim()
        ) {
          parametros.set(
            "trocaFinanceira",
            form.financeira_quitacao.trim()
          );
        }

        parametros.set(
          "trocaDescricao",
          descricao
        );

        window.location.href =
          `/vendas?${parametros.toString()}`;

        return;
      }

      const mensagemLavagem =
        form.lavagem_padrao
          ? lavagemRegistrada
            ? ehEstoqueInicial
              ? " Lavagem padrão de R$ 35,00 adicionada ao custo da moto, sem gerar nova saída no caixa por ser estoque inicial."
              : lavagemLancadaNoCaixa
                ? " Lavagem padrão de R$ 35,00 lançada automaticamente no custo da moto e como saída do caixa na data da compra."
                : " Lavagem padrão de R$ 35,00 adicionada ao custo da moto."
            : " Atenção: a lavagem padrão de R$ 35,00 não pôde ser lançada automaticamente."
          : "";

      setMensagem(
        ehEstoqueInicial
          ? `Moto cadastrada como estoque inicial. O valor de compra será usado no custo e no lucro, mas não foi lançado como saída no caixa.${fornecedorCustomerId ? " Quem vendeu a moto também foi vinculado em Clientes." : ""}${mensagemLavagem}`
          : form.possui_financiamento
            ? `Compra cadastrada com sucesso. A quitação de ${moeda(
                valorQuitacaoNumero
              )} e o repasse de ${moeda(
                valorLiquidoCliente
              )} foram registrados separadamente no caixa.${fornecedorCustomerId ? " Quem vendeu a moto também foi vinculado em Clientes." : ""}${mensagemLavagem}`
            : `Compra cadastrada com sucesso. A moto entrou no estoque e o valor da compra foi lançado como saída no caixa.${fornecedorCustomerId ? " Quem vendeu a moto também foi vinculado em Clientes." : ""}${mensagemLavagem}`
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

                <a
                  href={`/documentos/procuracao/${motoCriadaId}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-dourado px-4 py-2 text-sm font-bold text-preto transition hover:bg-dourado-claro"
                >
                  <FileSignature size={17} />
                  Gerar Procuração
                </a>

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
                  {
                    valor:
                      "outra_loja",
                    nome:
                      "Moto de outra loja",
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
                ehEstoqueInicial || ehOutraLoja
                  ? "border-blue-800 bg-blue-950/20 text-blue-300"
                  : "border-yellow-800 bg-yellow-950/20 text-yellow-300"
              }`}
            >
              {ehOutraLoja
                ? `Moto de ${LOJA_PARCEIRA}: a loja não pagou nada por ela, então o valor de compra fica zero e nada sai do caixa agora. Quando ela for vendida e você repassar o dinheiro, lance o repasse em Registrar Gasto, na ficha dela. Aí o lucro e o saldo do caixa ficam certos sozinhos.`
                : ehEstoqueInicial
                ? "Estoque inicial: use para motos que já pertenciam à loja antes de você começar a usar o sistema. Pode colocar a data real, mesmo retroativa. O valor não gera saída nova no caixa."
                : ehTroca
                  ? "Moto na troca: informe o valor total considerado na moto. Se ela ainda estiver financiada, informe também a quitação. O sistema usa somente a diferença como crédito de entrada e lança a quitação no caixa quando a venda for concluída."
                  : "Compra nova: informe o valor total combinado pela moto. Se ela estiver financiada, o sistema separa a saída do caixa entre quitação ao banco e eventual valor repassado ao vendedor."}
            </div>
          </section>

          {/* MOTO */}

          <section className="rounded-2xl border border-grafite-claro bg-grafite p-5 md:p-7">
            <h2 className="mb-5 border-b border-grafite-claro pb-3 text-lg font-semibold text-dourado">
              Dados da Moto
            </h2>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <CampoComBusca
                label="Marca *"
                value={form.marca}
                onChange={(valor) => {
                  atualizarCampo(
                    "marca",
                    valor
                  );

                  /*
                   * Trocou de marca: o modelo antigo não vale
                   * mais, senão fica Honda com modelo Yamaha.
                   */
                  if (
                    valor !== form.marca
                  ) {
                    atualizarCampo(
                      "modelo",
                      ""
                    );
                  }
                }}
                opcoes={MARCAS}
                placeholder="Honda"
              />

              <CampoComBusca
                label="Modelo *"
                value={form.modelo}
                onChange={(valor) =>
                  atualizarCampo(
                    "modelo",
                    valor
                  )
                }
                opcoes={modelosDaMarca(
                  form.marca
                )}
                placeholder="Fan 160"
                aviso={
                  form.marca &&
                  modelosDaMarca(
                    form.marca
                  ).length === 0
                    ? "Marca sem modelos no catálogo. Digite o modelo na busca."
                    : undefined
                }
              />

              <CampoComBusca
                label="Versão"
                value={form.versao}
                onChange={(valor) =>
                  atualizarCampo(
                    "versao",
                    valor
                  )
                }
                opcoes={versoesDoModelo(
                  form.marca,
                  form.modelo
                )}
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

              <div>
                <label className="mb-2 block text-sm font-medium text-texto-suave">
                  Placa
                </label>

                <div className="flex gap-2">
                  <input
                    value={form.placa}
                    onChange={(event) => {
                      const valor =
                        event.target.value
                          .toUpperCase()
                          .replace(
                            /[^A-Z0-9]/g,
                            ""
                          )
                          .slice(0, 7);

                      atualizarCampo(
                        "placa",
                        valor
                      );

                      setMensagemBuscaPlaca(
                        ""
                      );
                      setErroBuscaPlaca("");
                    }}
                    placeholder="ABC1D23"
                    className="min-w-0 flex-1 rounded-xl border border-grafite-claro bg-preto px-4 py-3 uppercase text-white outline-none transition placeholder:text-zinc-600 focus:border-dourado"
                  />

                  <button
                    type="button"
                    onClick={buscarPlaca}
                    disabled={
                      buscandoPlaca ||
                      form.placa
                        .replace(
                          /[^A-Za-z0-9]/g,
                          ""
                        )
                        .length !== 7
                    }
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-dourado px-4 py-3 font-bold text-preto transition hover:bg-dourado-claro disabled:cursor-not-allowed disabled:opacity-50"
                    title="Consultar dados do veículo pela placa"
                  >
                    <Search size={18} />
                    <span className="hidden sm:inline">
                      {buscandoPlaca
                        ? "Buscando..."
                        : "Buscar placa"}
                    </span>
                  </button>
                </div>

                {mensagemBuscaPlaca && (
                  <p className="mt-2 text-xs leading-5 text-green-400">
                    {mensagemBuscaPlaca}
                  </p>
                )}

                {erroBuscaPlaca && (
                  <p className="mt-2 text-xs leading-5 text-red-400">
                    {erroBuscaPlaca}
                  </p>
                )}
              </div>

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

              <Campo
                label="Cilindrada (cc)"
                type="number"
                value={form.cilindrada}
                onChange={(valor) =>
                  atualizarCampo(
                    "cilindrada",
                    valor
                  )
                }
                placeholder="160"
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


          {/* ITENS / PROCEDÊNCIA */}

          <section className="rounded-2xl border border-grafite-claro bg-grafite p-5 md:p-7">
            <div className="mb-5 border-b border-grafite-claro pb-3">
              <h2 className="text-lg font-semibold text-dourado">
                Itens e Procedência
              </h2>

              <p className="mt-1 text-xs text-texto-suave">
                Marque somente o que acompanha ou corresponde a esta moto.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                form.possui_manual
                  ? "border-dourado bg-dourado/10 text-dourado"
                  : "border-grafite-claro bg-preto/30 text-texto"
              }`}>
                <input
                  type="checkbox"
                  checked={form.possui_manual}
                  onChange={(event) =>
                    atualizarCampo(
                      "possui_manual",
                      event.target.checked
                    )
                  }
                  className="h-4 w-4 accent-yellow-500"
                />
                <span className="font-semibold">Possui manual</span>
              </label>

              <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                form.possui_chave_reserva
                  ? "border-dourado bg-dourado/10 text-dourado"
                  : "border-grafite-claro bg-preto/30 text-texto"
              }`}>
                <input
                  type="checkbox"
                  checked={form.possui_chave_reserva}
                  onChange={(event) =>
                    atualizarCampo(
                      "possui_chave_reserva",
                      event.target.checked
                    )
                  }
                  className="h-4 w-4 accent-yellow-500"
                />
                <span className="font-semibold">Chave reserva</span>
              </label>

              <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                form.unico_dono
                  ? "border-dourado bg-dourado/10 text-dourado"
                  : "border-grafite-claro bg-preto/30 text-texto"
              }`}>
                <input
                  type="checkbox"
                  checked={form.unico_dono}
                  onChange={(event) =>
                    atualizarCampo(
                      "unico_dono",
                      event.target.checked
                    )
                  }
                  className="h-4 w-4 accent-yellow-500"
                />
                <span className="font-semibold">Único dono</span>
              </label>
            </div>
          </section>
          {/* CUSTO PADRÃO */}

          <section className="rounded-2xl border border-grafite-claro bg-grafite p-5 md:p-7">
            <h2 className="mb-5 border-b border-grafite-claro pb-3 text-lg font-semibold text-dourado">
              Custo Padrão
            </h2>

            <label
              className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border p-4 transition ${
                form.lavagem_padrao
                  ? "border-dourado bg-dourado/10"
                  : "border-grafite-claro bg-preto/30"
              }`}
            >
              <div>
                <p className="font-semibold text-white">
                  Lavagem padrão
                </p>
                <p className="mt-1 text-sm text-texto-suave">
                  Ao salvar a compra, lança automaticamente R$ 35,00 no custo da moto e no caixa na mesma data.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="whitespace-nowrap font-bold text-dourado">
                  R$ 35,00
                </span>

                <input
                  type="checkbox"
                  checked={
                    form.lavagem_padrao
                  }
                  onChange={(event) =>
                    atualizarCampo(
                      "lavagem_padrao",
                      event.target.checked
                    )
                  }
                  className="h-5 w-5 accent-yellow-500"
                />
              </div>
            </label>

            {(
              <label
                className={`mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-xl border p-4 transition ${
                  form.documentacao_padrao
                    ? "border-dourado bg-dourado/10"
                    : "border-grafite-claro bg-preto/30"
                }`}
              >
                <div>
                  <p className="font-semibold text-white">
                    Vistoria cautelar
                  </p>

                  <p className="mt-1 text-sm text-texto-suave">
                    Vistoria cautelar, lançada no custo da moto na
                    data da compra.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="whitespace-nowrap font-bold text-dourado">
                    {moeda(TOTAL_PADRAO_COMPRA)}
                  </span>

                  <input
                    type="checkbox"
                    checked={
                      form.documentacao_padrao
                    }
                    onChange={(event) =>
                      atualizarCampo(
                        "documentacao_padrao",
                        event.target.checked
                      )
                    }
                    className="h-5 w-5 accent-yellow-500"
                  />
                </div>
              </label>
            )}

            <p className="mt-3 text-xs leading-5 text-texto-suave">
              As duas opções já vêm marcadas. Desmarque quando a moto não tiver aquele custo.
            </p>
          </section>

          {/* DÉBITOS DA MOTO */}

          <section className="rounded-2xl border border-grafite-claro bg-grafite p-5 md:p-7">
            <div className="mb-5 border-b border-grafite-claro pb-3">
              <h2 className="text-lg font-semibold text-dourado">
                Débitos da Moto *
              </h2>

              <p className="mt-1 text-sm text-texto-suave">
                Responda os três antes de salvar. O que estiver
                em aberto entra no custo da moto e fica pendente
                no caixa até ser pago.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-grafite-claro bg-preto/30 p-4">
                <p className="font-semibold text-white">
                  Possui IPVA a pagar?
                </p>

                <p className="mt-1 text-xs text-texto-suave">
                  IPVA atrasado ou do ano corrente ainda em aberto.
                </p>

                <div className="mt-3 flex gap-2">
                  {(["nao", "sim"] as const).map(
                    (opcao) => (
                      <button
                        key={opcao}
                        type="button"
                        onClick={() =>
                          atualizarCampo(
                            "possui_ipva",
                            opcao
                          )
                        }
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                          form.possui_ipva === opcao
                            ? "border-dourado bg-dourado text-preto"
                            : "border-grafite-claro text-texto-suave hover:border-dourado hover:text-dourado"
                        }`}
                      >
                        {opcao === "sim" ? "Sim" : "Não"}
                      </button>
                    )
                  )}
                </div>

                {form.possui_ipva === "sim" && (
                  <div className="mt-3">
                    <label className="mb-1 block text-xs text-texto-suave">
                      Valor a pagar (R$)
                    </label>

                    <CampoMoeda
                      value={form.valor_ipva}
                      onChange={(valorDigitado) =>
                        atualizarCampo(
                          "valor_ipva",
                          valorDigitado
                        )
                      }
                      className="w-full rounded-lg border border-grafite-claro bg-grafite-claro px-3 py-2.5 text-sm text-texto outline-none focus:border-dourado"
                    />
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-grafite-claro bg-preto/30 p-4">
                <p className="font-semibold text-white">
                  Possui multas?
                </p>

                <p className="mt-1 text-xs text-texto-suave">
                  Multas registradas no documento da moto.
                </p>

                <div className="mt-3 flex gap-2">
                  {(["nao", "sim"] as const).map(
                    (opcao) => (
                      <button
                        key={opcao}
                        type="button"
                        onClick={() =>
                          atualizarCampo(
                            "possui_multas",
                            opcao
                          )
                        }
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                          form.possui_multas === opcao
                            ? "border-dourado bg-dourado text-preto"
                            : "border-grafite-claro text-texto-suave hover:border-dourado hover:text-dourado"
                        }`}
                      >
                        {opcao === "sim" ? "Sim" : "Não"}
                      </button>
                    )
                  )}
                </div>

                {form.possui_multas === "sim" && (
                  <div className="mt-3">
                    <label className="mb-1 block text-xs text-texto-suave">
                      Valor a pagar (R$)
                    </label>

                    <CampoMoeda
                      value={form.valor_multas}
                      onChange={(valorDigitado) =>
                        atualizarCampo(
                          "valor_multas",
                          valorDigitado
                        )
                      }
                      className="w-full rounded-lg border border-grafite-claro bg-grafite-claro px-3 py-2.5 text-sm text-texto outline-none focus:border-dourado"
                    />
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-grafite-claro bg-preto/30 p-4">
                <p className="font-semibold text-white">
                  Precisa licenciar?
                </p>

                <p className="mt-1 text-xs text-texto-suave">
                  Licenciamento do ano ainda não pago.
                </p>

                <div className="mt-3 flex gap-2">
                  {(["nao", "sim"] as const).map(
                    (opcao) => (
                      <button
                        key={opcao}
                        type="button"
                        onClick={() =>
                          atualizarCampo(
                            "possui_licenciamento",
                            opcao
                          )
                        }
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                          form.possui_licenciamento === opcao
                            ? "border-dourado bg-dourado text-preto"
                            : "border-grafite-claro text-texto-suave hover:border-dourado hover:text-dourado"
                        }`}
                      >
                        {opcao === "sim" ? "Sim" : "Não"}
                      </button>
                    )
                  )}
                </div>

                {form.possui_licenciamento === "sim" && (
                  <div className="mt-3">
                    <label className="mb-1 block text-xs text-texto-suave">
                      Valor a pagar (R$)
                    </label>

                    <CampoMoeda
                      value={form.valor_licenciamento}
                      onChange={(valorDigitado) =>
                        atualizarCampo(
                          "valor_licenciamento",
                          valorDigitado
                        )
                      }
                      className="w-full rounded-lg border border-grafite-claro bg-grafite-claro px-3 py-2.5 text-sm text-texto outline-none focus:border-dourado"
                    />
                  </div>
                )}
              </div>
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
                    : ehOutraLoja
                      ? "Valor de compra (fica zero)"
                      : "Valor de compra *"
                }
                type="moeda"
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
                type="moeda"
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

            {form.tipo_entrada ===
              "compra_nova" && (
              <div className="mt-5">
                <CampoPagamentoFeito
                  titulo="Você já pagou esta moto?"
                  pago={pagoCompra}
                  aoMudarPago={
                    setPagoCompra
                  }
                  dataPrevista={
                    previsaoCompra
                  }
                  aoMudarDataPrevista={
                    setPrevisaoCompra
                  }
                  rotuloPago="Já paguei"
                  rotuloPendente="Ainda vou pagar"
                  ajudaPendente="A saída fica pendente no caixa até você dar baixa, no dia do acerto."
                />
              </div>
            )}

            {!ehEstoqueInicial && (
              <div className="mt-5 rounded-xl border border-grafite-claro bg-preto/40 p-4">
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                    form.possui_financiamento
                      ? "border-dourado bg-dourado/10 text-dourado"
                      : "border-grafite-claro bg-preto text-texto"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={
                      form.possui_financiamento
                    }
                    onChange={(event) =>
                      atualizarCampo(
                        "possui_financiamento",
                        event.target.checked
                      )
                    }
                    className="h-4 w-4 accent-yellow-500"
                  />

                  <span className="font-semibold">
                    Moto possui financiamento para quitar
                  </span>
                </label>

                {form.possui_financiamento && (
                  <div className="mt-4 grid gap-5 md:grid-cols-2">
                    <Campo
                      label="Valor da quitação *"
                      type="moeda"
                      value={
                        form.valor_quitacao
                      }
                      onChange={(valor) =>
                        atualizarCampo(
                          "valor_quitacao",
                          valor
                        )
                      }
                      placeholder="0,00"
                    />

                    <Campo
                      label="Banco / financeira da quitação *"
                      value={
                        form.financeira_quitacao
                      }
                      onChange={(valor) =>
                        atualizarCampo(
                          "financeira_quitacao",
                          valor
                        )
                      }
                      placeholder="Ex.: Banco Honda"
                    />
                  </div>
                )}

                {form.possui_financiamento && (
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-grafite-claro bg-preto p-4">
                      <p className="text-xs text-texto-suave">
                        Valor considerado na moto
                      </p>
                      <p className="mt-1 text-lg font-bold text-white">
                        {moeda(
                          valorCompraNumero
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl border border-grafite-claro bg-preto p-4">
                      <p className="text-xs text-texto-suave">
                        Quitação
                      </p>
                      <p className="mt-1 text-lg font-bold text-red-300">
                        {moeda(
                          valorQuitacaoNumero
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl border border-dourado/40 bg-dourado/10 p-4">
                      <p className="text-xs text-texto-suave">
                        {ehTroca
                          ? "Crédito líquido para a entrada"
                          : "Valor a repassar ao vendedor"}
                      </p>
                      <p className="mt-1 text-lg font-bold text-dourado">
                        {moeda(
                          valorLiquidoCliente
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {form.possui_financiamento && (
                  <p className="mt-3 text-xs leading-5 text-texto-suave">
                    {ehTroca
                      ? "Na troca, o custo da moto no estoque continua sendo o valor total considerado. A quitação sai do caixa e somente a diferença vira crédito de entrada na venda."
                      : "Na compra direta, o custo da moto no estoque continua sendo o valor total combinado. O caixa separa a quitação ao banco do valor que será repassado ao vendedor."}
                  </p>
                )}

                {form.possui_financiamento &&
                  valorQuitacaoNumero >
                    valorCompraNumero && (
                    <p className="mt-3 text-sm text-red-300">
                      A quitação está maior que o valor considerado na moto. Ajuste os valores antes de salvar.
                    </p>
                  )}
              </div>
            )}

            <div className="mt-5 rounded-xl border border-grafite-claro bg-preto p-4">
              <p className="text-xs text-texto-suave">
                {ehTroca
                  ? "Valor considerado na troca"
                  : "Valor da compra"}
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

              <div>
                <label className="mb-2 block text-sm font-medium text-texto-suave">
                  CEP
                </label>

                <div className="relative">
                  <input
                    value={
                      form.fornecedor_cep
                    }
                    inputMode="numeric"
                    maxLength={9}
                    onChange={(event) => {
                      atualizarCampo(
                        "fornecedor_cep",
                        formatarCep(
                          event.target.value
                        )
                      );

                      setErroCepFornecedor(
                        ""
                      );
                      setCepFornecedorEncontrado(
                        false
                      );
                    }}
                    placeholder="00000-000"
                    className="w-full rounded-xl border border-grafite-claro bg-preto px-4 py-3 pr-28 text-white outline-none transition placeholder:text-zinc-600 focus:border-dourado"
                  />

                  <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                    {buscandoCepFornecedor ? (
                      <span className="text-xs font-semibold text-dourado">
                        Buscando...
                      </span>
                    ) : cepFornecedorEncontrado ? (
                      <span className="text-xs font-semibold text-green-400">
                        Encontrado
                      </span>
                    ) : null}
                  </div>
                </div>

                {erroCepFornecedor && (
                  <p className="mt-2 text-xs leading-5 text-red-400">
                    {erroCepFornecedor}
                  </p>
                )}

                <p className="mt-2 text-xs leading-5 text-texto-suave">
                  Ao informar os 8 números,
                  Rua, Bairro, Cidade e Estado
                  são preenchidos automaticamente.
                </p>
              </div>

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
                label="Complemento"
                value={
                  form.fornecedor_complemento
                }
                onChange={(valor) =>
                  atualizarCampo(
                    "fornecedor_complemento",
                    valor
                  )
                }
                placeholder="Apto, bloco, fundos, casa..."
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

          {/* INTERMEDIADOR */}

          <section className="rounded-2xl border border-grafite-claro bg-grafite p-5 md:p-7">
            <button
              type="button"
              onClick={() =>
                setAbrirIntermediador(
                  !abrirIntermediador
                )
              }
              className="flex w-full items-center justify-between gap-4 text-left"
            >
              <div>
                <h2 className="text-lg font-semibold text-dourado">
                  Quem Intermediou a Venda
                </h2>

                <p className="mt-1 text-xs text-texto-suave">
                  Preencha só quando quem entregou a moto não é
                  o dono do documento.
                </p>
              </div>

              <span className="whitespace-nowrap text-sm font-semibold text-dourado">
                {abrirIntermediador
                  ? "Fechar"
                  : form.intermediador_nome.trim()
                    ? form.intermediador_nome
                    : "Abrir"}
              </span>
            </button>

            {abrirIntermediador && (
            <>
            <p className="mt-4 border-t border-grafite-claro pt-4 text-xs text-texto-suave">
              O contrato e a procuração continuam saindo no nome
              do dono; isto fica registrado para a loja saber com
              quem tratou.
            </p>

            <div className="mt-4 grid gap-5 md:grid-cols-2">
              <Campo
                label="Nome do intermediador"
                value={form.intermediador_nome}
                onChange={(valor) =>
                  atualizarCampo(
                    "intermediador_nome",
                    valor
                  )
                }
                placeholder="Nome completo"
              />

              <Campo
                label="Telefone"
                value={form.intermediador_telefone}
                onChange={(valor) =>
                  atualizarCampo(
                    "intermediador_telefone",
                    valor
                  )
                }
                placeholder="(00) 00000-0000"
              />

              <Campo
                label="CPF"
                value={form.intermediador_cpf}
                onChange={(valor) =>
                  atualizarCampo(
                    "intermediador_cpf",
                    valor
                  )
                }
                placeholder="000.000.000-00"
              />

              <Campo
                label="RG"
                value={form.intermediador_rg}
                onChange={(valor) =>
                  atualizarCampo(
                    "intermediador_rg",
                    valor
                  )
                }
                placeholder="00.000.000-0"
              />
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-texto-suave">
                Observações sobre a negociação
              </label>

              <textarea
                value={
                  form.intermediador_observacoes
                }
                onChange={(event) =>
                  atualizarCampo(
                    "intermediador_observacoes",
                    event.target.value
                  )
                }
                rows={2}
                placeholder="Ex.: irmão do dono, negociou pelo WhatsApp"
                className="w-full rounded-xl border border-grafite-claro bg-preto/40 px-4 py-3 text-texto outline-none transition focus:border-dourado"
              />
            </div>
            </>
            )}
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
              title="Cadastre a moto primeiro para gerar a procuração."
              className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-dourado px-6 py-3 font-semibold text-dourado opacity-40"
            >
              <FileSignature size={18} />
              Gerar Procuração após salvar
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

      {type === "moeda" ? (
        <CampoMoeda
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full rounded-xl border border-grafite-claro bg-preto px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-dourado"
        />
      ) : (
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
      )}
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
