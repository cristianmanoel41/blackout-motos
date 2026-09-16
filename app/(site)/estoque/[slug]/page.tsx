import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Wallet,
} from "lucide-react";
import { motoPorSlug } from "@/lib/dados/estoque-site";
import { galeriaOrdenada } from "@/lib/dados/fotos-site";
import Galeria from "@/components/site/Galeria";
import { IconeWhatsApp } from "@/components/site/IconeWhatsApp";
import { linkWhatsApp, LOJA } from "@/lib/dados/loja";
import {
  anoDaMoto,
  convitePelaMoto,
  kmDaMoto,
  nomeDaMoto,
  numero,
  precoDaMoto,
  type MotoSite,
} from "@/lib/dados/moto-site";

/*
 * A página de uma moto: é este link que vai para o cliente.
 *
 * Só sai daqui informação comercial. Placa, chassi, RENAVAM,
 * valor de compra, gastos e dados do antigo dono nem chegam ao
 * servidor - a função do banco não os devolve.
 *
 * Quando a moto é vendida, a função para de responder por ela
 * e o link antigo cai no "não encontrada", em vez de mostrar o
 * que não está mais à venda.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const achado = await motoPorSlug(slug);

  if (!achado) return { title: "Moto não encontrada" };

  const { moto, estoque } = achado;

  const nome = nomeDaMoto(moto);

  const descricao = `${nome} ${anoDaMoto(moto)}, ${kmDaMoto(
    moto.quilometragem
  )} — ${precoDaMoto(moto)}. ${LOJA.cidade}/${LOJA.estado}.`;

  /*
   * A capa entra no Open Graph: é ela que aparece quando o
   * cliente recebe o link no WhatsApp. Sem isso, chega um
   * retângulo cinza.
   */
  const capa = estoque.fotos.capas[moto.id];

  return {
    title: `${nome} ${anoDaMoto(moto)}`,
    description: descricao,
    alternates: { canonical: `/estoque/${slug}` },
    openGraph: {
      title: `${nome} · ${precoDaMoto(moto)}`,
      description: descricao,
      images: capa ? [capa] : undefined,
    },
  };
}

function Ficha({ moto }: { moto: MotoSite }) {
  const cilindrada = numero(moto.cilindrada);

  const itens = [
    { rotulo: "Ano", valor: anoDaMoto(moto) },
    {
      rotulo: "Quilometragem",
      valor: kmDaMoto(moto.quilometragem),
    },
    { rotulo: "Cor", valor: moto.cor },
    {
      rotulo: "Cilindrada",
      valor: cilindrada ? `${cilindrada} cc` : null,
    },
    { rotulo: "Categoria", valor: moto.categoria },
  ].filter((item) => item.valor);

  return (
    <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[.07] bg-white/[.07]">
      {itens.map((item) => (
        <div
          key={item.rotulo}
          className="bg-[#121215] px-4 py-3"
        >
          <dt className="text-xs texto-suave">
            {item.rotulo}
          </dt>

          <dd className="mt-0.5 text-sm font-bold texto-claro">
            {item.valor}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default async function MotoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const achado = await motoPorSlug(slug);

  if (!achado) notFound();

  const { moto, estoque } = achado;

  const fotos = galeriaOrdenada(estoque.fotos, moto.id);
  const nome = nomeDaMoto(moto);

  const selos = [
    moto.unico_dono ? "Único dono" : null,
    moto.possui_manual ? "Com manual" : null,
    moto.possui_chave_reserva ? "Chave reserva" : null,
  ].filter(Boolean) as string[];

  const convite = convitePelaMoto(moto);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <Link
        href="/estoque"
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold texto-suave transition hover:text-white"
      >
        <ArrowLeft size={16} />
        Ver todo o estoque
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="min-w-0 lg:col-span-2">
          <Galeria fotos={fotos} nome={nome} />
        </section>

        <section className="min-w-0">
          <article className="cartao-3d rounded-2xl p-5 sm:p-6">
            <h1 className="text-xl font-black leading-tight texto-claro sm:text-2xl">
              {nome}
            </h1>

            <p className="mt-1.5 text-sm texto-suave">
              {anoDaMoto(moto)} ·{" "}
              {kmDaMoto(moto.quilometragem)}
            </p>

            <p className="mt-4 text-3xl font-black tracking-tight texto-ouro sm:text-4xl">
              {precoDaMoto(moto)}
            </p>

            <p className="mt-1 text-sm texto-suave">
              Aceitamos sua moto na troca e financiamos
            </p>

            {selos.length > 0 && (
              <ul className="mt-4 space-y-2">
                {selos.map((selo) => (
                  <li
                    key={selo}
                    className="flex items-center gap-2 text-sm texto-suave"
                  >
                    <CheckCircle2
                      size={15}
                      className="shrink-0 texto-ouro"
                    />
                    {selo}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 flex flex-col gap-2.5">
              <a
                href={linkWhatsApp(convite)}
                target="_blank"
                rel="noopener noreferrer"
                className="botao-ouro flex items-center justify-center gap-2 rounded-xl px-6 py-4 text-sm font-bold"
              >
                <IconeWhatsApp className="h-4 w-4" />
                Tenho interesse
              </a>

              <a
                href={linkWhatsApp(
                  `${convite} Gostaria de simular um financiamento.`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="botao-vidro flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold"
              >
                <Wallet size={16} />
                Simular financiamento
              </a>

              <a
                href={`tel:${LOJA.telefoneLink}`}
                className="botao-vidro flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold"
              >
                Ligar para a loja
              </a>
            </div>

            <Ficha moto={moto} />

            {moto.descricao && (
              <div className="mt-6 border-t border-white/[.07] pt-5">
                <p className="text-sm font-bold texto-claro">
                  Sobre esta moto
                </p>

                <p className="mt-2 whitespace-pre-line text-sm leading-6 texto-suave">
                  {moto.descricao}
                </p>
              </div>
            )}
          </article>
        </section>
      </div>
    </main>
  );
}
