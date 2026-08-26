import fs from "node:fs/promises";
import path from "node:path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function moedaSemSimbolo(valor: unknown) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(valor) || 0);
}

const UNIDADES = [
  "",
  "UM",
  "DOIS",
  "TRÊS",
  "QUATRO",
  "CINCO",
  "SEIS",
  "SETE",
  "OITO",
  "NOVE",
];

const DEZ_A_DEZENOVE = [
  "DEZ",
  "ONZE",
  "DOZE",
  "TREZE",
  "QUATORZE",
  "QUINZE",
  "DEZESSEIS",
  "DEZESSETE",
  "DEZOITO",
  "DEZENOVE",
];

const DEZENAS = [
  "",
  "",
  "VINTE",
  "TRINTA",
  "QUARENTA",
  "CINQUENTA",
  "SESSENTA",
  "SETENTA",
  "OITENTA",
  "NOVENTA",
];

const CENTENAS = [
  "",
  "CENTO",
  "DUZENTOS",
  "TREZENTOS",
  "QUATROCENTOS",
  "QUINHENTOS",
  "SEISCENTOS",
  "SETECENTOS",
  "OITOCENTOS",
  "NOVECENTOS",
];

function ate999(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "CEM";

  const partes: string[] = [];

  const centena = Math.floor(n / 100);
  const resto100 = n % 100;

  if (centena > 0) {
    partes.push(CENTENAS[centena]);
  }

  if (resto100 > 0) {
    if (partes.length) partes.push("E");

    if (resto100 < 10) {
      partes.push(UNIDADES[resto100]);
    } else if (resto100 < 20) {
      partes.push(
        DEZ_A_DEZENOVE[
          resto100 - 10
        ]
      );
    } else {
      const dezena =
        Math.floor(
          resto100 / 10
        );

      const unidade =
        resto100 % 10;

      partes.push(
        DEZENAS[dezena]
      );

      if (unidade > 0) {
        partes.push("E");

        partes.push(
          UNIDADES[unidade]
        );
      }
    }
  }

  return partes.join(" ");
}

function numeroExtenso(
  valor: number
): string {
  const inteiro =
    Math.floor(valor);

  if (inteiro === 0) {
    return "ZERO REAIS";
  }

  const partes: string[] = [];

  const milhoes =
    Math.floor(
      inteiro / 1_000_000
    );

  const milhares =
    Math.floor(
      (inteiro % 1_000_000) /
        1_000
    );

  const resto =
    inteiro % 1_000;

  if (milhoes > 0) {
    partes.push(
      milhoes === 1
        ? "UM MILHÃO"
        : `${ate999(
            milhoes
          )} MILHÕES`
    );
  }

  if (milhares > 0) {
    if (partes.length) {
      partes.push("E");
    }

    partes.push(
      milhares === 1
        ? "MIL"
        : `${ate999(
            milhares
          )} MIL`
    );
  }

  if (resto > 0) {
    if (partes.length) {
      partes.push("E");
    }

    partes.push(
      ate999(resto)
    );
  }

  partes.push(
    inteiro === 1
      ? "REAL"
      : "REAIS"
  );

  return partes.join(" ");
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

  return `${dia} de ${mes.toUpperCase()} de ${ano}`;
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
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  ).format(
    Number(valor) || 0
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
            venda.cliente ||
            moto.fornecedor_nome ||
            "o VENDEDOR"
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

    // o modelo já fecha a frase com ponto
    const observacoesContrato = [
      descricaoTroca,
      moto.observacoes || "",
    ]
      .filter((parte) =>
        String(parte).trim()
      )
      .join(" ")
      .replace(/\s*\.\s*$/, "");

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

    doc.render({
      fornecedor_nome:
        moto.fornecedor_nome ||
        "",

      fornecedor_rg:
        moto.fornecedor_rg ||
        "",

      fornecedor_cpf:
        moto.fornecedor_cpf ||
        "",

      fornecedor_rua:
        moto.fornecedor_rua ||
        "",

      fornecedor_numero:
        moto.fornecedor_numero ||
        "",

      fornecedor_bairro:
        moto.fornecedor_bairro ||
        "",

      fornecedor_cidade:
        moto.fornecedor_cidade ||
        "",

      fornecedor_estado:
        moto.fornecedor_estado ||
        "",

      fornecedor_cep:
        moto.fornecedor_cep ||
        "",

      fornecedor_telefone:
        moto.fornecedor_telefone ||
        "",

      valor_compra:
        moedaSemSimbolo(
          valorCompra
        ),

      valor_compra_extenso:
        numeroExtenso(
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
        moto.placa || "",

      moto_cor:
        moto.cor || "",

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