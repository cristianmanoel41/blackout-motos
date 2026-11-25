import { recusarSemLogin } from "@/lib/supabase/exigir-login";

/*
 * A LEGENDA AUTOMÁTICA DO EDITOR DE VÍDEO
 *
 * O navegador já entrega o áudio pronto: só os trechos que
 * ficaram no vídeo editado, em WAV mono de 16 kHz (pequeno o
 * bastante para caber no limite de envio da Vercel, ~2 min).
 * Aqui ele vai para a transcrição da OpenAI, que devolve as
 * frases com o tempo de cada uma - os tempos já batem com o
 * vídeo editado, porque o áudio foi montado na mesma ordem.
 *
 * Fica atrás do login: a chave da OpenAI é da loja.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

type Segmento = { start: number; end: number; text: string };
type Palavra = { start: number; end: number; word: string };

export async function POST(request: Request) {
  const semLogin = await recusarSemLogin();
  if (semLogin) return semLogin;

  const chave = process.env.OPENAI_API_KEY;
  if (!chave) {
    return Response.json({ error: "A chave da OpenAI não está configurada." }, { status: 500 });
  }

  const recebido = await request.formData();
  const audio = recebido.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return Response.json({ error: "Áudio não recebido." }, { status: 400 });
  }

  const envio = new FormData();
  envio.append("file", audio, "audio.wav");
  envio.append("model", "whisper-1");
  envio.append("language", "pt");
  envio.append("response_format", "verbose_json");
  /* O tempo de cada palavra serve pro "Montar tudo automático" pôr o card na hora exata da fala. */
  envio.append("timestamp_granularities[]", "segment");
  envio.append("timestamp_granularities[]", "word");

  const resposta = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}` },
    body: envio,
  });

  if (!resposta.ok) {
    const corpo = await resposta.text();
    console.error("[legendas] OpenAI recusou:", resposta.status, corpo);
    /* Visto em 24/11/2026: a conta ficou sem crédito e a tela só dizia "falhou". */
    if (resposta.status === 429 && /insufficient_quota|credit/.test(corpo)) {
      return Response.json(
        { error: "A conta da OpenAI está sem crédito. Coloque crédito em platform.openai.com → Settings → Billing e tente de novo." },
        { status: 402 }
      );
    }
    return Response.json({ error: "A transcrição falhou. Tente de novo." }, { status: 502 });
  }

  const dados = (await resposta.json()) as { segments?: Segmento[]; words?: Palavra[] };

  const frases = (dados.segments || [])
    .map((s) => ({ inicio: s.start, fim: s.end, texto: String(s.text || "").trim() }))
    .filter((s) => s.texto);

  const palavras = (dados.words || [])
    .map((p) => ({ inicio: p.start, fim: p.end, texto: String(p.word || "").trim() }))
    .filter((p) => p.texto);

  return Response.json({ frases, palavras });
}
