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
  Wand2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  anoDaMoto,
  kmDaMoto,
  nomeDaMoto,
  numero,
  type MotoSite,
} from "@/lib/dados/moto-site";
import {
  audioDaMontagem,
  cartoesPelaFala,
  desenharQuadro,
  duracaoTotal,
  formatoDeGravacao,
  LIMITE_LEGENDA,
  montagemAutomatica,
  tamanhoDoQuadro,
  timelinePadrao,
  conflitosDeTempo,
  duracaoDoCard,
  type Cartoes,
  type Frase,
  type Mostrar,
  type Palavra,
  type Textos,
  type Trecho,
} from "@/lib/video/editor";

/*
 * O padrão de vídeo (PADRAO_VIDEO_BLACKOUT.md) pede Inter/Inter
 * Display, que o resto do site não usa (o site usa Geist). O
 * <canvas> só sabe desenhar com uma fonte depois que ela já
 * carregou no documento - por isso o link aqui, em vez de
 * `next/font` (que registra a fonte sob um nome interno, não
 * "Inter", e o lib/video/editor.ts precisa do nome certo para
 * montar o `ctx.font`).
 */
const FONTE_GOOGLE =
  "https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800;900&display=swap";

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

type MotoDoEditor = MotoSite & { status?: string | null; placa?: string | null };

/*
 * As linhas da "linha do tempo" dos cards (pedido de 23/11/2026:
 * alinhar o tempo de cada card de um jeito simples). Cada uma:
 * campo do tempo, nome, chave que liga/desliga (null = painel de
 * preço, que liga quando tem preço) e quanto tempo fica na tela.
 */
type CampoDeCard = Exclude<keyof Cartoes, "outroDuracao" | "duracoes">;
const LINHAS_DE_CARD: [CampoDeCard, string, keyof Mostrar | null][] = [
  ["ano", "Ano", "ano"],
  ["manual", "Manual", "manual"],
  ["cautelar", "Cautelar", "cautelar"],
  ["km", "Km", "km"],
  ["financiamento", "Financ.", "financiamento"],
  ["cartao", "Cartão", "cartao"],
  ["preco", "Preço", null],
];
const DURACAO_MINIMA = 0.8;

/*
 * Caixinha de segundos para digitar o valor na mão (pedido de
 * 23/11/2026). Enquanto digita, guarda o texto; só aplica ao
 * sair do campo ou no Enter (aceita vírgula). Esc desiste.
 */
function CampoSegundos({
  valor,
  aoMudar,
  disabled,
  rotulo,
}: {
  valor: number;
  aoMudar: (n: number) => void;
  disabled?: boolean;
  rotulo: string;
}) {
  const [texto, setTexto] = useState<string | null>(null);
  const desistiu = useRef(false);
  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={rotulo}
      title={rotulo}
      disabled={disabled}
      value={texto ?? valor.toFixed(1)}
      onFocus={(e) => {
        desistiu.current = false;
        setTexto(valor.toFixed(1));
        e.currentTarget.select();
      }}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={() => {
        const n = Number(String(texto ?? "").replace(",", ".").trim());
        if (!desistiu.current && texto !== null && texto.trim() !== "" && Number.isFinite(n)) aoMudar(n);
        setTexto(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          desistiu.current = true;
          e.currentTarget.blur();
        }
      }}
      className="h-7 w-12 shrink-0 rounded-md border border-white/15 bg-white/[.06] px-1 text-center text-[11px] font-black tabular-nums text-white outline-none focus:border-[#d4a017] disabled:opacity-40"
    />
  );
}

/*
 * Salvar os tempos dos cards (pedido de 23/11/2026). Vão para o
 * banco (tabela video_tempos, migração 0047), pra valer em
 * qualquer aparelho: uma linha por moto e uma "ultimo", usada
 * quando a moto ainda não tem a dela. Uma cópia fica também no
 * navegador, pra não perder nada se o banco falhar.
 */
const CHAVE_TEMPOS = "editor-video:tempos";

type TemposSalvos = { cartoes: Cartoes; telaFinalDepois: boolean; salvoEm: string };

function gravarTemposAqui(motoId: string, dados: TemposSalvos) {
  try {
    const texto = JSON.stringify(dados);
    localStorage.setItem(`${CHAVE_TEMPOS}:ultimo`, texto);
    if (motoId) localStorage.setItem(`${CHAVE_TEMPOS}:${motoId}`, texto);
    return true;
  } catch {
    return false;
  }
}

function temposValidos(dados: unknown): TemposSalvos | null {
  const d = dados as TemposSalvos | null;
  return d && d.cartoes && typeof d.cartoes.ano === "number" ? d : null;
}

/* Grava no banco e no navegador. Responde onde conseguiu gravar. */
async function gravarTempos(motoId: string, dados: TemposSalvos): Promise<"banco" | "aparelho" | "nada"> {
  const aqui = gravarTemposAqui(motoId, dados);
  const linhas = [{ chave: "ultimo", dados, atualizado_em: dados.salvoEm }];
  if (motoId) linhas.push({ chave: motoId, dados, atualizado_em: dados.salvoEm });
  const { error } = await supabase.from("video_tempos").upsert(linhas, { onConflict: "chave" });
  if (error) console.error("video_tempos:", error.message);
  return !error ? "banco" : aqui ? "aparelho" : "nada";
}

/* Lê do banco (a da moto, senão a última); sem banco, usa a cópia do navegador. */
async function lerTempos(motoId: string): Promise<TemposSalvos | null> {
  const chaves = motoId ? [motoId, "ultimo"] : ["ultimo"];
  const { data, error } = await supabase.from("video_tempos").select("chave, dados").in("chave", chaves);
  if (!error && data && data.length) {
    const daMoto = data.find((linha) => linha.chave === motoId);
    const ultimo = data.find((linha) => linha.chave === "ultimo");
    const escolhido = temposValidos(daMoto?.dados) || temposValidos(ultimo?.dados);
    if (escolhido) return escolhido;
  }
  if (error) console.error("video_tempos:", error.message);
  return lerTemposAqui(motoId);
}

function lerTemposAqui(motoId: string): TemposSalvos | null {
  try {
    const texto =
      (motoId && localStorage.getItem(`${CHAVE_TEMPOS}:${motoId}`)) || localStorage.getItem(`${CHAVE_TEMPOS}:ultimo`);
    if (!texto) return null;
    return temposValidos(JSON.parse(texto));
  } catch {
    return null;
  }
}

/* Troca o texto do botão por um instante, pra mostrar que funcionou. */
function avisarNoBotao(botao: HTMLButtonElement, texto: string) {
  const antes = botao.dataset.textoOriginal || botao.textContent || "";
  botao.dataset.textoOriginal = antes;
  botao.textContent = texto;
  window.setTimeout(() => {
    botao.textContent = antes;
  }, 1800);
}

