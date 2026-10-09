"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Camera,
  Check,
  Loader2,
  Plus,
  RotateCcw,
  ScanLine,
  Trash2,
  X,
} from "lucide-react";
import {
  cantosIniciais,
  endireitar,
  realcar,
  type Ponto,
  type Quadrilatero,
} from "@/lib/documentos/scanner";

/*
 * ESCANEAR DOCUMENTO PELA CÂMERA
 *
 * Para as motos que já estão no pátio com o documento só em
 * papel. (Moto comprada daqui para frente entra com o CRLV-e em
 * PDF, que é melhor: vem perfeito e a conferência lê de graça.)
 *
 *   1. "Escanear" abre a câmera do celular (a do próprio
 *      aparelho, em resolução cheia - melhor que um vídeo
 *      dentro da página);
 *   2. a foto aparece com 4 cantos para arrastar até as bordas
 *      do papel;
 *   3. a folha é endireitada e realçada (fundo branco, letra
 *      escura);
 *   4. dá para juntar mais páginas (frente e verso);
 *   5. "Concluir" junta tudo num PDF e devolve como arquivo -
 *      quem anexa é o formulário de sempre.
 *
 * Tudo acontece no aparelho: a foto não sobe para lugar nenhum
 * antes de virar o PDF que a pessoa escolheu anexar.
 */

/* Maior lado da foto que vai para o ajuste dos cantos. */
const MAIOR_LADO_DA_FOTO = 2600;

type Pagina = {
  id: number;
  cor: HTMLCanvasElement;
  realcada: HTMLCanvasElement;
  miniatura: string;
  miniaturaRealcada: string;
};

async function carregarFoto(arquivo: File): Promise<HTMLCanvasElement> {
  const endereco = URL.createObjectURL(arquivo);

  try {
    const imagem = new Image();
    imagem.src = endereco;
    await imagem.decode();

    const escala = Math.min(
      1,
      MAIOR_LADO_DA_FOTO / Math.max(imagem.naturalWidth, imagem.naturalHeight)
    );

    const tela = document.createElement("canvas");
    tela.width = Math.round(imagem.naturalWidth * escala);
    tela.height = Math.round(imagem.naturalHeight * escala);
    tela.getContext("2d")!.drawImage(imagem, 0, 0, tela.width, tela.height);
    return tela;
  } finally {
    URL.revokeObjectURL(endereco);
  }
}

function miniatura(tela: HTMLCanvasElement) {
  const largura = 240;
  const mini = document.createElement("canvas");
  mini.width = largura;
  mini.height = Math.round((tela.height / tela.width) * largura);
  mini.getContext("2d")!.drawImage(tela, 0, 0, mini.width, mini.height);
  return mini.toDataURL("image/jpeg", 0.8);
}

function paraBlob(tela: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolver, rejeitar) =>
    tela.toBlob(
      (blob) => (blob ? resolver(blob) : rejeitar(new Error("Falha ao gerar a imagem."))),
      "image/jpeg",
      0.85
    )
  );
}

