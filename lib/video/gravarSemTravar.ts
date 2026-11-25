/*
 * A GRAVAÇÃO SEM TRAVAR (pedido de 25/11/2026).
 *
 * O jeito antigo (ver EditorDeVideo.tsx) toca o vídeo de verdade e
 * grava o canvas EM TEMPO REAL: numa máquina fraca, se desenhar um
 * quadro demora mais que 1/30s, o navegador perde aquele quadro e a
 * gravação sai travada - não só a prévia, o arquivo final mesmo.
 *
 * Aqui não existe tempo real: para cada quadro, a tela é parada
 * exatamente no tempo certo (`seeked`), desenhada com calma e só
 * depois disso o próximo quadro começa. Uma máquina fraca demora
 * mais para o vídeo ficar pronto, mas o resultado nunca perde
 * quadro. De brinde, o arquivo sai de um jeito que o WhatsApp abre
 * direto: o MediaRecorder do navegador grava o MP4 "fragmentado"
 * (como os pedaços de uma transmissão ao vivo), que vários apps -
 * o WhatsApp entre eles - não aceitam. Aqui o arquivo é montado do
 * zero, de um jeito único (bibioteca mp4-muxer), já no formato
 * comum que qualquer um abre.
 *
 * Só funciona em navegadores com WebCodecs (Chrome/Edge atuais e
 * Safari 16.4+); `suportaGravacaoSemTravar` avisa quando não dá, e
 * quem chama volta para o jeito antigo nesse caso.
 */

import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import {
  desenharQuadro,
  duracaoTotal,
  type Cartoes,
  type Frase,
  type Mostrar,
  type Textos,
  type Trecho,
} from "./editor";

export function suportaGravacaoSemTravar() {
  return (
    typeof VideoEncoder !== "undefined" &&
    typeof AudioEncoder !== "undefined" &&
    typeof VideoFrame !== "undefined" &&
    typeof AudioData !== "undefined" &&
    typeof OfflineAudioContext !== "undefined"
  );
}

function esperar(video: HTMLVideoElement, evento: string) {
  return new Promise<void>((resolver) => {
    video.addEventListener(evento, () => resolver(), { once: true });
  });
}

const TAXA_AUDIO = 48000;
const CANAIS_AUDIO = 2;
const QUADROS_POR_BLOCO_AUDIO = 4096;

/*
 * O MESMO SOM DA PRÉVIA (ligarAudio, em EditorDeVideo.tsx) - passa-
 * altas e compressor só na narração, música só no volume dela, as
 * duas somadas e com um limitador no fim para nunca estourar - só
 * que renderizado de uma vez, fora do tempo real, no
 * OfflineAudioContext.
 */
async function renderizarAudio(opcoes: {
  trechos: Trecho[];
  musicaUrl: string | null;
  volumeOriginal: number;
  volumeMusica: number;
  duracao: number;
}): Promise<AudioBuffer> {
  const { trechos, musicaUrl, volumeOriginal, volumeMusica, duracao } = opcoes;
  const offline = new OfflineAudioContext(
    CANAIS_AUDIO,
    Math.max(1, Math.ceil(duracao * TAXA_AUDIO)),
    TAXA_AUDIO
  );

  const tratamento = offline.createBiquadFilter();
  tratamento.type = "highpass";
  tratamento.frequency.value = 80;

  const compressor = offline.createDynamicsCompressor();
  compressor.threshold.value = -16;
  compressor.knee.value = 12;
  compressor.ratio.value = 2;
  compressor.attack.value = 0.008;
  compressor.release.value = 0.25;

  const original = offline.createGain();
  original.gain.value = volumeOriginal;
  const musicaGanho = offline.createGain();
  musicaGanho.gain.value = volumeMusica;
  const mistura = offline.createGain();
  mistura.gain.value = 0.8;

  const limitador = offline.createDynamicsCompressor();
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
  limitador.connect(offline.destination);

  const decodificador = new AudioContext();
  try {
    let base = 0;
    for (const t of trechos) {
      const trechoDuracao = Math.max(0, t.fim - t.inicio);
      try {
        const audio = await decodificador.decodeAudioData(await t.arquivo.arrayBuffer());
        const fonte = offline.createBufferSource();
        fonte.buffer = audio;
        fonte.connect(tratamento);
        fonte.start(base, t.inicio, trechoDuracao);
      } catch {
        /* Trecho sem som (ou formato que o navegador não abre): fica em silêncio, igual na prévia. */
      }
      base += trechoDuracao;
    }

    if (musicaUrl) {
      try {
        const resposta = await fetch(musicaUrl);
        const musicaAudio = await decodificador.decodeAudioData(await resposta.arrayBuffer());
        if (musicaAudio.duration > 0) {
          for (let inicio = 0; inicio < duracao; inicio += musicaAudio.duration) {
            const fonte = offline.createBufferSource();
            fonte.buffer = musicaAudio;
            fonte.connect(musicaGanho);
            fonte.start(inicio, 0, Math.min(musicaAudio.duration, duracao - inicio));
          }
        }
      } catch {
        /* Música em formato que o navegador não abre: segue sem ela. */
      }
    }
  } finally {
    try {
      await decodificador.close();
    } catch {
      /* já estava fechado */
    }
  }

  return offline.startRendering();
}

