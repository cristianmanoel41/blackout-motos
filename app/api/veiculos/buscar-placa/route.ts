import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/*
 * CONSULTA DE PLACA — API BRASIL, BASE NACIONAL V2
 *
 * O que a loja precisa é chassi e RENAVAM a partir da placa.
 * São os dois campos onde errar um dígito estraga o contrato:
 * chassi tem 17 caracteres, RENAVAM tem 11.
 *
 * POR QUE ESTE FORNECEDOR
 *
 * O anterior (placaapi.com) nunca foi ligado, e não resolveria:
 * o campo renavam saía fixo em branco no código, porque aquela
 * consulta não entrega esse dado.
 *
 * Das opções da API Brasil, só a Base Nacional V2 traz os dois.
 * As irmãs mais baratas — Agregados Propria (R$ 0,08) e
 * Agregados V2 (R$ 0,60) — trazem chassi e não trazem RENAVAM,
 * o que é metade do serviço. Esta custa R$ 3,20 por consulta, e
 * é uma consulta por moto que entra no pátio.
 *
 * A BigDataCorp foi descartada: o dataset de chassi e RENAVAM
 * dela atende somente o Rio de Janeiro.
 *
 * A ARMADILHA QUE A PRÓPRIA DOCUMENTAÇÃO AVISA
 *
 * O erro chega no CORPO com HTTP 200. Conferir só o status da
 * resposta deixaria passar falha como sucesso, e o cadastro
 * seria preenchido com vazio como se tivesse dado certo. Por
 * isso a conferência de `error === false` vem antes de qualquer
 * leitura de dado.
 */

const ENDPOINT =
  process.env.APIBRASIL_ENDPOINT ||
  "https://gateway.apibrasil.io/api/v2/consulta/veiculos/credits";

