import Anthropic from "@anthropic-ai/sdk";
import { recusarSemLogin } from "@/lib/supabase/exigir-login";
import { LOJA } from "@/lib/dados/loja";

/*
 * O ASSISTENTE DO SISTEMA (pedido de 19/11/2026)
 *
 * Um chat para a equipe conversar direto de dentro do sistema -
 * tirar dúvida, pedir uma ideia, revisar um texto. Não enxerga o
 * banco (estoque, caixa, clientes): é conversa, não consulta.
 *
 * Fica atrás do login, como o resto das rotas internas.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const MODELO_IA = "claude-opus-5-5";

const MAX_TEXTO = 4000;
const MAX_MENSAGENS = 40;

type Mensagem = { papel: "usuario" | "assistente"; texto: string };

const INSTRUCOES = `Você é o assistente interno da ${LOJA.nome}, loja de motos seminovas em ${LOJA.cidade}. Conversa com a equipe direto de dentro do sistema deles.

- Responda em português do Brasil, direto e sem enrolação.
- Você não tem acesso ao banco de dados da loja (estoque, vendas, caixa, clientes) - se perguntarem algo assim, diga que não enxerga esses dados daqui e sugira onde no sistema olhar.
- Pode ajudar com texto de anúncio, dúvida geral, ideia, revisão, cálculo simples, etc.`;

export async function POST(requisicao: Request) {
  const semLogin = await recusarSemLogin();
  if (semLogin) return semLogin;

  const chave = process.env.ANTHROPIC_API_KEY;
  if (!chave) {
    return Response.json(
      { error: "A chave da Anthropic não está configurada." },
      { status: 500 }
    );
  }

  const corpo = await requisicao.json().catch(() => null);

  const mensagens: Mensagem[] = (
    Array.isArray(corpo?.mensagens) ? corpo.mensagens : []
  )
    .slice(-MAX_MENSAGENS)
    .map((m: Mensagem) => ({
      papel: m?.papel === "assistente" ? "assistente" : "usuario",
      texto: String(m?.texto || "").slice(0, MAX_TEXTO),
    }))
    .filter((m: Mensagem) => m.texto);

  if (mensagens.length === 0) {
    return Response.json({ error: "Escreva uma mensagem." }, { status: 400 });
  }

  const client = new Anthropic();

  try {
    const resposta = await client.beta.messages.create({
      model: MODELO_IA,
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: INSTRUCOES,
      messages: mensagens.map((m) => ({
        role: m.papel === "assistente" ? "assistant" : "user",
        content: m.texto,
      })),
    });

    if (resposta.stop_reason === "refusal") {
      return Response.json({ texto: "Não consigo ajudar com isso." });
    }

    const bloco = resposta.content.find((item) => item.type === "text");
    const texto = bloco && bloco.type === "text" ? bloco.text : "";

    if (!texto) {
      return Response.json(
        { error: "Não consegui responder agora. Tente de novo." },
        { status: 502 }
      );
    }

    return Response.json({ texto });
  } catch (erro) {
    console.error("[assistente] falhou:", (erro as Error)?.message);
    return Response.json(
      { error: "Não consegui responder agora. Tente de novo." },
      { status: 502 }
    );
  }
}
