"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Check, Star } from "lucide-react";

/*
 * Escolher se esta moto aparece na capa do site.
 *
 * Antes a capa pegava sozinha as quatro que entraram por
 * último. Serve enquanto não há opinião - mas moto com foto
 * fraca, ou que a loja não quer como cartão de visita, ia
 * para a vitrine do mesmo jeito.
 *
 * Com nenhuma marcada, a capa volta ao automático. Assim
 * ninguém precisa lembrar de marcar alguma para o site não
 * ficar vazio.
 */

const supabase = createClient();

export default function MotoNaCapa({
  motorcycleId,
}: {
  motorcycleId: string;
}) {
  const [naCapa, setNaCapa] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregar();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [motorcycleId]);

  async function carregar() {
    setCarregando(true);

    const { data, error } = await supabase
      .from("motorcycles")
      .select("na_capa")
      .eq("id", motorcycleId)
      .maybeSingle();

    if (error) {
      setErro(
        `Não deu para ler a marcação: ${error.message}`
      );
    } else {
      setNaCapa(Boolean(data?.na_capa));
    }

    setCarregando(false);
  }

  async function alternar() {
    const novo = !naCapa;

    setErro("");
    setSalvando(true);

    /* Muda na tela na hora; o banco confirma em seguida. */
    setNaCapa(novo);

    const { error } = await supabase
      .from("motorcycles")
      .update({ na_capa: novo })
      .eq("id", motorcycleId);

    setSalvando(false);

    if (error) {
      setNaCapa(!novo);

      setErro(
        `Não deu para salvar: ${error.message}. Se a coluna ainda não existe, rode a migração 0028.`
      );
    }
  }

  return (
    <div className="rounded-xl border border-grafite-claro bg-grafite p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-dourado">
            <Star size={18} />
            Moto na capa do site
          </h2>

          <p className="mt-1 max-w-xl text-xs leading-5 text-texto-suave">
            Marcadas aqui, só elas passam no destaque da
            página inicial. Sem nenhuma marcada, a capa mostra
            sozinha as últimas que entraram.
          </p>
        </div>

        <button
          type="button"
          disabled={carregando || salvando}
          onClick={alternar}
          className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold transition disabled:opacity-50 ${
            naCapa
              ? "bg-dourado text-preto hover:opacity-90"
              : "border border-grafite-claro text-texto-suave hover:border-dourado hover:text-dourado"
          }`}
        >
          {naCapa ? <Check size={16} /> : <Star size={16} />}
          {carregando
            ? "Carregando..."
            : naCapa
              ? "Aparece na capa"
              : "Mostrar na capa"}
        </button>
      </div>

      {erro && (
        <p className="mt-3 rounded-lg border border-red-700 bg-red-950/40 px-4 py-2.5 text-sm text-red-300">
          {erro}
        </p>
      )}
    </div>
  );
}
