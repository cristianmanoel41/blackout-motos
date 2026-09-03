"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatarData } from "@/lib/formatadores/data";
import {
  nomeArquivoSeguro,
  tamanhoLegivel,
} from "@/components/Vistorias";
import {
  ExternalLink,
  FileText,
  Trash2,
  Upload,
} from "lucide-react";

/*
 * Documentos do cliente.
 *
 * Na venda a loja pede o documento e o comprovante de endereço,
 * e essas fotos acabam ficando no celular de alguém. Quando
 * precisa - uma transferência, uma dúvida no contrato -
 * ninguém acha.
 *
 * Aqui cada arquivo fica na ficha do cliente, num espaço
 * privado: abre só por link assinado, gerado na hora para quem
 * está logado.
 */

const supabase = createClient();

const BUCKET = "documentos-clientes";

const TIPOS = [
  { chave: "documento", nome: "Documento (RG / CNH)" },
  {
    chave: "comprovante_endereco",
    nome: "Comprovante de endereço",
  },
  { chave: "outro", nome: "Outro" },
] as const;

/* 20 MB: acima disso quase sempre é foto sem compressão. */
const TAMANHO_MAXIMO = 20 * 1024 * 1024;

const TIPOS_ACEITOS = ".pdf,.jpg,.jpeg,.png,.webp";

type Documento = {
  id: string;
  customer_id: string;
  tipo: string;
  arquivo_path: string;
  arquivo_nome: string;
  arquivo_tipo: string | null;
  tamanho: number | null;
  observacoes: string | null;
  criado_em: string;
};

function nomeDoTipo(chave: string) {
  return (
    TIPOS.find((item) => item.chave === chave)?.nome ||
    "Documento"
  );
}

