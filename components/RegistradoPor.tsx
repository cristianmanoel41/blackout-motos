"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserRound } from "lucide-react";

/*
 * Mostra quem cadastrou e quem alterou um registro por último.
 *
 * As colunas created_by / updated_by / atualizado_em são
 * preenchidas por gatilho no banco, então valem para qualquer
 * registro criado depois da migration 0004. Registro antigo
 * não tem autor, e aí o componente não aparece.
 */

const supabase = createClient();

type Registro = {
  created_by?: string | null;
  updated_by?: string | null;
  atualizado_em?: string | null;
  criado_em?: string | null;
};

function dataHora(valor: string | null | undefined) {
  if (!valor) return "";

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) return "";

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

export default function RegistradoPor({
  registro,
}: {
  registro: Registro | null | undefined;
}) {
  const [nomes, setNomes] = useState<
    Record<string, string>
  >({});

  const criadoPor = registro?.created_by || "";
  const alteradoPor = registro?.updated_by || "";

  useEffect(() => {
    const ids = Array.from(
      new Set([criadoPor, alteradoPor].filter(Boolean))
    );

    if (ids.length === 0) return;

    let cancelado = false;

    async function carregar() {
      const { data } = await supabase
        .from("profiles")
        .select("id, nome")
        .in("id", ids);

      if (cancelado || !data) return;

      setNomes(
        Object.fromEntries(
          data.map((perfil: any) => [
            perfil.id,
            perfil.nome || "Usuário",
          ])
        )
      );
    }

    carregar();

    return () => {
      cancelado = true;
    };
  }, [criadoPor, alteradoPor]);

  if (!criadoPor && !alteradoPor) {
    return null;
  }

  const nomeCriou = nomes[criadoPor] || "carregando...";
  const nomeAlterou = nomes[alteradoPor] || "";

  const houveAlteracao =
    alteradoPor && alteradoPor !== criadoPor;

  return (
    <p className="flex flex-wrap items-center gap-1.5 text-xs text-texto-suave">
      <UserRound size={13} />

      {criadoPor && (
        <span>
          Registrado por{" "}
          <strong className="text-texto">
            {nomeCriou}
          </strong>
          {registro?.criado_em
            ? ` em ${dataHora(registro.criado_em)}`
            : ""}
        </span>
      )}

      {houveAlteracao && (
        <span>
          · alterado por{" "}
          <strong className="text-texto">
            {nomeAlterou || "outro usuário"}
          </strong>
          {registro?.atualizado_em
            ? ` em ${dataHora(registro.atualizado_em)}`
            : ""}
        </span>
      )}
    </p>
  );
}
