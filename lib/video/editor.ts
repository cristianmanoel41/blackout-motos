/*
 * O EDITOR DE VÍDEO DO SISTEMA - a parte que não é tela.
 *
 * Tudo roda no navegador de quem edita: o vídeo é desenhado
 * quadro a quadro num canvas (com logo, textos e legenda por
 * cima) e gravado de novo pelo próprio navegador. Nada de vídeo
 * sobe para o servidor - vídeo de celular passa fácil de 100 MB,
 * e a Vercel não aceita nem 5 MB por envio.
 *
 * O servidor só entra na legenda automática, e recebe apenas o
 * áudio (ver app/api/video/legendas).
 */

export type Trecho = {
  id: string;
  nome: string;
  url: string;
  arquivo: File;
  duracao: number;
  largura: number;
  altura: number;
  inicio: number;
  fim: number;
};

export type Frase = { inicio: number; fim: number; texto: string };

export type Textos = {
  titulo: string;
  detalhe: string;
  preco: string;
  chamada: string;
};

export type Mostrar = { logo: boolean; textos: boolean; legendas: boolean };

/* Maior lado do vídeo final. 1280 deixa a gravação leve em qualquer computador da loja. */
const LADO_MAIOR = 1280;

/* Vídeo de venda curto prende mais: a montagem automática para em 1 minuto. */
export const DURACAO_AUTOMATICA = 60;

/* O tamanho do vídeo final, pela orientação do primeiro trecho. */
export function tamanhoDoQuadro(trechos: Trecho[]) {
  const primeiro = trechos[0];
  if (!primeiro || !primeiro.largura || !primeiro.altura) return { largura: 720, altura: 1280 };

  const par = (n: number) => Math.round(n / 2) * 2;
  if (primeiro.largura >= primeiro.altura) {
    return { largura: LADO_MAIOR, altura: par((LADO_MAIOR * primeiro.altura) / primeiro.largura) };
  }
  return { largura: par((LADO_MAIOR * primeiro.largura) / primeiro.altura), altura: LADO_MAIOR };
}

export function duracaoTotal(trechos: Trecho[]) {
  return trechos.reduce((soma, t) => soma + Math.max(0, t.fim - t.inicio), 0);
}

/*
 * A montagem automática.
 *
 *   - Tira o comecinho e o finalzinho de cada trecho (o toque
 *     no botão de gravar, a câmera ainda tremendo).
 *   - Se a soma passa de 1 minuto, cada trecho fica com uma
 *     parte igual, pegando o meio dele - o começo e o fim de
 *     gravação de celular costumam ser o pior pedaço.
 *
 * Depois disso tudo continua ajustável na tela.
 */
export function montagemAutomatica(trechos: Trecho[]): Trecho[] {
  const limpos = trechos.map((t) => {
    const folga = t.duracao > 4 ? 0.3 : 0;
    return { ...t, inicio: folga, fim: Math.max(folga + 0.5, t.duracao - folga) };
  });

  const total = duracaoTotal(limpos);
  if (total <= DURACAO_AUTOMATICA) return limpos;

  /* Divide o minuto: trecho curto fica inteiro, a sobra vai para os longos. */
  let restante = DURACAO_AUTOMATICA;
  let faltam = limpos.length;
  const ordem = [...limpos].sort((a, b) => a.fim - a.inicio - (b.fim - b.inicio));
  const cota: Record<string, number> = {};
  for (const t of ordem) {
    const parte = restante / faltam;
    const usa = Math.min(parte, t.fim - t.inicio);
    cota[t.id] = usa;
    restante -= usa;
    faltam -= 1;
  }

  return limpos.map((t) => {
    const usa = cota[t.id];
    const meio = (t.inicio + t.fim) / 2;
    const inicio = Math.max(t.inicio, meio - usa / 2);
    return { ...t, inicio: arredondar(inicio), fim: arredondar(Math.min(t.fim, inicio + usa)) };
  });
}

function arredondar(n: number) {
  return Math.round(n * 10) / 10;
}

