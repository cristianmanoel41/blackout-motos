import { ehRobo } from "@/lib/dados/origem-visita";
import {
  CONVERSOES_LIGADAS,
  enviarEvento,
} from "@/lib/dados/meta-conversoes";

/*
 * A cópia de cada evento do pixel, mandada ao Meta pelo
 * servidor (API de Conversões).
 *
 * O site só chama isto depois do "Aceitar" no aviso de
 * cookies, junto com o mesmo evento no pixel e com o mesmo
 * event_id - o Meta conta uma vez só. A conta de quem o Meta
 * acha que é a pessoa sai dos cookies do próprio pixel (_fbp e
 * _fbc), do IP e do navegador, que chegam aqui sozinhos.
 *
 * Responde sempre 204, como /api/visita: ninguém do outro lado
 * espera resposta, e erro aqui não pode virar erro na tela.
 */

export const runtime = "nodejs";

const NADA = new Response(null, { status: 204 });

/* Os eventos que o site manda. Qualquer outro nome é ignorado. */
const EVENTOS = ["PageView", "ViewContent", "Contact", "Lead", "Search"];

function texto(valor: unknown, limite: number) {
  return String(valor ?? "").slice(0, limite);
}

function cookie(cabecalho: string, nome: string) {
  const achado = cabecalho
    .split(";")
    .map((parte) => parte.trim())
    .find((parte) => parte.startsWith(`${nome}=`));

  return achado ? decodeURIComponent(achado.slice(nome.length + 1)) : "";
}

/*
 * O _fbc é o rastro do clique no anúncio. O pixel grava esse
 * cookie quando a pessoa chega com ?fbclid= no link, mas se o
 * evento sair antes de o script dele rodar o cookie ainda não
 * existe - aí ele é montado aqui, no formato que o Meta pede.
 */
function cliqueDoAnuncio(cabecalho: string, url: string) {
  const gravado = cookie(cabecalho, "_fbc");

  if (gravado) return gravado;

  try {
    const fbclid = new URL(url).searchParams.get("fbclid");

    return fbclid ? `fb.1.${Date.now()}.${fbclid}` : "";
  } catch {
    return "";
  }
}

export async function POST(requisicao: Request) {
  if (!CONVERSOES_LIGADAS) return NADA;

  const agente = requisicao.headers.get("user-agent") || "";

  if (ehRobo(agente)) return NADA;

  const corpo = await requisicao.json().catch(() => null);

  const nome = texto(corpo?.evento, 40);
  const id = texto(corpo?.id, 80);
  const url = texto(corpo?.url, 500);

  if (!EVENTOS.includes(nome) || !id || !url.startsWith("http")) {
    return NADA;
  }

  const cookies = requisicao.headers.get("cookie") || "";

  const dados =
    corpo?.dados && typeof corpo.dados === "object" && !Array.isArray(corpo.dados)
      ? (corpo.dados as Record<string, unknown>)
      : undefined;

  await enviarEvento({
    nome,
    id,
    url,
    /* Atrás da Vercel o IP de verdade é o primeiro da lista. */
    ip: (requisicao.headers.get("x-forwarded-for") || "")
      .split(",")[0]
      .trim(),
    agente,
    fbp: cookie(cookies, "_fbp"),
    fbc: cliqueDoAnuncio(cookies, url),
    dados,
  });

  return NADA;
}
