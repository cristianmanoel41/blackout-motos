import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import {
  anosDaMoto,
  kmDaMoto,
  nomeDaMoto,
  type MotoSite,
} from "@/lib/dados/moto-site";
import { fotosDasMotos } from "@/lib/dados/fotos-site";
import GaleriaMoto from "@/components/loja/GaleriaMoto";
import {
  CabecalhoLoja,
  RodapeLoja,
} from "@/components/loja/CabecalhoLoja";
import { linkWhatsApp, LOJA } from "@/lib/dados/loja";

/*
 * A página de uma moto: é este link que vai para o cliente.
 *
 * A função moto_publica só responde por moto disponível, então
 * quando a moto é vendida ou arquivada o link deixa de existir
 * em vez de mostrar o que não está mais à venda.
 */

export const dynamic = "force-dynamic";

async function buscarMoto(id: string) {
  const supabase = await createClient();

  const { data } = await supabase.rpc("moto_publica", {
    p_id: id,
  });

  return ((data || [])[0] as MotoSite) || null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const moto = await buscarMoto(id);

  if (!moto) return { title: "Moto não encontrada" };

  const nome = nomeDaMoto(moto);

  const preco = moto.preco_anunciado
    ? formatarMoeda(moto.preco_anunciado)
    : "consulte o preço";

  const descricao = `${nome} ${anosDaMoto(
    moto
  )}, ${kmDaMoto(moto.quilometragem)} - ${preco}. ${
    LOJA.cidade
  }/${LOJA.estado}.`;

  /*
   * A capa entra no Open Graph: é ela que aparece quando o
   * cliente recebe o link no WhatsApp. Sem isso, chega um
   * retângulo cinza.
   */
  const { capas, galerias } = await fotosDasMotos([
    moto.id,
  ]);

  const capa =
    capas[moto.id] || (galerias[moto.id] || [])[0];

  return {
    title: nome,
    description: descricao,
    openGraph: {
      title: `${nome} · ${preco}`,
      description: descricao,
      images: capa ? [capa] : undefined,
    },
  };
}

function Ficha({ moto }: { moto: MotoSite }) {
  const itens = [
    { rotulo: "Ano", valor: anosDaMoto(moto) },
    {
      rotulo: "Quilometragem",
      valor: kmDaMoto(moto.quilometragem),
    },
    { rotulo: "Cor", valor: moto.cor },
    {
      rotulo: "Cilindrada",
      valor: moto.cilindrada
        ? `${moto.cilindrada} cc`
        : null,
    },
  ].filter((item) => item.valor);

  return (
    <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-black/10 bg-black/10">
      {itens.map((item) => (
        <div
          key={item.rotulo}
          className="bg-white px-4 py-3"
        >
          <dt className="text-xs text-black/50">
            {item.rotulo}
          </dt>

          <dd className="mt-0.5 text-sm font-bold text-[#0b0b0d]">
            {item.valor}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default async function MotoDoSitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const moto = await buscarMoto(id);

  if (!moto) notFound();

  const { capas, galerias } = await fotosDasMotos([
    moto.id,
  ]);

  const todasAsFotos = galerias[moto.id] || [];
  const capa = capas[moto.id];

  /* A capa marcada vai para a frente da galeria. */
  const fotos = capa
    ? [capa, ...todasAsFotos.filter((f) => f !== capa)]
    : todasAsFotos;

  const nome = nomeDaMoto(moto);

  const diferenciais = [
    moto.unico_dono ? "Único dono" : null,
    moto.possui_manual ? "Com manual" : null,
    moto.possui_chave_reserva
      ? "Chave reserva"
      : null,
  ].filter(Boolean) as string[];

  return (
    <>
      <CabecalhoLoja />

      <main className="min-h-screen bg-[#f5f6f8] px-3 py-6 sm:px-4 sm:py-8">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/loja"
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-black/60 transition hover:text-black"
          >
            <ArrowLeft size={16} />
            Ver todas as motos
          </Link>

          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <section>
              <GaleriaMoto fotos={fotos} nome={nome} />
            </section>

            <section>
              <article className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
                <h1 className="text-xl font-bold leading-tight text-[#0b0b0d] sm:text-2xl">
                  {nome}
                </h1>

                <p className="mt-3 text-3xl font-bold tracking-tight text-[#0b0b0d]">
                  {moto.preco_anunciado
                    ? formatarMoeda(moto.preco_anunciado)
                    : "Consultar preço"}
                </p>

                <p className="mt-1 text-sm text-black/55">
                  Aceitamos troca e financiamos
                </p>

                {diferenciais.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5 text-xs text-black/60">
                    {diferenciais.map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-black/[.05] px-2.5 py-1"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}

                <a
                  href={linkWhatsApp(
                    `Olá! Tenho interesse na ${nome} ${anosDaMoto(
                      moto
                    )} anunciada no site.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 flex w-full items-center justify-center rounded-xl bg-[#25D366] px-6 py-4 text-sm font-bold text-white transition hover:brightness-95"
                >
                  Tenho interesse · WhatsApp
                </a>

                <a
                  href="tel:+551239173777"
                  className="mt-2 flex w-full items-center justify-center rounded-xl border border-black/15 px-6 py-3.5 text-sm font-bold text-[#0b0b0d] transition hover:border-black/40"
                >
                  Ligar para a loja
                </a>

                <Ficha moto={moto} />
              </article>
            </section>
          </div>
        </div>
      </main>

      <RodapeLoja />
    </>
  );
}