export default function DocumentosCliente({
  customerId,
}: {
  customerId: string;
}) {
  const [documentos, setDocumentos] = useState<Documento[]>(
    []
  );

  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [abrindo, setAbrindo] = useState("");
  const [erro, setErro] = useState("");

  const [tipo, setTipo] = useState<string>("documento");
  const [observacoes, setObservacoes] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  async function carregar() {
    setCarregando(true);
    setErro("");

    const { data, error } = await supabase
      .from("customer_documents")
      .select("*")
      .eq("customer_id", customerId)
      .order("criado_em", { ascending: false });

    if (error) {
      setErro(
        `Não foi possível carregar os documentos: ${error.message}`
      );

      setCarregando(false);
      return;
    }

    setDocumentos((data as Documento[]) || []);
    setCarregando(false);
  }

  async function enviar() {
    setErro("");

    if (!arquivo) {
      setErro("Escolha o arquivo.");
      return;
    }

    if (arquivo.size > TAMANHO_MAXIMO) {
      setErro(
        `O arquivo tem ${tamanhoLegivel(
          arquivo.size
        )}. O limite é 20 MB.`
      );
      return;
    }

    setEnviando(true);

    const caminho = `${customerId}/${tipo}-${Date.now()}-${nomeArquivoSeguro(
      arquivo.name
    )}`;

    const { error: erroUpload } = await supabase.storage
      .from(BUCKET)
      .upload(caminho, arquivo, {
        contentType: arquivo.type || undefined,
        upsert: false,
      });

    if (erroUpload) {
      setEnviando(false);

      setErro(
        `Falha ao enviar: ${erroUpload.message}`
      );

      return;
    }

    const { error: erroRegistro } = await supabase
      .from("customer_documents")
      .insert({
        customer_id: customerId,
        tipo,
        arquivo_path: caminho,
        arquivo_nome: arquivo.name,
        arquivo_tipo: arquivo.type || null,
        tamanho: arquivo.size,
        observacoes: observacoes.trim() || null,
      });

    setEnviando(false);

    if (erroRegistro) {
      /* Não deixa arquivo órfão no Storage. */
      await supabase.storage
        .from(BUCKET)
        .remove([caminho]);

      setErro(
        `Falha ao registrar: ${erroRegistro.message}`
      );

      return;
    }

    setArquivo(null);
    setObservacoes("");

    await carregar();
  }

  /*
   * O bucket é privado, então o arquivo só abre por um link
   * assinado, criado na hora e válido por poucos minutos.
   */
  async function abrir(documento: Documento) {
    setErro("");
    setAbrindo(documento.id);

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(documento.arquivo_path, 300);

    setAbrindo("");

    if (error || !data?.signedUrl) {
      setErro(
        `Não foi possível abrir: ${
          error?.message || "link não gerado"
        }`
      );

      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  async function remover(documento: Documento) {
    const confirmar = window.confirm(
      `Remover ${documento.arquivo_nome}?`
    );

    if (!confirmar) return;

    setErro("");

    await supabase.storage
      .from(BUCKET)
      .remove([documento.arquivo_path]);

    const { error } = await supabase
      .from("customer_documents")
      .delete()
      .eq("id", documento.id);

    if (error) {
      setErro(
        `Não foi possível remover: ${error.message}`
      );

      return;
    }

    await carregar();
  }

  const campoClass =
    "w-full rounded-lg border border-grafite-claro bg-grafite px-3 py-2.5 text-sm text-texto outline-none transition focus:border-dourado";

  return (
    <div className="rounded-xl border border-grafite-claro bg-grafite p-5">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 font-semibold text-dourado">
          <FileText size={18} />
          Documentos do cliente
        </h2>

        <p className="mt-1 text-xs text-texto-suave">
          Documento e comprovante de endereço. Ficam guardados
          aqui e abrem só para quem está logado.
        </p>
      </div>

      {erro && (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {erro}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-[1fr_1.2fr_auto]">
        <div>
          <label className="mb-1 block text-xs text-texto-suave">
            Tipo
          </label>

          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className={campoClass}
          >
            {TIPOS.map((item) => (
              <option key={item.chave} value={item.chave}>
                {item.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-texto-suave">
            Arquivo
          </label>

          <input
            type="file"
            accept={TIPOS_ACEITOS}
            onChange={(e) =>
              setArquivo(e.target.files?.[0] || null)
            }
            className="w-full rounded-lg border border-grafite-claro bg-grafite px-3 py-2 text-sm text-texto file:mr-3 file:rounded-md file:border-0 file:bg-dourado file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-preto"
          />
        </div>

        <div className="flex items-end">
          <button
            type="button"
            disabled={enviando}
            onClick={enviar}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-dourado px-4 py-2.5 text-sm font-semibold text-preto transition hover:bg-dourado-claro disabled:opacity-50 md:w-auto"
          >
            <Upload size={16} />
            {enviando ? "Enviando..." : "Anexar"}
          </button>
        </div>
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-xs text-texto-suave">
          Observações (opcional)
        </label>

        <input
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          placeholder="Ex.: conta de luz de agosto"
          className={campoClass}
        />
      </div>

      <div className="mt-5">
        {carregando ? (
          <p className="text-sm text-texto-suave">
            Carregando...
          </p>
        ) : documentos.length === 0 ? (
          <p className="text-sm text-texto-suave">
            Nenhum documento anexado ainda.
          </p>
        ) : (
          <div className="space-y-2">
            {documentos.map((documento) => (
              <div
                key={documento.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-grafite-claro bg-preto/30 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-texto">
                    {nomeDoTipo(documento.tipo)}
                  </p>

                  <p className="text-xs text-texto-suave">
                    {documento.arquivo_nome}
                    {documento.tamanho
                      ? ` · ${tamanhoLegivel(
                          documento.tamanho
                        )}`
                      : ""}{" "}
                    · {formatarData(documento.criado_em)}
                  </p>

                  {documento.observacoes && (
                    <p className="mt-1 text-xs text-texto-suave">
                      {documento.observacoes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={abrindo === documento.id}
                    onClick={() => abrir(documento)}
                    className="inline-flex items-center gap-1 rounded-lg border border-grafite-claro px-3 py-1.5 text-xs font-semibold text-texto transition hover:border-dourado hover:text-dourado disabled:opacity-50"
                  >
                    <ExternalLink size={13} />
                    {abrindo === documento.id
                      ? "Abrindo..."
                      : "Abrir"}
                  </button>

                  <button
                    type="button"
                    onClick={() => remover(documento)}
                    className="rounded-lg border border-grafite-claro p-1.5 text-red-300 transition hover:border-red-700 hover:bg-red-950/30"
                    aria-label="Remover documento"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
