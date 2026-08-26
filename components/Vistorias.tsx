"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatarData } from "@/lib/formatadores/data";
import {
  ClipboardCheck,
  ExternalLink,
  Trash2,
  Upload,
} from "lucide-react";

const supabase = createClient();

export const BUCKET_VISTORIAS = "vistorias";

export const TIPOS_VISTORIA = [
  { chave: "cautelar", nome: "Vistoria cautelar" },
  {
    chave: "transferencia",
    nome: "Vistoria de transferência",
  },
] as const;

export type TipoVistoria =
  (typeof TIPOS_VISTORIA)[number]["chave"];

/* 20 MB: acima disso o arquivo quase sempre é foto sem compressão. */
const TAMANHO_MAXIMO = 20 * 1024 * 1024;

export const TIPOS_ACEITOS =
  ".pdf,.jpg,.jpeg,.png,.webp";

type Vistoria = {
  id: string;
  motorcycle_id: string;
  sale_id: string | null;
  tipo: TipoVistoria;
  data: string;
  arquivo_path: string;
  arquivo_nome: string;
  arquivo_tipo: string | null;
  tamanho: number | null;
  observacoes: string | null;
};

function hoje() {
  const data = new Date();
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

export function tamanhoLegivel(bytes: number | null) {
  if (!bytes) return "";

  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/*
 * Nome de arquivo seguro para o Storage: sem acento,
 * sem espaço e sem caractere especial.
 */
export function nomeArquivoSeguro(nome: string) {
  return (
    nome
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9.]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "arquivo"
  );
}

/*
 * Sobe o arquivo e grava a vistoria. Usado aqui e também
 * pela tela de venda, que anexa a vistoria de transferência
 * logo depois de criar a venda.
 */
export async function enviarVistoria({
  arquivo,
  motorcycleId,
  saleId,
  tipo,
  data,
  observacoes,
}: {
  arquivo: File;
  motorcycleId: string;
  saleId?: string | null;
  tipo: TipoVistoria;
  data: string;
  observacoes?: string;
}) {
  if (arquivo.size > TAMANHO_MAXIMO) {
    throw new Error(
      `O arquivo tem ${tamanhoLegivel(
        arquivo.size
      )}. O limite é 20 MB.`
    );
  }

  const caminho = `${motorcycleId}/${tipo}-${Date.now()}-${nomeArquivoSeguro(
    arquivo.name
  )}`;

  const { error: erroUpload } = await supabase.storage
    .from(BUCKET_VISTORIAS)
    .upload(caminho, arquivo, {
      contentType: arquivo.type || undefined,
      upsert: false,
    });

  if (erroUpload) {
    throw new Error(
      `Falha ao enviar o arquivo: ${erroUpload.message}`
    );
  }

  const { error: erroRegistro } = await supabase
    .from("motorcycle_inspections")
    .insert({
      motorcycle_id: motorcycleId,
      sale_id: saleId || null,
      tipo,
      data,
      arquivo_path: caminho,
      arquivo_nome: arquivo.name,
      arquivo_tipo: arquivo.type || null,
      tamanho: arquivo.size,
      observacoes: observacoes?.trim() || null,
    });

  if (erroRegistro) {
    /* Não deixa arquivo órfão no Storage. */
    await supabase.storage
      .from(BUCKET_VISTORIAS)
      .remove([caminho]);

    throw new Error(
      `Falha ao registrar a vistoria: ${erroRegistro.message}`
    );
  }
}

export default function Vistorias({
  motorcycleId,
  saleId,
  titulo = "Vistorias",
  descricao = "Guarde aqui a vistoria cautelar e a de transferência desta moto.",
}: {
  motorcycleId: string;
  saleId?: string | null;
  titulo?: string;
  descricao?: string;
}) {
  const [vistorias, setVistorias] = useState<Vistoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [abrindo, setAbrindo] = useState("");

  const [tipo, setTipo] =
    useState<TipoVistoria>("cautelar");
  const [data, setData] = useState(hoje());
  const [observacoes, setObservacoes] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motorcycleId]);

  async function carregar() {
    setCarregando(true);
    setErro("");

    const { data: lista, error } = await supabase
      .from("motorcycle_inspections")
      .select("*")
      .eq("motorcycle_id", motorcycleId)
      .order("data", { ascending: false })
      .order("criado_em", { ascending: false });

    if (error) {
      setErro(
        `Não foi possível carregar as vistorias: ${error.message}`
      );
      setCarregando(false);
      return;
    }

    setVistorias((lista as Vistoria[]) || []);
    setCarregando(false);
  }

  const ultimaTransferencia = useMemo(() => {
    return vistorias.find(
      (item) => item.tipo === "transferencia"
    );
  }, [vistorias]);

  async function enviar() {
    setErro("");

    if (!arquivo) {
      setErro("Escolha o arquivo da vistoria.");
      return;
    }

    setEnviando(true);

    try {
      await enviarVistoria({
        arquivo,
        motorcycleId,
        saleId,
        tipo,
        data,
        observacoes,
      });

      setArquivo(null);
      setObservacoes("");
      await carregar();
    } catch (e: any) {
      console.error(e);
      setErro(
        e?.message || "Não foi possível anexar a vistoria."
      );
    } finally {
      setEnviando(false);
    }
  }

  async function abrir(vistoria: Vistoria) {
    setAbrindo(vistoria.id);
    setErro("");

    const { data: assinado, error } = await supabase.storage
      .from(BUCKET_VISTORIAS)
      .createSignedUrl(vistoria.arquivo_path, 120);

    setAbrindo("");

    if (error || !assinado?.signedUrl) {
      setErro(
        `Não foi possível abrir o arquivo: ${
          error?.message || "link não gerado"
        }`
      );
      return;
    }

    window.open(
      assinado.signedUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function excluir(vistoria: Vistoria) {
    const confirmar = window.confirm(
      `Excluir a ${
        vistoria.tipo === "cautelar"
          ? "vistoria cautelar"
          : "vistoria de transferência"
      } de ${formatarData(vistoria.data)}?`
    );

    if (!confirmar) return;

    setErro("");

    const { error } = await supabase
      .from("motorcycle_inspections")
      .delete()
      .eq("id", vistoria.id);

    if (error) {
      setErro(
        `Não foi possível excluir: ${error.message}`
      );
      return;
    }

    await supabase.storage
      .from(BUCKET_VISTORIAS)
      .remove([vistoria.arquivo_path]);

    await carregar();
  }

  const inputClass =
    "w-full rounded-lg border border-grafite-claro bg-grafite-claro px-4 py-3 text-texto outline-none transition focus:border-dourado";

  const labelClass =
    "mb-1 block text-sm font-medium text-texto";

  return (
    <section className="rounded-2xl border border-grafite-claro bg-grafite p-5 md:p-8">
      <div className="mb-6 border-b border-grafite-claro pb-4">
        <h2 className="flex items-center gap-2 text-xl font-bold text-dourado">
          <ClipboardCheck size={20} />
          {titulo}
        </h2>

        <p className="mt-1 text-sm text-texto-suave">
          {descricao}
        </p>
      </div>

      {erro && (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {erro}
        </div>
      )}

      {/* LISTA */}

      {carregando && (
        <p className="text-sm text-texto-suave">
          Carregando vistorias...
        </p>
      )}

      {!carregando && vistorias.length === 0 && (
        <div className="rounded-xl border border-grafite-claro bg-preto/40 p-5 text-sm text-texto-suave">
          Nenhuma vistoria anexada nesta moto.
        </div>
      )}

      {vistorias.length > 0 && (
        <div className="space-y-2">
          {vistorias.map((vistoria) => {
            const ehTransferencia =
              vistoria.tipo === "transferencia";

            const ehUltima =
              ehTransferencia &&
              ultimaTransferencia?.id === vistoria.id;

            return (
              <div
                key={vistoria.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-grafite-claro bg-preto/40 p-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-lg border px-2 py-1 text-xs font-semibold ${
                        ehTransferencia
                          ? "border-sky-700 bg-sky-950/40 text-sky-300"
                          : "border-purple-700 bg-purple-950/40 text-purple-300"
                      }`}
                    >
                      {ehTransferencia
                        ? "Transferência"
                        : "Cautelar"}
                    </span>

                    {ehUltima && (
                      <span className="rounded-lg border border-green-700 bg-green-950/40 px-2 py-1 text-xs font-semibold text-green-300">
                        Mais recente
                      </span>
                    )}

                    <span className="text-sm text-texto-suave">
                      {formatarData(vistoria.data)}
                    </span>
                  </div>

                  <p className="mt-1 truncate text-sm text-texto">
                    {vistoria.arquivo_nome}

                    {vistoria.tamanho ? (
                      <span className="text-texto-suave">
                        {" "}
                        ·{" "}
                        {tamanhoLegivel(vistoria.tamanho)}
                      </span>
                    ) : null}
                  </p>

                  {vistoria.observacoes && (
                    <p className="mt-1 text-xs text-texto-suave">
                      {vistoria.observacoes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => abrir(vistoria)}
                    disabled={abrindo === vistoria.id}
                    className="inline-flex items-center gap-2 rounded-lg border border-dourado px-3 py-2 text-xs font-semibold text-dourado transition hover:bg-dourado hover:text-preto disabled:opacity-50"
                  >
                    <ExternalLink size={14} />
                    {abrindo === vistoria.id
                      ? "Abrindo..."
                      : "Abrir"}
                  </button>

                  <button
                    type="button"
                    onClick={() => excluir(vistoria)}
                    className="rounded-lg border border-grafite-claro p-2 text-red-300 transition hover:border-red-700 hover:bg-red-950/40"
                    aria-label="Excluir vistoria"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ANEXAR */}

      <div className="mt-6 rounded-xl border border-grafite-claro bg-preto/40 p-4">
        <p className="mb-4 text-sm font-semibold text-texto">
          Anexar vistoria
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Tipo</label>

            <select
              value={tipo}
              onChange={(e) =>
                setTipo(e.target.value as TipoVistoria)
              }
              className={inputClass}
            >
              {TIPOS_VISTORIA.map((item) => (
                <option
                  key={item.chave}
                  value={item.chave}
                >
                  {item.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              Data da vistoria
            </label>

            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>
              Arquivo (PDF ou foto, até 20 MB)
            </label>

            <input
              type="file"
              accept={TIPOS_ACEITOS}
              onChange={(e) =>
                setArquivo(e.target.files?.[0] || null)
              }
              className="w-full rounded-lg border border-grafite-claro bg-grafite-claro px-4 py-3 text-sm text-texto file:mr-4 file:rounded-lg file:border-0 file:bg-dourado file:px-4 file:py-2 file:text-sm file:font-semibold file:text-preto"
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>Observações</label>

            <input
              value={observacoes}
              onChange={(e) =>
                setObservacoes(e.target.value)
              }
              placeholder="Opcional"
              className={inputClass}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={enviar}
          disabled={enviando || !arquivo}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-dourado px-6 py-3 text-sm font-semibold text-preto transition hover:bg-dourado-claro disabled:opacity-50"
        >
          <Upload size={16} />
          {enviando ? "Enviando..." : "Anexar vistoria"}
        </button>
      </div>
    </section>
  );
}
