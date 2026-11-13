import fs from "node:fs/promises";
import path from "node:path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { createClient } from "@/lib/supabase/server";
import {
  formatarMoeda,
  formatarNumero,
} from "@/lib/formatadores/moeda";
import { valorPorExtenso } from "@/lib/formatadores/extenso";
import { comLogradouro } from "@/lib/formatadores/endereco";
import { formatarPlaca } from "@/lib/formatadores/placa";
import { nomeProprio } from "@/lib/formatadores/nome";
import { formatarTelefone } from "@/lib/formatadores/telefone";
import { temOutroProprietario } from "@/lib/dados/proprietario";

export const runtime = "nodejs";

function formatarCPF(valor: unknown) {
  const numeros = String(valor || "")
    .replace(/\D/g, "")
    .slice(0, 11);

  if (numeros.length !== 11) {
    return String(valor || "").trim();
  }

  return numeros.replace(
    /(\d{3})(\d{3})(\d{3})(\d{2})/,
    "$1.$2.$3-$4"
  );
}

function complementoEndereco(valor: unknown) {
  const complemento = String(valor || "").trim();

  return complemento
    ? `, complemento: ${complemento}`
    : "";
}


function moedaSemSimbolo(valor: unknown) {
  return formatarNumero(valor as number);
}