export default function EscanearDocumento({
  nomeBase = "documento",
  aoConcluir,
}: {
  /* Começo do nome do PDF (ex.: "crlv"). */
  nomeBase?: string;
  aoConcluir: (arquivo: File) => void;
}) {
  const entrada = useRef<HTMLInputElement>(null);

  const [aberto, setAberto] = useState(false);
  const [foto, setFoto] = useState<HTMLCanvasElement | null>(null);
  const [fotoUrl, setFotoUrl] = useState("");
  const [cantos, setCantos] = useState<Quadrilatero | null>(null);
  const [paginas, setPaginas] = useState<Pagina[]>([]);
  const [realce, setRealce] = useState(true);
  const [trabalhando, setTrabalhando] = useState("");
  const [erro, setErro] = useState("");

  const area = useRef<HTMLDivElement>(null);
  const meio = useRef<HTMLDivElement>(null);
  const [espaco, setEspaco] = useState({ largura: 0, altura: 0 });
  const arrastando = useRef<number | null>(null);
  const proximoId = useRef(1);

  /* Mede o espaço do meio da tela, para a foto caber inteira. */
  useEffect(() => {
    const alvo = meio.current;
    if (!aberto || !alvo) return;

    const observador = new ResizeObserver(([item]) => {
      setEspaco({
        largura: item.contentRect.width,
        altura: item.contentRect.height,
      });
    });

    observador.observe(alvo);
    return () => observador.disconnect();
  }, [aberto]);

  /* A página de trás não rola enquanto o scanner está aberto. */
  useEffect(() => {
    if (!aberto) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = antes;
    };
  }, [aberto]);

  function fotografar() {
    setErro("");
    entrada.current?.click();
  }

  async function aoEscolherFoto(arquivo: File | undefined) {
    if (!arquivo) return;

    setAberto(true);
    setTrabalhando("Abrindo a foto...");

    try {
      const tela = await carregarFoto(arquivo);
      setFoto(tela);
      setFotoUrl(tela.toDataURL("image/jpeg", 0.85));
      setCantos(cantosIniciais(tela.width, tela.height));
    } catch {
      setErro("Não foi possível abrir a foto. Tente de novo.");
    } finally {
      setTrabalhando("");
    }
  }

  /* ---------- arrastar os cantos ---------- */

  function pontoNaFoto(evento: React.PointerEvent): Ponto | null {
    const caixa = area.current?.getBoundingClientRect();
    if (!caixa || !foto) return null;

    const x = ((evento.clientX - caixa.left) / caixa.width) * foto.width;
    const y = ((evento.clientY - caixa.top) / caixa.height) * foto.height;

    return {
      x: Math.min(foto.width, Math.max(0, x)),
      y: Math.min(foto.height, Math.max(0, y)),
    };
  }

  function comecarArrasto(indice: number, evento: React.PointerEvent) {
    arrastando.current = indice;
    (evento.target as Element).setPointerCapture(evento.pointerId);
  }

  function arrastar(evento: React.PointerEvent) {
    if (arrastando.current === null || !cantos) return;
    const ponto = pontoNaFoto(evento);
    if (!ponto) return;

    const novos = [...cantos] as Quadrilatero;
    novos[arrastando.current] = ponto;
    setCantos(novos);
  }

  function soltar() {
    arrastando.current = null;
  }

  /* ---------- usar a página ---------- */

  async function usarPagina() {
    if (!foto || !cantos) return;

    setTrabalhando("Endireitando a página...");

    /* Deixa a mensagem aparecer antes da conta pesada. */
    await new Promise((r) => setTimeout(r, 30));

    try {
      const cor = endireitar(foto, cantos);
      const realcada = realcar(cor);

      setPaginas((atuais) => [
        ...atuais,
        {
          id: proximoId.current++,
          cor,
          realcada,
          miniatura: miniatura(cor),
          miniaturaRealcada: miniatura(realcada),
        },
      ]);

      setFoto(null);
      setFotoUrl("");
      setCantos(null);
    } catch {
      setErro("Não foi possível endireitar a página. Tente de novo.");
    } finally {
      setTrabalhando("");
    }
  }

  function descartarFoto() {
    setFoto(null);
    setFotoUrl("");
    setCantos(null);
    if (paginas.length === 0) fechar();
  }

  function fechar() {
    setAberto(false);
    setFoto(null);
    setFotoUrl("");
    setCantos(null);
    setPaginas([]);
    setErro("");
  }

  /* ---------- o PDF ---------- */

  async function concluir() {
    if (paginas.length === 0) return;

    setTrabalhando("Montando o PDF...");

    try {
      const { PDFDocument } = await import("pdf-lib");
      const pdf = await PDFDocument.create();

      /* Largura de uma folha A4, em pontos. */
      const A4 = 595.28;

      for (const pagina of paginas) {
        const tela = realce ? pagina.realcada : pagina.cor;
        const imagem = await pdf.embedJpg(
          await (await paraBlob(tela)).arrayBuffer()
        );
        const altura = (tela.height / tela.width) * A4;
        const folha = pdf.addPage([A4, altura]);
        folha.drawImage(imagem, { x: 0, y: 0, width: A4, height: altura });
      }

      const bytes = await pdf.save();
      const hoje = new Date().toISOString().slice(0, 10);
      const arquivo = new File(
        [bytes as BlobPart],
        `${nomeBase}-escaneado-${hoje}.pdf`,
        { type: "application/pdf" }
      );

      aoConcluir(arquivo);
      fechar();
    } catch {
      setErro("Não foi possível montar o PDF. Tente de novo.");
    } finally {
      setTrabalhando("");
    }
  }

  /* ---------- tela ---------- */

  /*
   * O tamanho exato da foto na tela: cabe inteira no espaço do
   * meio sem deformar. Os cantos são posicionados em % desta
   * caixa, então ela precisa ter a proporção da foto.
   */
  const caixa = (() => {
    if (!foto || !espaco.largura || !espaco.altura) return null;
    const escala = Math.min(
      espaco.largura / foto.width,
      espaco.altura / foto.height
    );
    return { largura: foto.width * escala, altura: foto.height * escala };
  })();

  const poligono =
    cantos && foto
      ? cantos
          .map((p) => `${(p.x / foto.width) * 100},${(p.y / foto.height) * 100}`)
          .join(" ")
      : "";

  return (
    <>
      <input
        ref={entrada}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          aoEscolherFoto(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={fotografar}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dourado/60 px-4 py-3 text-sm font-semibold text-dourado transition hover:bg-dourado hover:text-preto"
      >
        <ScanLine size={17} />
        Escanear com a câmera
      </button>

      {aberto &&
        createPortal(
          <div
            className="fixed inset-0 flex flex-col bg-[#0b0b0d] text-texto"
            /* Acima do botão "Voltar" flutuante do sistema (99999). */
            style={{ zIndex: 100000 }}
          >
            {/* TOPO */}
            <div className="flex items-center justify-between gap-3 border-b border-grafite-claro px-4 py-3">
              <p className="flex items-center gap-2 font-bold text-dourado">
                <ScanLine size={18} />
                {foto
                  ? "Arraste os cantos até as bordas do papel"
                  : `Documento escaneado · ${paginas.length} ${
                      paginas.length === 1 ? "página" : "páginas"
                    }`}
              </p>

              <button
                type="button"
                onClick={fechar}
                aria-label="Cancelar o scanner"
                className="rounded-lg p-2 text-texto-suave transition hover:text-texto"
              >
                <X size={20} />
              </button>
            </div>

            {erro && (
              <div className="mx-4 mt-3 rounded-lg border border-red-700 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                {erro}
              </div>
            )}

            {/* MEIO */}
            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4">
              <div
                ref={meio}
                className="flex h-full w-full items-center justify-center"
              >
              {foto && cantos && caixa && (
                /*
                 * A foto com os cantos por cima. O SVG usa a mesma
                 * caixa da foto (viewBox 0-100), então os cantos
                 * acompanham a foto em qualquer tamanho de tela.
                 */
                <div
                  ref={area}
                  className="relative touch-none select-none"
                  style={{ width: caixa.largura, height: caixa.altura }}
                  onPointerMove={arrastar}
                  onPointerUp={soltar}
                  onPointerCancel={soltar}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fotoUrl}
                    alt="Foto do documento"
                    draggable={false}
                    className="h-full w-full object-contain"
                  />

                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="pointer-events-none absolute inset-0 h-full w-full"
                  >
                    <polygon
                      points={poligono}
                      fill="rgba(224,177,41,0.15)"
                      stroke="#f3c63f"
                      strokeWidth={2.5}
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>

                  {cantos.map((p, indice) => (
                    <button
                      key={indice}
                      type="button"
                      aria-label={`Canto ${indice + 1}`}
                      onPointerDown={(e) => comecarArrasto(indice, e)}
                      className="absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center"
                      style={{
                        left: `${(p.x / foto.width) * 100}%`,
                        top: `${(p.y / foto.height) * 100}%`,
                      }}
                    >
                      <span className="h-6 w-6 rounded-full border-[3px] border-[#f3c63f] bg-black/50 shadow-[0_0_0_3px_rgba(0,0,0,0.4)]" />
                    </button>
                  ))}
                </div>
              )}

              {!foto && paginas.length > 0 && (
                <div className="grid max-h-full w-full max-w-3xl grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
                  {paginas.map((pagina, indice) => (
                    <figure
                      key={pagina.id}
                      className="relative overflow-hidden rounded-xl border border-grafite-claro bg-white"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={realce ? pagina.miniaturaRealcada : pagina.miniatura}
                        alt={`Página ${indice + 1}`}
                        className="w-full"
                      />

                      <figcaption className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-0.5 text-xs font-bold text-white">
                        {indice + 1}
                      </figcaption>

                      <button
                        type="button"
                        onClick={() =>
                          setPaginas((atuais) =>
                            atuais.filter((item) => item.id !== pagina.id)
                          )
                        }
                        aria-label={`Apagar a página ${indice + 1}`}
                        className="absolute right-2 top-2 rounded-md bg-black/70 p-1.5 text-white transition hover:bg-red-700"
                      >
                        <Trash2 size={15} />
                      </button>
                    </figure>
                  ))}
                </div>
              )}

              {!foto && paginas.length === 0 && !trabalhando && (
                <button
                  type="button"
                  onClick={fotografar}
                  className="inline-flex items-center gap-2 rounded-lg bg-dourado px-5 py-3 font-semibold text-preto"
                >
                  <Camera size={18} />
                  Fotografar o documento
                </button>
              )}

              </div>

              {trabalhando && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                  <p className="flex items-center gap-2 rounded-xl bg-grafite px-5 py-4 text-sm font-semibold">
                    <Loader2 size={18} className="animate-spin text-dourado" />
                    {trabalhando}
                  </p>
                </div>
              )}
            </div>

            {/* BAIXO */}
            <div className="border-t border-grafite-claro px-4 py-3">
              {foto ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={descartarFoto}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-grafite-claro px-4 py-3 text-sm font-semibold"
                  >
                    <RotateCcw size={16} />
                    Descartar
                  </button>

                  <button
                    type="button"
                    onClick={usarPagina}
                    disabled={!!trabalhando}
                    className="inline-flex flex-[2] items-center justify-center gap-2 rounded-lg bg-dourado px-4 py-3 text-sm font-bold text-preto disabled:opacity-60"
                  >
                    <Check size={17} />
                    Usar esta página
                  </button>
                </div>
              ) : paginas.length > 0 ? (
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={realce}
                      onChange={(e) => setRealce(e.target.checked)}
                      className="h-4 w-4 accent-[#d4a514]"
                    />
                    Realçar documento (fundo branco, letra escura)
                  </label>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={fotografar}
                      disabled={!!trabalhando}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-grafite-claro px-4 py-3 text-sm font-semibold disabled:opacity-60"
                    >
                      <Plus size={16} />
                      Mais uma página
                    </button>

                    <button
                      type="button"
                      onClick={concluir}
                      disabled={!!trabalhando}
                      className="inline-flex flex-[2] items-center justify-center gap-2 rounded-lg bg-dourado px-4 py-3 text-sm font-bold text-preto disabled:opacity-60"
                    >
                      <Check size={17} />
                      Concluir ({paginas.length})
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
