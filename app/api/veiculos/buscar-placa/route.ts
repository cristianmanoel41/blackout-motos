import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function limparPlaca(valor: string) {
  return String(valor || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function decodificarEntidadesXml(valor: string) {
  return valor
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function textoCampo(
  valor: unknown
): string {
  if (
    valor === null ||
    valor === undefined
  ) {
    return "";
  }

  if (typeof valor === "string") {
    return valor.trim();
  }

  if (
    typeof valor === "number"
  ) {
    return String(valor);
  }

  if (
    typeof valor === "object"
  ) {
    const objeto = valor as Record<
      string,
      unknown
    >;

    const candidatos = [
      objeto.CurrentTextValue,
      objeto.currentTextValue,
      objeto.Text,
      objeto.text,
      objeto.Value,
      objeto.value,
    ];

    for (const candidato of candidatos) {
      const texto =
        textoCampo(candidato);

      if (texto) return texto;
    }
  }

  return "";
}

function pegar(
  dados: Record<string, unknown>,
  ...chaves: string[]
) {
  for (const chave of chaves) {
    if (
      Object.prototype.hasOwnProperty.call(
        dados,
        chave
      )
    ) {
      const valor =
        textoCampo(dados[chave]);

      if (valor) return valor;
    }
  }

  return "";
}

function extrairVehicleJson(
  xml: string
): Record<string, unknown> {
  const correspondencia =
    xml.match(
      /<vehicleJson(?:\s[^>]*)?>([\s\S]*?)<\/vehicleJson>/i
    );

  if (!correspondencia) {
    throw new Error(
      "A API respondeu, mas não retornou os dados do veículo."
    );
  }

  const bruto =
    decodificarEntidadesXml(
      correspondencia[1]
    ).trim();

  if (!bruto) {
    throw new Error(
      "A consulta não retornou dados para esta placa."
    );
  }

  try {
    return JSON.parse(bruto);
  } catch {
    throw new Error(
      "A API retornou os dados em um formato inesperado."
    );
  }
}

function mensagemErroApi(
  dados: Record<string, unknown>
) {
  const candidatos = [
    "Error",
    "error",
    "Message",
    "message",
    "Status",
    "status",
  ];

  for (const chave of candidatos) {
    const valor =
      textoCampo(dados[chave]);

    if (
      valor &&
      /error|erro|invalid|not found|não encontrado|nao encontrado|no data/i.test(
        valor
      )
    ) {
      return valor;
    }
  }

  return "";
}

export async function GET(
  request: NextRequest
) {
  const placa = limparPlaca(
    request.nextUrl.searchParams.get(
      "placa"
    ) || ""
  );

  if (placa.length !== 7) {
    return NextResponse.json(
      {
        error:
          "Informe uma placa válida com 7 caracteres.",
      },
      { status: 400 }
    );
  }

  const username =
    process.env.REGCHECK_USERNAME?.trim();

  if (!username) {
    return NextResponse.json(
      {
        error:
          "A consulta de placa ainda não foi configurada. Defina REGCHECK_USERNAME no .env.local e no Vercel.",
      },
      { status: 500 }
    );
  }

  const endpoint =
    (
      process.env.REGCHECK_ENDPOINT ||
      "https://www.placaapi.com/api/reg.asmx/CheckBrazil"
    ).replace(/\/+$/, "");

  const url = new URL(endpoint);

  url.searchParams.set(
    "RegistrationNumber",
    placa
  );
  url.searchParams.set(
    "username",
    username
  );

  let resposta: Response;

  try {
    resposta = await fetch(
      url.toString(),
      {
        method: "GET",
        headers: {
          Accept:
            "application/xml,text/xml,*/*",
        },
        cache: "no-store",
      }
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Não foi possível conectar ao serviço de consulta de placa.",
      },
      { status: 502 }
    );
  }

  const corpo =
    await resposta.text();

  if (!resposta.ok) {
    return NextResponse.json(
      {
        error:
          "O serviço de consulta de placa recusou a requisição.",
      },
      { status: 502 }
    );
  }

  let dados: Record<
    string,
    unknown
  >;

  try {
    dados =
      extrairVehicleJson(corpo);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível interpretar a resposta da consulta.",
      },
      { status: 502 }
    );
  }

  const erroApi =
    mensagemErroApi(dados);

  if (erroApi) {
    return NextResponse.json(
      {
        error: erroApi,
      },
      { status: 404 }
    );
  }

  const descricao = pegar(
    dados,
    "Description",
    "description"
  );

  const marca = pegar(
    dados,
    "CarMake",
    "Make",
    "make",
    "Marca",
    "marca"
  );

  let modelo = pegar(
    dados,
    "CarModel",
    "Model",
    "model",
    "Modelo",
    "modelo"
  );

  if (
    !modelo &&
    descricao &&
    marca &&
    descricao
      .toUpperCase()
      .startsWith(
        marca.toUpperCase()
      )
  ) {
    modelo = descricao
      .slice(marca.length)
      .replace(/^[\s\-\/]+/, "")
      .trim();
  }

  const ano = pegar(
    dados,
    "RegistrationYear",
    "Year",
    "year",
    "Ano",
    "ano"
  );

  const resultado = {
    placa,
    marca,
    modelo,
    ano_fabricacao: ano,
    ano_modelo: ano,
    cor: pegar(
      dados,
      "Colour",
      "Color",
      "colour",
      "color",
      "Cor",
      "cor"
    ),
    chassi: pegar(
      dados,
      "Vin",
      "VIN",
      "vin",
      "Chassis",
      "chassis"
    ),
    cilindrada: pegar(
      dados,
      "EngineCC",
      "engineCC",
      "Cilindrada",
      "cilindrada"
    ),
    combustivel: pegar(
      dados,
      "Fuel",
      "fuel",
      "Combustivel",
      "combustivel"
    ),
    localizacao: pegar(
      dados,
      "Location",
      "location"
    ),
    descricao,
    renavam: "",
  };

  return NextResponse.json(
    resultado,
    {
      headers: {
        "Cache-Control":
          "no-store, max-age=0",
      },
    }
  );
}
