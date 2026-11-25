import type { Trecho } from "@/lib/video/editor";

/*
 * GERAR O VÍDEO QUADRO A QUADRO (pedido de 25/11/2026)
 *
 * A gravação antiga (MediaRecorder) grava a tela em tempo real:
 * se a máquina engasga, o quadro some do vídeo final - e a
 * compressão do navegador, feita às pressas, borra a imagem.
 *
 * Aqui é o contrário: cada quadro é desenhado e entregue ao
 * compressor de vídeo do próprio Chrome (WebCodecs), que vai no
 * ritmo que a máquina aguenta. Máquina fraca só demora mais; o
 * vídeo sai igual. O som é montado à parte, sem tempo real
 * (OfflineAudioContext), com o mesmo tratamento da prévia, e os
 * dois vão juntos num MP4 (mp4-muxer).
 *
 * Só no Chrome/Edge de computador - o editor é usado nas
 * máquinas da loja e no PC de casa.
 */

export const FPS_DO_VIDEO = 30;

export type Resolucao = "1080" | "4k";

export const QUALIDADES: Record<Resolucao, { ladoMaior: number; bitrate: number; rotulo: string }> = {
  "1080": { ladoMaior: 1920, bitrate: 20_000_000, rotulo: "Full HD 1080p - Instagram e TikTok" },
  "4k": { ladoMaior: 3840, bitrate: 50_000_000, rotulo: "4K - YouTube e site (mais pesado)" },
};

export function suportaQuadroAQuadro() {
  return (
    typeof window !== "undefined" &&
    typeof VideoEncoder !== "undefined" &&
    typeof AudioEncoder !== "undefined" &&
    typeof VideoFrame !== "undefined" &&
    "requestVideoFrameCallback" in HTMLVideoElement.prototype
  );
}

/* O compressor H.264 de melhor qualidade que esta máquina tem para esse tamanho. */
async function configDeVideo(largura: number, altura: number, bitrate: number): Promise<VideoEncoderConfig | null> {
  const grande = largura * altura > 1920 * 1088;
  const codecs = grande
    ? ["avc1.640033", "avc1.640034", "avc1.4d0033"]
    : ["avc1.640028", "avc1.640032", "avc1.4d0028", "avc1.42e028"];
  for (const codec of codecs) {
    for (const hardwareAcceleration of ["prefer-hardware", "no-preference"] as const) {
      const config: VideoEncoderConfig = {
        codec,
        width: largura,
        height: altura,
        bitrate,
        framerate: FPS_DO_VIDEO,
        bitrateMode: "variable",
        latencyMode: "quality",
        hardwareAcceleration,
        avc: { format: "avc" },
      };
      try {
        const r = await VideoEncoder.isConfigSupported(config);
        if (r.supported) return config;
      } catch {
        /* config que o navegador nem entende: tenta a próxima */
      }
    }
  }
  return null;
}

async function configDeAudio(taxa: number, canais: number) {
  const opcoes: [AudioEncoderConfig, "aac" | "opus"][] = [
    [{ codec: "mp4a.40.2", sampleRate: taxa, numberOfChannels: canais, bitrate: 192_000 }, "aac"],
    [{ codec: "opus", sampleRate: taxa, numberOfChannels: canais, bitrate: 192_000 }, "opus"],
  ];
  for (const [config, tipo] of opcoes) {
    try {
      const r = await AudioEncoder.isConfigSupported(config);
      if (r.supported) return { config, tipo };
    } catch {
      /* segue */
    }
  }
  return null;
}

/*
 * O som do vídeo final, montado sem tempo real: os trechos na
 * ordem da montagem e a música em loop, com o mesmo tratamento
 * da prévia (EditorDeVideo.tsx, ligarAudio) - filtro de grave,
 * compressor leve na voz, mistura e limitador no fim.
 */
