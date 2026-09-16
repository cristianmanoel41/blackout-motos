import { createClient } from "@/lib/supabase/server";
import { type MotoSite } from "@/lib/dados/moto-site";
import { fotosDasMotos } from "@/lib/dados/fotos-site";
import ListaSite from "@/components/loja/ListaSite";
import {
  CabecalhoLoja,
  RodapeLoja,
} from "@/components/loja/CabecalhoLoja";
import {
  Capa,
  Garantias,
  OndeEstamos,
} from "@/components/loja/Capa";

/*
 * Site da loja: o estoque disponível, aberto a qualquer um.
 *
 * Os dados vêm da função estoque_publico, que devolve só moto
 * disponível e só as colunas de vitrine. Valor de compra,
 * gastos, fornecedor e placa não passam por aqui.
 *
 * Só entra moto com foto: card sem imagem não vende e, no meio
 * dos outros, passa a impressão de estoque malcuidado.
 */

export const dynamic = "force-dynamic";

export default async function LojaPage() {
  const supabase = await createClient();

  const { data } = await supabase.rpc(
    "estoque_publico"
  );

  const todas = (data || []) as MotoSite[];

  const { capas, galerias } = await fotosDasMotos(
    todas.map((moto) => moto.id)
  );

  const motos = todas.filter(
    (moto) => (galerias[moto.id] || []).length > 0
  );

  /* A capa é a marcada; sem marcação, a primeira da ordem. */
  const capaDeCada: Record<string, string> = {};
  const totalFotos: Record<string, number> = {};

  motos.forEach((moto) => {
    const fotos = galerias[moto.id] || [];

    capaDeCada[moto.id] =
      capas[moto.id] || fotos[0];

    totalFotos[moto.id] = fotos.length;
  });

  return (
    <>
      <CabecalhoLoja />

      <Capa motos={motos.length} />

      <Garantias />

      <main
        id="estoque"
        className="scroll-mt-20 bg-[#f5f6f8] px-3 py-10 sm:px-4 sm:py-14"
      >
        <div className="mx-auto max-w-6xl">
          <section className="mb-7 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#a97800]">
              Estoque disponível
            </p>

            <h2 className="mt-1 text-2xl font-bold text-[#0b0b0d] sm:text-3xl">
              {motos.length} moto
              {motos.length === 1 ? "" : "s"} à pronta
              entrega
            </h2>

            <p className="mt-2 text-sm text-black/55">
              Clique na moto para ver todas as fotos e a
              ficha completa
            </p>
          </section>

          {motos.length === 0 ? (
            <article className="rounded-2xl border border-black/10 bg-white p-10 text-center text-sm text-black/60">
              Nenhuma moto disponível no momento. Fale com a
              gente no WhatsApp: chega moto nova toda semana.
            </article>
          ) : (
            <ListaSite
              motos={motos}
              capas={capaDeCada}
              totalFotos={totalFotos}
            />
          )}
        </div>
      </main>

      <OndeEstamos />

      <RodapeLoja />
    </>
  );
}
