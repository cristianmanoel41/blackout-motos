"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  nomeArquivoSeguro,
  tamanhoLegivel,
} from "@/components/Vistorias";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Star,
  Trash2,
  Upload,
} from "lucide-react";

/*
 * Fotos da moto.
 *
 * Hoje elas vivem no celular de quem tirou, e na hora de
 * anunciar alguem tem que caçar na galeria. Aqui ficam na
 * ficha da moto, em ordem, com uma marcada como capa - que e
 * a que representa a moto na vitrine.
 */

const supabase = createClient();

const BUCKET = "fotos-motos";

/*
 * Video de celular e pesado: 30 segundos em 1080p passam de 50
 * MB. O balde aceita ate 200, entao a tela segue o mesmo teto.
 */
const TAMANHO_MAXIMO = 200 * 1024 * 1024;

const TIPOS_ACEITOS =
  ".jpg,.jpeg,.png,.webp,.mp4,.mov,.webm";

function ehVideo(foto: { arquivo_tipo?: string | null; arquivo_nome?: string }) {
  if (foto.arquivo_tipo) {
    return foto.arquivo_tipo.startsWith("video/");
  }

  return /\.(mp4|mov|webm)$/i.test(
    foto.arquivo_nome || ""
  );
}

type Foto = {
  id: string;
  motorcycle_id: string;
  arquivo_path: string;
  arquivo_nome: string;
  arquivo_tipo: string | null;
  tamanho: number | null;
  principal: boolean;
  url: string;
  ordem: number;
  legenda: string | null;
};