async function somDaMontagem(opcoes: {
  trechos: Trecho[];
  total: number;
  musicaUrl: string | null;
  volumeOriginal: number;
  volumeMusica: number;
  taxa: number;
}) {
  const { trechos, total, musicaUrl, volumeOriginal, volumeMusica, taxa } = opcoes;
  const ctx = new OfflineAudioContext(2, Math.max(1, Math.ceil(total * taxa)), taxa);

  const tratamento = ctx.createBiquadFilter();
  tratamento.type = "highpass";
  tratamento.frequency.value = 80;
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -16;
  compressor.knee.value = 12;
  compressor.ratio.value = 2;
  compressor.attack.value = 0.008;
  compressor.release.value = 0.25;
  const original = ctx.createGain();
  original.gain.value = volumeOriginal;
  const musicaGanho = ctx.createGain();
  musicaGanho.gain.value = volumeMusica;
  const mistura = ctx.createGain();
  mistura.gain.value = 0.8;
  const limitador = ctx.createDynamicsCompressor();
  limitador.threshold.value = -3;
  limitador.knee.value = 0;
  limitador.ratio.value = 20;
  limitador.attack.value = 0.002;
  limitador.release.value = 0.12;
  tratamento.connect(compressor);
  compressor.connect(original);
  original.connect(mistura);
  musicaGanho.connect(mistura);
  mistura.connect(limitador);
  limitador.connect(ctx.destination);

  let base = 0;
  for (const t of trechos) {
    const dura = Math.max(0, t.fim - t.inicio);
    try {
      const som = await ctx.decodeAudioData(await t.arquivo.arrayBuffer());
      const fonte = ctx.createBufferSource();
      fonte.buffer = som;
      fonte.connect(tratamento);
      fonte.start(base, t.inicio, dura);
    } catch {
      /* trecho sem som: fica em silêncio */
    }
    base += dura;
  }

  if (musicaUrl) {
    try {
      const som = await ctx.decodeAudioData(await (await fetch(musicaUrl)).arrayBuffer());
      const fonte = ctx.createBufferSource();
      fonte.buffer = som;
      fonte.loop = true;
      fonte.connect(musicaGanho);
      fonte.start(0, 0);
      fonte.stop(total);
    } catch {
      /* música que não abriu: o vídeo sai sem ela */
    }
  }

  return ctx.startRendering();
}

function esperarEvento(alvo: EventTarget, nome: string) {
  return new Promise<void>((pronto) => alvo.addEventListener(nome, () => pronto(), { once: true }));
}

