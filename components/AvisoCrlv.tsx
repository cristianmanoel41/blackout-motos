"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  conferirCrlv,
  type ItemDaConferencia,
  type LeituraDoCrlv,
  type MotoParaConferir,
} from "@/lib/documentos/crlv";

const supabase = createClient();

/*
 * O AVISO NA HORA DE IMPRIMIR
 *
 * A conferência mora na ficha da moto, mas o momento em que um
 * dado errado vira problema é este: o contrato na tela, pronto
 * para imprimir. Se o cadastro não bate com o CRLV, o aviso
 * aparece aqui em cima, com o que está diferente e o link para
 * corrigir.
 *
 * Só aparece quando há diferença. Sem CRLV, ou com tudo
 * conferido, a tela fica como sempre foi.
 */
export default function AvisoCrlv({
  motoId,
  vendaId,
}: {
  motoId?: string;
  vendaId?: string;
}) {
  const [diferentes, setDiferentes] = useState<
    ItemDaConferencia[]
  >([]);
  const [idDaMoto, setIdDaMoto] = useState("");

  useEffect(() => {
    conferir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motoId, vendaId]);

  async function conferir() {
    let id = motoId || "";

    if (!id && vendaId) {
      const { data: venda } = await supabase
        .from("sales")
        .select("motorcycle_id")
        .eq("id", vendaId)
        .maybeSingle();

      id = venda?.motorcycle_id || "";
    }

    if (!id) return;

    const [{ data: moto }, { data: anexo }] = await Promise.all([
      supabase
        .from("motorcycles")
        .select(
          "placa, renavam, chassi, marca, modelo, versao, cor, ano_fabricacao, ano_modelo"
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("motorcycle_inspections")
        .select("leitura")
        .eq("motorcycle_id", id)
        .eq("tipo", "crlv")
        .order("data", { ascending: false })
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const leitura = anexo?.leitura as LeituraDoCrlv | null;

    if (!moto || !leitura) return;

    setIdDaMoto(id);
    setDiferentes(
      conferirCrlv(moto as MotoParaConferir, leitura.dados).filter(
        (item) => item.situacao === "diferente"
      )
    );
  }

  if (!diferentes.length) return null;

  return (
    <div className="no-print mx-auto mb-6 max-w-[21cm] px-4">
      <div className="rounded-xl border border-red-700 bg-red-950/40 p-5 text-sm text-red-200">
        <p className="flex items-center gap-2 font-bold text-red-300">
          <CircleAlert size={18} />
          {diferentes.length === 1
            ? "1 dado da moto não bate com o CRLV"
            : `${diferentes.length} dados da moto não batem com o CRLV`}
        </p>

        <ul className="mt-2 space-y-1">
          {diferentes.map((item) => (
            <li key={item.campo}>
              <strong>{item.nome}:</strong> no cadastro{" "}
              <span className="font-mono">{item.cadastro}</span>,
              no CRLV{" "}
              <span className="font-mono">{item.documento}</span>
            </li>
          ))}
        </ul>

        <p className="mt-3">
          O documento sai com o dado do cadastro.{" "}
          <Link
            href={`/motos/${idDaMoto}`}
            className="font-semibold text-red-100 underline"
          >
            Corrigir na ficha da moto
          </Link>{" "}
          antes de imprimir.
        </p>
      </div>
    </div>
  );
}
