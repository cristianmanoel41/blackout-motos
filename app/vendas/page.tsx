"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import {
  BANCOS_FINANCIAMENTO,
  OPERADORA_CARTAO,
} from "@/lib/dados/financeiras";
import {
  enviarVistoria,
  tamanhoLegivel,
  TIPOS_ACEITOS,
} from "@/components/Vistorias";
import {
  Bike,
  ClipboardCheck,
  CreditCard,
  FileSignature,
  FileText,
  HardHat,
  Plus,
  Trash2,
} from "lucide-react";

const supabase = createClient();

type Moto = {
  id: string | number;
  preco_anunciado?:
    | number
    | string
    | null;
  codigo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  versao?: string | null;
  cor?: string | null;
  ano_modelo?: string | number | null;
  placa?: string | null;
  status?: string | null;
};

type Cliente = {
  id: string;
  nome: string;
  telefone?: string | null;
  cpf?: string | null;
};

type TipoPagamento =
  | "Pix"
  | "Dinheiro"
  | "Transferência"
  | "Cartão"
  | "Moto na troca";

type DestinoPagamento =
  | "moto"
  | "capacete";

type ComponentePagamento = {
  idLocal: string;
  tipo: TipoPagamento;
  destino: DestinoPagamento;
  valor: string;
  parcelas: string;
  motoId?: string;
  motoDescricao?: string;
};

