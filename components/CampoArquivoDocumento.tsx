"use client";

import { useRef } from "react";
import { FileText, Upload, X } from "lucide-react";
import { TIPOS_ACEITOS, tamanhoLegivel } from "@/components/Vistorias";

/*
 * Campo para escolher um documento (CRLV, CNH) num formulário.
 *
 * Só guarda o arquivo escolhido; quem envia é o formulário, na
 * hora de salvar - antes disso ainda não existe a moto ou o
 * cliente onde o arquivo vai ficar.
 */
export default function CampoArquivoDocumento({
  label,
  ajuda,
  arquivo,
  aoEscolher,
}: {
  label: string;
  ajuda?: string;
  arquivo: File | null;
  aoEscolher: (arquivo: File | null) => void;
}) {
  const entrada = useRef<HTMLInputElement>(null);

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-texto">
        {label}
      </span>

      <input
        ref={entrada}
        type="file"
        accept={TIPOS_ACEITOS}
        className="hidden"
        onChange={(e) => {
          aoEscolher(e.target.files?.[0] || null);
          /* Limpa para escolher o mesmo arquivo de novo depois
             de remover. */
          e.target.value = "";
        }}
      />

      {arquivo ? (
        <div className="flex items-center gap-2 rounded-lg border border-grafite-claro bg-grafite-claro px-4 py-3 text-sm text-texto">
          <FileText size={16} className="shrink-0 text-dourado" />

          <span className="min-w-0 flex-1 truncate">
            {arquivo.name}
          </span>

          <span className="shrink-0 text-xs text-texto-suave">
            {tamanhoLegivel(arquivo.size)}
          </span>

          <button
            type="button"
            onClick={() => aoEscolher(null)}
            aria-label={`Remover ${label}`}
            className="shrink-0 rounded p-1 text-texto-suave transition hover:text-red-400"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-grafite-claro px-4 py-3 text-sm font-semibold text-texto transition hover:border-dourado hover:text-dourado"
        >
          <Upload size={16} />
          Escolher arquivo (foto ou PDF)
        </button>
      )}

      {ajuda && (
        <p className="mt-1 text-xs text-texto-suave">{ajuda}</p>
      )}
    </div>
  );
}