function dataAtualExtenso() {
  const agora = new Date();

  const partes =
    new Intl.DateTimeFormat(
      "pt-BR",
      {
        timeZone:
          "America/Sao_Paulo",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    ).formatToParts(agora);

  const dia =
    partes.find(
      (parte) =>
        parte.type === "day"
    )?.value || "";

  const mes =
    partes.find(
      (parte) =>
        parte.type === "month"
    )?.value || "";

  const ano =
    partes.find(
      (parte) =>
        parte.type === "year"
    )?.value || "";

  return `${dia} de ${mes.toLowerCase()} de ${ano}`;
}

function horaAtual() {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      timeZone:
        "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  ).format(new Date());
}

function moedaComSimbolo(
  valor: unknown
) {
  return formatarMoeda(
    valor as number
  );
}

/*
 * Descreve como o cliente pagou o RESTANTE
 * da compra, fora a moto dada na troca.
 */
function descricaoRestante(
  venda: any,
  componentes: any[]
) {
  const partes: string[] = [];

  for (const item of componentes ||
    []) {
    if (
      item.tipo ===
      "Moto na troca"
    ) {
      continue;
    }

    if (item.tipo === "Cartão") {
      const parcelas =
        Number(item.parcelas) ||
        1;

      const valorParcela =
        Number(
          item.valor_parcela
        ) ||
        Number(item.valor) /
          parcelas;

      partes.push(
        `cartão no valor de ${moedaComSimbolo(
          item.valor
        )}, em ${parcelas}x de ${moedaComSimbolo(
          valorParcela
        )}`
      );

      continue;
    }

    partes.push(
      `${
        item.tipo
      } no valor de ${moedaComSimbolo(
        item.valor
      )}`
    );
  }

  const financiado =
    Number(
      venda.valor_financiado
    ) || 0;

  if (financiado > 0) {
    const parcelas =
      Number(
        venda.parcelas_financiamento
      ) || 0;

    partes.push(
      `financiamento de ${moedaComSimbolo(
        financiado
      )}${
        venda.banco
          ? ` pelo banco/financeira ${venda.banco}`
          : ""
      }${
        parcelas > 0
          ? `, em ${parcelas}x`
          : ""
      }`
    );
  }

  if (partes.length === 0) {
    return "";
  }

  return partes.join("; ");
}

function nomeArquivoSeguro(
  valor: string
) {
  return valor
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-zA-Z0-9-_ ]/g,
      ""
    )
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { id } =
      await params;

    const supabase =
      await createClient();

    const {
      data: moto,
      error: motoError,
    } = await supabase
      .from("motorcycles")
      .select("*")
      .eq("id", id)
      .single();

    if (
      motoError ||
      !moto
    ) {
      return Response.json(
        {
          error:
            motoError?.message ||
            "Moto não encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      !moto.fornecedor_nome
    ) {
      return Response.json(
        {
          error:
            "Esta moto não possui os dados de quem vendeu para a loja.",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // MOTO RECEBIDA NA TROCA: descreve a negociação
    // =====================================================

    let descricaoTroca = "";

    if (
      moto.origem_troca_venda_id
    ) {
      const { data: venda } =
        await supabase
          .from("sales")
          .select("*")
          .eq(
            "id",
            moto.origem_troca_venda_id
          )
          .single();

      if (venda) {
        const {
          data: componentes,
        } = await supabase
          .from(
            "sale_payment_components"
          )
          .select("*")
          .eq(
            "sale_id",
            venda.id
          )
          .order("criado_em", {
            ascending: true,
          });

        let motoVendida: any =
          null;

        if (
          venda.motorcycle_id
        ) {
          const { data } =
            await supabase
              .from(
                "motorcycles"
              )
              .select("*")
              .eq(
                "id",
                venda.motorcycle_id
              )
              .single();

          motoVendida = data;
        }

        const descricaoMotoVendida =
          motoVendida
            ? `${[
                motoVendida.marca,
                motoVendida.modelo,
                motoVendida.versao,
              ]
                .filter(Boolean)
                .join(" ")}${
                motoVendida.placa
                  ? `, placa ${motoVendida.placa}`
                  : ""
              }${
                motoVendida.ano_modelo
                  ? `, ano ${motoVendida.ano_modelo}`
                  : ""
              }`
            : "outro veículo da loja";

        const valorTotalVenda =
          Number(
            venda.valor_total_venda ??
              venda.valor_venda
          ) || 0;

        const valorTroca =
          Number(
            moto.valor_compra
          ) || 0;

        const restante =
          descricaoRestante(
            venda,
            componentes || []
          );

        const frases = [
          `Veículo entregue por ${
            nomeProprio(
              venda.cliente ||
              moto.fornecedor_nome
            ) || "o VENDEDOR"
          } como parte do pagamento (troca) na compra da moto ${descricaoMotoVendida}, negociada por ${moedaComSimbolo(
            valorTotalVenda
          )}.`,

          `A moto entregue na troca foi considerada pelo valor de ${moedaComSimbolo(
            valorTroca
          )}.`,
        ];

        if (restante) {
          frases.push(
            `O restante do valor foi pago da seguinte forma: ${restante}.`
          );
        }

        descricaoTroca =
          frases.join(" ");
      }
    }

    /*
     * Moto no nome de outra pessoa: o contrato continua com
     * quem vendeu, e diz em nome de quem está o documento - é
     * essa pessoa que assina a procuração.
     */
    const clausulaProprietario = temOutroProprietario(moto)
      ? `O veículo está registrado no órgão de trânsito em nome de ${nomeProprio(
          moto.proprietario_nome
        )}${
          moto.proprietario_cpf
            ? `, CPF ${formatarCPF(moto.proprietario_cpf)}`
            : ""
        }, proprietário(a) que autoriza esta venda e assina a procuração para a transferência do veículo.`
      : "";

    /*
     * Moto com financiamento para quitar.
     *
     * O recibo diz que o VENDEDOR recebeu o valor total da moto,
     * mas parte dele vai para o banco. A observação separa as
     * duas coisas: quanto a loja paga de quitação e quanto sobra
     * para o cliente - para ninguém achar depois que recebeu (ou
     * deixou de receber) o valor cheio.
     *
     * Os números são os do cadastro da moto (valor_compra e
     * valor_quitacao), os mesmos que o caixa usa.
     */
    const valorQuitacao = moto.possui_financiamento
      ? Number(moto.valor_quitacao) || 0
      : 0;

    let clausulaQuitacao = "";

    if (valorQuitacao > 0) {
      const valorTotalMoto = Number(moto.valor_compra) || 0;
      const saldo = Math.max(valorTotalMoto - valorQuitacao, 0);
      const banco = String(moto.financeira_quitacao || "").trim();

      const pagamentoQuitacao = `Do valor total de ${moedaComSimbolo(
        valorTotalMoto
      )}, a quantia de ${moedaComSimbolo(
        valorQuitacao
      )} será paga pela loja para a quitação do financiamento do veículo${
        banco ? ` junto ao banco/financeira ${banco}` : ""
      }`;

      if (moto.tipo_entrada === "troca") {
        clausulaQuitacao =
          saldo > 0
            ? `${pagamentoQuitacao}, e o saldo de ${moedaComSimbolo(
                saldo
              )} foi utilizado como parte do pagamento.`
            : `${pagamentoQuitacao}, não restando saldo a favor do VENDEDOR.`;
      } else {
        clausulaQuitacao =
          saldo > 0
            ? `${pagamentoQuitacao}, e o valor restante de ${moedaComSimbolo(
                saldo
              )} será repassado ao VENDEDOR.`
            : `${pagamentoQuitacao}, não restando valor a ser repassado ao VENDEDOR.`;
      }
    }

    /*
     * O ponto final vem daqui, e só quando há observação: o
     * modelo não tem mais o "." fixo, para a linha sair só
     * "Observação:" quando não há nada (pedido de 13/11/2026).
     */
    const observacoesSemPonto = [
      clausulaProprietario,
      clausulaQuitacao,
      descricaoTroca,
      moto.observacoes || "",
    ]
      .filter((parte) =>
        String(parte).trim()
      )
      .join(" ")
      .replace(/\s*\.\s*$/, "");

    const observacoesContrato = observacoesSemPonto
      ? `${observacoesSemPonto}.`
      : "";

    const templatePath =
      path.join(
        process.cwd(),
        "public",
        "templates",
        "contrato-compra.docx"
      );

    const template =
      await fs.readFile(
        templatePath
      );

    const zip =
      new PizZip(template);

    const doc =
      new Docxtemplater(
        zip,
        {
          paragraphLoop: true,
          linebreaks: true,
          nullGetter:
            () => "",
        }
      );

    const valorCompra =
      Number(
        moto.valor_compra
      ) || 0;

    /*
     * Dados CURTOS do vendedor numa linha só: os espaços de
     * dentro viram espaço que não quebra. Sem isso o Word partia
     * "12 / 988029889" na virada da linha. O modelo do Word cola
     * o rótulo no dado do mesmo jeito ("CPF nº 224...",
     * "CEP 12236-495").
     *
     * Rua e bairro NÃO: bloco comprido demais não cabe no fim
     * da linha, desce inteiro, e o justificado do Word estica
     * os espaços da linha de cima (buraco visto em 12/11/2026).
     *
     * A cidade SIM (13/11/2026): a loja aprovou o contrato com
     * "São José dos Campos - SP" inteiro no começo da linha,
     * mesmo com os espaços um pouco mais largos na linha de
     * cima.
     */
    const junto = (valor: unknown) =>
      String(valor ?? "").trim().replace(/\s+/g, " ");

    doc.render({
      fornecedor_nome:
        nomeProprio(moto.fornecedor_nome),

      fornecedor_rg:
        junto(moto.fornecedor_rg),

      fornecedor_cpf:
        junto(formatarCPF(moto.fornecedor_cpf)),

      fornecedor_rua:
        comLogradouro(moto.fornecedor_rua),

      fornecedor_numero:
        junto(moto.fornecedor_numero),

      fornecedor_complemento_texto:
        complementoEndereco(moto.fornecedor_complemento),

      fornecedor_bairro:
        moto.fornecedor_bairro || "",

      fornecedor_cidade:
        junto(moto.fornecedor_cidade),

      fornecedor_estado:
        junto(moto.fornecedor_estado),

      fornecedor_cep:
        junto(moto.fornecedor_cep),

      fornecedor_telefone:
        junto(formatarTelefone(moto.fornecedor_telefone)),

      valor_compra:
        moedaSemSimbolo(
          valorCompra
        ),

      valor_compra_extenso:
        valorPorExtenso(
          valorCompra
        ),

      moto_marca_modelo:
        `${moto.marca || ""} / ${
          moto.modelo || ""
        }${
          moto.versao
            ? ` ${moto.versao}`
            : ""
        }`.trim(),

      moto_placa:
        formatarPlaca(moto.placa),

      /* Cor sempre maiúscula, como no CRLV (pedido de 13/11/2026). */
      moto_cor:
        String(moto.cor || "").toLocaleUpperCase("pt-BR"),

      moto_renavam:
        moto.renavam || "",

      moto_chassi:
        moto.chassi || "",

      moto_ano_fabricacao:
        moto.ano_fabricacao ||
        "",

      moto_ano_modelo:
        moto.ano_modelo ||
        "",

      moto_km:
        new Intl.NumberFormat(
          "pt-BR"
        ).format(
          Number(
            moto.quilometragem
          ) || 0
        ),

      observacoes:
        observacoesContrato,

      troca_descricao:
        descricaoTroca,

      // DATA E HORA DO MOMENTO DA EMISSÃO
      data_extenso:
        dataAtualExtenso(),

      hora_documento:
        horaAtual(),
    });

    const buffer =
      doc
        .getZip()
        .generate({
          type: "nodebuffer",
          compression:
            "DEFLATE",
        });

    const nome =
      nomeArquivoSeguro(
        moto.fornecedor_nome ||
          "vendedor"
      );

    return new Response(
      new Uint8Array(
        buffer
      ),
      {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

          "Content-Disposition":
            `attachment; filename="contrato-compra-${nome}.docx"`,

          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (
    error: any
  ) {
    console.error(
      error
    );

    return Response.json(
      {
        error:
          error?.message ||
          "Não foi possível gerar o contrato de compra.",
      },
      {
        status: 500,
      }
    );
  }
}