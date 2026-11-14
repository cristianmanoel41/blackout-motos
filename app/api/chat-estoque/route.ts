import { estoqueDoSite } from "@/lib/dados/estoque-site";
import {
  anoDaMoto,
  kmDaMoto,
  nomeDaMoto,
  precoDaMoto,
  type MotoSite,
} from "@/lib/dados/moto-site";
import {
  linhaParaIA,
  procurarNoEstoque,
} from "@/lib/dados/chat-estoque";
import { LOJA } from "@/lib/dados/loja";

/*
 * O CHAT "ACHE SUA MOTO" DO SITE
 *
 * Recebe o que a pessoa escreveu e devolve uma frase curta e
 * as motos do estoque de hoje que servem.
 *
 * Com OPENAI_API_KEY na Vercel, quem entende o pedido é a IA:
 * ela recebe a lista do estoque (só o que já está na vitrine -
 * nome, ano, preço anunciado, km) e escolhe pelos ids. Moto que
 * ela citar e não existir é descartada aqui; preço e foto saem
 * sempre do banco, nunca do texto da IA.
 *
 * Sem a chave, ou se a OpenAI falhar ou demorar, responde a
 * busca própria (lib/dados/chat-estoque) - o chat funciona do
 * mesmo jeito, só entende menos frase solta.
 *
 * Nada do visitante vai para a OpenAI além do que ele digitou.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TEXTO = 300;
const MAX_TURNOS = 6;

/*
 * Freio contra abuso: cada pergunta à IA custa. Por instância
 * do servidor, então é aproximado - mas segura quem fica
 * apertando enter em loop.
 */
const PEDIDOS_POR_JANELA = 20;
const JANELA_MS = 5 * 60 * 1000;
const contagem = new Map<string, { n: number; desde: number }>();

/*
 * E um teto por dia (revisão de segurança de 13/11/2026): quem
 * espera os 5 minutos e volta não consegue passar o dia
 * perguntando. Uma pessoa de verdade não chega perto de 60.
 */
const PEDIDOS_POR_DIA = 60;
const DIA_MS = 24 * 60 * 60 * 1000;
const contagemDoDia = new Map<string, { n: number; desde: number }>();

function contar(
  mapa: Map<string, { n: number; desde: number }>,
  ip: string,
  janela: number,
  limite: number
) {
  const agora = Date.now();
  const atual = mapa.get(ip);

  if (!atual || agora - atual.desde > janela) {
    mapa.set(ip, { n: 1, desde: agora });
    if (mapa.size > 5000) mapa.clear();
    return false;
  }

  atual.n += 1;
  return atual.n > limite;
}

function passouDoLimite(ip: string) {
  const naJanela = contar(contagem, ip, JANELA_MS, PEDIDOS_POR_JANELA);
  const noDia = contar(contagemDoDia, ip, DIA_MS, PEDIDOS_POR_DIA);
  return naJanela || noDia;
}

/*
 * Só responde a pedido que saiu de uma página do próprio site.
 *
 * O navegador sempre manda de onde veio o pedido (Origin). Um
 * script de fora pode mentir, mas outro site não consegue usar
 * o chat da loja de dentro das páginas dele.
 */
function veioDoSite(requisicao: Request) {
  const origem = requisicao.headers.get("origin");
  if (!origem) return true;

  try {
    const host = new URL(origem).hostname;
    const daqui = new URL(requisicao.url).hostname;
    return (
      host === daqui ||
      host === "blackoutmotos.com.br" ||
      host === "www.blackoutmotos.com.br" ||
      host === "localhost" ||
      host.endsWith(".vercel.app") ||
      host.endsWith(".ts.net") ||
      /^(192\.168|10|100)\./.test(host)
    );
  } catch {
    return false;
  }
}

type Turno = { quem: "cliente" | "loja"; texto: string };

function paraTela(
  moto: MotoSite,
  slugs: Record<string, string>,
  capas: Record<string, string>
) {
  return {
    id: moto.id,
    nome: nomeDaMoto(moto),
    ano: anoDaMoto(moto),
    km: kmDaMoto(moto.quilometragem),
    preco: precoDaMoto(moto),
    slug: slugs[moto.id],
    capa: capas[moto.id] || "",
  };
}

