/*
 * O SIMULADOR DENTRO DO CHAT "ACHE SUA MOTO"
 *
 * Em vez de um formulário, a simulação vira conversa: o chat
 * pergunta uma coisa de cada vez (valor da moto, financiamento
 * ou cartão, entrada, prazo) e a pessoa responde do jeito dela
 * ("18 mil", "sem entrada", "48x"). Quem já disse tudo de uma
 * vez ("financiar 20 mil com 5 de entrada em 36x") pula direto
 * para a conta.
 *
 * A conta é a mesma do resto do site, para dar o mesmo número:
 *   - financiamento: Tabela Price com a faixa de taxas da loja
 *     (lib/dados/parcela);
 *   - cartão: a tabela da maquininha (lib/dados/cartao-maquininha),
 *     com a entrada abatendo o que passa no cartão.
 *
 * Tudo roda no navegador e nada vai para o servidor nem para a
 * IA: o que a pessoa conta da vida financeira dela só sai dali
 * se ela mesma mandar no WhatsApp.
 */

import { formatarMoeda } from "@/lib/formatadores/moeda";
import {
  MAXIMA_ESCRITA,
  MINIMA_ESCRITA,
  TAXA_MAXIMA,
  TAXA_MINIMA,
  parcelaPrice,
} from "@/lib/dados/parcela";
import { noCartao } from "@/lib/dados/cartao-maquininha";

export type Forma = "financiamento" | "cartao";

export type MotoSimulada = {
  nome: string;
  ano: string;
  valor: number;
};

export type Simulacao = {
  moto?: MotoSimulada;
  valor?: number;
  forma?: Forma;
  entrada?: number;
  prazo?: number;
};

export type Passo = {
  /* null: a simulação acabou e o chat volta a buscar moto. */
  sim: Simulacao | null;
  texto: string;
  opcoes: string[];
  whatsapp?: string;
};

const PRAZOS_FINANCIAMENTO = { min: 6, max: 48, botoes: [12, 24, 36, 48] };
const PRAZOS_CARTAO = { min: 1, max: 24, botoes: [6, 10, 12, 18, 24] };

const SAIR = "Sair da simulação";