function umaCasa(n: number) {
  return Math.round(n * 10) / 10;
}

function semAcento(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

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
  const [buscaMoto, setBuscaMoto] = useState("");
  /* Card sendo arrastado na linha do tempo: qual, e onde o dedo pegou (segundos depois do início do card). */
  const arrasto = useRef<{ campo: CampoDeCard; pegouEm: number; modo: "mover" | "duracao" } | null>(null);
  const [filtroMoto, setFiltroMoto] = useState<"todas" | "estoque" | "vendidas">("todas");
  const [textos, setTextos] = useState<Textos>({ marca: "", modelo: "", ano: "", km: "", preco: "" });
  const [cartoes, setCartoes] = useState<Cartoes>(() => timelinePadrao(0));
  const [timelineManual, setTimelineManual] = useState(false);
  /*
   * Tela final DEPOIS do vídeo, e não por cima do fim dele
   * (pedido de 23/11/2026: o locutor ainda falava do cartão em
   * 24x quando a tela final entrava). Ligado, o vídeo ganha
   * "Tela final dura" segundos a mais no fim, com o último
   * quadro parado por baixo e só a música tocando.
   */
  const [telaFinalDepois, setTelaFinalDepois] = useState(false);
  const [mostrar, setMostrar] = useState<Mostrar>({
    logo: true,
    textos: true,
    legendas: false,
    ano: true,
    km: true,
    financiamento: true,
    cartao: true,
    manual: false,
    cautelar: false,
  });
  const [musica, setMusica] = useState<{ nome: string; url: string } | null>(null);
  const [volumeOriginal, setVolumeOriginal] = useState(1);
  const [volumeMusica, setVolumeMusica] = useState(0.35);
  const [frases, setFrases] = useState<Frase[]>([]);
  const [gerandoLegenda, setGerandoLegenda] = useState(false);
  const [montandoTudo, setMontandoTudo] = useState(false);
  const [avisoMontagem, setAvisoMontagem] = useState("");
  const [estado, setEstado] = useState<"parado" | "tocando" | "pausado" | "gravando">("parado");
  const [tempo, setTempo] = useState(0);
  const [aviso, setAviso] = useState("");
  const [pronto, setPronto] = useState<{ url: string; nome: string } | null>(null);

  const [chat, setChat] = useState<{ de: "eu" | "ia"; texto: string }[]>([]);
  const [pedido, setPedido] = useState("");
  const [pedindo, setPedindo] = useState(false);

  const canvas = useRef<HTMLCanvasElement>(null);
  const videos = useRef(new Map<string, HTMLVideoElement>());
  const audioMusica = useRef<HTMLAudioElement>(null);
  const logo = useRef<HTMLImageElement | null>(null);
  const parar = useRef(false);
  const pausado = useRef(false);
  /* O vídeo e o passo de desenho de agora, pra "Retomar" conseguir religar o laço de fora da função reproduzir. */
  const loopAtivo = useRef<{ v: HTMLVideoElement; passo: () => void; soQuadro?: boolean } | null>(null);
  const audio = useRef<{
    ctx: AudioContext;
    original: GainNode;
    tratamento: BiquadFilterNode;
    musica: GainNode;
    saida: MediaStreamAudioDestinationNode;
    ligados: WeakSet<HTMLMediaElement>;
  } | null>(null);
  const config = useRef({ textos, mostrar, frases, cartoes });

  const totalVideo = duracaoTotal(trechos);
  const total = totalVideo + (telaFinalDepois && totalVideo > 0 ? cartoes.outroDuracao : 0);
  const quadro = useMemo(() => tamanhoDoQuadro(trechos), [trechos]);

  /*
   * Pesquisa e filtro da lista de motos (pedido de 23/11/2026).
   * A moto já escolhida continua na lista mesmo fora do filtro,
   * pra o <select> não perder o que está marcado.
   */
  const motosDaLista = useMemo(() => {
    const termos = semAcento(buscaMoto).split(/s+/).filter(Boolean);
    return motos.filter((m) => {
      if (String(m.id) === motoId) return true;
      const vendida = m.status === "vendida";
      if (filtroMoto === "estoque" && vendida) return false;
      if (filtroMoto === "vendidas" && !vendida) return false;
      const texto = semAcento(
        [m.marca, m.modelo, m.versao, m.cor, m.placa, m.ano_fabricacao, m.ano_modelo, m.cilindrada].filter(Boolean).join(" ")
      );
      return termos.every((t) => texto.includes(t));
    });
  }, [motos, buscaMoto, filtroMoto, motoId]);
  const ocupado = estado !== "parado";
  /* Quais cards estão cobrindo outro (ou a tela final) - a linha fica vermelha. */
  const cardsCobertos = useMemo(() => {
    const janelas = LINHAS_DE_CARD.filter(([, , chave]) => (chave ? mostrar[chave] : Boolean(textos.preco)))
      .map(([campo]) => ({ campo, inicio: cartoes[campo], fim: cartoes[campo] + duracaoDoCard(cartoes, campo) }))
      .sort((a, b) => a.inicio - b.inicio);
    const cobertos = new Set<string>();
    for (let i = 0; i < janelas.length - 1; i += 1) {
      if (janelas[i + 1].inicio < janelas[i].fim) {
        cobertos.add(janelas[i].campo);
        cobertos.add(janelas[i + 1].campo);
      }
    }
    const ultimo = janelas[janelas.length - 1];
    if (ultimo && ultimo.fim > Math.max(2, total - cartoes.outroDuracao)) cobertos.add(ultimo.campo);
    return cobertos;
  }, [cartoes, mostrar, textos.preco, total]);

  const avisosDeTempo = useMemo(
    () => conflitosDeTempo(cartoes, mostrar, Boolean(textos.preco), total),
    [cartoes, mostrar, textos.preco, total]
  );

  /*
   * As motos para preencher os textos sozinho - todas, inclusive
   * as vendidas (pedido de 23/11/2026: refazer vídeo de moto que
   * já saiu). Na lista elas aparecem separadas, embaixo.
   */
  useEffect(() => {
    supabase
      .from("motorcycles")
      .select(
        "id, marca, modelo, versao, cor, ano_fabricacao, ano_modelo, quilometragem, cilindrada, preco_anunciado, data_entrada, status, placa"
      )
      .order("data_entrada", { ascending: false, nullsFirst: false })
      .then(({ data }) => setMotos((data || []) as unknown as MotoDoEditor[]));

    const imagem = new Image();
    imagem.src = "/logo-blackout-marca.png";
    imagem.onload = () => desenharParado();
    logo.current = imagem;

    /*
     * A Inter, para o <canvas> conseguir desenhar os cards do
     * padrão com ela. Só colocar o <link> não basta: o navegador
     * não baixa o peso até alguém de fato usar, e o <canvas>
     * desenha síncrono - sem esperar, o primeiro quadro sai com a
     * fonte do sistema (bem diferente) e só acerta depois de
     * redesenhar por acaso.
     */
    if (!document.querySelector(`link[href="${FONTE_GOOGLE}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = FONTE_GOOGLE;
      document.head.appendChild(link);
    }
    Promise.all(
      ["500", "600", "700", "800", "900"].map((peso) => document.fonts.load(`${peso} 48px Inter`))
    )
      .then(() => document.fonts.ready)
      .then(() => desenharParado())
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* A linha do tempo dos cards acompanha a duração sozinha, até alguém mexer num campo dela à mão. */
  useEffect(() => {
    if (!timelineManual) setCartoes(timelinePadrao(total));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

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
      duracaoTotal: total,
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
    config.current = { textos, mostrar, frases, cartoes };
    if (estado === "parado") desenharParado();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textos, mostrar, frases, cartoes, quadro, estado, total]);

  function escolherMoto(id: string) {
    setMotoId(id);
    const moto = motos.find((m) => String(m.id) === id);
    if (!moto) return;
    const preco = numero(moto.preco_anunciado);
    setTextos({
      marca: String(moto.marca || "").trim(),
      modelo: [moto.modelo, moto.versao].filter(Boolean).join(" ").trim(),
      ano: anoDaMoto(moto) === "—" ? "" : anoDaMoto(moto),
      km: kmDaMoto(moto.quilometragem) === "—" ? "" : kmDaMoto(moto.quilometragem),
      preco: preco ? new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(preco) : "",
    });
  }

  /* Cada card do padrão tem o tempo em que aparece; só quem ouve a narração sabe o certo - aqui é só o ponto de partida. */
  function mudarCartao(campo: keyof Cartoes, valor: number) {
    setTimelineManual(true);
    setCartoes((atual) => ({ ...atual, [campo]: Math.max(0, umaCasa(valor)) }));
  }

  function mudarDuracao(campo: CampoDeCard, valor: number) {
    setTimelineManual(true);
    setCartoes((atual) => ({
      ...atual,
      duracoes: { ...atual.duracoes, [campo]: Math.max(DURACAO_MINIMA, umaCasa(valor)) },
    }));
  }

  function cardLigado(chave: keyof Mostrar | null) {
    return chave ? Boolean(mostrar[chave]) : Boolean(textos.preco);
  }

  /* Empurra pra frente cada card que entra antes do anterior sair, na ordem em que aparecem. */
  function organizarCards() {
    setTimelineManual(true);
    setCartoes((atual) => {
      const novo = { ...atual };
      const ligados = LINHAS_DE_CARD.filter(([, , chave]) => cardLigado(chave)).sort((a, b) => atual[a[0]] - atual[b[0]]);
      let fimAnterior = 0;
      for (const [campo] of ligados) {
        if (novo[campo] < fimAnterior) novo[campo] = Math.ceil(fimAnterior * 10 - 1e-6) / 10;
        fimAnterior = novo[campo] + duracaoDoCard(novo, campo);
      }
      return novo;
    });
  }

  /*
   * O chat de dentro do editor: manda o pedido junto do estado
   * atual, e aplica de volta só os campos que a IA mudou (os
   * outros vêm null). Já aplica direto - sem perguntar antes -
   * então o campo errado é só corrigir na mão ou pedir de novo.
   */
  async function enviarPedido() {
    const texto = pedido.trim();
    if (!texto || pedindo) return;

    setChat((atual) => [...atual, { de: "eu", texto }]);
    setPedido("");
    setPedindo(true);

    try {
      const resposta = await fetch("/api/video/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pedido: texto,
          estado: { duracaoTotal: total, textos, cartoes, mostrar },
        }),
      });
      const dados = await resposta.json().catch(() => null);

      if (!resposta.ok || !dados) {
        setChat((atual) => [...atual, { de: "ia", texto: dados?.error || "Não consegui entender. Tente de novo." }]);
        return;
      }

      if (dados.textos) {
        const mudancas = Object.fromEntries(Object.entries(dados.textos).filter(([, v]) => v !== null));
        if (Object.keys(mudancas).length) setTextos((atual) => ({ ...atual, ...mudancas }));
      }
      if (dados.cartoes) {
        const mudancas = Object.fromEntries(Object.entries(dados.cartoes).filter(([, v]) => v !== null));
        if (Object.keys(mudancas).length) {
          setTimelineManual(true);
          setCartoes((atual) => ({ ...atual, ...mudancas }));
        }
      }
      if (dados.mostrar) {
        const mudancas = Object.fromEntries(Object.entries(dados.mostrar).filter(([, v]) => v !== null));
        if (Object.keys(mudancas).length) setMostrar((atual) => ({ ...atual, ...mudancas }));
      }

      setChat((atual) => [...atual, { de: "ia", texto: dados.resposta || "Pronto." }]);
    } catch {
      setChat((atual) => [...atual, { de: "ia", texto: "Sem conexão com o servidor. Tente de novo." }]);
    } finally {
      setPedindo(false);
    }
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

  /*
   * O som passa todo por aqui: a narração recebe o tratamento do
   * padrão (passa-altas de 80 Hz para tirar o grave surdo do
   * microfone do celular, e um compressor para nivelar fala baixa
   * e alta) antes do volume; a música entra direto, só no volume
   * dela. O navegador não faz a normalização de loudness do
   * ffmpeg (loudnorm) - o compressor já deixa a fala bem mais
   * pareja, que é o que mais se nota ouvindo.
   */
  function ligarAudio() {
    if (!audio.current) {
      const ctx = new AudioContext();
      const tratamento = ctx.createBiquadFilter();
      tratamento.type = "highpass";
      tratamento.frequency.value = 80;

      /*
       * Áudio (revisão de 23/11/2026 - a gravação saía com o som
       * horrível): o compressor antigo (-20 dB, 3:1) somado ao
       * ganho automático que o navegador põe nele, mais a música
       * por cima, passava do 0 dB e estourava (distorção), além de
       * levantar o chiado. Agora: compressor leve só na voz, e no
       * fim da mistura um limitador que segura o pico abaixo do
       * máximo, pra voz + música nunca estourarem.
       */
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -16;
      compressor.knee.value = 12;
      compressor.ratio.value = 2;
      compressor.attack.value = 0.008;
      compressor.release.value = 0.25;

      const original = ctx.createGain();
      const musicaGanho = ctx.createGain();
      const mistura = ctx.createGain();
      mistura.gain.value = 0.8;
      const limitador = ctx.createDynamicsCompressor();
      limitador.threshold.value = -3;
      limitador.knee.value = 0;
      limitador.ratio.value = 20;
      limitador.attack.value = 0.002;
      limitador.release.value = 0.12;
      const saida = ctx.createMediaStreamDestination();
      tratamento.connect(compressor);
      compressor.connect(original);
      original.connect(mistura);
      musicaGanho.connect(mistura);
      mistura.connect(limitador);
      limitador.connect(ctx.destination);
      limitador.connect(saida);
      audio.current = { ctx, original, tratamento, musica: musicaGanho, saida, ligados: new WeakSet() };
    }
    const a = audio.current;
    a.original.gain.value = volumeOriginal;
    a.musica.gain.value = volumeMusica;

    videos.current.forEach((v) => {
      if (!a.ligados.has(v)) {
        a.ctx.createMediaElementSource(v).connect(a.tratamento);
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

  /*
   * Barra de adiantar/voltar (pedido de 23/11/2026). Parado: só
   * mostra o quadro daquele ponto (e "Tocar" começa dali).
   * Tocando ou pausado: para a reprodução e, quando ela terminar
   * de parar, recomeça do ponto escolhido (se estava tocando)
   * ou fica parado mostrando o quadro.
   */
  const irPara = useRef<{ t: number; tocar: boolean } | null>(null);

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

  async function mostrarQuadro(t: number) {
    const lugar = localizar(t);
    setTempo(t);
    if (!lugar) return;
    const v = videos.current.get(lugar.trecho.id);
    if (!v) return;
    v.currentTime = lugar.local;
    await esperar(v, "seeked");
    desenhar(v, t);
  }

  function procurar(t: number) {
    const alvo = Math.min(Math.max(0, t), Math.max(0, total - 0.05));
    if (estado === "gravando") return;
    if (estado === "parado") {
      mostrarQuadro(alvo);
      return;
    }
    irPara.current = { t: alvo, tocar: estado === "tocando" || Boolean(irPara.current?.tocar) };
    setTempo(alvo);
    pararTudo();
  }

  async function reproduzir(gravar: boolean, desde = 0) {
    if (gravar) desde = 0;
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

    /*
     * iPhone (Safari): vídeo só toca se o play() sair direto do
     * toque no botão - depois de qualquer await, ele recusa e a
     * prévia fica preta parada em 0:00 (visto em 23/11/2026).
     * Então aqui, ainda dentro do toque, dá play e pausa em todos
     * os vídeos e na música: depois disso o Safari libera tocar
     * cada um deles quando o laço chegar. Espera os pauses
     * terminarem antes de seguir, pra nenhum pause atrasado parar
     * o vídeo de verdade.
     */
    const liberando = [
      ...trechos.map((t) => videos.current.get(t.id)),
      musica ? audioMusica.current : null,
    ].map((midia) =>
      midia
        ? midia
            .play()
            .then(() => midia.pause())
            .catch(() => {})
        : null
    );

    await a.ctx.resume();
    await Promise.all(liberando);

    let gravador: MediaRecorder | null = null;
    const pedacos: Blob[] = [];
    if (gravar && formato && canvas.current) {
      /*
       * 30 fps, igual ao vídeo do celular (revisão de 24/11/2026):
       * com 24 o gravador jogava fora 1 a cada 5 quadros e o
       * movimento saía aos trancos.
       */
      const fluxo = canvas.current.captureStream(30);
      a.saida.stream.getAudioTracks().forEach((faixa) => fluxo.addTrack(faixa));
      gravador = new MediaRecorder(fluxo, {
        mimeType: formato.tipo,
        /* 16 Mbps (antes 6): em 1080x1920 os 6 deixavam a imagem borrada e quadriculada no movimento. */
        videoBitsPerSecond: 16_000_000,
        /* Sem isso o navegador grava o som com qualidade baixa. */
        audioBitsPerSecond: 192_000,
      });
      gravador.ondataavailable = (e) => {
        if (e.data.size) pedacos.push(e.data);
      };
    }

    const m = audioMusica.current;
    if (m && musica) {
      m.currentTime = m.duration ? desde % m.duration : 0;
      m.loop = true;
    }

    let base = 0;
    let comecou = false;
    /*
     * O relógio da tela só atualiza ~10x por segundo: atualizar a
     * cada quadro redesenhava a página inteira 60x por segundo e
     * fazia o vídeo gravado travar (revisão de 24/11/2026).
     */
    let relogioEm = 0;
    const mostrarTempo = (t: number, agora = false) => {
      const ms = performance.now();
      if (agora || ms - relogioEm >= 100) {
        relogioEm = ms;
        setTempo(t);
      }
    };

    for (const trecho of trechos) {
      if (parar.current) break;
      const v = videos.current.get(trecho.id);
      if (!v) continue;

      /* Começando do meio (barra de adiantar): pula os trechos que já passaram e entra no ponto certo do atual. */
      const dura = trecho.fim - trecho.inicio;
      if (base + dura <= desde) {
        base += dura;
        continue;
      }
      v.currentTime = trecho.inicio + Math.max(0, desde - base);
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
          /* Pausado: não desenha nem agenda o próximo quadro - "Retomar" é quem rechama requestAnimationFrame(passo). */
          if (pausado.current) return;
          const t = base + (v.currentTime - trecho.inicio);
          desenhar(v, t);
          const acabou = parar.current || v.ended || v.currentTime >= trecho.fim;
          mostrarTempo(t, acabou);
          if (acabou) {
            terminou();
            return;
          }
          requestAnimationFrame(passo);
        };
        loopAtivo.current = { v, passo };
        requestAnimationFrame(passo);
      });

      v.pause();
      base += trecho.fim - trecho.inicio;
    }

    /* A tela final depois do vídeo: o último quadro parado, contando o tempo no relógio (o vídeo já acabou). */
    const ultimoTrecho = trechos[trechos.length - 1];
    const ultimoVideo = ultimoTrecho ? videos.current.get(ultimoTrecho.id) : undefined;
    if (telaFinalDepois && !parar.current && ultimoTrecho && ultimoVideo && total > totalVideo) {
      ultimoVideo.pause();
      if (Math.abs(ultimoVideo.currentTime - ultimoTrecho.fim) > 0.2) {
        ultimoVideo.currentTime = Math.max(ultimoTrecho.inicio, ultimoTrecho.fim - 0.05);
        await esperar(ultimoVideo, "seeked");
      }
      if (!comecou) {
        comecou = true;
        gravador?.start(250);
        if (m && musica) await m.play().catch(() => {});
      }
      const extra = total - totalVideo;
      let decorrido = Math.max(0, desde - totalVideo);
      let antes: number | null = null;
      await new Promise<void>((terminou) => {
        const passo = () => {
          if (pausado.current) {
            antes = null;
            return;
          }
          const agora = performance.now();
          if (antes !== null) decorrido += (agora - antes) / 1000;
          antes = agora;
          const t = totalVideo + Math.min(decorrido, extra);
          desenhar(ultimoVideo, t);
          mostrarTempo(t, parar.current || decorrido >= extra);
          if (parar.current || decorrido >= extra) {
            terminou();
            return;
          }
          requestAnimationFrame(passo);
        };
        loopAtivo.current = { v: ultimoVideo, passo, soQuadro: true };
        requestAnimationFrame(passo);
      });
    }

    m?.pause();

    if (gravador && formato) {
      const fim = esperar(gravador as unknown as HTMLVideoElement, "stop");
      gravador.stop();
      await fim;
      if (!parar.current) {
        const arquivo = new Blob(pedacos, { type: formato.tipo });
        const nomeBase =
          (`${textos.marca} ${textos.modelo}`.trim() || "video")
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
    pausado.current = false;
    loopAtivo.current = null;

    /* Parou porque alguém mexeu na barra: recomeça (ou só mostra o quadro) do ponto escolhido. */
    const pedido = irPara.current;
    irPara.current = null;
    if (pedido && !gravar) {
      if (pedido.tocar) reproduzir(false, pedido.t);
      else mostrarQuadro(pedido.t);
    }
  }

  /* "Tocar" parado: começa de onde a barra está (do zero se estiver no fim). */
  function tocarDaqui() {
    reproduzir(false, tempo > 0 && tempo < total - 0.3 ? tempo : 0);
  }

  /* Pausa a prévia no quadro atual - o vídeo e o laço ficam parados, prontos pra "Retomar". Não existe durante a gravação: ela só tem "Cancelar". */
  function pausarPrevia() {
    if (estado !== "tocando" || !loopAtivo.current) return;
    pausado.current = true;
    loopAtivo.current.v.pause();
    audioMusica.current?.pause();
    setEstado("pausado");
  }

  function retomarPrevia() {
    if (estado !== "pausado" || !loopAtivo.current) return;
    pausado.current = false;
    if (!loopAtivo.current.soQuadro) loopAtivo.current.v.play().catch(() => {});
    if (musica) audioMusica.current?.play().catch(() => {});
    setEstado("tocando");
    requestAnimationFrame(loopAtivo.current.passo);
  }

  /* Para de vez (sai da prévia) - funciona tocando ou pausado. Durante a gravação, é o "Cancelar". */
  function pararTudo() {
    parar.current = true;
    if (estado === "pausado" && loopAtivo.current) {
      pausado.current = false;
      requestAnimationFrame(loopAtivo.current.passo);
    }
  }

  /* Manda o áudio da montagem pra transcrição. Devolve as frases e as palavras, ou o texto do erro. */
  async function transcrever(lista: Trecho[]): Promise<{ frases: Frase[]; palavras: Palavra[] } | string> {
    if (duracaoTotal(lista) > LIMITE_LEGENDA) {
      return `A legenda automática vai até ${LIMITE_LEGENDA / 60} minutos de vídeo. Encurte os trechos e tente de novo.`;
    }
    try {
      const wav = await audioDaMontagem(lista);
      if (!wav) return "Não achei som nesses vídeos para legendar.";
      const envio = new FormData();
      envio.append("audio", wav, "audio.wav");
      const resposta = await fetch("/api/video/legendas", { method: "POST", body: envio });
      const dados = await resposta.json();
      if (!resposta.ok) return dados.error || "A legenda falhou. Tente de novo.";
      return { frases: (dados.frases || []) as Frase[], palavras: (dados.palavras || []) as Palavra[] };
    } catch (erro) {
      console.error(erro);
      return "A legenda falhou. Tente de novo.";
    }
  }

  async function gerarLegendas() {
    if (trechos.length === 0 || gerandoLegenda) return;
    setAviso("");
    setGerandoLegenda(true);
    try {
      const resultado = await transcrever(trechos);
      if (typeof resultado === "string") {
        setAviso(resultado);
        return;
      }
      setFrases(resultado.frases);
      setMostrar((atual) => ({ ...atual, legendas: true }));
      if (resultado.frases.length === 0) setAviso("Não entendi fala nenhuma no vídeo.");
    } finally {
      setGerandoLegenda(false);
    }
  }

  /*
   * Montar tudo automático (pedido de 24/11/2026): corta os
   * trechos, ouve a fala, põe cada card na hora em que ele é
   * falado, liga a tela final depois do vídeo e deixa a legenda
   * pronta. Tudo continua ajustável na mão depois.
   */
  async function montarTudoAutomatico() {
    if (trechos.length === 0 || ocupado || gerandoLegenda) return;
    const novos = montagemAutomatica(trechos);
    setTrechos(novos);
    setFrases([]);
    setAviso("");
    setAvisoMontagem("");
    setGerandoLegenda(true);
    setMontandoTudo(true);
    try {
      const resultado = await transcrever(novos);
      const ligados = LINHAS_DE_CARD.filter(([, , chave]) => cardLigado(chave)).map(([campo]) => campo);
      const totalNovo = duracaoTotal(novos);
      const base: Cartoes = { ...timelinePadrao(totalNovo), duracoes: cartoes.duracoes };

      if (typeof resultado === "string") {
        setTimelineManual(false);
        setCartoes(base);
        setAvisoMontagem(`Não consegui ouvir a fala, então os cards não foram posicionados (só cortei os vídeos). Motivo: ${resultado}`);
        return;
      }

      const falas = resultado.palavras.length ? resultado.palavras : resultado.frases;
      const { cartoes: novo, achados } = cartoesPelaFala(falas, base, ligados, totalNovo);
      setTimelineManual(true);
      setCartoes(novo);
      setTelaFinalDepois(true);
      setFrases(resultado.frases);
      setMostrar((atual) => ({ ...atual, legendas: resultado.frases.length > 0 }));

      const nomes = (campos: CampoDeCard[]) =>
        campos.map((c) => LINHAS_DE_CARD.find(([campo]) => campo === c)?.[1] || c).join(", ");
      const chutados = ligados.filter((c) => !achados.includes(c));
      setAvisoMontagem(
        resultado.frases.length === 0
          ? "Cortei os vídeos, mas não entendi fala nenhuma - os cards ficaram espalhados no tempo padrão. Confira e ajuste."
          : chutados.length === 0
            ? "Pronto: montei tudo pela sua fala. Dê o play pra conferir e ajuste o que precisar."
            : `Pronto: montei pela sua fala. Não ouvi você falar de: ${nomes(chutados)} - ${chutados.length === 1 ? "esse card ficou" : "esses cards ficaram"} num espaço livre, confira.`
      );
    } finally {
      setGerandoLegenda(false);
      setMontandoTudo(false);
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

      <section className={`${CARTAO} mb-5`}>
        <h2 className="flex items-center gap-2 font-black text-black">
          <Sparkles size={16} className="text-[#a97800]" /> Peça pra IA ajustar
        </h2>
        <p className="mt-1 text-[11px] font-semibold text-black/45">
          Ex.: &quot;põe o card do ano aos 8 segundos&quot;, &quot;desliga o cautelar&quot;, &quot;preço 22.900&quot;. Aplica direto nos campos abaixo.
        </p>

        {chat.length > 0 && (
          <div className="mt-3 max-h-40 space-y-2 overflow-y-auto rounded-xl border border-black/10 bg-black/[0.03] p-3">
            {chat.map((m, i) => (
              <p key={i} className="text-xs font-semibold text-black/80">
                <span className={m.de === "eu" ? "text-black/50" : "font-black text-[#a97800]"}>
                  {m.de === "eu" ? "Você: " : "IA: "}
                </span>
                {m.texto}
              </p>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          <input
            className={CAMPO}
            value={pedido}
            placeholder="Escreva o que você quer mudar…"
            disabled={pedindo}
            onChange={(e) => setPedido(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") enviarPedido();
            }}
          />
          <button type="button" className={BOTAO_FORTE} disabled={!pedido.trim() || pedindo} onClick={enviarPedido}>
            {pedindo ? <Loader2 size={15} className="animate-spin" /> : "Pedir"}
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        {/* Coluna da esquerda: os ajustes */}
        <div className="min-w-0 space-y-4">
          <section className={CARTAO}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-black text-black">1. Vídeos</h2>
              <div className="flex flex-wrap gap-2">
                {trechos.length > 0 && (
                  <button
                    type="button"
                    className={BOTAO_FORTE}
                    disabled={ocupado || gerandoLegenda}
                    title="Corta os vídeos, ouve a sua fala, põe cada card na hora em que você fala dele e faz a legenda"
                    onClick={montarTudoAutomatico}
                  >
                    {montandoTudo ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
                    {montandoTudo ? "Montando…" : "Montar tudo automático"}
                  </button>
                )}
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

            {avisoMontagem && (
              <p className="mt-3 rounded-lg border border-amber-400/60 bg-amber-50 px-3 py-2 text-xs font-bold text-[#0b0b0c]">
                {avisoMontagem}
              </p>
            )}

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
                  Cards do padrão
                </label>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                className={`${CAMPO} sm:flex-1`}
                value={buscaMoto}
                placeholder="Pesquisar moto: modelo, cor, placa, ano…"
                onChange={(e) => setBuscaMoto(e.target.value)}
              />
              <select
                className={`${CAMPO} sm:w-44`}
                value={filtroMoto}
                onChange={(e) => setFiltroMoto(e.target.value as "todas" | "estoque" | "vendidas")}
              >
                <option value="todas">Todas</option>
                <option value="estoque">Só no estoque</option>
                <option value="vendidas">Só vendidas</option>
              </select>
            </div>
            <select className={`${CAMPO} mt-2`} value={motoId} onChange={(e) => escolherMoto(e.target.value)}>
              <option value="">
                {motosDaLista.length === 0
                  ? "Nenhuma moto encontrada na pesquisa"
                  : `Escolha a moto para preencher sozinho… (${motosDaLista.length})`}
              </option>
              {[
                { rotulo: "No estoque", lista: motosDaLista.filter((m) => m.status !== "vendida") },
                { rotulo: "Já vendidas", lista: motosDaLista.filter((m) => m.status === "vendida") },
              ]
                .filter((grupo) => grupo.lista.length > 0)
                .map((grupo) => (
                  <optgroup key={grupo.rotulo} label={grupo.rotulo}>
                    {grupo.lista.map((m) => (
                      <option key={m.id} value={String(m.id)}>
                        {nomeDaMoto(m)} {anoDaMoto(m)} {m.cor ? `· ${m.cor}` : ""}
                      </option>
                    ))}
                  </optgroup>
                ))}
            </select>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="text-[11px] font-bold text-black/55">
                Marca
                <input className={CAMPO} value={textos.marca} onChange={(e) => setTextos({ ...textos, marca: e.target.value })} />
              </label>
              <label className="text-[11px] font-bold text-black/55">
                Modelo
                <input className={CAMPO} value={textos.modelo} onChange={(e) => setTextos({ ...textos, modelo: e.target.value })} />
              </label>
              <label className="text-[11px] font-bold text-black/55">
                Ano
                <input className={CAMPO} value={textos.ano} onChange={(e) => setTextos({ ...textos, ano: e.target.value })} />
              </label>
              <label className="text-[11px] font-bold text-black/55">
                Km
                <input className={CAMPO} value={textos.km} placeholder="ex.: 35 mil km" onChange={(e) => setTextos({ ...textos, km: e.target.value })} />
              </label>
              <label className="text-[11px] font-bold text-black/55 sm:col-span-2">
                Preço (só o número, sem R$)
                <input className={CAMPO} value={textos.preco} placeholder="Deixe vazio para não mostrar preço" onChange={(e) => setTextos({ ...textos, preco: e.target.value })} />
              </label>
            </div>

            <div className="mt-4 border-t border-black/10 pt-3">
              <h3 className="text-xs font-black text-black">Cards opcionais</h3>
              <p className="mt-1 text-[11px] font-semibold text-black/45">
                Só liga o que o narrador vai realmente falar nesse vídeo - manual e cautelar dependem da moto.
              </p>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                {(
                  [
                    ["ano", "Ano"],
                    ["km", "Quilometragem"],
                    ["financiamento", "Financiamento"],
                    ["cartao", "Cartão de crédito"],
                    ["manual", "Manual / chave reserva"],
                    ["cautelar", "Cautelar 100% aprovada"],
                  ] as [keyof Mostrar, string][]
                ).map(([campo, rotulo]) => (
                  <label key={campo} className="flex items-center gap-2 text-[11px] font-bold text-black/70">
                    <input
                      type="checkbox"
                      checked={Boolean(mostrar[campo])}
                      onChange={(e) => setMostrar({ ...mostrar, [campo]: e.target.checked })}
                    />
                    {rotulo}
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-4 border-t border-black/10 pt-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-black">Quando cada card aparece (segundos)</h3>
                <button
                  type="button"
                  className="text-xs font-bold text-black/50 hover:text-[#a97800]"
                  onClick={() => {
                    setCartoes((atual) => ({ ...timelinePadrao(total), duracoes: atual.duracoes }));
                    setTimelineManual(false);
                  }}
                >
                  recalcular automático
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-md bg-[#d4a017] px-3 py-1.5 text-[11px] font-black text-[#0b0b0c] hover:bg-[#f0c640]"
                  onClick={async (e) => {
                    const botao = e.currentTarget;
                    botao.disabled = true;
                    const onde = await gravarTempos(motoId, { cartoes, telaFinalDepois, salvoEm: new Date().toISOString() });
                    botao.disabled = false;
                    avisarNoBotao(
                      botao,
                      onde === "banco" ? "Salvo no banco ✓" : onde === "aparelho" ? "Salvo só neste aparelho" : "Não deu para salvar"
                    );
                  }}
                >
                  Salvar estes tempos
                </button>
                <button
                  type="button"
                  className="rounded-md border border-white/15 bg-white/[.06] px-3 py-1.5 text-[11px] font-black text-white hover:border-[#d4a017]"
                  onClick={async (e) => {
                    const botao = e.currentTarget;
                    botao.disabled = true;
                    const salvos = await lerTempos(motoId);
                    botao.disabled = false;
                    if (!salvos) {
                      avisarNoBotao(botao, "Nada salvo ainda");
                      return;
                    }
                    setTimelineManual(true);
                    setCartoes(salvos.cartoes);
                    setTelaFinalDepois(Boolean(salvos.telaFinalDepois));
                    avisarNoBotao(botao, "Tempos aplicados ✓");
                  }}
                >
                  Usar tempos salvos
                </button>
              </div>
              <p className="mt-1 text-[11px] font-semibold text-black/45">
                Aperte Tocar e, ouvindo a narração, clique em Marcar na hora em que o locutor fala de cada coisa. Arraste o bloco para mudar quando entra e puxe a ponta direita (ou use “dura − +”) para mudar quanto tempo fica. Linha vermelha = card cobrindo outro.
              </p>

              {avisosDeTempo.length > 0 && (
                <div className="mt-2 rounded-lg border border-amber-400/60 bg-amber-50 p-2">
                  <p className="text-[11px] font-black text-black">
                    ⚠ {avisosDeTempo.length === 1 ? "Um card vai cobrir o outro:" : "Esses cards vão se cobrir:"}
                  </p>
                  <ul className="mt-1 space-y-0.5 text-[11px] font-semibold text-black/70">
                    {avisosDeTempo.map((aviso, i) => (
                      <li key={i}>• {aviso}</li>
                    ))}
                  </ul>
                </div>
              )}

              {(() => {
                const podeMarcar = estado !== "gravando" && trechos.length > 0;
                const pct = (x: number) => (total > 0 ? Math.min(100, Math.max(0, (x / total) * 100)) : 0);
                const outroInicio = Math.max(2, total - cartoes.outroDuracao);
                const BOTAO_PEQUENO =
                  "grid h-7 w-7 shrink-0 place-items-center rounded-md border border-white/15 bg-white/[.06] text-sm font-black text-white hover:border-[#d4a017] disabled:opacity-30";
                return (
                  <>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {estado === "tocando" ? (
                        <button type="button" className={BOTAO} onClick={pausarPrevia}>
                          <Pause size={15} /> Pausar
                        </button>
                      ) : estado === "pausado" ? (
                        <button type="button" className={BOTAO} onClick={retomarPrevia}>
                          <Play size={15} /> Continuar
                        </button>
                      ) : (
                        <button type="button" className={BOTAO} disabled={ocupado || trechos.length === 0} onClick={tocarDaqui}>
                          <Play size={15} /> Tocar para marcar
                        </button>
                      )}
                      {(estado === "tocando" || estado === "pausado") && (
                        <button type="button" className={BOTAO} onClick={pararTudo}>
                          Parar
                        </button>
                      )}
                      <span className="text-xs font-black tabular-nums text-black/60">
                        {tempo.toFixed(1)}s / {total.toFixed(1)}s
                      </span>
                      {cardsCobertos.size > 0 && (
                        <button type="button" className="ml-auto text-xs font-bold text-[#a97800] hover:underline" onClick={organizarCards}>
                          desencavalar cards sozinho
                        </button>
                      )}
                    </div>

                    <input
                      type="range"
                      aria-label="Adiantar ou voltar o vídeo"
                      min={0}
                      max={Math.max(total, 0.1)}
                      step={0.1}
                      value={Math.min(tempo, total)}
                      disabled={trechos.length === 0 || estado === "gravando"}
                      onChange={(e) => procurar(Number(e.target.value))}
                      className="mt-2 block h-6 w-full cursor-pointer accent-[#d4a017] disabled:opacity-40"
                    />

                    <div className="mt-2 space-y-1.5">
                      {LINHAS_DE_CARD.map(([campo, rotulo, chave]) => {
                        const duracao = duracaoDoCard(cartoes, campo);
                        const ligado = cardLigado(chave);
                        const coberto = ligado && cardsCobertos.has(campo);
                        const inicio = cartoes[campo];
                        return (
                          <div
                            key={campo}
                            className={`flex flex-wrap items-center gap-2 rounded-lg border px-2 py-1.5 sm:flex-nowrap ${
                              !ligado ? "border-white/5 opacity-40" : coberto ? "border-red-500/70 bg-red-500/10" : "border-white/10 bg-white/[.03]"
                            }`}
                          >
                            <span className="w-16 shrink-0 text-[11px] font-black text-white">
                              {rotulo}
                              {!ligado && <span className="block text-[9px] font-bold text-white/50">desligado</span>}
                            </span>
                            <div
                              className={`relative order-last h-7 basis-full touch-none select-none overflow-hidden rounded bg-white/10 sm:order-none sm:min-w-0 sm:flex-1 sm:basis-auto ${
                                ligado && total > 0 ? "cursor-grab active:cursor-grabbing" : ""
                              }`}
                              title={ligado ? "Arraste o bloco para mudar quando entra; puxe a ponta direita para mudar quanto tempo fica" : undefined}
                              onPointerDown={(e) => {
                                if (!ligado || total <= 0) return;
                                const caixa = e.currentTarget.getBoundingClientRect();
                                const t = ((e.clientX - caixa.left) / caixa.width) * total;
                                /*
                                 * Ponta direita do bloco (12px pra cada lado): muda a duração.
                                 * No bloco: arrasta mantendo o ponto pego. Fora: o card começa ali.
                                 */
                                const folgaPonta = (12 / caixa.width) * total;
                                const fimCard = inicio + duracao;
                                e.currentTarget.setPointerCapture(e.pointerId);
                                if (Math.abs(t - fimCard) <= folgaPonta) {
                                  arrasto.current = { campo, pegouEm: 0, modo: "duracao" };
                                  return;
                                }
                                const pegouEm = t >= inicio && t <= fimCard ? t - inicio : 0;
                                arrasto.current = { campo, pegouEm, modo: "mover" };
                                if (!pegouEm) mudarCartao(campo, Math.min(t, total - duracao));
                              }}
                              onPointerMove={(e) => {
                                const a = arrasto.current;
                                if (!a || a.campo !== campo) return;
                                const caixa = e.currentTarget.getBoundingClientRect();
                                const t = ((e.clientX - caixa.left) / caixa.width) * total;
                                if (a.modo === "duracao") mudarDuracao(campo, Math.min(t, total) - inicio);
                                else mudarCartao(campo, Math.min(t - a.pegouEm, total - duracao));
                              }}
                              onPointerUp={() => {
                                arrasto.current = null;
                              }}
                              onPointerCancel={() => {
                                arrasto.current = null;
                              }}
                            >
                              {total > 0 && (
                                <>
                                  <div className="absolute inset-y-0 bg-white/20" style={{ left: `${pct(outroInicio)}%`, right: 0 }} title="Tela final" />
                                  {ligado && (
                                    <div
                                      className={`absolute inset-y-0 rounded ${coberto ? "bg-red-500/80" : "bg-[#d4a017]"}`}
                                      style={{ left: `${pct(inicio)}%`, width: `${pct(duracao)}%` }}
                                    >
                                      <span className="absolute inset-y-1 right-0.5 w-1.5 cursor-ew-resize rounded-full bg-[#0b0b0c]/50" />
                                    </div>
                                  )}
                                  {podeMarcar && <div className="absolute inset-y-0 w-0.5 bg-white" style={{ left: `${pct(tempo)}%` }} />}
                                </>
                              )}
                            </div>
                            <button type="button" className={BOTAO_PEQUENO} disabled={!ligado} onClick={() => mudarCartao(campo, inicio - 0.1)} aria-label={`${rotulo} 0,1 s antes`}>
                              −
                            </button>
                            <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-white/60">
                              <CampoSegundos
                                valor={inicio}
                                disabled={!ligado}
                                rotulo={`${rotulo}: começa em (segundos)`}
                                aoMudar={(n) => mudarCartao(campo, Math.min(n, Math.max(0, total - duracao)))}
                              />
                              <span className="w-12 tabular-nums">até {(inicio + duracao).toFixed(1)}</span>
                            </span>
                            <button type="button" className={BOTAO_PEQUENO} disabled={!ligado} onClick={() => mudarCartao(campo, inicio + 0.1)} aria-label={`${rotulo} 0,1 s depois`}>
                              +
                            </button>
                            <button
                              type="button"
                              className="h-7 shrink-0 rounded-md bg-[#d4a017] px-2.5 text-[11px] font-black text-[#0b0b0c] hover:bg-[#f0c640] disabled:bg-white/10 disabled:text-white/40"
                              disabled={!ligado || !podeMarcar}
                              title={podeMarcar ? "Começa este card no ponto atual do vídeo" : "Anexe um vídeo primeiro"}
                              onClick={() => mudarCartao(campo, tempo)}
                            >
                              Marcar
                            </button>
                            <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-white/60">
                              dura
                              <button type="button" className={BOTAO_PEQUENO} disabled={!ligado} onClick={() => mudarDuracao(campo, duracao - 0.2)} aria-label={`${rotulo}: menos tempo na tela`}>
                                −
                              </button>
                              <CampoSegundos valor={duracao} disabled={!ligado} rotulo={`${rotulo}: fica na tela (segundos)`} aoMudar={(n) => mudarDuracao(campo, n)} />
                              <button type="button" className={BOTAO_PEQUENO} disabled={!ligado} onClick={() => mudarDuracao(campo, duracao + 0.2)} aria-label={`${rotulo}: mais tempo na tela`}>
                                +
                              </button>
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <label className="mt-3 flex items-start gap-2 text-[11px] font-bold text-white">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={telaFinalDepois}
                        onChange={(e) => setTelaFinalDepois(e.target.checked)}
                      />
                      <span>
                        Tela final depois do vídeo
                        <span className="block font-semibold text-white/60">
                          Não corta a fala do fim: acrescenta o tempo da tela final depois do último trecho, com a imagem parada e só a música.
                        </span>
                      </span>
                    </label>

                    <label className="mt-2 flex items-center gap-2 text-[11px] font-bold text-black/55">
                      Tela final dura
                      <input
                        type="number"
                        min={2}
                        step={0.5}
                        className={`${CAMPO} w-20`}
                        value={cartoes.outroDuracao}
                        onChange={(e) => mudarCartao("outroDuracao", Number(e.target.value))}
                      />
                      segundos (faixa cinza no fim de cada linha)
                    </label>
                  </>
                );
              })()}
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
        <div className="min-w-0 lg:sticky lg:top-4 lg:self-start">
          <section className={CARTAO}>
            <canvas
              ref={canvas}
              width={quadro.largura}
              height={quadro.altura}
              className="mx-auto block max-h-[70vh] w-full rounded-xl bg-black object-contain"
              style={{ aspectRatio: `${quadro.largura} / ${quadro.altura}` }}
            />
            <input
                type="range"
                aria-label="Adiantar ou voltar o vídeo"
                min={0}
                max={Math.max(total, 0.1)}
                step={0.1}
                value={Math.min(tempo, total)}
                disabled={trechos.length === 0 || estado === "gravando"}
                onChange={(e) => procurar(Number(e.target.value))}
                className="mt-2 block h-6 w-full cursor-pointer accent-[#d4a017] disabled:opacity-40"
              />
            <div className="mt-1 flex justify-center gap-2">
              <button type="button" className={BOTAO} disabled={trechos.length === 0 || estado === "gravando"} onClick={() => procurar(tempo - 2)}>
                −2s
              </button>
              <button type="button" className={BOTAO} disabled={trechos.length === 0 || estado === "gravando"} onClick={() => procurar(tempo + 2)}>
                +2s
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2">
              {estado === "tocando" && (
                <>
                  <button type="button" className={BOTAO} onClick={pausarPrevia}>
                    <Pause size={15} /> Pausar
                  </button>
                  <button type="button" className={BOTAO} onClick={pararTudo}>
                    Parar
                  </button>
                </>
              )}
              {estado === "pausado" && (
                <>
                  <button type="button" className={BOTAO} onClick={retomarPrevia}>
                    <Play size={15} /> Retomar
                  </button>
                  <button type="button" className={BOTAO} onClick={pararTudo}>
                    Parar
                  </button>
                </>
              )}
              {(estado === "parado" || estado === "gravando") && (
                <button type="button" className={BOTAO} disabled={ocupado || trechos.length === 0} onClick={tocarDaqui}>
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
              <button type="button" className="mt-2 text-xs font-bold text-black/50 hover:text-red-600" onClick={pararTudo}>
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