type ModeloCapacete = {
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

type CapaceteVenda = {
  idLocal: string;
  modeloId: string;
  quantidade: string;
  valorUnitario: string;
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


function horaAtual() {
  const data = new Date();

  const hora = String(
    data.getHours()
  ).padStart(2, "0");

  const minuto = String(
    data.getMinutes()
  ).padStart(2, "0");

  return `${hora}:${minuto}`;
}

function moeda(valor: number) {
  return formatarMoeda(valor);
}

function normalizarTexto(
  valor: string
) {
  return valor
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim();
}

function apenasLetrasNumeros(
  valor: string
) {
  return normalizarTexto(
    valor
  ).replace(/[^a-z0-9]/g, "");
}

function textoDaMoto(moto: Moto) {
  return [
    moto.codigo,
    moto.marca,
    moto.modelo,
    moto.versao,
    moto.cor,
    moto.placa,
    moto.ano_modelo,
  ]
    .map((parte) =>
      apenasLetrasNumeros(
        String(parte ?? "")
      )
    )
    .filter(Boolean)
    .join(" ");
}

function novoIdLocal() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export default function VendasPage() {
  const [motos, setMotos] =
    useState<Moto[]>([]);

  const [clientes, setClientes] =
    useState<Cliente[]>([]);

  const [
    carregandoMotos,
    setCarregandoMotos,
  ] = useState(true);

  const [
    carregandoClientes,
    setCarregandoClientes,
  ] = useState(true);

  const [salvando, setSalvando] =
    useState(false);

  const [mensagem, setMensagem] =
    useState("");

  const [erro, setErro] =
    useState("");

  const [dataVenda, setDataVenda] =
    useState(hoje());

  const [horaVenda, setHoraVenda] =
    useState(horaAtual());

  const [motoId, setMotoId] =
    useState("");

  const [
    buscaMoto,
    setBuscaMoto,
  ] = useState("");

  const [
    documentos,
    setDocumentos,
  ] = useState<{
    vendaId: string;
    motoTrocaId: string;
  } | null>(null);

  const [clienteId, setClienteId] =
    useState("");

  const [
    buscaCliente,
    setBuscaCliente,
  ] = useState("");

  const [vendedor, setVendedor] =
    useState("");

  const [tipoVenda, setTipoVenda] =
    useState<
      "avista" | "financiamento"
    >("avista");

  const [valorVenda, setValorVenda] =
    useState("");

  const [banco, setBanco] =
    useState("");

  const [
    parcelasFinanciamento,
    setParcelasFinanciamento,
  ] = useState("");

  const [
    valorParcelaManual,
    setValorParcelaManual,
  ] = useState("");

  const [
    componentes,
    setComponentes,
  ] = useState<
    ComponentePagamento[]
  >([]);

  const [
    modelosCapacete,
    setModelosCapacete,
  ] = useState<
    ModeloCapacete[]
  >([]);

  const [
    capacetes,
    setCapacetes,
  ] = useState<
    CapaceteVenda[]
  >([]);

  const [
    vistoriaTransferencia,
    setVistoriaTransferencia,
  ] = useState<File | null>(
    null
  );

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

  const motoSelecionada =
    motos.find(
      (moto) =>
        String(moto.id) ===
        String(motoId)
    );

  const precoAnunciado =
    Number(
      motoSelecionada?.preco_anunciado
    ) || 0;

  const motosFiltradas =
    useMemo(() => {
      const termos = buscaMoto
        .split(/\s+/)
        .map((termo) =>
          apenasLetrasNumeros(
            termo
          )
        )
        .filter(Boolean);

      if (
        termos.length === 0
      ) {
        return motos;
      }

      return motos.filter(
        (moto) => {
          if (
            String(moto.id) ===
            String(motoId)
          ) {
            return true;
          }

          const texto =
            textoDaMoto(moto);

          return termos.every(
            (termo) =>
              texto.includes(
                termo
              )
          );
        }
      );
    }, [
      motos,
      buscaMoto,
      motoId,
    ]);

  const clienteSelecionado =
    clientes.find(
      (cliente) =>
        String(cliente.id) ===
        String(clienteId)
    );

  const clientesFiltrados =
    clientes.filter((cliente) => {
      const termoTexto =
        normalizarTexto(
          buscaCliente
        );

      const termoCpf =
        buscaCliente.replace(
          /\D/g,
          ""
        );

      if (
        !termoTexto &&
        !termoCpf
      ) {
        return [];
      }

      const nome =
        normalizarTexto(
          cliente.nome || ""
        );

      const cpf = (
        cliente.cpf || ""
      ).replace(/\D/g, "");

      const encontrouNome =
        termoTexto.length > 0 &&
        nome.includes(
          termoTexto
        );

      const encontrouCpf =
        termoCpf.length > 0 &&
        cpf.includes(
          termoCpf
        );

      return (
        encontrouNome ||
        encontrouCpf
      );
    });

  const valorVendaNumero =
    Number(valorVenda) || 0;

  const entradaTotal =
    useMemo(() => {
      return componentes.reduce(
        (total, componente) =>
          total +
          (Number(
            componente.valor
          ) || 0),
        0
      );
    }, [componentes]);

  const totalCapacetes =
    useMemo(() => {
      return capacetes.reduce(
        (total, item) =>
          total +
          (Number(
            item.quantidade
          ) || 0) *
            (Number(
              item.valorUnitario
            ) || 0),
        0
      );
    }, [capacetes]);

  const custoCapacetes =
    useMemo(() => {
      return capacetes.reduce(
        (total, item) => {
          const modelo =
            modelosCapacete.find(
              (m) =>
                m.id ===
                item.modeloId
            );

          return (
            total +
            (Number(
              item.quantidade
            ) || 0) *
              Number(
                modelo?.custo_medio ||
                  0
              )
          );
        },
        0
      );
    }, [
      capacetes,
      modelosCapacete,
    ]);

  /*
   * O cliente paga a moto + os capacetes levados.
   * Capacete com valor zerado é brinde: sai do
   * estoque, vira custo e não soma na venda.
   */
  const valorTotalVenda =
    valorVendaNumero +
    totalCapacetes;

  /*
   * Cada forma de pagamento diz o que está quitando.
   * Assim dá para passar a moto no cartão e o capacete
   * no Pix, sem misturar as contas.
   */
  const pagoNaMoto =
    useMemo(() => {
      return componentes
        .filter(
          (componente) =>
            componente.destino !==
            "capacete"
        )
        .reduce(
          (total, componente) =>
            total +
            (Number(
              componente.valor
            ) || 0),
          0
        );
    }, [componentes]);

  const pagoNosCapacetes =
    useMemo(() => {
      return componentes
        .filter(
          (componente) =>
            componente.destino ===
            "capacete"
        )
        .reduce(
          (total, componente) =>
            total +
            (Number(
              componente.valor
            ) || 0),
          0
        );
    }, [componentes]);

  const faltaNaMoto =
    Math.max(
      valorVendaNumero -
        pagoNaMoto,
      0
    );

  const faltaNosCapacetes =
    Math.max(
      totalCapacetes -
        pagoNosCapacetes,
      0
    );

  const valorFinanciado =
    useMemo(() => {
      if (
        tipoVenda !==
        "financiamento"
      ) {
        return 0;
      }

      /*
       * O banco financia o que falta DA MOTO.
       * Capacete não entra no financiamento: é pago
       * na hora, com forma de pagamento própria.
       */
      return Math.max(
        valorVendaNumero -
          pagoNaMoto,
        0
      );
    }, [
      tipoVenda,
      valorVendaNumero,
      pagoNaMoto,
    ]);

  const parcelasNumero =
    Number(
      parcelasFinanciamento
    ) || 0;

  const valorParcelaFinal =
    Number(
      valorParcelaManual
    ) || 0;

  const totalPagamentosCaixa =
    useMemo(() => {
      return componentes
        .filter(
          (componente) =>
            componente.tipo !==
            "Moto na troca"
        )
        .reduce(
          (total, componente) =>
            total +
            (Number(
              componente.valor
            ) || 0),
          0
        );
    }, [componentes]);

  const totalTroca =
    useMemo(() => {
      return componentes
        .filter(
          (componente) =>
            componente.tipo ===
            "Moto na troca"
        )
        .reduce(
          (total, componente) =>
            total +
            (Number(
              componente.valor
            ) || 0),
          0
        );
    }, [componentes]);

  const valorFalta =
    Math.max(
      valorTotalVenda -
        entradaTotal,
      0
    );

  async function carregarMotos() {
    setCarregandoMotos(true);

    const { data, error } =
      await supabase
        .from("motorcycles")
        .select("*")
        .in("status", [
          "disponivel",
          "reservada",
        ])
        .order("criado_em", {
          ascending: false,
        });

    if (error) {
      setErro(
        `Não foi possível carregar as motos: ${error.message}`
      );
      setCarregandoMotos(false);
      return;
    }

    setMotos(data || []);
    setCarregandoMotos(false);
  }

  async function carregarCapacetes() {
    const { data, error } =
      await supabase
        .from(
          "helmet_models"
        )
        .select(
          "id, produto, marca, modelo, cor, tamanho, preco_venda_padrao, custo_medio, estoque_atual"
        )
        .eq("ativo", true)
        .order("marca", {
          ascending: true,
        })
        .order("modelo", {
          ascending: true,
        })
        .order("tamanho", {
          ascending: true,
        });

    if (error) {
      console.error(
        "Erro ao carregar capacetes:",
        error
      );
      return;
    }

    setModelosCapacete(
      (data as ModeloCapacete[]) ||
        []
    );
  }

  async function carregarClientes(
    clienteParaSelecionar?: string
  ) {
    setCarregandoClientes(true);

    const { data, error } =
      await supabase
        .from("customers")
        .select(
          "id, nome, telefone, cpf"
        )
        .order("nome", {
          ascending: true,
        });

    if (error) {
      setErro(
        `Não foi possível carregar os clientes: ${error.message}`
      );
      setCarregandoClientes(false);
      return;
    }

    const lista = data || [];
    setClientes(lista);

    if (
      clienteParaSelecionar
    ) {
      const encontrado =
        lista.find(
          (cliente) =>
            String(
              cliente.id
            ) ===
            String(
              clienteParaSelecionar
            )
        );

      if (encontrado) {
        setClienteId(
          String(
            encontrado.id
          )
        );

        setBuscaCliente(
          encontrado.nome
        );
      }
    }

    setCarregandoClientes(false);
  }

  useEffect(() => {
    async function iniciar() {
      const parametros =
        new URLSearchParams(
          window.location.search
        );

      const motoRecebida =
        parametros.get("moto") ||
        "";

      const clienteRecebido =
        parametros.get(
          "cliente"
        ) || "";

      const trocaMotoId =
        parametros.get(
          "trocaMoto"
        ) || "";

      const trocaDescricao =
        parametros.get(
          "trocaDescricao"
        ) || "";

      const trocaValor =
        parametros.get(
          "trocaValor"
        ) || "";

      const rascunhoSalvo =
        sessionStorage.getItem(
          "blackout-venda-em-andamento"
        );

      if (rascunhoSalvo) {
        try {
          const rascunho =
            JSON.parse(
              rascunhoSalvo
            );

          if (
            rascunho.dataVenda
          ) {
            setDataVenda(
              rascunho.dataVenda
            );
          }

          if (
            rascunho.horaVenda
          ) {
            setHoraVenda(
              rascunho.horaVenda
            );
          }

          if (rascunho.motoId) {
            setMotoId(
              rascunho.motoId
            );
          }

          if (
            rascunho.vendedor
          ) {
            setVendedor(
              rascunho.vendedor
            );
          }

          if (
            rascunho.tipoVenda
          ) {
            setTipoVenda(
              rascunho.tipoVenda
            );
          }

          if (
            rascunho.valorVenda
          ) {
            setValorVenda(
              rascunho.valorVenda
            );
          }

          /*
           * Só restaura o banco se ele for um dos que a
           * loja trabalha. Rascunho antigo, de quando o
           * campo era texto livre, não volta com lixo.
           */
          if (
            rascunho.banco &&
            BANCOS_FINANCIAMENTO.some(
              (nome) =>
                nome ===
                rascunho.banco
            )
          ) {
            setBanco(
              rascunho.banco
            );
          }

          if (
            rascunho.clienteId
          ) {
            setClienteId(
              rascunho.clienteId
            );
          }

          if (
            rascunho.buscaCliente
          ) {
            setBuscaCliente(
              rascunho.buscaCliente
            );
          }

          if (
            rascunho.parcelasFinanciamento
          ) {
            setParcelasFinanciamento(
              rascunho.parcelasFinanciamento
            );
          }

          if (
            rascunho.valorParcelaManual
          ) {
            setValorParcelaManual(
              rascunho.valorParcelaManual
            );
          }

          if (
            Array.isArray(
              rascunho.componentes
            )
          ) {
            /*
             * Rascunho salvo antes da separação
             * moto/capacete não tem destino:
             * tudo que existia pagava a moto.
             */
            setComponentes(
              rascunho.componentes.map(
                (
                  componente: ComponentePagamento
                ) => ({
                  ...componente,
                  destino:
                    componente.destino ===
                    "capacete"
                      ? "capacete"
                      : "moto",
                })
              )
            );
          }

          if (
            Array.isArray(
              rascunho.capacetes
            )
          ) {
            setCapacetes(
              rascunho.capacetes
            );
          }

          if (
            rascunho.transferenciaCliente
          ) {
            setTransferenciaCliente(
              rascunho.transferenciaCliente
            );
          }

          if (
            rascunho.transferenciaLoja
          ) {
            setTransferenciaLoja(
              rascunho.transferenciaLoja
            );
          }

          if (
            rascunho.observacoes
          ) {
            setObservacoes(
              rascunho.observacoes
            );
          }
        } catch (e) {
          console.error(
            "Erro ao restaurar venda:",
            e
          );
        }
      }

      if (motoRecebida) {
        setMotoId(
          motoRecebida
        );
      }

      if (
        trocaMotoId &&
        trocaValor
      ) {
        setComponentes(
          (atuais) => {
            const jaExiste =
              atuais.some(
                (item) =>
                  item.motoId ===
                  trocaMotoId
              );

            if (jaExiste) {
              return atuais;
            }

            return [
              ...atuais,
              {
                idLocal:
                  novoIdLocal(),
                tipo:
                  "Moto na troca",
                destino:
                  "moto",
                valor:
                  trocaValor,
                parcelas: "1",
                motoId:
                  trocaMotoId,
                motoDescricao:
                  trocaDescricao ||
                  "Moto recebida na troca",
              },
            ];
          }
        );
      }

      await carregarMotos();

      await carregarCapacetes();

      await carregarClientes(
        clienteRecebido
      );
    }

    iniciar();
  }, []);

  /*
   * Quando a moto já vem escolhida (link do estoque ou
   * rascunho da venda), o preço anunciado só existe depois
   * que a lista de motos carrega. Preenche aqui, sem
   * apagar valor que já tenha sido digitado.
   */
  useEffect(() => {
    if (
      !motoId ||
      valorVenda.trim() !== ""
    ) {
      return;
    }

    const moto = motos.find(
      (item) =>
        String(item.id) ===
        String(motoId)
    );

    const preco =
      Number(
        moto?.preco_anunciado
      ) || 0;

    if (preco > 0) {
      setValorVenda(
        String(preco)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motos, motoId]);

  function salvarRascunho() {
    const rascunho = {
      dataVenda,
      horaVenda,
      motoId,
      vendedor,
      tipoVenda,
      valorVenda,
      banco,
      parcelasFinanciamento,
      valorParcelaManual,
      clienteId,
      buscaCliente,
      componentes,
      capacetes,
      transferenciaCliente,
      transferenciaLoja,
      observacoes,
    };

    sessionStorage.setItem(
      "blackout-venda-em-andamento",
      JSON.stringify(
        rascunho
      )
    );
  }

  function cadastrarNovoCliente() {
    salvarRascunho();

    const parametros =
      new URLSearchParams();

    parametros.set(
      "retorno",
      "venda"
    );

    if (motoId) {
      parametros.set(
        "moto",
        motoId
      );
    }

    window.location.href =
      `/clientes/novo?${parametros.toString()}`;
  }

  function cadastrarMotoTroca() {
    if (!clienteId) {
      const seguir =
        window.confirm(
          "Nenhum cliente selecionado. Os dados de quem está entregando a moto não serão preenchidos automaticamente (a procuração e o contrato de compra precisam deles). Deseja continuar mesmo assim?"
        );

      if (!seguir) return;
    }

    salvarRascunho();

    const parametros =
      new URLSearchParams();

    parametros.set(
      "retorno",
      "venda-troca"
    );

    if (clienteId) {
      parametros.set(
        "cliente",
        clienteId
      );
    }

    window.location.href =
      `/motos/nova?${parametros.toString()}`;
  }

  /*
   * Ao trocar a moto, o valor da venda vem do preço
   * anunciado no cadastro dela. Continua editável:
   * o que foi negociado manda.
   */
  function selecionarMoto(
    novoMotoId: string
  ) {
    setMotoId(novoMotoId);

    const moto = motos.find(
      (item) =>
        String(item.id) ===
        String(novoMotoId)
    );

    const preco =
      Number(
        moto?.preco_anunciado
      ) || 0;

    if (preco > 0) {
      setValorVenda(
        String(preco)
      );
    }
  }

  function adicionarPagamento(
    tipo: TipoPagamento
  ) {
    if (
      tipo ===
      "Moto na troca"
    ) {
      cadastrarMotoTroca();
      return;
    }

    setComponentes(
      (atuais) => [
        ...atuais,
        {
          idLocal:
            novoIdLocal(),
          tipo,
          destino:
            faltaNaMoto <=
              0.009 &&
            faltaNosCapacetes >
              0.009
              ? "capacete"
              : "moto",
          valor: "",
          parcelas: "1",
        },
      ]
    );
  }

  function alterarComponente(
    idLocal: string,
    campo:
      | "valor"
      | "parcelas"
      | "destino",
    valor: string
  ) {
    setComponentes(
      (atuais) =>
        atuais.map(
          (item) =>
            item.idLocal ===
            idLocal
              ? {
                  ...item,
                  [campo]: valor,
                }
              : item
        )
    );
  }

  function removerComponente(
    idLocal: string
  ) {
    setComponentes(
      (atuais) =>
        atuais.filter(
          (item) =>
            item.idLocal !==
            idLocal
        )
    );
  }

  function adicionarCapacete() {
    setCapacetes(
      (atuais) => [
        ...atuais,
        {
          idLocal:
            novoIdLocal(),
          modeloId: "",
          quantidade: "1",
          valorUnitario: "",
        },
      ]
    );
  }

  function alterarCapacete(
    idLocal: string,
    campo:
      | "modeloId"
      | "quantidade"
      | "valorUnitario",
    valor: string
  ) {
    setCapacetes((atuais) =>
      atuais.map((item) => {
        if (
          item.idLocal !==
          idLocal
        ) {
          return item;
        }

        const atualizado = {
          ...item,
          [campo]: valor,
        };

        /*
         * Ao escolher o capacete já sugerimos
         * o valor padrão do modelo.
         */
        if (
          campo === "modeloId"
        ) {
          const modelo =
            modelosCapacete.find(
              (m) =>
                m.id === valor
            );

          atualizado.valorUnitario =
            modelo
              ? String(
                  modelo.preco_venda_padrao ??
                    ""
                )
              : "";
        }

        return atualizado;
      })
    );
  }

  function removerCapacete(
    idLocal: string
  ) {
    setCapacetes((atuais) =>
      atuais.filter(
        (item) =>
          item.idLocal !==
          idLocal
      )
    );
  }

  function limparFormulario() {
    setDataVenda(hoje());
    setHoraVenda(horaAtual());
    setMotoId("");
    setBuscaMoto("");
    setClienteId("");
    setBuscaCliente("");
    setVendedor("");
    setTipoVenda("avista");
    setValorVenda("");
    setBanco("");
    setParcelasFinanciamento("");
    setValorParcelaManual("");
    setComponentes([]);
    setCapacetes([]);
    setVistoriaTransferencia(null);
    setTransferenciaCliente("");
    setTransferenciaLoja("");
    setObservacoes("");
  }

  async function salvarVenda(
    event: FormEvent
  ) {
    event.preventDefault();

    setErro("");
    setMensagem("");
    setDocumentos(null);

    if (!horaVenda) {
      setErro(
        "Informe a hora da venda."
      );
      return;
    }

    if (!motoId) {
      setErro(
        "Selecione a moto vendida."
      );
      return;
    }

    if (
      !clienteId ||
      !clienteSelecionado
    ) {
      setErro(
        "É obrigatório selecionar um cliente cadastrado."
      );
      return;
    }

    if (!vendedor) {
      setErro(
        "Selecione o vendedor."
      );
      return;
    }

    if (
      valorVendaNumero <= 0
    ) {
      setErro(
        "Informe o valor da moto."
      );
      return;
    }

    if (
      componentes.length === 0
    ) {
      setErro(
        tipoVenda ===
          "financiamento"
          ? "Adicione pelo menos uma forma de pagamento para a entrada."
          : "Adicione a forma de pagamento da venda."
      );
      return;
    }

    for (
      const componente of
      componentes
    ) {
      const valor =
        Number(
          componente.valor
        ) || 0;

      if (valor <= 0) {
        setErro(
          `Informe o valor de ${componente.tipo}.`
        );
        return;
      }

      if (
        componente.tipo ===
          "Cartão" &&
        (
          Number(
            componente.parcelas
          ) < 1 ||
          Number(
            componente.parcelas
          ) > 24
        )
      ) {
        setErro(
          "No cartão, escolha de 1x a 24x."
        );
        return;
      }

      if (
        componente.tipo ===
          "Moto na troca" &&
        !componente.motoId
      ) {
        setErro(
          "A moto recebida na troca precisa estar cadastrada e vinculada."
        );
        return;
      }
    }

    const capacetesPorModelo:
      Record<string, number> = {};

    for (const capacete of capacetes) {
      if (!capacete.modeloId) {
        setErro(
          "Escolha o capacete ou remova a linha vazia."
        );
        return;
      }

      const quantidade =
        Number(
          capacete.quantidade
        ) || 0;

      if (quantidade <= 0) {
        setErro(
          "A quantidade de cada capacete precisa ser maior que zero."
        );
        return;
      }

      capacetesPorModelo[
        capacete.modeloId
      ] =
        (capacetesPorModelo[
          capacete.modeloId
        ] || 0) + quantidade;
    }

    for (const [
      modeloId,
      quantidade,
    ] of Object.entries(
      capacetesPorModelo
    )) {
      const modelo =
        modelosCapacete.find(
          (m) =>
            m.id === modeloId
        );

      if (
        modelo &&
        quantidade >
          Number(
            modelo.estoque_atual ||
              0
          )
      ) {
        setErro(
          `Estoque insuficiente de ${modelo.marca} ${modelo.modelo} (${modelo.tamanho}). Disponível: ${modelo.estoque_atual}.`
        );
        return;
      }
    }

    if (
      pagoNaMoto >
      valorVendaNumero + 0.009
    ) {
      setErro(
        `Os pagamentos marcados como "Moto" (${moeda(
          pagoNaMoto
        )}) passam do valor da moto (${moeda(
          valorVendaNumero
        )}).`
      );
      return;
    }

    if (
      pagoNosCapacetes >
      totalCapacetes + 0.009
    ) {
      setErro(
        `Os pagamentos marcados como "Capacete" (${moeda(
          pagoNosCapacetes
        )}) passam do valor dos capacetes (${moeda(
          totalCapacetes
        )}).`
      );
      return;
    }

    /*
     * Os capacetes são sempre pagos na hora, mesmo
     * quando a moto é financiada.
     */
    if (
      totalCapacetes > 0 &&
      faltaNosCapacetes > 0.009
    ) {
      setErro(
        `Falta ${moeda(
          faltaNosCapacetes
        )} para fechar o pagamento dos capacetes. Adicione uma forma de pagamento marcada como "Capacete".`
      );
      return;
    }

    if (
      tipoVenda === "avista" &&
      faltaNaMoto > 0.009
    ) {
      setErro(
        `Na venda à vista, a composição precisa fechar o valor da moto. Falta ${moeda(
          faltaNaMoto
        )}.`
      );
      return;
    }

    if (
      tipoVenda ===
        "financiamento" &&
      faltaNaMoto <= 0.009
    ) {
      setErro(
        "A entrada já cobre todo o valor da moto, então não sobra nada para financiar. Altere o tipo da venda para À vista."
      );
      return;
    }

    if (
      tipoVenda ===
        "financiamento" &&
      !banco.trim()
    ) {
      setErro(
        "Informe o banco ou financeira."
      );
      return;
    }

    if (
      tipoVenda ===
        "financiamento" &&
      parcelasNumero <= 0
    ) {
      setErro(
        "Selecione em quantas parcelas o financiamento será pago."
      );
      return;
    }

    const confirmar =
      window.confirm(
        `Confirmar a venda de ${
          motoSelecionada
            ? `${motoSelecionada.marca || ""} ${motoSelecionada.modelo || ""}`
            : "esta moto"
        } para ${clienteSelecionado.nome}?`
      );

    if (!confirmar) {
      return;
    }

    setSalvando(true);

    try {
      const formaResumo =
        tipoVenda ===
        "financiamento"
          ? "Financiamento"
          : componentes.length ===
              1
            ? componentes[0]
                .tipo
            : "Misto";

      /*
       * Na venda financiada, a entrada é o que foi pago
       * DA MOTO: entrada + financiado = valor da moto.
       * O que pagou capacete fica fora dessa conta.
       */
      const entradaCompat =
        tipoVenda ===
        "financiamento"
          ? pagoNaMoto
          : valorTotalVenda;

      const {
        data: vendaCriada,
        error: vendaError,
      } = await supabase
        .from("sales")
        .insert({
          data_venda: dataVenda,
          hora_venda: horaVenda,
          motorcycle_id:
            motoId,
          customer_id:
            clienteSelecionado.id,
          cliente:
            clienteSelecionado.nome.trim(),
          telefone:
            clienteSelecionado.telefone?.trim() ||
            "",
          vendedor,
          forma_pagamento:
            formaResumo,
          tipo_venda:
            tipoVenda,
          valor_venda:
            valorVendaNumero,
          valor_total_venda:
            valorTotalVenda,
          entrada:
            entradaCompat,
          entrada_total:
            entradaCompat,
          valor_financiado:
            valorFinanciado,
          banco:
            tipoVenda ===
            "financiamento"
              ? banco.trim()
              : null,
          parcelas_financiamento:
            tipoVenda ===
            "financiamento"
              ? parcelasNumero
              : null,
          valor_parcela_financiamento:
            tipoVenda ===
              "financiamento" &&
            valorParcelaFinal > 0
              ? valorParcelaFinal
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
        .select("id")
        .single();

      if (
        vendaError ||
        !vendaCriada
      ) {
        throw (
          vendaError ||
          new Error(
            "Não foi possível registrar a venda."
          )
        );
      }

      const componentesBanco =
        componentes.map(
          (componente) => {
            const valor =
              Number(
                componente.valor
              ) || 0;

            const parcelas =
              componente.tipo ===
              "Cartão"
                ? Number(
                    componente.parcelas
                  ) || 1
                : null;

            return {
              sale_id:
                vendaCriada.id,
              tipo:
                componente.tipo,
              destino:
                componente.destino ===
                "capacete"
                  ? "capacete"
                  : "moto",
              valor,
              parcelas,
              valor_parcela:
                parcelas
                  ? valor /
                    parcelas
                  : null,
              motorcycle_id:
                componente.motoId ||
                null,
              observacoes:
                componente.motoDescricao ||
                null,
            };
          }
        );

      const {
        error:
          componentesError,
      } = await supabase
        .from(
          "sale_payment_components"
        )
        .insert(
          componentesBanco
        );

      if (componentesError) {
        await supabase
          .from("sales")
          .delete()
          .eq(
            "id",
            vendaCriada.id
          );

        throw componentesError;
      }

      /*
       * CAPACETES:
       * baixam do estoque pelo banco e guardam
       * o custo do momento para o relatório de lucro.
       */
      if (capacetes.length > 0) {
        const capacetesBanco =
          capacetes.map(
            (capacete) => {
              const modelo =
                modelosCapacete.find(
                  (m) =>
                    m.id ===
                    capacete.modeloId
                );

              return {
                sale_id:
                  vendaCriada.id,
                helmet_model_id:
                  capacete.modeloId,
                data: dataVenda,
                produto:
                  modelo?.produto ||
                  "Capacete",
                marca:
                  modelo?.marca ||
                  null,
                modelo:
                  modelo?.modelo ||
                  null,
                cor:
                  modelo?.cor ||
                  null,
                tamanho:
                  modelo?.tamanho ||
                  null,
                quantidade:
                  Number(
                    capacete.quantidade
                  ) || 0,
                valor_unitario:
                  Number(
                    capacete.valorUnitario
                  ) || 0,
                custo_unitario:
                  Number(
                    modelo?.custo_medio ||
                      0
                  ),
              };
            }
          );

        const {
          error:
            capacetesError,
        } = await supabase
          .from(
            "helmet_sale_items"
          )
          .insert(
            capacetesBanco
          );

        if (capacetesError) {
          await supabase
            .from("sales")
            .delete()
            .eq(
              "id",
              vendaCriada.id
            );

          throw capacetesError;
        }
      }

      const motosTroca =
        componentes.filter(
          (componente) =>
            componente.tipo ===
              "Moto na troca" &&
            componente.motoId
        );

      for (
        const troca of
        motosTroca
      ) {
        const {
          error: trocaError,
        } = await supabase
          .from("motorcycles")
          .update({
            origem_troca_venda_id:
              vendaCriada.id,
            status:
              "disponivel",
          })
          .eq(
            "id",
            troca.motoId
          );

        if (trocaError) {
          throw trocaError;
        }
      }

      const {
        error: motoError,
      } = await supabase
        .from("motorcycles")
        .update({
          status: "vendida",
        })
        .eq(
          "id",
          motoId
        );

      if (motoError) {
        throw motoError;
      }

      /*
       * CAIXA:
       * - Pagamentos reais recebidos entram no caixa.
       * - Moto na troca NÃO entra no caixa.
       * - Financiamento entra como recebimento do banco.
       */
      const valorCaixaVenda =
        totalPagamentosCaixa +
        valorFinanciado +
        (Number(
          transferenciaCliente
        ) || 0);

      if (
        valorCaixaVenda > 0
      ) {
        const {
          error: caixaError,
        } = await supabase
          .from(
            "cash_transactions"
          )
          .insert({
            data: dataVenda,
            tipo: "entrada",
            origem: "venda",
            origem_id:
              vendaCriada.id,
            valor:
              valorCaixaVenda,
            descricao:
              `Venda - ${
                motoSelecionada
                  ? `${motoSelecionada.marca || ""} ${motoSelecionada.modelo || ""}`
                  : "Moto"
              }`,
          });

        if (caixaError) {
          throw caixaError;
        }
      }

      const valorTransfLoja =
        Number(
          transferenciaLoja
        ) || 0;

      if (
        valorTransfLoja > 0
      ) {
        const {
          error:
            transferenciaError,
        } = await supabase
          .from(
            "cash_transactions"
          )
          .insert({
            data: dataVenda,
            tipo: "saida",
            origem: "venda",
            origem_id:
              vendaCriada.id,
            valor:
              valorTransfLoja,
            descricao:
              "Transferência paga pela loja",
          });

        if (
          transferenciaError
        ) {
          throw transferenciaError;
        }
      }

      /*
       * VISTORIA DE TRANSFERÊNCIA:
       * fica guardada na moto e vinculada a esta venda.
       * Se o envio falhar, a venda continua salva - só
       * avisamos para anexar depois pela ficha da moto.
       */
      let avisoVistoria = "";

      if (vistoriaTransferencia) {
        try {
          await enviarVistoria({
            arquivo:
              vistoriaTransferencia,
            motorcycleId: motoId,
            saleId: vendaCriada.id,
            tipo: "transferencia",
            data: dataVenda,
          });
        } catch (e: any) {
          console.error(e);

          avisoVistoria = ` A vistoria de transferência NÃO foi anexada (${
            e?.message || "falha no envio"
          }). Anexe pela ficha da moto.`;
        }
      } else {
        avisoVistoria =
          " Lembre-se de anexar a vistoria de transferência na ficha da moto.";
      }

      setMensagem(
        `Venda registrada com sucesso. Pagamentos, financiamento e moto de troca foram vinculados.${avisoVistoria}`
      );

      setDocumentos({
        vendaId: String(
          vendaCriada.id
        ),
        motoTrocaId:
          motosTroca[0]?.motoId ||
          "",
      });

      limparFormulario();

      sessionStorage.removeItem(
        "blackout-venda-em-andamento"
      );

      window.history.replaceState(
        {},
        "",
        "/vendas"
      );

      await carregarMotos();

      await carregarCapacetes();
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
          "Não foi possível registrar a venda."
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="mb-1 text-sm font-semibold uppercase tracking-[0.25em] text-yellow-500">
            Blackout Motos
          </p>

          <h1 className="text-3xl font-bold md:text-4xl">
            Registrar Venda
          </h1>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/vendas/historico"
              className="rounded-lg border border-yellow-500 px-4 py-2 font-semibold text-yellow-500 transition hover:bg-yellow-500 hover:text-black"
            >
              Ver Todas as Vendas
            </Link>

            <Link
              href="/estoque"
              className="rounded-lg border border-zinc-700 px-4 py-2 font-semibold text-zinc-300 transition hover:border-yellow-500 hover:text-yellow-500"
            >
              Voltar ao Estoque
            </Link>
          </div>
        </div>

        {mensagem && (
          <div className="mb-6 rounded-xl border border-green-700 bg-green-950/40 p-4 text-green-300">
            {mensagem}

            {documentos && (
              <div className="mt-4 border-t border-green-800 pt-4">
                <p className="mb-3 text-sm text-green-200">
                  Documentos desta venda:
                </p>

                <div className="flex flex-wrap gap-3">
                  <a
                    href={`/documentos/contrato-venda/${documentos.vendaId}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-yellow-400"
                  >
                    <FileText size={16} />
                    Contrato de Venda
                  </a>

                  {documentos.motoTrocaId && (
                    <>
                      <a
                        href={`/documentos/procuracao/${documentos.motoTrocaId}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-yellow-500 px-4 py-2 text-sm font-semibold text-yellow-400 transition hover:bg-yellow-500 hover:text-black"
                      >
                        <FileSignature size={16} />
                        Procuração da Moto da Troca
                      </a>

                      <a
                        href={`/documentos/contrato-compra/${documentos.motoTrocaId}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-yellow-500 px-4 py-2 text-sm font-semibold text-yellow-400 transition hover:bg-yellow-500 hover:text-black"
                      >
                        <FileText size={16} />
                        Contrato de Compra da Troca
                      </a>
                    </>
                  )}
                </div>

                {documentos.motoTrocaId && (
                  <p className="mt-3 text-xs text-green-200/70">
                    Os documentos da troca usam os dados de
                    quem entregou a moto (fornecedor da moto).
                    O contrato de compra já sai descrevendo a
                    troca e como o restante foi pago.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {erro && (
          <div className="mb-6 rounded-xl border border-red-700 bg-red-950/40 p-4 text-red-300">
            {erro}
          </div>
        )}

        <form
          onSubmit={salvarVenda}
          className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 md:p-8"
        >
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

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Moto vendida *
                </label>

                <input
                  type="text"
                  value={buscaMoto}
                  onChange={(e) =>
                    setBuscaMoto(
                      e.target.value
                    )
                  }
                  placeholder="Procurar por marca, modelo, cor, placa..."
                  className="mb-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm outline-none focus:border-yellow-500"
                />

                <select
                  value={motoId}
                  onChange={(e) =>
                    selecionarMoto(
                      e.target.value
                    )
                  }
                  disabled={
                    carregandoMotos
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                >
                  <option value="">
                    {carregandoMotos
                      ? "Carregando motos..."
                      : "Selecione a moto"}
                  </option>

                  {motosFiltradas.map(
                    (moto) => (
                      <option
                        key={moto.id}
                        value={moto.id}
                      >
                        {moto.codigo
                          ? `${moto.codigo} - `
                          : ""}
                        {moto.marca || ""}{" "}
                        {moto.modelo || ""}{" "}
                        {moto.versao || ""}
                        {moto.cor
                          ? ` - ${moto.cor}`
                          : ""}
                        {moto.ano_modelo
                          ? ` - ${moto.ano_modelo}`
                          : ""}
                        {moto.placa
                          ? ` - ${moto.placa}`
                          : ""}
                      </option>
                    )
                  )}
                </select>

                {buscaMoto.trim() && (
                  <p className="mt-2 text-xs text-zinc-500">
                    {motosFiltradas.length ===
                    0
                      ? "Nenhuma moto encontrada. Limpe a busca para ver todas."
                      : `${motosFiltradas.length} ${
                          motosFiltradas.length ===
                          1
                            ? "moto encontrada"
                            : "motos encontradas"
                        }.`}
                  </p>
                )}
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
                    Selecione o vendedor
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
                  Tipo da venda *
                </label>

                <select
                  value={tipoVenda}
                  onChange={(e) => {
                    const valor =
                      e.target.value as
                        | "avista"
                        | "financiamento";

                    setTipoVenda(
                      valor
                    );

                    if (
                      valor ===
                      "avista"
                    ) {
                      setBanco("");
                    }
                  }}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                >
                  <option value="avista">
                    À vista / pagamento completo
                  </option>

                  <option value="financiamento">
                    Financiamento
                  </option>
                </select>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-4 border-b border-zinc-800 pb-3">
              <h2 className="text-lg font-semibold text-yellow-500">
                Cliente *
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Digite parte do nome ou CPF e selecione uma sugestão.
              </p>
            </div>

            <div className="relative">
              <input
                type="text"
                value={buscaCliente}
                onChange={(e) => {
                  const valor =
                    e.target.value;

                  setBuscaCliente(
                    valor
                  );

                  if (
                    clienteSelecionado &&
                    valor !==
                      clienteSelecionado.nome
                  ) {
                    setClienteId("");
                  }
                }}
                placeholder="Digite o nome ou CPF do cliente..."
                autoComplete="off"
                className="w-full rounded-xl border border-yellow-600/60 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
              />

              {buscaCliente.trim() &&
                !clienteSelecionado && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl">
                    {carregandoClientes ? (
                      <div className="p-4 text-sm text-zinc-400">
                        Carregando clientes...
                      </div>
                    ) : clientesFiltrados.length >
                      0 ? (
                      clientesFiltrados
                        .slice(0, 10)
                        .map(
                          (
                            cliente
                          ) => (
                            <button
                              key={
                                cliente.id
                              }
                              type="button"
                              onClick={() => {
                                setClienteId(
                                  String(
                                    cliente.id
                                  )
                                );
                                setBuscaCliente(
                                  cliente.nome
                                );
                              }}
                              className="block w-full border-b border-zinc-800 px-4 py-3 text-left hover:bg-zinc-900"
                            >
                              <p className="font-semibold">
                                {
                                  cliente.nome
                                }
                              </p>

                              <p className="mt-1 text-xs text-zinc-400">
                                {cliente.cpf
                                  ? `CPF: ${cliente.cpf}`
                                  : ""}
                                {cliente.telefone
                                  ? ` · ${cliente.telefone}`
                                  : ""}
                              </p>
                            </button>
                          )
                        )
                    ) : (
                      <div className="p-4 text-sm text-yellow-300">
                        Nenhum cliente encontrado.
                      </div>
                    )}
                  </div>
                )}
            </div>

            <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-zinc-400">
                {clienteSelecionado
                  ? `Selecionado: ${clienteSelecionado.nome}`
                  : "Nenhum cliente selecionado."}
              </div>

              <button
                type="button"
                onClick={
                  cadastrarNovoCliente
                }
                className="rounded-xl bg-yellow-500 px-5 py-3 font-bold text-black hover:bg-yellow-400"
              >
                + Cadastrar Cliente
              </button>
            </div>
          </section>

          <section>
            <h2 className="mb-4 border-b border-zinc-800 pb-3 text-lg font-semibold text-yellow-500">
              Valor da Moto
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Valor da moto *
                </label>

                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={valorVenda}
                  onChange={(e) =>
                    setValorVenda(
                      e.target.value
                    )
                  }
                  placeholder="0,00"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                />

                {motoSelecionada &&
                  (precoAnunciado >
                  0 ? (
                    <p className="mt-2 text-xs text-zinc-500">
                      Preço anunciado no cadastro
                      da moto:{" "}
                      <strong className="text-yellow-500">
                        {moeda(
                          precoAnunciado
                        )}
                      </strong>
                      {Math.abs(
                        valorVendaNumero -
                          precoAnunciado
                      ) > 0.009 && (
                        <>
                          {" "}
                          · você alterou para{" "}
                          {moeda(
                            valorVendaNumero
                          )}
                        </>
                      )}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-yellow-300">
                      Esta moto não tem preço
                      anunciado no cadastro.{" "}
                      <Link
                        href={`/motos/${motoId}`}
                        className="underline"
                      >
                        Cadastrar o preço
                      </Link>{" "}
                      para ele vir preenchido nas
                      próximas vendas.
                    </p>
                  ))}
              </div>

              {tipoVenda ===
                "financiamento" && (
                <div>
                  <label className="mb-2 block text-sm text-zinc-300">
                    Banco / Financeira *
                  </label>

                  <select
                    value={banco}
                    onChange={(e) =>
                      setBanco(
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                  >
                    <option value="">
                      Selecione
                    </option>

                    {BANCOS_FINANCIAMENTO.map((nome) => (
                      <option
                        key={nome}
                        value={nome}
                      >
                        {nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {tipoVenda ===
                "financiamento" && (
                <div>
                  <label className="mb-2 block text-sm text-zinc-300">
                    Parcelas do financiamento *
                  </label>

                  <select
                    value={
                      parcelasFinanciamento
                    }
                    onChange={(e) =>
                      setParcelasFinanciamento(
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                  >
                    <option value="">
                      Selecione
                    </option>

                    <option value="12">
                      12x
                    </option>

                    <option value="24">
                      24x
                    </option>

                    <option value="36">
                      36x
                    </option>

                    <option value="48">
                      48x
                    </option>
                  </select>
                </div>
              )}

              {tipoVenda ===
                "financiamento" && (
                <div>
                  <label className="mb-2 block text-sm text-zinc-300">
                    Valor da parcela
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      valorParcelaManual
                    }
                    onChange={(e) =>
                      setValorParcelaManual(
                        e.target.value
                      )
                    }
                    placeholder="0,00"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                  />

                  <p className="mt-2 text-xs text-zinc-500">
                    Opcional. Anote aqui a parcela que ficou
                    no banco, só para controle interno. No
                    contrato sai apenas a quantidade de
                    parcelas.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="mb-4 border-b border-zinc-800 pb-3">
              <h2 className="text-lg font-semibold text-yellow-500">
                Capacetes
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Capacetes que o cliente está levando junto.
                O valor entra no total da venda. Deixe o valor
                zerado para dar de brinde (sai do estoque e
                entra como custo).
              </p>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={
                  adicionarCapacete
                }
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 hover:border-yellow-500 hover:text-yellow-500"
              >
                <HardHat
                  size={16}
                />
                Adicionar capacete
              </button>

              <Link
                href="/capacetes"
                className="text-xs text-zinc-500 underline hover:text-yellow-500"
              >
                Gerenciar estoque de capacetes
              </Link>
            </div>

            {capacetes.length ===
              0 && (
              <div className="rounded-xl border border-zinc-800 bg-black/40 p-5 text-sm text-zinc-400">
                Nenhum capacete nesta venda.
              </div>
            )}

            <div className="space-y-3">
              {capacetes.map(
                (capacete) => {
                  const modelo =
                    modelosCapacete.find(
                      (m) =>
                        m.id ===
                        capacete.modeloId
                    );

                  const quantidade =
                    Number(
                      capacete.quantidade
                    ) || 0;

                  const valor =
                    Number(
                      capacete.valorUnitario
                    ) || 0;

                  return (
                    <div
                      key={
                        capacete.idLocal
                      }
                      className="rounded-xl border border-zinc-800 bg-black/40 p-4"
                    >
                      <div className="grid gap-3 md:grid-cols-4">
                        <div className="md:col-span-2">
                          <label className="mb-2 block text-xs text-zinc-400">
                            Capacete
                          </label>

                          <select
                            value={
                              capacete.modeloId
                            }
                            onChange={(
                              e
                            ) =>
                              alterarCapacete(
                                capacete.idLocal,
                                "modeloId",
                                e
                                  .target
                                  .value
                              )
                            }
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                          >
                            <option value="">
                              Selecione
                            </option>

                            {modelosCapacete.map(
                              (
                                m
                              ) => (
                                <option
                                  key={
                                    m.id
                                  }
                                  value={
                                    m.id
                                  }
                                >
                                  {
                                    m.marca
                                  }{" "}
                                  {
                                    m.modelo
                                  }{" "}
                                  ·{" "}
                                  {
                                    m.cor
                                  }{" "}
                                  ·{" "}
                                  {
                                    m.tamanho
                                  }{" "}
                                  · estoque{" "}
                                  {
                                    m.estoque_atual
                                  }
                                </option>
                              )
                            )}
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-xs text-zinc-400">
                            Quantidade
                          </label>

                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={
                              capacete.quantidade
                            }
                            onChange={(
                              e
                            ) =>
                              alterarCapacete(
                                capacete.idLocal,
                                "quantidade",
                                e
                                  .target
                                  .value
                              )
                            }
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-xs text-zinc-400">
                            Valor unitário
                          </label>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              capacete.valorUnitario
                            }
                            onChange={(
                              e
                            ) =>
                              alterarCapacete(
                                capacete.idLocal,
                                "valorUnitario",
                                e
                                  .target
                                  .value
                              )
                            }
                            placeholder="0,00"
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-zinc-500">
                          {modelo
                            ? `Custo médio ${moeda(
                                modelo.custo_medio
                              )} · estoque ${
                                modelo.estoque_atual
                              }`
                            : "Escolha o capacete"}
                          {valor ===
                            0 &&
                          modelo
                            ? " · será lançado como BRINDE"
                            : ""}
                        </p>

                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-yellow-500">
                            {moeda(
                              quantidade *
                                valor
                            )}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              removerCapacete(
                                capacete.idLocal
                              )
                            }
                            className="rounded-lg border border-zinc-700 p-2 text-red-300 hover:border-red-700 hover:bg-red-950/30"
                            aria-label="Remover capacete"
                          >
                            <Trash2
                              size={
                                16
                              }
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            {capacetes.length >
              0 && (
              <div className="mt-4 rounded-xl border border-zinc-800 bg-black/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm text-zinc-400">
                    Total em capacetes
                  </span>

                  <span className="text-lg font-bold text-yellow-500">
                    {moeda(
                      totalCapacetes
                    )}
                  </span>
                </div>

                <p className="mt-2 text-xs text-zinc-500">
                  Custo da loja{" "}
                  {moeda(
                    custoCapacetes
                  )}{" "}
                  · lucro nos capacetes{" "}
                  <span
                    className={
                      totalCapacetes -
                        custoCapacetes >=
                      0
                        ? "text-green-400"
                        : "text-red-400"
                    }
                  >
                    {moeda(
                      totalCapacetes -
                        custoCapacetes
                    )}
                  </span>
                </p>
              </div>
            )}
          </section>

          <section>
            <div className="mb-4 border-b border-zinc-800 pb-3">
              <h2 className="text-lg font-semibold text-yellow-500">
                {tipoVenda ===
                "financiamento"
                  ? "Composição da Entrada"
                  : "Composição do Pagamento"}
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Você pode combinar Pix, dinheiro, transferência, cartão e moto na troca.
                {totalCapacetes > 0 &&
                  " Em cada pagamento, escolha se ele está quitando a moto ou os capacetes."}
              </p>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {(
                [
                  "Pix",
                  "Dinheiro",
                  "Transferência",
                  "Cartão",
                ] as TipoPagamento[]
              ).map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() =>
                    adicionarPagamento(
                      tipo
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 hover:border-yellow-500 hover:text-yellow-500"
                >
                  {tipo ===
                  "Cartão" ? (
                    <CreditCard
                      size={16}
                    />
                  ) : (
                    <Plus
                      size={16}
                    />
                  )}
                  {tipo}
                </button>
              ))}

              <button
                type="button"
                onClick={
                  cadastrarMotoTroca
                }
                className="inline-flex items-center gap-2 rounded-lg border border-yellow-700 bg-yellow-950/20 px-3 py-2 text-sm font-semibold text-yellow-300 hover:bg-yellow-900/30"
              >
                <Bike size={16} />
                Moto na troca
              </button>
            </div>

            {componentes.length ===
              0 && (
              <div className="rounded-xl border border-zinc-800 bg-black/40 p-5 text-sm text-zinc-400">
                Nenhuma forma de pagamento adicionada.
              </div>
            )}

            <div className="space-y-3">
              {componentes.map(
                (componente) => {
                  const valor =
                    Number(
                      componente.valor
                    ) || 0;

                  const parcelas =
                    Math.max(
                      1,
                      Number(
                        componente.parcelas
                      ) || 1
                    );

                  return (
                    <div
                      key={
                        componente.idLocal
                      }
                      className="rounded-xl border border-zinc-800 bg-black p-4"
                    >
                      <div
                        className={`grid gap-3 md:items-end ${
                          totalCapacetes > 0
                            ? "md:grid-cols-[1fr_140px_160px_160px_46px]"
                            : "md:grid-cols-[1fr_180px_180px_46px]"
                        }`}
                      >
                        <div>
                          <p className="text-xs text-zinc-500">
                            Forma
                          </p>

                          <p className="mt-2 font-semibold text-white">
                            {
                              componente.tipo
                            }
                          </p>

                          {componente.tipo ===
                            "Moto na troca" && (
                            <p className="mt-1 text-xs text-yellow-300">
                              {componente.motoDescricao ||
                                "Moto vinculada"}
                            </p>
                          )}
                        </div>

                        {totalCapacetes >
                          0 && (
                          <div>
                            <label className="mb-2 block text-xs text-zinc-500">
                              Pagando
                            </label>

                            {componente.tipo ===
                            "Moto na troca" ? (
                              <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-500">
                                Moto
                              </div>
                            ) : (
                              <select
                                value={
                                  componente.destino
                                }
                                onChange={(e) =>
                                  alterarComponente(
                                    componente.idLocal,
                                    "destino",
                                    e
                                      .target
                                      .value
                                  )
                                }
                                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 outline-none focus:border-yellow-500"
                              >
                                <option value="moto">
                                  Moto
                                </option>

                                <option value="capacete">
                                  Capacete
                                </option>
                              </select>
                            )}
                          </div>
                        )}

                        <div>
                          <label className="mb-2 block text-xs text-zinc-500">
                            Valor
                          </label>

                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={
                              componente.valor
                            }
                            onChange={(e) =>
                              alterarComponente(
                                componente.idLocal,
                                "valor",
                                e
                                  .target
                                  .value
                              )
                            }
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 outline-none focus:border-yellow-500"
                          />
                        </div>

                        <div>
                          {componente.tipo ===
                          "Cartão" ? (
                            <>
                              <label className="mb-2 block text-xs text-zinc-500">
                                Parcelas
                              </label>

                              <select
                                value={
                                  componente.parcelas
                                }
                                onChange={(e) =>
                                  alterarComponente(
                                    componente.idLocal,
                                    "parcelas",
                                    e
                                      .target
                                      .value
                                  )
                                }
                                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 outline-none focus:border-yellow-500"
                              >
                                {Array.from(
                                  {
                                    length:
                                      24,
                                  },
                                  (
                                    _,
                                    indice
                                  ) =>
                                    indice +
                                    1
                                ).map(
                                  (
                                    parcela
                                  ) => (
                                    <option
                                      key={
                                        parcela
                                      }
                                      value={
                                        parcela
                                      }
                                    >
                                      {
                                        parcela
                                      }
                                      x
                                    </option>
                                  )
                                )}
                              </select>

                              <p className="mt-1 text-xs text-yellow-500">
                                {parcelas}x de{" "}
                                {moeda(
                                  valor /
                                    parcelas
                                )}
                              </p>

                              <p className="mt-1 text-xs text-zinc-500">
                                Operadora:{" "}
                                {
                                  OPERADORA_CARTAO
                                }
                              </p>
                            </>
                          ) : (
                            <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-500">
                              {componente.tipo ===
                              "Moto na troca"
                                ? "Vinculada ao estoque"
                                : "Pagamento único"}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removerComponente(
                              componente.idLocal
                            )
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-900 text-red-400 hover:bg-red-950/30"
                          title="Remover"
                        >
                          <Trash2
                            size={16}
                          />
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            {totalCapacetes > 0 && (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-zinc-800 bg-black/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Moto
                  </p>

                  <p className="mt-2 text-sm text-zinc-300">
                    Pago{" "}
                    <strong className="text-white">
                      {moeda(pagoNaMoto)}
                    </strong>{" "}
                    de{" "}
                    {moeda(
                      valorVendaNumero
                    )}
                  </p>

                  {faltaNaMoto > 0.009 && (
                    <p className="mt-1 text-xs text-yellow-300">
                      {tipoVenda ===
                      "financiamento"
                        ? `${moeda(
                            faltaNaMoto
                          )} vai para o financiamento`
                        : `Falta ${moeda(
                            faltaNaMoto
                          )}`}
                    </p>
                  )}

                  {faltaNaMoto <= 0.009 &&
                    valorVendaNumero >
                      0 && (
                      <p className="mt-1 text-xs text-green-400">
                        Moto quitada.
                      </p>
                    )}
                </div>

                <div className="rounded-xl border border-zinc-800 bg-black/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Capacetes
                  </p>

                  <p className="mt-2 text-sm text-zinc-300">
                    Pago{" "}
                    <strong className="text-white">
                      {moeda(
                        pagoNosCapacetes
                      )}
                    </strong>{" "}
                    de{" "}
                    {moeda(totalCapacetes)}
                  </p>

                  {faltaNosCapacetes >
                  0.009 ? (
                    <p className="mt-1 text-xs text-yellow-300">
                      Falta{" "}
                      {moeda(
                        faltaNosCapacetes
                      )}
                      . Capacete não entra no
                      financiamento.
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-green-400">
                      Capacetes quitados.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <Resumo
                titulo={
                  tipoVenda ===
                  "financiamento"
                    ? "Entrada da moto"
                    : "Pagamento total"
                }
                valor={
                  tipoVenda ===
                  "financiamento"
                    ? pagoNaMoto
                    : entradaTotal
                }
              />

              <Resumo
                titulo="Moto na troca"
                valor={totalTroca}
              />

              <Resumo
                titulo="Recebimento em dinheiro/cartão"
                valor={
                  totalPagamentosCaixa
                }
              />

              <Resumo
                titulo="Valor financiado"
                valor={
                  valorFinanciado
                }
                destaque
              />
            </div>

            {totalCapacetes > 0 && (
              <p className="mt-3 text-sm text-zinc-400">
                Valor total da venda:{" "}
                <strong className="text-yellow-500">
                  {moeda(
                    valorTotalVenda
                  )}
                </strong>{" "}
                (moto{" "}
                {moeda(
                  valorVendaNumero
                )}{" "}
                + capacetes{" "}
                {moeda(
                  totalCapacetes
                )}
                )
              </p>
            )}

            {tipoVenda ===
              "avista" &&
              valorTotalVenda >
                0 &&
              valorFalta > 0.009 && (
                <p className="mt-3 text-sm text-yellow-300">
                  Falta compor{" "}
                  <strong>
                    {moeda(
                      valorFalta
                    )}
                  </strong>{" "}
                  para fechar o valor da venda.
                </p>
              )}

            {tipoVenda ===
              "financiamento" && (
              <div className="mt-4 rounded-xl border border-yellow-800/50 bg-yellow-950/10 p-4">
                <p className="text-sm text-zinc-300">
                  Cálculo automático
                </p>

                <p className="mt-2 text-lg font-bold text-yellow-500">
                  {moeda(
                    valorTotalVenda
                  )}{" "}
                  -{" "}
                  {moeda(
                    entradaTotal
                  )}{" "}
                  ={" "}
                  {moeda(
                    valorFinanciado
                  )}
                </p>

                {parcelasNumero >
                  0 && (
                  <p className="mt-2 text-sm text-zinc-300">
                    Financiamento em{" "}
                    <strong className="text-yellow-500">
                      {parcelasNumero}x
                    </strong>

                    {valorParcelaFinal >
                      0 && (
                      <span className="text-zinc-500">
                        {" "}
                        · parcela de{" "}
                        {moeda(
                          valorParcelaFinal
                        )}{" "}
                        (uso interno)
                      </span>
                    )}
                  </p>
                )}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-4 border-b border-zinc-800 pb-3 text-lg font-semibold text-yellow-500">
              Transferência do Documento
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
                  value={
                    transferenciaCliente
                  }
                  onChange={(e) =>
                    setTransferenciaCliente(
                      e.target.value
                    )
                  }
                  placeholder="0,00"
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
                  placeholder="0,00"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-yellow-500"
                />
              </div>
            </div>
          </section>

          <section>
            <div className="mb-4 border-b border-zinc-800 pb-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-yellow-500">
                <ClipboardCheck size={18} />
                Vistoria de Transferência
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Anexe aqui a vistoria feita para a
                transferência. Ela fica guardada na ficha da
                moto e vinculada a esta venda, para a loja
                sempre ter a última vistoria.
              </p>
            </div>

            <input
              type="file"
              accept={TIPOS_ACEITOS}
              onChange={(e) =>
                setVistoriaTransferencia(
                  e.target.files?.[0] ||
                    null
                )
              }
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-300 file:mr-4 file:rounded-lg file:border-0 file:bg-yellow-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black"
            />

            {vistoriaTransferencia ? (
              <p className="mt-2 text-xs text-green-400">
                {
                  vistoriaTransferencia.name
                }{" "}
                ·{" "}
                {tamanhoLegivel(
                  vistoriaTransferencia.size
                )}
              </p>
            ) : (
              <p className="mt-2 text-xs text-yellow-300">
                Nenhum arquivo escolhido. Dá para registrar a
                venda assim mesmo e anexar depois pela ficha
                da moto.
              </p>
            )}
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
              placeholder="Informações adicionais..."
            />
          </section>

          <section className="rounded-xl border border-zinc-800 bg-black p-5">
            <h3 className="mb-4 font-semibold text-yellow-500">
              Resumo da Venda
            </h3>

            <div className="grid gap-4 md:grid-cols-4">
              <ResumoTexto
                titulo="Cliente"
                valor={
                  clienteSelecionado?.nome ||
                  "Obrigatório"
                }
              />

              <ResumoTexto
                titulo="Tipo"
                valor={
                  tipoVenda ===
                  "financiamento"
                    ? "Financiamento"
                    : "À vista"
                }
              />

              <Resumo
                titulo="Valor da moto"
                valor={
                  valorVendaNumero
                }
              />

              <Resumo
                titulo="Capacetes"
                valor={
                  totalCapacetes
                }
              />

              <Resumo
                titulo="Total da venda"
                valor={
                  valorTotalVenda
                }
              />

              <Resumo
                titulo="Financiado"
                valor={
                  valorFinanciado
                }
                destaque
              />
            </div>
          </section>

          <button
            type="submit"
            disabled={
              salvando ||
              !clienteId
            }
            className="w-full rounded-xl bg-yellow-500 px-6 py-4 text-base font-bold text-black transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {salvando
              ? "Registrando venda..."
              : !clienteId
                ? "Selecione um Cliente para Continuar"
                : "Registrar Venda"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Resumo({
  titulo,
  valor,
  destaque = false,
}: {
  titulo: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <p className="text-xs text-zinc-500">
        {titulo}
      </p>

      <p
        className={`mt-1 font-bold ${
          destaque
            ? "text-yellow-500"
            : "text-white"
        }`}
      >
        {moeda(valor)}
      </p>
    </div>
  );
}

function ResumoTexto({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div>
      <p className="text-xs text-zinc-500">
        {titulo}
      </p>
      <p className="mt-1 font-semibold">
        {valor}
      </p>
    </div>
  );
}