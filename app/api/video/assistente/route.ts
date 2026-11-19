import Anthropic from "@anthropic-ai/sdk";
import { recusarSemLogin } from "@/lib/supabase/exigir-login";

/*
 * O CHAT DO EDITOR DE VÍDEO (pedido de 19/11/2026)
 *
 * Diferente do /api/assistente (conversa solta): este recebe o
 * estado atual da edição - textos da moto, quando cada card
 * aparece, quais estão ligados - e devolve só os campos que o
 * pedido muda. Quem chama (EditorDeVideo.tsx) aplica o que não
 * vier null e ignora o resto; nada aqui mexe direto na tela.
 */

export const runtime = "nodejs";
export const maxDuration = 30;

const MODELO_IA = "claude-opus-5-5";

const CAMPO_TEXTO = { type: ["string", "null"] } as const;
const CAMPO_NUMERO = { type: ["number", "null"] } as const;
const CAMPO_BOOLEANO = { type: ["boolean", "null"] } as const;

const FORMATO_DA_RESPOSTA = {
  type: "object",
  additionalProperties: false,
  required: ["resposta", "textos", "cartoes", "mostrar"],
  properties: {
    resposta: { type: "string" },
    textos: {
      type: "object",
      additionalProperties: false,
      required: ["marca", "modelo", "ano", "km", "preco"],
      properties: {
        marca: CAMPO_TEXTO,
        modelo: CAMPO_TEXTO,
        ano: CAMPO_TEXTO,
        km: CAMPO_TEXTO,
        preco: CAMPO_TEXTO,
      },
    },
    cartoes: {
      type: "object",
      additionalProperties: false,
      required: ["outroDuracao", "ano", "manual", "cautelar", "km", "financiamento", "cartao", "preco"],
      properties: {
        outroDuracao: CAMPO_NUMERO,
        ano: CAMPO_NUMERO,
        manual: CAMPO_NUMERO,
        cautelar: CAMPO_NUMERO,
        km: CAMPO_NUMERO,
        financiamento: CAMPO_NUMERO,
        cartao: CAMPO_NUMERO,
        preco: CAMPO_NUMERO,
      },
    },
    mostrar: {
      type: "object",
      additionalProperties: false,
      required: ["logo", "textos", "legendas", "ano", "km", "financiamento", "cartao", "manual", "cautelar"],
      properties: {
        logo: CAMPO_BOOLEANO,
        textos: CAMPO_BOOLEANO,
        legendas: CAMPO_BOOLEANO,
        ano: CAMPO_BOOLEANO,
        km: CAMPO_BOOLEANO,
        financiamento: CAMPO_BOOLEANO,
        cartao: CAMPO_BOOLEANO,
        manual: CAMPO_BOOLEANO,
        cautelar: CAMPO_BOOLEANO,
      },
    },
  },
};

const INSTRUCOES = `Você ajusta o editor de vídeo da Blackout Motos a partir do que a pessoa pede em português.

O editor desenha, por cima do vídeo: um cabeçalho fixo (marca/modelo/ano) e cards de informação que aparecem e somem em tempos marcados, em segundos - ANO, MANUAL (acompanha manual/chave reserva), CAUTELAR (100% aprovada), QUILOMETRAGEM, FINANCIAMENTO, CARTÃO, e um painel de PREÇO antes da tela final. Cada card tem um horário em "cartoes" e um liga/desliga em "mostrar". "outroDuracao" é quantos segundos a tela final (logo grande + WhatsApp) dura no final do vídeo.

Você recebe o estado atual (duração total do vídeo em segundos, textos, cartoes, mostrar) e o pedido. Devolva em "textos", "cartoes" e "mostrar" SÓ os campos que o pedido muda - todo o resto fica null (não "o valor atual", null mesmo, para não mexer em nada que não foi pedido). Em "resposta", uma frase curta confirmando o que você fez, ou explicando em uma frase se não entendeu o pedido (nesse caso todos os campos ficam null).

Regras:
- Tempo em segundos, pode vir como "8", "8s", "no segundo 8" - sempre interprete como segundos.
- "liga"/"mostra"/"ativa" = true; "desliga"/"esconde"/"tira"/"remove" = false.
- Nunca invente marca, modelo, ano, km ou preço que a pessoa não disse - só mude texto se o pedido disser claramente o novo valor.
- Um tempo não pode ficar maior que a duração total do vídeo; se pedirem isso, explique em "resposta" e não mude o campo.
- Pedido fora desse assunto (edição do vídeo): não mude nada, explique em "resposta" que você só ajusta os cards aqui.`;

type Estado = {
  duracaoTotal: number;
  textos: Record<string, string>;
  cartoes: Record<string, number>;
  mostrar: Record<string, boolean>;
};

export async function POST(requisicao: Request) {
  const semLogin = await recusarSemLogin();
  if (semLogin) return semLogin;

  const chave = process.env.ANTHROPIC_API_KEY;
  if (!chave) {
    return Response.json({ error: "A chave da Anthropic não está configurada." }, { status: 500 });
  }

  const corpo = await requisicao.json().catch(() => null);
  const pedido = String(corpo?.pedido || "").trim().slice(0, 500);
  const estado = corpo?.estado as Estado | undefined;

  if (!pedido || !estado) {
    return Response.json({ error: "Faltou o pedido ou o estado atual do editor." }, { status: 400 });
  }

  const client = new Anthropic();

  try {
    const resposta = await client.beta.messages.create({
      model: MODELO_IA,
      max_tokens: 1200,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: INSTRUCOES,
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: FORMATO_DA_RESPOSTA },
      },
      messages: [
        {
          role: "user",
          content: `Estado atual: ${JSON.stringify(estado)}\n\nPedido: ${pedido}`,
        },
      ],
    });

    if (resposta.stop_reason === "refusal") {
      return Response.json({ resposta: "Não consigo ajudar com isso.", textos: null, cartoes: null, mostrar: null });
    }

    const bloco = resposta.content.find((item) => item.type === "text");
    if (!bloco || bloco.type !== "text") {
      return Response.json({ error: "Não consegui entender o pedido. Tente de novo." }, { status: 502 });
    }

    const dados = JSON.parse(bloco.text);
    return Response.json(dados);
  } catch (erro) {
    console.error("[assistente do editor] falhou:", (erro as Error)?.message);
    return Response.json({ error: "Não consegui entender o pedido. Tente de novo." }, { status: 502 });
  }
}