function limparPlaca(valor: string) {
  return String(valor || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/*
 * Placa válida é a antiga (ABC1234) ou a do Mercosul (ABC1D23).
 *
 * A conferência é aqui, antes de gastar: cada consulta custa, e
 * placa digitada errada custaria igual à certa.
 */
function placaValida(placa: string) {
  return /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(placa);
}

/*
 * Procura um campo em qualquer nível da resposta.
 *
 * A documentação mostra chassi e renavam dentro de
 * `data.baseNacional`, mas o mesmo gateway serve vários
 * produtos e a forma muda entre eles. Procurar pelo NOME, em
 * vez de pelo caminho, faz a integração sobreviver a uma
 * mudança de ninho — que é o tipo de coisa que acontece sem
 * aviso e quebra na primeira moto do dia.
 */
function acharCampo(objeto: unknown, ...nomes: string[]): string {
  const procurados = nomes.map((n) => n.toLowerCase());
  const visitados = new Set<unknown>();

  const visitar = (no: unknown): string => {
    if (!no || typeof no !== "object") return "";
    if (visitados.has(no)) return "";
    visitados.add(no);

    if (Array.isArray(no)) {
      for (const item of no) {
        const achado = visitar(item);
        if (achado) return achado;
      }
      return "";
    }

    const registro = no as Record<string, unknown>;

    for (const [chave, valor] of Object.entries(registro)) {
      if (
        procurados.includes(chave.toLowerCase()) &&
        (typeof valor === "string" || typeof valor === "number")
      ) {
        const texto = String(valor).trim();
        if (texto) return texto;
      }
    }

    for (const valor of Object.values(registro)) {
      const achado = visitar(valor);
      if (achado) return achado;
    }

    return "";
  };

  return visitar(objeto);
}

/*
 * "HONDA/CG 160 FAN" vira marca e modelo separados.
 *
 * O campo vem junto, com barra, e o cadastro tem um campo para
 * cada. Sem barra, tudo vai para o modelo: é melhor o modelo
 * ficar comprido do que a marca sair errada.
 */
function separarMarcaModelo(junto: string) {
  const texto = junto.trim();

  if (!texto) return { marca: "", modelo: "" };

  const barra = texto.indexOf("/");

  if (barra < 0) return { marca: "", modelo: texto };

  return {
    marca: texto.slice(0, barra).trim(),
    modelo: texto.slice(barra + 1).trim(),
  };
}

/* Só os dígitos: chassi e RENAVAM às vezes vêm com pontuação. */
const soDigitos = (valor: string) => valor.replace(/\D/g, "");

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const placa = limparPlaca(url.searchParams.get("placa") || "");

  if (!placaValida(placa)) {
    return NextResponse.json(
      { error: "Placa inválida. Use o formato ABC1234 ou ABC1D23." },
      { status: 400 }
    );
  }

  const token = process.env.APIBRASIL_BEARER_TOKEN?.trim();
  const dispositivo = process.env.APIBRASIL_DEVICE_TOKEN?.trim();

  if (!token) {
    return NextResponse.json(
      {
        error:
          "A consulta de placa ainda não foi configurada. Defina APIBRASIL_BEARER_TOKEN no .env.local e na Vercel.",
      },
      { status: 503 }
    );
  }

  let resposta: Response;

  try {
    resposta = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        /* O DeviceToken é exigido por parte das APIs do gateway.
           Vai quando existir; não atrapalha quem não pede. */
        ...(dispositivo ? { DeviceToken: dispositivo } : {}),
      },
      body: JSON.stringify({
        tipo: "base-nacional-v2",
        placa,
        /* homolog=true devolve dado de exemplo sem cobrar. Serve
           para conferir a ligação antes de gastar consulta. */
        ...(process.env.APIBRASIL_HOMOLOGACAO === "sim"
          ? { homolog: true }
          : {}),
      }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível falar com a consulta de placa." },
      { status: 502 }
    );
  }

  let corpo: unknown;

  try {
    corpo = await resposta.json();
  } catch {
    return NextResponse.json(
      { error: "A consulta de placa respondeu em formato inesperado." },
      { status: 502 }
    );
  }

  const registro = (corpo || {}) as Record<string, unknown>;

  /*
   * A conferência que a documentação pede, antes de tudo.
   *
   * Sem ela, uma placa inexistente voltaria com HTTP 200 e o
   * cadastro seria preenchido com vazio — e quem está na loja
   * acharia que a consulta funcionou.
   */
  if (registro.error === true || resposta.status >= 400) {
    const recado =
      typeof registro.message === "string" && registro.message.trim()
        ? registro.message.trim()
        : "A consulta não encontrou esta placa.";

    return NextResponse.json({ error: recado }, { status: 404 });
  }

  const chassi = acharCampo(corpo, "chassi", "chassis", "vin");
  const renavam = soDigitos(acharCampo(corpo, "renavam"));

  const { marca, modelo } = separarMarcaModelo(
    acharCampo(corpo, "marcaModelo", "marca_modelo", "marcaemodelo")
  );

  const resultado = {
    placa: acharCampo(corpo, "placa") || placa,
    marca: marca || acharCampo(corpo, "marca"),
    modelo: modelo || acharCampo(corpo, "modelo"),
    ano_fabricacao: acharCampo(corpo, "anoFabricacao", "ano_fabricacao"),
    ano_modelo: acharCampo(corpo, "anoModelo", "ano_modelo"),
    cor: acharCampo(corpo, "corVeiculo", "cor", "color"),
    chassi,
    renavam,
    cilindrada: acharCampo(corpo, "cilindradas", "cilindrada"),
    combustivel: acharCampo(corpo, "combustivel"),
    localizacao: [
      acharCampo(corpo, "municipio"),
      acharCampo(corpo, "uf"),
    ]
      .filter(Boolean)
      .join(" - "),
    situacao: acharCampo(corpo, "situacaoVeiculo", "situacao"),
    descricao: acharCampo(corpo, "marcaModelo", "marca_modelo"),
  };

  /*
   * Veio resposta, mas sem o que interessa.
   *
   * Acontece com placa fora da base. Dizer isso é melhor que
   * preencher o cadastro com nada e deixar a pessoa achando que
   * a moto não tem chassi.
   */
  if (!resultado.chassi && !resultado.modelo) {
    return NextResponse.json(
      { error: "A consulta não trouxe dados desta placa." },
      { status: 404 }
    );
  }

  return NextResponse.json(resultado, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