export default function FotosMoto({
  motorcycleId,
}: {
  motorcycleId: string;
}) {
  const [fotos, setFotos] = useState<Foto[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motorcycleId]);

  async function carregar() {
    setCarregando(true);

    const { data, error } = await supabase
      .from("motorcycle_photos")
      .select("*")
      .eq("motorcycle_id", motorcycleId)
      .order("ordem", { ascending: true })
      .order("criado_em", { ascending: true });

    if (error) {
      setErro(
        `Não foi possível carregar as fotos: ${error.message}`
      );

      setCarregando(false);
      return;
    }

    setFotos((data as Foto[]) || []);
    setCarregando(false);
  }

  function enderecoDe(foto: Foto) {
    if (foto.url) return foto.url;

    /* Linha antiga sem o endereco gravado. */
    return supabase.storage
      .from(BUCKET)
      .getPublicUrl(foto.arquivo_path).data.publicUrl;
  }

  /* Aceita várias de uma vez: ninguém sobe foto de moto uma a uma. */
  async function enviar(lista: FileList | null) {
    if (!lista || lista.length === 0) return;

    setErro("");
    setEnviando(true);

    const arquivos = Array.from(lista);

    /* Continua de onde a ordem parou. */
    let proximaOrdem =
      fotos.reduce(
        (maior, foto) => Math.max(maior, foto.ordem),
        0
      ) + 1;

    let temCapa = fotos.some((foto) => foto.principal);
    const falhas: string[] = [];

    for (let i = 0; i < arquivos.length; i++) {
      const arquivo = arquivos[i];

      setProgresso(
        `Enviando ${i + 1} de ${arquivos.length}...`
      );

      if (arquivo.size > TAMANHO_MAXIMO) {
        falhas.push(
          `${arquivo.name} tem ${tamanhoLegivel(
            arquivo.size
          )}, acima do limite de 200 MB`
        );

        continue;
      }

      const caminho = `${motorcycleId}/${Date.now()}-${i}-${nomeArquivoSeguro(
        arquivo.name
      )}`;

      const { error: erroUpload } = await supabase.storage
        .from(BUCKET)
        .upload(caminho, arquivo, {
          contentType: arquivo.type || undefined,
          upsert: false,
        });

      if (erroUpload) {
        falhas.push(
          `${arquivo.name}: ${erroUpload.message}`
        );

        continue;
      }

      const publicUrl = supabase.storage
        .from(BUCKET)
        .getPublicUrl(caminho).data.publicUrl;

      const arquivoEhVideo = (arquivo.type || "").startsWith(
        "video/"
      );

      const { error: erroRegistro } = await supabase
        .from("motorcycle_photos")
        .insert({
          motorcycle_id: motorcycleId,
          arquivo_path: caminho,
          arquivo_nome: arquivo.name,
          arquivo_tipo: arquivo.type || null,
          tamanho: arquivo.size,
          /*
           * A capa representa a moto na lista e na vitrine, e
           * ali so cabe imagem - video nao vira miniatura.
           */
          principal: !temCapa && !arquivoEhVideo,
          url: publicUrl,
          ordem: proximaOrdem,
        });

      if (erroRegistro) {
        /* Não deixa arquivo órfão no Storage. */
        await supabase.storage
          .from(BUCKET)
          .remove([caminho]);

        falhas.push(
          `${arquivo.name}: ${erroRegistro.message}`
        );

        continue;
      }

      if (!temCapa && !arquivoEhVideo) temCapa = true;
      proximaOrdem++;
    }

    setEnviando(false);
    setProgresso("");

    if (falhas.length > 0) {
      setErro(falhas.join(" · "));
    }

    await carregar();
  }

  async function definirCapa(foto: Foto) {
    if (foto.principal) return;

    setErro("");

    /*
     * O banco só aceita uma capa por moto, então a atual tem
     * que sair antes da nova entrar.
     */
    const atual = fotos.find((item) => item.principal);

    if (atual) {
      const { error } = await supabase
        .from("motorcycle_photos")
        .update({ principal: false })
        .eq("id", atual.id);

      if (error) {
        setErro(
          `Não foi possível trocar a capa: ${error.message}`
        );

        return;
      }
    }

    const { error } = await supabase
      .from("motorcycle_photos")
      .update({ principal: true })
      .eq("id", foto.id);

    if (error) {
      setErro(
        `Não foi possível marcar a capa: ${error.message}`
      );
    }

    await carregar();
  }

  /* Troca esta foto de lugar com a vizinha. */
  async function mover(foto: Foto, direcao: -1 | 1) {
    const posicao = fotos.findIndex(
      (item) => item.id === foto.id
    );

    const vizinha = fotos[posicao + direcao];

    if (!vizinha) return;

    setErro("");

    const { error } = await supabase
      .from("motorcycle_photos")
      .upsert([
        { id: foto.id, ordem: vizinha.ordem },
        { id: vizinha.id, ordem: foto.ordem },
      ]);

    if (error) {
      setErro(
        `Não foi possível reordenar: ${error.message}`
      );
    }

    await carregar();
  }

  async function remover(foto: Foto) {
    const confirmar = window.confirm(
      "Apagar esta foto? Não dá para desfazer."
    );

    if (!confirmar) return;

    setErro("");

    await supabase.storage
      .from(BUCKET)
      .remove([foto.arquivo_path]);

    const { data: apagadas, error } = await supabase
      .from("motorcycle_photos")
      .delete()
      .eq("id", foto.id)
      .select("id");

    if (error || !apagadas?.length) {
      setErro(
        `Não foi possível apagar: ${
          error?.message || "sem permissão"
        }`
      );

      return;
    }

    await carregar();
  }

  return (
    <div className="rounded-xl border border-grafite-claro bg-grafite p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-dourado">
            <Camera size={18} />
            Fotos e vídeos da moto
          </h2>

          <p className="mt-1 text-xs text-texto-suave">
            A primeira foto vira a capa. Use as setas para
            ordenar — é essa ordem que vale no anúncio. Vídeo é
            o que rende no TikTok.
          </p>
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-dourado px-4 py-2.5 text-sm font-semibold text-preto transition hover:opacity-90">
          <Upload size={16} />
          {enviando
            ? progresso || "Enviando..."
            : "Adicionar fotos ou vídeo"}

          <input
            type="file"
            accept={TIPOS_ACEITOS}
            multiple
            disabled={enviando}
            onChange={(evento) => {
              enviar(evento.target.files);
              evento.target.value = "";
            }}
            className="hidden"
          />
        </label>
      </div>

      {erro && (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {erro}
        </div>
      )}

      {carregando ? (
        <p className="py-6 text-center text-sm text-texto-suave">
          Carregando...
        </p>
      ) : fotos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-grafite-claro px-4 py-10 text-center">
          <Camera
            size={28}
            className="mx-auto text-texto-suave"
          />

          <p className="mt-3 text-sm text-texto-suave">
            Nada aqui ainda. Suba várias de uma vez — fotos e
            vídeos.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fotos.map((foto, indice) => (
            <div
              key={foto.id}
              className="overflow-hidden rounded-lg border border-grafite-claro bg-preto/40"
            >
              <div className="relative">
                {ehVideo(foto) ? (
                  <video
                    src={enderecoDe(foto)}
                    controls
                    preload="metadata"
                    className="h-44 w-full bg-black object-contain"
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={enderecoDe(foto)}
                    alt={foto.legenda || foto.arquivo_nome}
                    className="h-44 w-full object-cover"
                  />
                )}

                {ehVideo(foto) && (
                  <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[10px] font-bold text-white">
                    Vídeo
                  </span>
                )}

                {foto.principal && (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-dourado px-2 py-1 text-[10px] font-bold text-preto">
                    <Star size={11} />
                    Capa
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={indice === 0}
                    onClick={() => mover(foto, -1)}
                    aria-label="Mover para trás"
                    className="rounded border border-grafite-claro p-1.5 text-texto-suave transition hover:border-dourado hover:text-dourado disabled:opacity-30"
                  >
                    <ArrowLeft size={13} />
                  </button>

                  <button
                    type="button"
                    disabled={indice === fotos.length - 1}
                    onClick={() => mover(foto, 1)}
                    aria-label="Mover para frente"
                    className="rounded border border-grafite-claro p-1.5 text-texto-suave transition hover:border-dourado hover:text-dourado disabled:opacity-30"
                  >
                    <ArrowRight size={13} />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  {!foto.principal && !ehVideo(foto) && (
                    <button
                      type="button"
                      onClick={() => definirCapa(foto)}
                      className="rounded border border-grafite-claro px-2 py-1.5 text-[11px] font-semibold text-texto-suave transition hover:border-dourado hover:text-dourado"
                    >
                      Usar como capa
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => remover(foto)}
                    aria-label="Apagar foto"
                    className="rounded border border-grafite-claro p-1.5 text-red-300 transition hover:border-red-700 hover:bg-red-950/30"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