/* Quebra o texto em linhas que cabem na largura. */
function quebrarLinhas(ctx: CanvasRenderingContext2D, texto: string, largura: number) {
  const palavras = texto.split(/\s+/).filter(Boolean);
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of palavras) {
    const teste = atual ? `${atual} ${palavra}` : palavra;
    if (ctx.measureText(teste).width > largura && atual) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = teste;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

const FONTE = `"Arial Black", "Segoe UI", Arial, sans-serif`;

/*
 * Um quadro do vídeo final.
 *
 * Embaixo, uma faixa escura com nome, ano/km, preço e a chamada
 * do WhatsApp; no canto, a logo; no meio, a legenda da fala.
 * As medidas são proporcionais ao menor lado, então o mesmo
 * desenho serve para vídeo em pé e deitado.
 */
export function desenharQuadro(
  ctx: CanvasRenderingContext2D,
  opcoes: {
    largura: number;
    altura: number;
    video: HTMLVideoElement | null;
    tempo: number;
    logo: HTMLImageElement | null;
    mostrar: Mostrar;
    textos: Textos;
    frases: Frase[];
  }
) {
  const { largura: L, altura: A, video, tempo, logo, mostrar, textos, frases } = opcoes;
  const u = Math.min(L, A) / 720;

  ctx.save();
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, L, A);

  /* O vídeo inteiro no quadro; trecho de outra orientação ganha faixas pretas. */
  if (video && video.videoWidth) {
    const escala = Math.min(L / video.videoWidth, A / video.videoHeight);
    const w = video.videoWidth * escala;
    const h = video.videoHeight * escala;
    ctx.drawImage(video, (L - w) / 2, (A - h) / 2, w, h);
  }

  const entrada = Math.min(1, Math.max(0, tempo / 0.5));
  let topoDosTextos = A;

  if (mostrar.textos && (textos.titulo || textos.preco || textos.detalhe || textos.chamada)) {
    ctx.globalAlpha = entrada;

    const faixa = ctx.createLinearGradient(0, A * 0.55, 0, A);
    faixa.addColorStop(0, "rgba(0,0,0,0)");
    faixa.addColorStop(0.45, "rgba(0,0,0,0.55)");
    faixa.addColorStop(1, "rgba(0,0,0,0.88)");
    ctx.fillStyle = faixa;
    ctx.fillRect(0, A * 0.55, L, A * 0.45);

    const margem = 36 * u;
    const larguraUtil = L - margem * 2;
    let y = A - 40 * u;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    if (textos.chamada) {
      ctx.font = `700 ${24 * u}px ${FONTE}`;
      ctx.fillStyle = "#25D366";
      ctx.fillText(textos.chamada, margem, y, larguraUtil);
      y -= 52 * u;
    }

    if (textos.preco) {
      ctx.font = `900 ${60 * u}px ${FONTE}`;
      ctx.fillStyle = "#f0c640";
      ctx.fillText(textos.preco, margem, y, larguraUtil);
      y -= 62 * u;
    }

    if (textos.detalhe) {
      ctx.font = `700 ${26 * u}px ${FONTE}`;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText(textos.detalhe, margem, y, larguraUtil);
      y -= 46 * u;
    }

    if (textos.titulo) {
      ctx.font = `900 ${42 * u}px ${FONTE}`;
      ctx.fillStyle = "#fff";
      const linhas = quebrarLinhas(ctx, textos.titulo.toUpperCase(), larguraUtil).slice(0, 2);
      for (let i = linhas.length - 1; i >= 0; i -= 1) {
        ctx.fillText(linhas[i], margem, y, larguraUtil);
        y -= 50 * u;
      }
    }

    topoDosTextos = y;
    ctx.globalAlpha = 1;
  }

  if (mostrar.legendas) {
    const frase = frases.find((f) => tempo >= f.inicio && tempo < f.fim);
    if (frase) {
      ctx.font = `900 ${38 * u}px ${FONTE}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.lineJoin = "round";
      ctx.lineWidth = 9 * u;
      ctx.strokeStyle = "rgba(0,0,0,0.9)";
      ctx.fillStyle = "#fff";
      const linhas = quebrarLinhas(ctx, frase.texto, L * 0.86).slice(-3);
      const passo = 48 * u;
      const base = Math.min(A * 0.8, topoDosTextos - 24 * u);
      linhas.forEach((linha, i) => {
        const yLinha = base - (linhas.length - 1 - i) * passo;
        ctx.strokeText(linha, L / 2, yLinha);
        ctx.fillText(linha, L / 2, yLinha);
      });
    }
  }

  if (mostrar.logo && logo && logo.naturalWidth) {
    const w = 170 * u;
    const h = (w * logo.naturalHeight) / logo.naturalWidth;
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 12 * u;
    ctx.drawImage(logo, L - w - 28 * u, 28 * u, w, h);
  }

  ctx.restore();
}

/* O formato que o navegador sabe gravar: MP4 quando dá (abre em tudo), senão WebM. */
export function formatoDeGravacao() {
  if (typeof MediaRecorder === "undefined") return null;
  const opcoes = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4;codecs=avc1,mp4a",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  const tipo = opcoes.find((t) => MediaRecorder.isTypeSupported(t));
  if (!tipo) return null;
  return { tipo, extensao: tipo.startsWith("video/mp4") ? "mp4" : "webm" };
}

/* Áudio mono em WAV 16 bits: o formato mais simples que a transcrição aceita. */
export function wavDe(amostras: Float32Array, taxa: number) {
  const buffer = new ArrayBuffer(44 + amostras.length * 2);
  const v = new DataView(buffer);
  const escrever = (pos: number, texto: string) => {
    for (let i = 0; i < texto.length; i += 1) v.setUint8(pos + i, texto.charCodeAt(i));
  };
  escrever(0, "RIFF");
  v.setUint32(4, 36 + amostras.length * 2, true);
  escrever(8, "WAVE");
  escrever(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, taxa, true);
  v.setUint32(28, taxa * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  escrever(36, "data");
  v.setUint32(40, amostras.length * 2, true);
  for (let i = 0; i < amostras.length; i += 1) {
    const s = Math.max(-1, Math.min(1, amostras[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

/* Legenda automática vai até 2 min: é o que cabe num envio para a Vercel. */
export const LIMITE_LEGENDA = 120;

/*
 * O áudio do vídeo editado, só com os trechos escolhidos e na
 * ordem da montagem, em 16 kHz mono. Assim o tempo de cada frase
 * que volta da transcrição já é o tempo do vídeo final.
 */
export async function audioDaMontagem(trechos: Trecho[]) {
  const taxa = 16000;
  const total = duracaoTotal(trechos);
  const decodificador = new AudioContext();
  const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(total * taxa)), taxa);

  let base = 0;
  let algumAudio = false;
  try {
    for (const t of trechos) {
      const duracao = Math.max(0, t.fim - t.inicio);
      try {
        const audio = await decodificador.decodeAudioData(await t.arquivo.arrayBuffer());
        const fonte = offline.createBufferSource();
        fonte.buffer = audio;
        fonte.connect(offline.destination);
        fonte.start(base, t.inicio, duracao);
        algumAudio = true;
      } catch {
        /* Trecho sem som (ou formato que o navegador não abre): fica em silêncio. */
      }
      base += duracao;
    }
  } finally {
    decodificador.close();
  }

  if (!algumAudio) return null;
  const pronto = await offline.startRendering();
  return wavDe(pronto.getChannelData(0), taxa);
}
