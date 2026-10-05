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

/*
 * Qual produto da API Brasil é consultado.
 *
 * O mesmo endereço serve vários, e quem escolhe é este campo:
 *
 *   nacional          R$ 1,80 — chassi, RENAVAM, nome do
 *                     proprietário, roubo e furto, Renajud, PDF
 *   base-nacional-v2  R$ 3,20 — chassi, RENAVAM, restrições de
 *                     financiamento, número do motor
 *
 * Fica em variável de ambiente porque trocar de produto não
 * devia pedir mexida no código: o leitor de campos abaixo
 * procura pelo nome, e os dois formatos já foram testados.
 *
 * É lido a cada chamada, não uma vez só. Guardado numa constante
 * do módulo, o valor congelava no primeiro carregamento — foi
 * assim que o meu próprio teste comparou um produto com ele
 * mesmo e eu quase culpei a API deles.
 */
function tipoDaConsulta() {
  return process.env.APIBRASIL_TIPO || "base-nacional-v2";
}

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

  /*
   * MODO DE TESTE, SEM CONTA E SEM GASTAR
   *
   * Com APIBRASIL_SIMULAR=sim no .env.local, a rota devolve um
   * veículo de mentira sem falar com a API. Serve para conferir o
   * caminho inteiro na tela — o botão, o preenchimento dos
   * campos, o que acontece quando a placa não existe — antes de
   * contratar qualquer coisa.
   *
   * Duas travas, porque dado de mentira em ficha de moto é pior
   * que consulta nenhuma:
   *
   *   1. só funciona fora de produção, então ligar a variável na
   *      Vercel por engano não tem efeito;
   *   2. os valores são impossíveis de confundir com os reais —
   *      o chassi começa com SIMULACAO, e a resposta vem marcada
   *      com `simulado`, que a tela usa para avisar.
   *
   * Placa terminada em 0 devolve erro de propósito. O caminho da
   * falha também precisa de teste: a tela tem que avisar, não
   * preencher os campos com vazio.
   */
  if (
    process.env.APIBRASIL_SIMULAR === "sim" &&
    process.env.NODE_ENV !== "production"
  ) {
    if (placa.endsWith("0")) {
      return NextResponse.json(
        { error: "SIMULAÇÃO: nenhum veículo com esta placa na base." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        placa,
        marca: "HONDA",
        modelo: "CG 160 FAN",
        ano_fabricacao: "2021",
        ano_modelo: "2022",
        cor: "VERMELHA",
        chassi: "SIMULACAO00000000",
        renavam: "00000000000",
        cilindrada: "162",
        combustivel: "GASOLINA",
        localizacao: "SAO JOSE DOS CAMPOS - SP",
        situacao: "EM CIRCULACAO",
        descricao: "HONDA/CG 160 FAN",
        simulado: true,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
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
        tipo: tipoDaConsulta(),
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
  /*
   * Saldo acabado tem recado próprio.
   *
   * A API devolve 402 quando os créditos zeram. Sem este trecho a
   * mensagem padrão diria "não encontrou esta placa" — e quem está
   * na loja procuraria defeito na moto, no documento ou no
   * sistema, quando o problema é recarregar a conta. É o único
   * erro aqui que se resolve com cartão, não com conferência.
   */
  if (resposta.status === 402) {
    return NextResponse.json(
      {
        error:
          "Os créditos da consulta de placa acabaram. Recarregue em app.apibrasil.io/recargas. Os campos podem ser preenchidos à mão.",
      },
      { status: 402 }
    );
  }

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
    /* A V2 chama de corVeiculo, a V1 de cor_veiculo. */
    cor: acharCampo(corpo, "corVeiculo", "cor_veiculo", "cor", "color"),
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

    /*
     * Homologação deles também é dado de mentira.
     *
     * Com APIBRASIL_HOMOLOGACAO=sim a API responde sempre o mesmo
     * veículo de exemplo — um Ford Focus — e não cobra. Sem esta
     * marca, a tela mostraria esse carro em verde, como consulta
     * boa, e alguém cadastraria a moto com o chassi dele.
     *
     * A marca vem do que ELES dizem na resposta, não do que nós
     * mandamos: se um dia a conta cair em homologação sozinha, o
     * aviso aparece do mesmo jeito.
     */
    simulado:
      registro.homolog === true ||
      registro.api_limit_for === "homolog" ||
      undefined,
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