function semAcento(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/* "simular", "quanto fica", "dá pra financiar?" abrem a simulação. */
export function querSimular(texto: string) {
  return /\b(simul\w*|financ\w*|quanto fica|parcelar|no cartao)\b/.test(
    semAcento(texto)
  );
}

/*
 * Um número de dinheiro escrito do jeito da pessoa:
 * "18 mil", "18,9 mil", "18k", "18.900", "R$ 18.900,00", "18900".
 */
function paraNumero(bruto: string, milhar: boolean) {
  let limpo = bruto.replace(/[.,]$/, "");

  if (limpo.includes(",")) {
    limpo = limpo.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) {
    limpo = limpo.replace(/\./g, "");
  }

  let valor = Number(limpo);
  if (!Number.isFinite(valor)) return null;
  if (milhar) valor *= 1000;

  return Math.round(valor * 100) / 100;
}

const DINHEIRO = /(\d[\d.,]*)\s*(mil\b|k\b)?/;

function lerDinheiro(texto: string) {
  const achado = semAcento(texto).match(DINHEIRO);
  if (!achado) return null;
  return paraNumero(achado[1], Boolean(achado[2]));
}

/* "48x", "48 vezes", "em 48 meses". */
const PRAZO = /\b(\d{1,2})\s*(x\b|vezes\b|meses\b|mes\b|parcelas\b)/;

function lerPrazo(texto: string, soNumero: boolean) {
  const t = semAcento(texto);
  const achado = t.match(PRAZO) || (soNumero ? t.match(/^\D*(\d{1,2})\D*$/) : null);
  return achado ? Number(achado[1]) : null;
}

function lerForma(texto: string): Forma | null {
  const t = semAcento(texto);
  if (/\b(cartao|credito|maquininha)\b/.test(t)) return "cartao";
  if (/\b(financ\w*|banco|boleto|carne)\b/.test(t)) return "financiamento";
  return null;
}

const SEM_ENTRADA = /\b(sem entrada|nao tenho|nada|zero|nenhuma)\b/;

/* "5 mil de entrada", "entrada de 5 mil", "sem entrada". */
function lerEntradaNaFrase(texto: string) {
  const t = semAcento(texto);
  if (/\bsem entrada\b/.test(t)) return 0;

  const depois = t.match(/entrada\s*(?:de|:)?\s*(?:r\$\s*)?(\d[\d.,]*)\s*(mil\b|k\b)?/);
  const antes = t.match(/(\d[\d.,]*)\s*(mil\b|k\b)?\s*(?:reais\s*)?(?:de|pra|para)\s*(?:dar\s*(?:de|na)?\s*)?entrada/);
  const achado = depois || antes;

  return achado ? paraNumero(achado[1], Boolean(achado[2])) : null;
}

/*
 * Quem escreve "20" para o valor da moto quer dizer 20 mil; ninguém
 * financia moto de vinte reais. Na entrada, "5" também é 5 mil.
 */
function emReais(valor: number, limiteDoMil: number) {
  return valor > 0 && valor < limiteDoMil ? valor * 1000 : valor;
}

function valorDa(sim: Simulacao) {
  return sim.moto?.valor || sim.valor || 0;
}

function nomeDa(sim: Simulacao) {
  return sim.moto ? `${sim.moto.nome} ${sim.moto.ano}` : "";
}

function faixaDoPrazo(forma: Forma | undefined) {
  return forma === "cartao" ? PRAZOS_CARTAO : PRAZOS_FINANCIAMENTO;
}

/* A pergunta do que ainda falta, ou a conta quando não falta nada. */
function proximo(sim: Simulacao, aviso = ""): Passo {
  const antes = aviso ? `${aviso}\n\n` : "";
  const valor = valorDa(sim);

  if (!valor) {
    return {
      sim,
      texto: `${antes}Qual o valor da moto? Pode escrever do seu jeito, tipo "18 mil". Se for uma das motos que eu mostrei, toque em "Simular" no card dela.`,
      opcoes: [SAIR],
    };
  }

  if (!sim.forma) {
    return {
      sim,
      texto: `${antes}Vai ser no financiamento ou no cartão de crédito?`,
      opcoes: ["Financiamento", "Cartão de crédito", SAIR],
    };
  }

  if (sim.entrada === undefined) {
    const sugestoes = [2000, 5000, 10000]
      .filter((v) => v < valor * 0.8)
      .map((v) => `R$ ${v / 1000} mil`);

    return {
      sim,
      texto: `${antes}Quanto você tem de entrada? Se não tiver, é só dizer "sem entrada".`,
      opcoes: ["Sem entrada", ...sugestoes],
    };
  }

  if (!sim.prazo) {
    const faixa = faixaDoPrazo(sim.forma);
    return {
      sim,
      texto: `${antes}Em quantas vezes? ${
        sim.forma === "cartao" ? "No cartão vai de 1x a 24x." : "O banco vai até 48x."
      }`,
      opcoes: faixa.botoes.map((n) => `${n}x`),
    };
  }

  return resultado(sim, antes);
}

function resultado(sim: Simulacao, antes: string): Passo {
  const valor = valorDa(sim);
  const entrada = Math.min(sim.entrada || 0, valor);
  const resto = valor - entrada;
  const prazo = sim.prazo || 0;
  const nome = nomeDa(sim);

  const linhas = [
    nome ? `${nome}: ${formatarMoeda(valor)}` : `Moto de ${formatarMoeda(valor)}`,
    `Entrada: ${entrada > 0 ? formatarMoeda(entrada) : "sem entrada"}`,
  ];

  let mensagem: Array<string | null>;

  if (sim.forma === "cartao") {
    const cartao = noCartao(resto, prazo);
    linhas.push(
      `No cartão: ${formatarMoeda(resto)}`,
      `👉 ${cartao.parcelas}x de ${formatarMoeda(cartao.parcela)}`,
      `Total no cartão: ${formatarMoeda(cartao.total)}`
    );
    mensagem = [
      "Olá! Simulei no cartão pelo chat do site:",
      "",
      nome ? `Moto: ${nome}` : null,
      `Valor: ${formatarMoeda(valor)}`,
      entrada > 0 ? `Entrada: ${formatarMoeda(entrada)}` : null,
      `No cartão: ${formatarMoeda(resto)}`,
      `${cartao.parcelas}x de ${formatarMoeda(cartao.parcela)}`,
      `Total no cartão: ${formatarMoeda(cartao.total)}`,
      "",
      "Quero confirmar se dá para fechar assim.",
    ];
  } else {
    const minima = parcelaPrice(resto, TAXA_MINIMA, prazo);
    const maxima = parcelaPrice(resto, TAXA_MAXIMA, prazo);
    linhas.push(
      `Financiado: ${formatarMoeda(resto)}`,
      `👉 ${prazo}x de ${formatarMoeda(minima)} a ${formatarMoeda(maxima)}`,
      "",
      `A parcela certa sai na análise de crédito do banco (taxa de ${MINIMA_ESCRITA} a ${MAXIMA_ESCRITA} ao mês).`
    );
    mensagem = [
      "Olá! Fiz uma simulação no chat do site:",
      "",
      nome ? `Moto: ${nome}` : null,
      `Valor: ${formatarMoeda(valor)}`,
      `Entrada: ${entrada > 0 ? formatarMoeda(entrada) : "sem entrada"}`,
      `Parcelas: ${prazo}x de ${formatarMoeda(minima)} a ${formatarMoeda(maxima)}`,
      "",
      "Quero ver as condições reais do banco.",
    ];
  }

  return {
    sim,
    texto: `${antes}${linhas.join("\n")}`,
    opcoes: [
      "Mudar entrada",
      "Mudar prazo",
      sim.forma === "cartao" ? "Ver no financiamento" : "Ver no cartão",
      "Simular outra moto",
      SAIR,
    ],
    whatsapp: mensagem.filter((l) => l !== null).join("\n"),
  };
}

/* Confere o que a pessoa passou e devolve o aviso se algo não fecha. */
function conferir(sim: Simulacao): [Simulacao, string] {
  const valor = valorDa(sim);
  let aviso = "";
  const certo = { ...sim };

  if (certo.entrada !== undefined && valor && certo.entrada >= valor) {
    aviso = "Com essa entrada a moto já fica paga, não sobra nada para parcelar 🙂";
    certo.entrada = undefined;
  }

  if (certo.prazo !== undefined && certo.forma) {
    const faixa = faixaDoPrazo(certo.forma);
    if (certo.prazo < faixa.min || certo.prazo > faixa.max) {
      aviso =
        certo.forma === "cartao"
          ? "No cartão dá de 1x a 24x."
          : "No financiamento o banco faz de 6x a 48x.";
      certo.prazo = undefined;
    }
  }

  return [certo, aviso];
}

/* O que dá para tirar de uma frase solta ("20 mil com 5 de entrada em 36x"). */
function lerFrase(sim: Simulacao, texto: string): Simulacao {
  const novo = { ...sim };
  const t = semAcento(texto);

  const forma = lerForma(t);
  if (forma) novo.forma = forma;

  const prazo = lerPrazo(t, false);
  if (prazo) novo.prazo = prazo;

  const entrada = lerEntradaNaFrase(t);
  if (entrada !== null) novo.entrada = emReais(entrada, 100);

  if (!valorDa(novo)) {
    /* Tira prazo e entrada da frase antes de procurar o valor da moto. */
    const resto = t
      .replace(PRAZO, " ")
      .replace(/entrada\s*(?:de|:)?\s*(?:r\$\s*)?\d[\d.,]*\s*(mil\b|k\b)?/, " ")
      .replace(/\d[\d.,]*\s*(mil\b|k\b)?\s*(?:reais\s*)?(?:de|pra|para)\s*(?:dar\s*(?:de|na)?\s*)?entrada/, " ");
    const valor = lerDinheiro(resto);
    if (valor) novo.valor = emReais(valor, 300);
  }

  return novo;
}

/* Começa a simulação: de uma moto do card, ou de uma frase. */
export function comecar(moto?: MotoSimulada, texto = ""): Passo {
  let sim: Simulacao = moto && moto.valor > 0 ? { moto } : {};
  if (texto) sim = lerFrase(sim, texto);

  const [certo, aviso] = conferir(sim);
  const nome = nomeDa(certo);
  const abertura = nome
    ? `Bora simular a ${nome} (${formatarMoeda(valorDa(certo))}).`
    : "Bora simular! Eu faço a conta com você.";

  return proximo(certo, [abertura, aviso].filter(Boolean).join("\n\n"));
}

/* Uma resposta da pessoa no meio da simulação. */
export function responder(sim: Simulacao, texto: string): Passo {
  const t = semAcento(texto).trim();

  if (/\b(sair|cancelar|parar|chega)\b/.test(t)) {
    return {
      sim: null,
      texto: "Pronto! Me diz o que você procura que eu busco no estoque de hoje.",
      opcoes: [],
    };
  }

  if (/\bmudar entrada\b/.test(t)) return proximo({ ...sim, entrada: undefined });
  if (/\bmudar prazo\b/.test(t)) return proximo({ ...sim, prazo: undefined });
  if (/\boutra moto\b/.test(t)) return comecar();

  if (/\bver no (cartao|financiamento)\b/.test(t)) {
    const forma: Forma = t.includes("cartao") ? "cartao" : "financiamento";
    const [certo] = conferir({ ...sim, forma });
    return proximo(certo);
  }

  /* Primeiro o que a frase diz com todas as letras... */
  let novo = lerFrase(sim, texto);

  /* ...depois a resposta curta para a pergunta que estava aberta. */
  if (novo === sim || JSON.stringify(novo) === JSON.stringify(sim)) {
    if (!valorDa(sim)) {
      const valor = lerDinheiro(t);
      if (valor) novo = { ...sim, valor: emReais(valor, 300) };
    } else if (!sim.forma) {
      const forma = lerForma(t);
      if (forma) novo = { ...sim, forma };
    } else if (sim.entrada === undefined) {
      if (SEM_ENTRADA.test(t)) novo = { ...sim, entrada: 0 };
      else {
        const valor = lerDinheiro(t);
        if (valor !== null) novo = { ...sim, entrada: emReais(valor, 100) };
      }
    } else if (!sim.prazo) {
      const prazo = lerPrazo(t, true);
      if (prazo) novo = { ...sim, prazo };
    }
  }

  if (JSON.stringify(novo) === JSON.stringify(sim)) {
    return proximo(sim, "Não entendi 😅");
  }

  const [certo, aviso] = conferir(novo);
  return proximo(certo, aviso);
}
