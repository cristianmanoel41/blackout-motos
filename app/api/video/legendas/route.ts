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

  const resposta = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}` },
    body: envio,
  });

  if (!resposta.ok) {
    console.error("[legendas] OpenAI recusou:", resposta.status, await resposta.text());
    return Response.json({ error: "A transcrição falhou. Tente de novo." }, { status: 502 });
  }

  const dados = (await resposta.json()) as { segments?: Segmento[] };

  const frases = (dados.segments || [])
    .map((s) => ({ inicio: s.start, fim: s.end, texto: String(s.text || "").trim() }))
    .filter((s) => s.texto);

  return Response.json({ frases });
}
