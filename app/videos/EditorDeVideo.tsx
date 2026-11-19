"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Captions,
  Download,
  Film,
  Loader2,
  Music,
  Pause,
  Play,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LOJA } from "@/lib/dados/loja";
import {
  anoDaMoto,
  kmDaMoto,
  nomeDaMoto,
  precoDaMoto,
  type MotoSite,
} from "@/lib/dados/moto-site";
import {
  audioDaMontagem,
  desenharQuadro,
  duracaoTotal,
  formatoDeGravacao,
  LIMITE_LEGENDA,
  montagemAutomatica,
  tamanhoDoQuadro,
  type Frase,
  type Mostrar,
  type Textos,
  type Trecho,
} from "@/lib/video/editor";

/*
 * O EDITOR DE VÍDEO (pedido de 19/11/2026)
 *
 * Anexa os vídeos da moto, escolhe a moto do estoque e o
 * sistema monta sozinho: corta as pontas, junta os trechos
 * (até 1 minuto), põe a logo, o nome, ano, km, preço e a
 * chamada do WhatsApp. Música e legenda automática são de
 * um clique. Tudo fica ajustável antes de baixar.
 *
 * A edição roda no navegador (lib/video/editor): o vídeo final
 * é gravado em tempo real, então um vídeo de 40 s leva 40 s
 * para ficar pronto - e a aba precisa ficar aberta na frente.
 */

const supabase = createClient();

type MotoDoEditor = MotoSite & { status?: string | null };