async function codificarAudio(buffer: AudioBuffer, muxer: Muxer<ArrayBufferTarget>) {
  const canais = buffer.numberOfChannels;
  const taxa = buffer.sampleRate;
  const total = buffer.length;

  await new Promise<void>((resolver, rejeitar) => {
    const encoder = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
      error: (e) => rejeitar(e),
    });
    encoder.configure({
      codec: "mp4a.40.2",
      sampleRate: taxa,
      numberOfChannels: canais,
      bitrate: 192_000,
    });

    (async () => {
      for (let inicio = 0; inicio < total; inicio += QUADROS_POR_BLOCO_AUDIO) {
        const quadros = Math.min(QUADROS_POR_BLOCO_AUDIO, total - inicio);
        const dados = new Float32Array(canais * quadros);
        for (let c = 0; c < canais; c += 1) {
          dados.set(buffer.getChannelData(c).subarray(inicio, inicio + quadros), c * quadros);
        }
        encoder.encode(
          new AudioData({
            format: "f32-planar",
            sampleRate: taxa,
            numberOfChannels: canais,
            numberOfFrames: quadros,
            timestamp: Math.round((inicio / taxa) * 1_000_000),
            data: dados,
          })
        );
      }
      await encoder.flush();
      encoder.close();
      resolver();
    })().catch(rejeitar);
  });
}

export async function gravarQuadroAQuadro(opcoes: {
  trechos: Trecho[];
  videos: Map<string, HTMLVideoElement>;
  musicaUrl: string | null;
  volumeOriginal: number;
  volumeMusica: number;
  canvas: HTMLCanvasElement;
  largura: number;
  altura: number;
  logo: HTMLImageElement | null;
  mostrar: Mostrar;
  textos: Textos;
  cartoes: Cartoes;
  frases: Frase[];
  duracaoFinal: number;
  fps?: number;
  bitrateVideo?: number;
  deveParar: () => boolean;
  aoProgresso: (segundos: number) => void;
}): Promise<Blob> {
  const {
    trechos,
    videos,
    musicaUrl,
    volumeOriginal,
    volumeMusica,
    canvas,
    largura,
    altura,
    logo,
    mostrar,
    textos,
    cartoes,
    frases,
    duracaoFinal,
    fps = 30,
    bitrateVideo = 16_000_000,
    deveParar,
    aoProgresso,
  } = opcoes;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Sem contexto 2D no canvas.");

  const totalVideo = duracaoTotal(trechos);

  function localizar(t: number) {
    let base = 0;
    for (const trecho of trechos) {
      const dura = trecho.fim - trecho.inicio;
      if (t < base + dura) return { trecho, local: trecho.inicio + Math.max(0, t - base) };
      base += dura;
    }
    const ultimo = trechos[trechos.length - 1];
    return ultimo ? { trecho: ultimo, local: ultimo.fim } : null;
  }

  const ultimoTrecho = trechos[trechos.length - 1];
  const ultimoVideo = ultimoTrecho ? videos.get(ultimoTrecho.id) : undefined;

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: "avc", width: largura, height: altura, frameRate: fps },
    audio: { codec: "aac", numberOfChannels: CANAIS_AUDIO, sampleRate: TAXA_AUDIO },
    fastStart: "in-memory",
  });

  let erroDoEncoder: unknown = null;
  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      erroDoEncoder = e;
    },
  });
  videoEncoder.configure({
    codec: "avc1.640028",
    width: largura,
    height: altura,
    bitrate: bitrateVideo,
    framerate: fps,
  });

  const passoTempo = 1 / fps;
  const totalQuadros = Math.max(1, Math.round(duracaoFinal * fps));
  let videoAtivo: HTMLVideoElement | null = null;

  for (let i = 0; i < totalQuadros; i += 1) {
    if (deveParar() || erroDoEncoder) break;
    const t = i * passoTempo;

    let videoDoQuadro: HTMLVideoElement | null = null;
    if (t < totalVideo) {
      const lugar = localizar(t);
      const v = lugar ? videos.get(lugar.trecho.id) || null : null;
      if (v && lugar) {
        if (v !== videoAtivo || Math.abs(v.currentTime - lugar.local) > 0.001) {
          v.currentTime = lugar.local;
          await esperar(v, "seeked");
        }
        videoDoQuadro = v;
      }
    } else if (ultimoVideo) {
      videoDoQuadro = ultimoVideo;
    }
    videoAtivo = videoDoQuadro;

    desenharQuadro(ctx, {
      largura,
      altura,
      video: videoDoQuadro,
      tempo: t,
      duracaoTotal: totalVideo,
      logo,
      mostrar,
      textos,
      cartoes,
      frases,
    });

    const quadro = new VideoFrame(canvas, { timestamp: Math.round(t * 1_000_000) });
    videoEncoder.encode(quadro, { keyFrame: i % (fps * 3) === 0 });
    quadro.close();

    /* Não deixa a fila de quadros por codificar crescer demais numa máquina fraca. */
    while (videoEncoder.encodeQueueSize > 4) {
      await new Promise((resolver) => setTimeout(resolver, 0));
    }

    aoProgresso(Math.min(t, duracaoFinal));
  }

  await videoEncoder.flush();
  videoEncoder.close();
  if (erroDoEncoder) throw erroDoEncoder;

  if (!deveParar()) {
    const audioBuffer = await renderizarAudio({
      trechos,
      musicaUrl,
      volumeOriginal,
      volumeMusica,
      duracao: duracaoFinal,
    });
    await codificarAudio(audioBuffer, muxer);
  }

  muxer.finalize();
  return new Blob([target.buffer], { type: "video/mp4" });
}
