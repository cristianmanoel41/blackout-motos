"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/*
 * O botão "Conferido" do quadro de licenciamento.
 *
 * Grava na moto o ano do licenciamento que a loja acabou de
 * conferir; o painel recarrega e a moto sai da lista até o
 * vencimento do ano seguinte.
 *
 * Com desfazer, faz o contrário: apaga a conferência e a moto
 * volta para a lista (para o clique sem querer).
 */
export default function MarcarLicenciado({
  motoId,
  ano,
  desfazer = false,
}: {
  motoId: string;
  ano: number;
  desfazer?: boolean;
}) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function marcar() {
    setErro("");
    setSalvando(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("motorcycles")
      .update(
        desfazer
          ? {
              licenciamento_conferido_ano: null,
              licenciamento_conferido_em: null,
              licenciamento_conferido_por: null,
            }
          : {
              licenciamento_conferido_ano: ano,
              licenciamento_conferido_em: new Date().toISOString(),
              licenciamento_conferido_por: user?.id ?? null,
            }
      )
      .eq("id", motoId);

    setSalvando(false);

    if (error) {
      console.error(error);
      setErro("Não salvou. Tente de novo.");
      return;
    }

    router.refresh();
  }

  if (desfazer) {
    return (
      <span className="flex items-center gap-2">
        {erro && <span className="text-[11px] font-bold text-red-400">{erro}</span>}
        <button
          type="button"
          onClick={marcar}
          disabled={salvando}
          className="shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-black text-black/50 transition hover:text-[#f0c640] disabled:opacity-50"
        >
          {salvando ? "Voltando…" : "Voltar para a lista"}
        </button>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2">
      {erro && <span className="text-[11px] font-bold text-red-400">{erro}</span>}
      <button
        type="button"
        onClick={marcar}
        disabled={salvando}
        title={`Marcar o licenciamento ${ano} como conferido`}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-400/40 px-3 py-2 text-xs font-black text-emerald-400 transition hover:bg-emerald-400/10 disabled:opacity-50"
      >
        <Check size={14} />
        {salvando ? "Salvando…" : `Conferido ${ano}`}
      </button>
    </span>
  );
}