function segundos(n: number) {
  const m = Math.floor(n / 60);
  const s = Math.floor(n % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function dadosDoVideo(arquivo: File): Promise<Trecho> {
  return new Promise((resolver, recusar) => {
    const url = URL.createObjectURL(arquivo);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () =>
      resolver({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        nome: arquivo.name,
        url,
        arquivo,
        duracao: v.duration,
        largura: v.videoWidth,
        altura: v.videoHeight,
        inicio: 0,
        fim: v.duration,
      });
    v.onerror = () => {
      URL.revokeObjectURL(url);
      recusar(new Error(arquivo.name));
    };
    v.src = url;
  });
}

function esperar(video: HTMLVideoElement, evento: string) {
  return new Promise<void>((resolver) => {
    video.addEventListener(evento, () => resolver(), { once: true });
  });
}

const CAMPO =
  "w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm font-semibold text-black outline-none focus:border-[#a97800]";
const CARTAO = "rounded-2xl border border-black/10 bg-white p-4";
const BOTAO =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-black/15 px-3 py-2 text-sm font-bold text-black transition hover:border-[#a97800] disabled:opacity-40";
const BOTAO_FORTE =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-black text-white transition hover:bg-black/80 disabled:opacity-40";

export default function EditorDeVideo() {
  const [trechos, setTrechos] = useState<Trecho[]>([]);
  const [motos, setMotos] = useState<MotoDoEditor[]>([]);
  const [motoId, setMotoId] = useState("");
  const [textos, setTextos] = useState<Textos>({
    titulo: "",
    detalhe: "",
    preco: "",
    chamada: `Chama no WhatsApp ${LOJA.whatsappExibicao}`,
  });
  const [mostrar, setMostrar] = useState<Mostrar>({ logo: true, textos: true, legendas: false });
  const [musica, setMusica] = useState<{ nome: string; url: string } | null>(null);
  const [volumeOriginal, setVolumeOriginal] = useState(1);
  const [volumeMusica, setVolumeMusica] = useState(0.35);
  const [frases, setFrases] = useState<Frase[]>([]);
  const [gerandoLegenda, setGerandoLegenda] = useState(false);
  const [estado, setEstado] = useState<"parado" | "tocando" | "gravando">("parado");
  const [tempo, setTempo] = useState(0);
  const [aviso, setAviso] = useState("");
  const [pronto, setPronto] = useState<{ url: string; nome: string } | null>(null);

  const canvas = useRef<HTMLCanvasElement>(null);
  const videos = useRef(new Map<string, HTMLVideoElement>());
  const audioMusica = useRef<HTMLAudioElement>(null);
  const logo = useRef<HTMLImageElement | null>(null);
  const parar = useRef(false);
  const audio = useRef<{
    ctx: AudioContext;
    original: GainNode;
    musica: GainNode;
    saida: MediaStreamAudioDestinationNode;
    ligados: WeakSet<HTMLMediaElement>;
  } | null>(null);
  const config = useRef({ textos, mostrar, frases });

  const total = duracaoTotal(trechos);
  const quadro = useMemo(() => tamanhoDoQuadro(trechos), [trechos]);
  const ocupado = estado !== "parado";

  /* As motos disponíveis, para preencher os textos sozinho. */
  useEffect(() => {
    supabase
      .from("motorcycles")
      .select(
        "id, marca, modelo, versao, cor, ano_fabricacao, ano_modelo, quilometragem, cilindrada, preco_anunciado, data_entrada, status"
      )
      .eq("status", "disponivel")
      .order("data_entrada", { ascending: false, nullsFirst: false })
      .then(({ data }) => setMotos((data || []) as unknown as MotoDoEditor[]));

    const imagem = new Image();
    imagem.src = "/logo-blackout-marca.png";
    logo.current = imagem;
  }, []);

  useEffect(() => {
    if (audio.current) {
      audio.current.original.gain.value = volumeOriginal;
      audio.current.musica.gain.value = volumeMusica;
    }
  }, [volumeOriginal, volumeMusica]);

  function desenhar(video: HTMLVideoElement | null, t: number) {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    desenharQuadro(ctx, {
      largura: quadro.largura,
      altura: quadro.altura,
      video,
      tempo: t,
      logo: logo.current,
      ...config.current,
    });
  }

  /* Parado, mostra o primeiro quadro do primeiro trecho com tudo por cima. */
  function desenharParado() {
    const primeiro = trechos[0];
    desenhar(primeiro ? videos.current.get(primeiro.id) || null : null, 1);
  }

  /* O que o desenho lê durante a reprodução, sempre o mais novo. */
  useEffect(() => {
    config.current = { textos, mostrar, frases };
    if (estado === "parado") desenharParado();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textos, mostrar, frases, quadro, estado]);

  function escolherMoto(id: string) {
    setMotoId(id);
    const moto = motos.find((m) => String(m.id) === id);
    if (!moto) return;
    setTextos((atual) => ({
      ...atual,
      titulo: nomeDaMoto(moto),
      detalhe: [anoDaMoto(moto), kmDaMoto(moto.quilometragem), String(moto.cor || "").trim()]
        .filter((p) => p && p !== "—")
        .join(" · "),
      preco: precoDaMoto(moto) === "Consultar" ? "" : precoDaMoto(moto),
    }));
  }

  async function anexar(arquivos: FileList | null) {
    if (!arquivos || arquivos.length === 0) return;
    setAviso("");
    setPronto(null);

    const novos: Trecho[] = [];
    const recusados: string[] = [];
    for (const arquivo of Array.from(arquivos)) {
      try {
        novos.push(await dadosDoVideo(arquivo));
      } catch {
        recusados.push(arquivo.name);
      }
    }

    if (recusados.length) {
      setAviso(
        `Não consegui abrir: ${recusados.join(", ")}. Vídeo de iPhone em HEVC às vezes não abre no Windows - grave em "Mais compatível" (Ajustes > Câmera > Formatos) ou mande pelo WhatsApp para si mesmo e baixe de lá.`
      );
    }

    /* Montagem automática já na chegada; a legenda antiga não vale mais. */
    setTrechos((atuais) => montagemAutomatica([...atuais, ...novos]));
    setFrases([]);
  }

  function mudarTrecho(id: string, mudanca: Partial<Trecho>) {
    setTrechos((atuais) => atuais.map((t) => (t.id === id ? { ...t, ...mudanca } : t)));
    setFrases([]);
  }

  function mover(id: string, passo: number) {
    setTrechos((atuais) => {
      const i = atuais.findIndex((t) => t.id === id);
      const j = i + passo;
      if (i < 0 || j < 0 || j >= atuais.length) return atuais;
      const nova = [...atuais];
      [nova[i], nova[j]] = [nova[j], nova[i]];
      return nova;
    });
    setFrases([]);
  }

  function remover(id: string) {
    setTrechos((atuais) => {
      const sai = atuais.find((t) => t.id === id);
      if (sai) URL.revokeObjectURL(sai.url);
      return atuais.filter((t) => t.id !== id);
    });
    videos.current.delete(id);
    setFrases([]);
  }

  function escolherMusica(arquivos: FileList | null) {
    const arquivo = arquivos?.[0];
    if (!arquivo) return;
    if (musica) URL.revokeObjectURL(musica.url);
    setMusica({ nome: arquivo.name, url: URL.createObjectURL(arquivo) });
  }

  /* O som passa todo por aqui: o original e a música, cada um com seu volume. */
  function ligarAudio() {
    if (!audio.current) {
      const ctx = new AudioContext();
      const original = ctx.createGain();
      const musicaGanho = ctx.createGain();
      const saida = ctx.createMediaStreamDestination();
      original.connect(ctx.destination);
      original.connect(saida);
      musicaGanho.connect(ctx.destination);
      musicaGanho.connect(saida);
      audio.current = { ctx, original, musica: musicaGanho, saida, ligados: new WeakSet() };
    }
    const a = audio.current;
    a.original.gain.value = volumeOriginal;
    a.musica.gain.value = volumeMusica;

    videos.current.forEach((v) => {
      if (!a.ligados.has(v)) {
        a.ctx.createMediaElementSource(v).connect(a.original);
        a.ligados.add(v);
      }
    });
    const m = audioMusica.current;
    if (m && !a.ligados.has(m)) {
      a.ctx.createMediaElementSource(m).connect(a.musica);
      a.ligados.add(m);
    }
    return a;
  }

  async function reproduzir(gravar: boolean) {
    if (trechos.length === 0 || ocupado) return;

    const formato = formatoDeGravacao();
    if (gravar && !formato) {
      setAviso("Este navegador não grava vídeo. Use o Google Chrome atualizado.");
      return;
    }

    setAviso("");
    setPronto(null);
    parar.current = false;
    setEstado(gravar ? "gravando" : "tocando");

    const a = ligarAudio();
    await a.ctx.resume();

    let gravador: MediaRecorder | null = null;
    const pedacos: Blob[] = [];
    if (gravar && formato && canvas.current) {
      const fluxo = canvas.current.captureStream(30);
      a.saida.stream.getAudioTracks().forEach((faixa) => fluxo.addTrack(faixa));
      gravador = new MediaRecorder(fluxo, { mimeType: formato.tipo, videoBitsPerSecond: 4_000_000 });
      gravador.ondataavailable = (e) => {
        if (e.data.size) pedacos.push(e.data);
      };
    }

    const m = audioMusica.current;
    if (m && musica) {
      m.currentTime = 0;
      m.loop = true;
    }

    let base = 0;
    let comecou = false;

    for (const trecho of trechos) {
      if (parar.current) break;
      const v = videos.current.get(trecho.id);
      if (!v) continue;

      v.currentTime = trecho.inicio;
      await esperar(v, "seeked");

      /* Gravador e música só começam com o primeiro quadro pronto, para não abrir com tela preta. */
      if (!comecou) {
        comecou = true;
        gravador?.start(250);
        if (m && musica) await m.play().catch(() => {});
      }

      await v.play().catch(() => {});

      await new Promise<void>((terminou) => {
        const passo = () => {
          const t = base + (v.currentTime - trecho.inicio);
          desenhar(v, t);
          setTempo(t);
          if (parar.current || v.ended || v.currentTime >= trecho.fim) {
            terminou();
            return;
          }
          requestAnimationFrame(passo);
        };
        requestAnimationFrame(passo);
      });

      v.pause();
      base += trecho.fim - trecho.inicio;
    }

    m?.pause();

    if (gravador && formato) {
      const fim = esperar(gravador as unknown as HTMLVideoElement, "stop");
      gravador.stop();
      await fim;
      if (!parar.current) {
        const arquivo = new Blob(pedacos, { type: formato.tipo });
        const nomeBase =
          (textos.titulo || "video")
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "video";
        setPronto({ url: URL.createObjectURL(arquivo), nome: `${nomeBase}-blackout.${formato.extensao}` });
      }
    }

    setEstado("parado");
    setTempo(0);
  }

  async function gerarLegendas() {
    if (trechos.length === 0 || gerandoLegenda) return;
    if (total > LIMITE_LEGENDA) {
      setAviso(`A legenda automática vai até ${LIMITE_LEGENDA / 60} minutos de vídeo. Encurte os trechos e tente de novo.`);
      return;
    }

    setAviso("");
    setGerandoLegenda(true);
    try {
      const wav = await audioDaMontagem(trechos);
      if (!wav) {
        setAviso("Não achei som nesses vídeos para legendar.");
        return;
      }
      const envio = new FormData();
      envio.append("audio", wav, "audio.wav");
      const resposta = await fetch("/api/video/legendas", { method: "POST", body: envio });
      const dados = await resposta.json();
      if (!resposta.ok) {
        setAviso(dados.error || "A legenda falhou. Tente de novo.");
        return;
      }
      const lista = (dados.frases || []) as Frase[];
      setFrases(lista);
      setMostrar((atual) => ({ ...atual, legendas: true }));
      if (lista.length === 0) setAviso("Não entendi fala nenhuma no vídeo.");
    } catch (erro) {
      console.error(erro);
      setAviso("A legenda falhou. Tente de novo.");
    } finally {
      setGerandoLegenda(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1300px] px-4 py-6 sm:px-6">
      <header className="mb-5">
        <h1 className="flex items-center gap-2 text-2xl font-black text-black">
          <Film size={24} className="text-[#a97800]" /> Editor de vídeo
        </h1>
        <p className="mt-1 text-sm font-semibold text-black/60">
          Anexe os vídeos da moto e escolha a moto: o sistema corta as pontas, junta os trechos, põe logo, preço e
          chamada do WhatsApp. Ajuste o que quiser e baixe.
        </p>
      </header>

      {aviso && (
        <p className="mb-4 rounded-xl border border-amber-400/60 bg-amber-50 px-3 py-2 text-sm font-bold text-black">
          {aviso}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        {/* Coluna da esquerda: os ajustes */}
        <div className="space-y-4">
          <section className={CARTAO}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-black text-black">1. Vídeos</h2>
              <div className="flex flex-wrap gap-2">
                {trechos.length > 1 && (
                  <button
                    type="button"
                    className={BOTAO}
                    disabled={ocupado}
                    onClick={() => {
                      setTrechos((atuais) => montagemAutomatica(atuais));
                      setFrases([]);
                    }}
                  >
                    <Sparkles size={15} /> Montar de novo
                  </button>
                )}
                <label className={`${BOTAO_FORTE} cursor-pointer`}>
                  {trechos.length ? <Plus size={15} /> : <Upload size={15} />}
                  {trechos.length ? "Juntar outro vídeo" : "Anexar vídeos"}
                  <input
                    type="file"
                    accept="video/*"
                    multiple
                    className="hidden"
                    disabled={ocupado}
                    onChange={(e) => {
                      anexar(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>

            {trechos.length === 0 ? (
              <p className="mt-3 text-sm font-semibold text-black/55">
                Pode anexar vários de uma vez: eles entram em sequência, na ordem que você escolher.
              </p>
            ) : (
              <>
                <p className="mt-2 text-xs font-bold text-black/55">
                  Vídeo final: {segundos(total)} · {trechos.length} {trechos.length === 1 ? "trecho" : "trechos"}
                </p>
                <div className="mt-3 space-y-3">
                  {trechos.map((t, i) => (
                    <div key={t.id} className="flex gap-3 rounded-xl border border-black/10 p-3">
                      <video
                        ref={(el) => {
                          if (el) videos.current.set(t.id, el);
                        }}
                        src={t.url}
                        playsInline
                        preload="auto"
                        onLoadedData={i === 0 ? () => desenharParado() : undefined}
                        className="h-24 w-20 shrink-0 rounded-lg bg-black object-contain"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="min-w-0 flex-1 truncate text-sm font-black text-black">
                            {i + 1}. {t.nome}
                          </p>
                          <button type="button" title="Subir" className="p-1 text-black/50 hover:text-black" disabled={ocupado || i === 0} onClick={() => mover(t.id, -1)}>
                            <ArrowUp size={15} />
                          </button>
                          <button type="button" title="Descer" className="p-1 text-black/50 hover:text-black" disabled={ocupado || i === trechos.length - 1} onClick={() => mover(t.id, 1)}>
                            <ArrowDown size={15} />
                          </button>
                          <button type="button" title="Tirar" className="p-1 text-black/50 hover:text-red-600" disabled={ocupado} onClick={() => remover(t.id)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <p className="text-[11px] font-bold text-black/50">
                          Usa de {segundos(t.inicio)} até {segundos(t.fim)} ({(t.fim - t.inicio).toFixed(1)} s de{" "}
                          {segundos(t.duracao)})
                        </p>
                        <label className="mt-1 flex items-center gap-2 text-[11px] font-bold text-black/60">
                          <span className="w-10">Início</span>
                          <input
                            type="range"
                            min={0}
                            max={t.duracao}
                            step={0.1}
                            value={t.inicio}
                            disabled={ocupado}
                            className="flex-1 accent-[#a97800]"
                            onChange={(e) => {
                              const inicio = Math.min(Number(e.target.value), t.fim - 0.5);
                              mudarTrecho(t.id, { inicio });
                              const v = videos.current.get(t.id);
                              if (v) v.currentTime = inicio;
                            }}
                          />
                        </label>
                        <label className="flex items-center gap-2 text-[11px] font-bold text-black/60">
                          <span className="w-10">Fim</span>
                          <input
                            type="range"
                            min={0}
                            max={t.duracao}
                            step={0.1}
                            value={t.fim}
                            disabled={ocupado}
                            className="flex-1 accent-[#a97800]"
                            onChange={(e) => {
                              const fim = Math.max(Number(e.target.value), t.inicio + 0.5);
                              mudarTrecho(t.id, { fim });
                              const v = videos.current.get(t.id);
                              if (v) v.currentTime = fim;
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          <section className={CARTAO}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-black text-black">2. Logo, preço e textos</h2>
              <div className="flex gap-3 text-xs font-bold text-black/70">
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={mostrar.logo} onChange={(e) => setMostrar({ ...mostrar, logo: e.target.checked })} />
                  Logo
                </label>
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={mostrar.textos} onChange={(e) => setMostrar({ ...mostrar, textos: e.target.checked })} />
                  Textos
                </label>
              </div>
            </div>
            <select className={`${CAMPO} mt-3`} value={motoId} onChange={(e) => escolherMoto(e.target.value)}>
              <option value="">Escolha a moto do estoque para preencher sozinho…</option>
              {motos.map((m) => (
                <option key={m.id} value={String(m.id)}>
                  {nomeDaMoto(m)} {anoDaMoto(m)} {m.cor ? `· ${m.cor}` : ""}
                </option>
              ))}
            </select>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="text-[11px] font-bold text-black/55">
                Nome da moto
                <input className={CAMPO} value={textos.titulo} onChange={(e) => setTextos({ ...textos, titulo: e.target.value })} />
              </label>
              <label className="text-[11px] font-bold text-black/55">
                Ano · km · cor
                <input className={CAMPO} value={textos.detalhe} onChange={(e) => setTextos({ ...textos, detalhe: e.target.value })} />
              </label>
              <label className="text-[11px] font-bold text-black/55">
                Preço
                <input className={CAMPO} value={textos.preco} placeholder="Deixe vazio para não mostrar" onChange={(e) => setTextos({ ...textos, preco: e.target.value })} />
              </label>
              <label className="text-[11px] font-bold text-black/55">
                Chamada
                <input className={CAMPO} value={textos.chamada} onChange={(e) => setTextos({ ...textos, chamada: e.target.value })} />
              </label>
            </div>
          </section>

          <section className={CARTAO}>
            <h2 className="font-black text-black">3. Música e legendas</h2>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className={`${BOTAO} cursor-pointer`}>
                <Music size={15} /> {musica ? "Trocar música" : "Pôr música"}
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  disabled={ocupado}
                  onChange={(e) => {
                    escolherMusica(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
              {musica && (
                <>
                  <span className="min-w-0 truncate text-xs font-bold text-black/60">{musica.nome}</span>
                  <button type="button" className="text-xs font-bold text-black/50 hover:text-red-600" disabled={ocupado} onClick={() => setMusica(null)}>
                    tirar
                  </button>
                </>
              )}
            </div>
            <p className="mt-1 text-[11px] font-semibold text-black/45">
              Use música livre de direitos (ex.: Biblioteca de Áudio do YouTube) - música famosa faz o Instagram tirar o som do vídeo.
            </p>
            <audio ref={audioMusica} src={musica?.url} preload="auto" className="hidden" />

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="text-[11px] font-bold text-black/55">
                Som do vídeo: {Math.round(volumeOriginal * 100)}%
                <input type="range" min={0} max={1} step={0.05} value={volumeOriginal} className="w-full accent-[#a97800]" onChange={(e) => setVolumeOriginal(Number(e.target.value))} />
              </label>
              <label className="text-[11px] font-bold text-black/55">
                Música: {Math.round(volumeMusica * 100)}%
                <input type="range" min={0} max={1} step={0.05} value={volumeMusica} className="w-full accent-[#a97800]" onChange={(e) => setVolumeMusica(Number(e.target.value))} />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-black/10 pt-3">
              <button type="button" className={BOTAO} disabled={ocupado || gerandoLegenda || trechos.length === 0} onClick={gerarLegendas}>
                {gerandoLegenda ? <Loader2 size={15} className="animate-spin" /> : <Captions size={15} />}
                {gerandoLegenda ? "Ouvindo o vídeo…" : frases.length ? "Gerar legenda de novo" : "Gerar legenda automática"}
              </button>
              {frases.length > 0 && (
                <label className="flex items-center gap-1 text-xs font-bold text-black/70">
                  <input type="checkbox" checked={mostrar.legendas} onChange={(e) => setMostrar({ ...mostrar, legendas: e.target.checked })} />
                  Mostrar legenda
                </label>
              )}
            </div>

            {frases.length > 0 && (
              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                {frases.map((f, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-12 shrink-0 pt-2 text-[11px] font-bold text-black/45">{segundos(f.inicio)}</span>
                    <input
                      className={CAMPO}
                      value={f.texto}
                      onChange={(e) =>
                        setFrases((atuais) => atuais.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)))
                      }
                    />
                    <button
                      type="button"
                      title="Apagar frase"
                      className="p-2 text-black/40 hover:text-red-600"
                      onClick={() => setFrases((atuais) => atuais.filter((_, j) => j !== i))}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Coluna da direita: a prévia e o botão de baixar */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <section className={CARTAO}>
            <canvas
              ref={canvas}
              width={quadro.largura}
              height={quadro.altura}
              className="mx-auto block max-h-[70vh] w-full rounded-xl bg-black object-contain"
              style={{ aspectRatio: `${quadro.largura} / ${quadro.altura}` }}
            />

            <div className="mt-3 flex items-center gap-2">
              {estado === "tocando" ? (
                <button type="button" className={BOTAO} onClick={() => (parar.current = true)}>
                  <Pause size={15} /> Parar
                </button>
              ) : (
                <button type="button" className={BOTAO} disabled={ocupado || trechos.length === 0} onClick={() => reproduzir(false)}>
                  <Play size={15} /> Ver prévia
                </button>
              )}
              <span className="text-xs font-bold text-black/50">
                {segundos(tempo)} / {segundos(total)}
              </span>
            </div>

            <button
              type="button"
              className={`${BOTAO_FORTE} mt-3 w-full`}
              disabled={ocupado || trechos.length === 0}
              onClick={() => reproduzir(true)}
            >
              {estado === "gravando" ? <Loader2 size={16} className="animate-spin" /> : <Film size={16} />}
              {estado === "gravando"
                ? `Gravando… ${Math.min(100, Math.round((tempo / Math.max(total, 0.1)) * 100))}%`
                : "Gerar vídeo final"}
            </button>

            {estado === "gravando" && (
              <p className="mt-2 text-[11px] font-bold text-black/55">
                A gravação acontece em tempo real. Não troque de aba nem minimize até terminar.
              </p>
            )}

            {estado === "gravando" && (
              <button type="button" className="mt-2 text-xs font-bold text-black/50 hover:text-red-600" onClick={() => (parar.current = true)}>
                Cancelar
              </button>
            )}

            {pronto && (
              <a
                href={pronto.url}
                download={pronto.nome}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#1ebe5b]"
              >
                <Download size={16} /> Baixar vídeo ({pronto.nome.split(".").pop()?.toUpperCase()})
              </a>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