async function perguntarParaIA(
  texto: string,
  historico: Turno[],
  motos: MotoSite[]
): Promise<{ resposta: string; ids: string[] } | null> {
  const chave = process.env.OPENAI_API_KEY;
  if (!chave) return null;

  const instrucoes = `Você é o atendente virtual da ${LOJA.nome}, loja de motos seminovas em ${LOJA.cidade}.
O cliente descreve a moto que quer (preço, modelo, marca, tipo, uso). Escolha no ESTOQUE abaixo as que servem.

Regras:
- Use SOMENTE motos do estoque, pelo id. Nunca invente moto, preço, ano, km ou condição.
- "até X" é teto de preço; "acima de X" é piso. "20 mil" = 20000.
- Se nada servir exatamente, ofereça até 3 mais próximas e diga que são alternativas.
- Até 6 motos, da que mais combina para a que menos combina.
- Resposta em português do Brasil, curta (no máximo 2 frases), simpática, sem repetir a lista de motos (os cards aparecem embaixo). Não use markdown.
- Financiamento, troca e visita: diga que a loja faz e convide a chamar no WhatsApp.
- Se a pergunta não for sobre motos ou sobre a loja, responda em uma frase que você só ajuda a achar moto no estoque.

Responda só em JSON: {"resposta": "texto", "ids": ["id", ...]}

ESTOQUE DE HOJE (id | moto | ano | preço | km | cc | tipo | cor | extra):
${motos.map(linhaParaIA).join("\n")}`;

  const mensagens = [
    { role: "system", content: instrucoes },
    /*
     * Só as falas do cliente vão para a IA (revisão de 13/11/2026).
     * As "da loja" vêm do navegador e qualquer um pode inventá-las,
     * o que deixaria usar o chat como IA de graça.
     */
    ...historico
      .filter((t) => t.quem === "cliente")
      .map((t) => ({
        role: "user",
        content: t.texto,
      })),
    { role: "user", content: texto },
  ];

  try {
    const resposta = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${chave}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: mensagens,
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 400,
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!resposta.ok) {
      console.error("[chat do estoque] OpenAI respondeu", resposta.status);
      return null;
    }

    const corpo = await resposta.json();
    const conteudo = JSON.parse(corpo?.choices?.[0]?.message?.content || "{}");

    const texto_ = String(conteudo?.resposta || "").trim();
    const ids = Array.isArray(conteudo?.ids)
      ? conteudo.ids.map(String)
      : [];

    if (!texto_) return null;

    return { resposta: texto_.slice(0, 500), ids };
  } catch (erro) {
    console.error("[chat do estoque] OpenAI falhou:", (erro as Error)?.message);
    return null;
  }
}

export async function POST(requisicao: Request) {
  if (!veioDoSite(requisicao)) {
    return Response.json({ error: "Origem não permitida." }, { status: 403 });
  }

  const ip =
    requisicao.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requisicao.headers.get("x-real-ip") ||
    "sem-ip";

  if (passouDoLimite(ip)) {
    return Response.json(
      {
        resposta:
          "Muitas perguntas seguidas. Espere um minutinho ou chame a gente no WhatsApp.",
        motos: [],
      },
      { status: 429 }
    );
  }

  const corpo = await requisicao.json().catch(() => null);
  const texto = String(corpo?.texto || "").trim().slice(0, MAX_TEXTO);

  if (!texto) {
    return Response.json({ error: "Escreva o que procura." }, { status: 400 });
  }

  const historico: Turno[] = (Array.isArray(corpo?.historico) ? corpo.historico : [])
    .slice(-MAX_TURNOS)
    .map((t: Turno) => ({
      quem: t?.quem === "loja" ? "loja" : "cliente",
      texto: String(t?.texto || "").slice(0, MAX_TEXTO),
    }))
    .filter((t: Turno) => t.texto);

  const { motos, fotos, slugs, falhou } = await estoqueDoSite();

  if (motos.length === 0) {
    return Response.json({
      resposta: falhou
        ? "Não consegui abrir o estoque agora. Tente de novo em instantes ou chame no WhatsApp."
        : "Estamos renovando o estoque. Chama a gente no WhatsApp que a loja avisa quando chegar moto nova.",
      motos: [],
    });
  }

  const daIA = await perguntarParaIA(texto, historico, motos);

  if (daIA) {
    const porId = new Map(motos.map((m) => [m.id, m]));
    const escolhidas = Array.from(new Set(daIA.ids))
      .map((id) => porId.get(id))
      .filter((m): m is MotoSite => Boolean(m))
      .slice(0, 6);

    return Response.json({
      resposta: daIA.resposta,
      motos: escolhidas.map((m) => paraTela(m, slugs, fotos.capas)),
      fonte: "ia",
    });
  }

  /*
   * A busca própria olha só a última frase, mais a anterior do
   * cliente quando a última é curta ("e da honda?").
   */
  const anterior = [...historico].reverse().find((t) => t.quem === "cliente");
  const consulta =
    anterior && texto.split(/\s+/).length <= 3 ? `${anterior.texto} ${texto}` : texto;

  const achado = procurarNoEstoque(consulta, motos);

  return Response.json({
    resposta: achado.resposta,
    motos: achado.motos.map((m) => paraTela(m, slugs, fotos.capas)),
    fonte: "local",
  });
}
