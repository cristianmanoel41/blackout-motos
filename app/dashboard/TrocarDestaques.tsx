"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Star, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/*
 * O clique que troca a moto da capa.
 *
 * A lista vem pronta do servidor (ver DestaquesDoSite); aqui só
 * acontece o que depende de gente: marcar, desmarcar e procurar.
 *
 * A tela muda na hora e o banco depois. Se o banco recusar, a
 * tela volta atrás - melhor desfazer na frente de quem clicou
 * do que mostrar uma capa que não existe.
 */

export type MotoDaCapa = {
  id: string;
  nome: string;
  ano: string;
  preco: number;
  naCapa: boolean;
  capa: string;
};

/* A capa do site mostra três. É o limite de lá, não daqui. */
const LIMITE = 3;

function emReais(valor: number) {
  if (!Number.isFinite(valor) || valor <= 0) return "Sem preço";

  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export default function TrocarDestaques({
  motos: iniciais,
}: {
  motos: MotoDaCapa[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [motos, setMotos] = useState(iniciais);
  const [busca, setBusca] = useState("");
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [erro, setErro] = useState("");

  async function alternar(moto: MotoDaCapa, novo: boolean) {
    setErro("");
    setSalvandoId(moto.id);

    setMotos((atuais) =>
      atuais.map((item) =>
        item.id === moto.id ? { ...item, naCapa: novo } : item
      )
    );

    const { error } = await supabase
      .from("motorcycles")
      .update({ na_capa: novo })
      .eq("id", moto.id);

    setSalvandoId(null);

    if (error) {
      console.error(error);
      setMotos((atuais) =>
        atuais.map((item) =>
          item.id === moto.id ? { ...item, naCapa: !novo } : item
        )
      );
      setErro("Não foi possível mudar a capa do site. Tente de novo.");
      return;
    }

    /* O site é servido do servidor: sem isto, a capa só mudaria
       no próximo carregamento completo. */
    router.refresh();
  }

  const naCapa = motos.filter((m) => m.naCapa).slice(0, LIMITE);
  const vagas = LIMITE - naCapa.length;

  const candidatas = busca.trim()
    ? motos
        .filter((m) => !m.naCapa)
        .filter((m) =>
          m.nome.toLowerCase().includes(busca.trim().toLowerCase())
        )
        .slice(0, 6)
    : [];

  return (
    <div className="space-y-4">
      {erro && (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-400">
          {erro}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {naCapa.map((moto) => (
          <article
            key={moto.id}
            className="relative overflow-hidden rounded-2xl border border-[#e0b129]/35 bg-[linear-gradient(160deg,#1b1e22,#101214)]"
          >
            {moto.capa ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={moto.capa}
                alt=""
                className="h-28 w-full object-cover"
              />
            ) : (
              <div className="flex h-28 items-center justify-center text-[11px] font-bold text-white/30">
                sem foto
              </div>
            )}

            <button
              type="button"
              disabled={salvandoId === moto.id}
              onClick={() => alternar(moto, false)}
              title="Tirar da capa"
              className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-black/70 text-white/80 transition hover:border-red-400/60 hover:text-red-400 disabled:opacity-50"
            >
              <X size={14} />
            </button>

            <div className="p-3">
              <p className="text-[13px] font-black leading-tight text-[#e8eaed]">
                {moto.nome}
              </p>
              <p className="mt-1 text-[11px] font-bold text-[#a7adb6]">
                {moto.ano || "—"}
              </p>
              <p className="mt-1.5 text-sm font-black text-[#f0c640]">
                {emReais(moto.preco)}
              </p>
            </div>
          </article>
        ))}

        {Array.from({ length: Math.max(0, vagas) }).map((_, i) => (
          <div
            key={`vaga-${i}`}
            className="flex min-h-[11rem] items-center justify-center rounded-2xl border border-dashed border-white/[0.12] text-[11px] font-bold text-white/30"
          >
            vaga livre
          </div>
        ))}
      </div>

      {/*
        * A busca só aparece com vaga.
        *
        * Com as três cheias, marcar uma quarta não faria nada -
        * ela ficaria marcada e fora da capa, e a pessoa ficaria
        * procurando o erro.
        */}
      {vagas > 0 ? (
        <div>
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6f757d]"
            />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Procurar moto para pôr na capa"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-9 pr-3 text-sm font-semibold text-[#f1f3f5] outline-none transition focus:border-[#e0b129]/60"
            />
          </div>

          {candidatas.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {candidatas.map((moto) => (
                <li key={moto.id}>
                  <button
                    type="button"
                    disabled={salvandoId === moto.id}
                    onClick={() => {
                      alternar(moto, true);
                      setBusca("");
                    }}
                    className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition hover:border-[#e0b129]/50 disabled:opacity-50"
                  >
                    <Star size={14} className="shrink-0 text-[#e0b129]" />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-[#e8eaed]">
                      {moto.nome}
                    </span>
                    <span className="shrink-0 text-[12px] font-black text-[#a7adb6]">
                      {moto.ano}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {busca.trim() && candidatas.length === 0 && (
            <p className="mt-2 text-xs font-bold text-[#a7adb6]">
              Nenhuma moto disponível com esse nome.
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs font-bold text-[#a7adb6]">
          A capa está cheia. Tire uma moto para pôr outra no lugar.
        </p>
      )}
    </div>
  );
}