export async function gerarQuadroAQuadro(opcoes: {
  trechos: Trecho[];
  videos: Map<string, HTMLVideoElement>;
  largura: number;
  altura: number;
  bitrate: number;
  totalVideo: number;
  total: number;
  musicaUrl: string | null;
  volumeOriginal: number;
  volumeMusica: number;
  desenhar: (ctx: CanvasRenderingContext2D, video: HTMLVideoElement, tempo: number) => void;
  aoProgresso: (tempo: number, canvas: HTMLCanvasElement) => void;
  cancelado: () => boolean;
}): Promise<{ blob: Blob } | { erro: string } | null> {
  const { trechos, videos, largura: L, altura: A, totalVideo, total, desenhar, aoProgresso, cancelado } = opcoes;

  const configVideo = await configDeVideo(L, A, opcoes.bitrate);
  if (!configVideo) {
    return {
      erro:
        L * A > 1920 * 1088
          ? "Esta máquina não consegue gerar vídeo em 4K. Use Full HD 1080p (ou gere no PC de casa)."
          : "Este navegador não tem o compressor de vídeo necessário. Use o Chrome atualizado.",
    };
  }

  /* 1. O som, inteiro, antes - é rápido. */
  const TAXA = 48000;
  const som = await somDaMontagem({ ...opcoes, taxa: TAXA });
  if (cancelado()) return null;
  const audio = await configDeAudio(TAXA, som.numberOfChannels);

  const { Muxer, ArrayBufferTarget } = await import("mp4-muxer");
  const alvo = new ArrayBufferTarget();
  const muxer = new Muxer({
    target: alvo,
    video: { codec: "avc", width: L, height: A, frameRate: FPS_DO_VIDEO },
    audio: audio ? { codec: audio.tipo, numberOfChannels: som.numberOfChannels, sampleRate: TAXA } : undefined,
    fastStart: "in-memory",
    firstTimestampBehavior: "offset",
  });

  let erro: unknown = null;

  if (audio) {
    const codificadorDeAudio = new AudioEncoder({
      output: (pedaco, meta) => muxer.addAudioChunk(pedaco, meta),
      error: (e) => (erro = e),
    });
    codificadorDeAudio.configure(audio.config);
    const BLOCO = 4096;
    const canais = som.numberOfChannels;
    for (let i = 0; i < som.length; i += BLOCO) {
      const n = Math.min(BLOCO, som.length - i);
      const dados = new Float32Array(n * canais);
      for (let c = 0; c < canais; c += 1) dados.set(som.getChannelData(c).subarray(i, i + n), c * n);
      const pedaco = new AudioData({
        format: "f32-planar",
        sampleRate: TAXA,
        numberOfFrames: n,
        numberOfChannels: canais,
        timestamp: Math.round((i / TAXA) * 1e6),
        data: dados,
      });
      codificadorDeAudio.encode(pedaco);
      pedaco.close();
    }
    await codificadorDeAudio.flush();
    codificadorDeAudio.close();
  }

  /* 2. O vídeo, quadro a quadro. */
  const tela = document.createElement("canvas");
  tela.width = L;
  tela.height = A;
  const ctx = tela.getContext("2d", { alpha: false });
  if (!ctx) return { erro: "Não consegui preparar a tela do vídeo." };

  const codificador = new VideoEncoder({
    output: (pedaco, meta) => muxer.addVideoChunk(pedaco, meta),
    error: (e) => (erro = e),
  });
  codificador.configure(configVideo);

  const DURACAO_QUADRO = 1 / FPS_DO_VIDEO;
  let quadros = 0;
  let ultimoTs = -1;
  let ultimoTempo = -Infinity;

  /* Espera o compressor esvaziar um pouco - é isso que deixa a máquina fraca no ritmo dela. */
  const folego = async () => {
    while (codificador.encodeQueueSize > 4 && !erro) await esperarEvento(codificador, "dequeue");
  };

  const emitir = (video: HTMLVideoElement, tempo: number) => {
    /*
     * Fonte em 60 fps: o vídeo final fica em 30 (pula o quadro do
     * meio). O corte é em 22 ms, entre 16,7 (60 fps) e 33 (30 fps),
     * pra não jogar fora quadro de celular com tempo irregular.
     */
    if (quadros > 0 && tempo - ultimoTempo < 0.022) return;
    const ts = quadros === 0 ? 0 : Math.round(tempo * 1e6);
    if (ts <= ultimoTs) return;
    desenhar(ctx, video, tempo);
    const quadro = new VideoFrame(tela, { timestamp: ts, duration: Math.round(DURACAO_QUADRO * 1e6) });
    codificador.encode(quadro, { keyFrame: quadros % (FPS_DO_VIDEO * 2) === 0 });
    quadro.close();
    quadros += 1;
    ultimoTs = ts;
    ultimoTempo = tempo;
    if (quadros % 5 === 0) aoProgresso(tempo, tela);
  };

  const estadoAntes = new Map<HTMLVideoElement, { muted: boolean; rate: number }>();
  try {
    let base = 0;
    for (const trecho of trechos) {
      if (cancelado() || erro) break;
      const v = videos.get(trecho.id);
      const dura = trecho.fim - trecho.inicio;
      if (!v) {
        base += dura;
        continue;
      }
      if (!estadoAntes.has(v)) estadoAntes.set(v, { muted: v.muted, rate: v.playbackRate });
      v.muted = true;
      v.playbackRate = 1;
      v.pause();
      v.currentTime = trecho.inicio;
      await esperarEvento(v, "seeked");

      /*
       * Toca o trecho (mudo) e pega cada quadro que o navegador
       * decodifica (requestVideoFrameCallback), com o tempo exato
       * dele no vídeo. Se perceber quadro pulado, toca mais devagar.
       */
      await new Promise<void>((acabou) => {
        let terminou = false;
        let ultimoApresentado: number | null = null;
        const fim = () => {
          if (terminou) return;
          terminou = true;
          v.pause();
          v.removeEventListener("ended", fim);
          acabou();
        };
        v.addEventListener("ended", fim);

        const aoQuadro: VideoFrameRequestCallback = async (_agora, meta) => {
          if (terminou) return;
          if (cancelado() || erro) return fim();
          if (meta.mediaTime >= trecho.fim - 0.001) return fim();

          if (ultimoApresentado !== null && meta.presentedFrames - ultimoApresentado > 1) {
            v.playbackRate = Math.max(0.25, v.playbackRate * 0.8);
          }
          ultimoApresentado = meta.presentedFrames;

          emitir(v, base + Math.max(0, meta.mediaTime - trecho.inicio));

          if (codificador.encodeQueueSize > 4) {
            v.pause();
            await folego();
            if (terminou) return;
            ultimoApresentado = null;
            v.requestVideoFrameCallback(aoQuadro);
            v.play().catch(fim);
            return;
          }
          v.requestVideoFrameCallback(aoQuadro);
        };

        v.requestVideoFrameCallback(aoQuadro);
        v.play().catch(fim);
      });

      base += dura;
    }

    /* A tela final depois do vídeo: o último quadro parado, no tempo do relógio do vídeo. */
    const ultimo = trechos[trechos.length - 1];
    const ultimoVideo = ultimo ? videos.get(ultimo.id) : undefined;
    if (ultimoVideo && total > totalVideo + 0.01) {
      for (let t = Math.max(totalVideo, ultimoTempo + DURACAO_QUADRO); t < total; t += DURACAO_QUADRO) {
        if (cancelado() || erro) break;
        emitir(ultimoVideo, t);
        await folego();
      }
    }

    if (cancelado()) {
      codificador.close();
      return null;
    }
    await codificador.flush();
    codificador.close();
  } finally {
    estadoAntes.forEach((antes, v) => {
      v.pause();
      v.muted = antes.muted;
      v.playbackRate = antes.rate;
    });
  }

  if (erro) {
    console.error("[video quadro a quadro]", erro);
    return { erro: "O compressor de vídeo falhou no meio. Tente de novo ou use Full HD 1080p." };
  }
  if (quadros === 0) return { erro: "Nenhum quadro foi gerado. Confira os trechos e tente de novo." };

  muxer.finalize();
  return { blob: new Blob([alvo.buffer], { type: "video/mp4" }) };
}
