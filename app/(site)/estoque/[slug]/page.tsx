import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Phone,
  Wallet,
} from "lucide-react";
import { motoPorSlug } from "@/lib/dados/estoque-site";
import { galeriaOrdenada } from "@/lib/dados/fotos-site";
import GaleriaMoto, { type Midia } from "@/components/v2/GaleriaMoto";
import CardMoto from "@/components/v2/CardMoto";
import Compartilhar from "@/components/v2/Compartilhar";
import EventoMoto from "@/components/site/EventoMoto";
import { IconeWhatsApp } from "@/components/site/IconeWhatsApp";
import { linkWhatsApp, LOJA } from "@/lib/dados/loja";
import {
  ENDERECO_DO_SITE,
  anoDaMoto,
  categoriaDaMoto,
  convitePelaMoto,
  kmDaMoto,
  linkDaFicha,
  motosParecidas,
  nomeDaCategoria,
  nomeDaMoto,
  numero,
  paraQueServe,
  precoDaMoto,
  selosDaMoto,
  tituloDaMoto,
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
 *
 * A ORDEM DA TELA, NO CELULAR
 *
 * Foto, nome, ladrilhos (ano, km, motor), preço, e os botões. É
 * o que a pessoa que veio do anúncio precisa para decidir se
 * chama - a ficha completa e as parecidas ficam para quem rola.
 * Rolou para baixo, os botões continuam a um toque na barra
 * fixa do pé da tela.
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
  )} — ${precoDaMoto(moto)}. Fotos reais, financiamento e troca em ${LOJA.cidade}/${LOJA.estado}.`;

  /*
   * A capa entra no Open Graph: é ela que aparece quando o
   * cliente recebe o link no WhatsApp. Sem isso, chega um
   * retângulo cinza.
   */
  const capa = estoque.fotos.capas[moto.id];

  return {
    title: `${nome} ${anoDaMoto(moto)} à venda em ${LOJA.cidade}`,
    description: descricao,
    alternates: { canonical: `/estoque/${slug}` },
    openGraph: {
      title: `${nome} ${anoDaMoto(moto)} · ${precoDaMoto(moto)}`,
      description: descricao,
      images: capa ? [capa] : undefined,
    },
  };
}

function FichaTecnica({ moto }: { moto: MotoSite }) {
  const cilindrada = numero(moto.cilindrada);

  const itens = [
    { rotulo: "Marca", valor: tituloDaMoto(moto.marca || "") },
    { rotulo: "Modelo", valor: tituloDaMoto(moto.modelo || "") },
    { rotulo: "Versão", valor: tituloDaMoto(moto.versao || "") },
    { rotulo: "Ano", valor: anoDaMoto(moto) },
    { rotulo: "Quilometragem", valor: kmDaMoto(moto.quilometragem) },
    { rotulo: "Cilindrada", valor: cilindrada ? `${cilindrada} cc` : "" },
    { rotulo: "Cor", valor: tituloDaMoto(moto.cor || "") },
    { rotulo: "Categoria", valor: nomeDaCategoria(categoriaDaMoto(moto)) },
    { rotulo: "Único dono", valor: moto.unico_dono ? "Sim" : "" },
    { rotulo: "Manual", valor: moto.possui_manual ? "Sim" : "" },
    { rotulo: "Chave reserva", valor: moto.possui_chave_reserva ? "Sim" : "" },
  ].filter((item) => item.valor && item.valor !== "—");

  return (
    <dl className="grid gap-px overflow-hidden rounded-2xl border border-white/[.07] bg-white/[.07] sm:grid-cols-2">
      {itens.map((item) => (
        <div
          key={item.rotulo}
          className="flex items-center justify-between gap-4 bg-[#111115] px-4 py-3.5"
        >
          <dt className="text-[13px] suave">{item.rotulo}</dt>
          <dd className="text-right text-sm font-bold claro">{item.valor}</dd>
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

  const nome = nomeDaMoto(moto);
  const ano = anoDaMoto(moto);
  const preco = numero(moto.preco_anunciado);
  const cilindrada = numero(moto.cilindrada);
  const selos = selosDaMoto(moto);
  const frase = paraQueServe(moto);

  /* O vídeo entra logo depois da capa: é o segundo que se vê. */
  const fotos: Midia[] = galeriaOrdenada(estoque.fotos, moto.id).map(
    (url) => ({ tipo: "foto", url })
  );
  const videos: Midia[] = (estoque.fotos.videos[moto.id] || []).map(
    (url) => ({ tipo: "video", url })
  );
  const midias = [...fotos.slice(0, 1), ...videos, ...fotos.slice(1)];

  const convite = convitePelaMoto(moto, linkDaFicha(slug));
  const simular = `/financiamento?moto=${encodeURIComponent(`${nome} ${ano}`)}`;

  const parecidas = motosParecidas(estoque.motos, moto, 4);

  const ladrilhos = [
    { rotulo: "Ano", valor: ano },
    { rotulo: "Km", valor: kmDaMoto(moto.quilometragem) },
    cilindrada ? { rotulo: "Motor", valor: `${cilindrada} cc` } : null,
    moto.cor ? { rotulo: "Cor", valor: tituloDaMoto(moto.cor) } : null,
  ].filter(Boolean) as { rotulo: string; valor: string }[];

  /*
   * A moto em linguagem de buscador: o Google pode mostrar
   * preço, ano e km direto no resultado. O endereço e a
   * disponibilidade são os de verdade - a página some quando a
   * moto é vendida.
   */
  const dadosEstruturados = [
    {
      "@context": "https://schema.org",
      "@type": ["Product", "Motorcycle"],
      name: `${nome} ${ano}`,
      brand: moto.marca ? { "@type": "Brand", name: tituloDaMoto(moto.marca) } : undefined,
      model: moto.modelo ? tituloDaMoto(moto.modelo) : undefined,
      vehicleModelDate: String(numero(moto.ano_modelo) || numero(moto.ano_fabricacao) || ""),
      color: moto.cor || undefined,
      mileageFromOdometer: numero(moto.quilometragem) !== null
        ? { "@type": "QuantitativeValue", value: numero(moto.quilometragem), unitCode: "KMT" }
        : undefined,
      itemCondition: "https://schema.org/UsedCondition",
      image: fotos.slice(0, 6).map((f) => f.url),
      url: linkDaFicha(slug),
      offers: preco
        ? {
            "@type": "Offer",
            price: preco,
            priceCurrency: "BRL",
            availability: "https://schema.org/InStock",
            url: linkDaFicha(slug),
            seller: { "@type": "MotorcycleDealer", name: LOJA.nome },
          }
        : undefined,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: `${ENDERECO_DO_SITE}/` },
        { "@type": "ListItem", position: 2, name: "Estoque", item: `${ENDERECO_DO_SITE}/estoque` },
        { "@type": "ListItem", position: 3, name: `${nome} ${ano}`, item: linkDaFicha(slug) },
      ],
    },
  ];

  return (
    /*
     * `data-moto` é como a medição do site sabe qual moto está
     * aberta - inclusive no clique do WhatsApp, que acontece
     * muito depois de a tela montar.
     */
    <main
      data-moto={moto.id}
      className="mx-auto max-w-[1400px] px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:pb-16"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(dadosEstruturados) }}
      />

      <EventoMoto id={moto.id} nome={nome} preco={preco} />

      <nav aria-label="Caminho" className="mb-5 flex items-center gap-1.5 text-[13px] suave">
        <Link href="/estoque" className="inline-flex min-h-10 items-center gap-1.5 font-semibold hover:text-white">
          <ArrowLeft size={15} />
          Estoque
        </Link>
        <ChevronRight size={13} aria-hidden="true" />
        <span className="truncate claro">{nome}</span>
      </nav>

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-10">
        <section className="min-w-0">
          <GaleriaMoto midias={midias} nome={`${nome} ${ano}`} />
        </section>

        <section className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <article className="vidro p-5 sm:p-7">
            <p className="text-[12px] font-bold uppercase tracking-[0.25em] ouro">
              {nomeDaCategoria(categoriaDaMoto(moto))} · disponível
            </p>

            <h1 className="titulo mt-3 text-[clamp(1.7rem,4vw,2.4rem)] claro">
              {nome}
            </h1>

            <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
              {ladrilhos.map((item) => (
                <div key={item.rotulo} className="ficha-ladrilho min-w-0">
                  <dt className="text-[11px] uppercase tracking-wider suave">{item.rotulo}</dt>
                  <dd className="truncate text-[15px] font-bold claro">{item.valor}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 border-t border-white/[.07] pt-5">
              <p className="text-[12px] uppercase tracking-wider suave">Preço à vista</p>
              <p className="titulo mt-1 text-[clamp(2.2rem,6vw,3rem)] ouro">
                {precoDaMoto(moto)}
              </p>
              <p className="mt-1 text-sm suave">
                Financiamos e aceitamos sua moto na troca
              </p>
            </div>

            {(frase || selos.length > 0) && (
              <ul className="mt-5 space-y-2">
                {frase && (
                  <li className="flex items-start gap-2 text-sm claro">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 ouro" />
                    {frase}
                  </li>
                )}
                {selos.map((selo) => (
                  <li key={selo} className="flex items-center gap-2 text-sm suave">
                    <CheckCircle2 size={16} className="shrink-0 ouro" />
                    {selo}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 grid gap-2.5">
              <a
                href={linkWhatsApp(convite)}
                target="_blank"
                rel="noopener noreferrer"
                className="botao-ouro flex min-h-14 items-center justify-center gap-2 rounded-xl px-6 py-4 text-[15px] font-bold"
              >
                <IconeWhatsApp className="h-5 w-5" />
                Tenho interesse nesta moto
              </a>

              {/*
                * Leva ao simulador com a moto já preenchida, em
                * vez de abrir o WhatsApp sem os dados - a proposta
                * sai mais rápido quando a mensagem chega completa.
                */}
              <Link
                href={simular}
                className="botao-vidro flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold"
              >
                <Wallet size={17} className="ouro" />
                Simular financiamento
              </Link>

              <div className="grid grid-cols-2 gap-2.5">
                <Compartilhar
                  titulo={`${nome} ${ano}`}
                  texto={`${nome} ${ano} por ${precoDaMoto(moto)} na ${LOJA.nome}`}
                />

                <a
                  href={`tel:${LOJA.telefoneLink}`}
                  className="botao-vidro flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold"
                >
                  <Phone size={16} />
                  Ligar
                </a>
              </div>
            </div>
          </article>
        </section>
      </div>

      <section className="mt-12">
        <h2 className="titulo text-[1.6rem] claro">
          Ficha <span className="ouro">técnica</span>
        </h2>
        <div className="mt-5">
          <FichaTecnica moto={moto} />
        </div>
        <p className="mt-3 text-[13px] suave">
          Dados do nosso cadastro. Confirme os detalhes com o vendedor
          antes de fechar - e venha ver a moto pessoalmente em{" "}
          {LOJA.cidade}.
        </p>
      </section>

      {parecidas.length > 0 && (
        <section className="mt-14">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="titulo text-[1.6rem] claro">
              Motos <span className="ouro">parecidas</span>
            </h2>
            <Link href="/estoque" className="text-sm font-bold ouro hover:underline">
              Ver todo o estoque
            </Link>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {parecidas.map((outra) => (
              <CardMoto
                key={outra.id}
                moto={outra}
                slug={estoque.slugs[outra.id]}
                foto={estoque.fotos.capas[outra.id]}
                fotos={(estoque.fotos.galerias[outra.id] || []).length}
                videos={(estoque.fotos.videos[outra.id] || []).length}
              />
            ))}
          </div>
        </section>
      )}

      {/*
        * A barra do pé, só no celular.
        *
        * Quem rolou até a ficha técnica ou as parecidas não
        * precisa subir de volta para chamar: preço e os dois
        * caminhos ficam a um toque do polegar.
        */}
      <div className="barra-acao lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] suave">{nome}</p>
            <p className="titulo truncate text-[1.15rem] ouro">{precoDaMoto(moto)}</p>
          </div>

          <Link
            href={simular}
            aria-label="Simular financiamento"
            className="botao-vidro flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
          >
            <Wallet size={19} className="ouro" />
          </Link>

          <a
            href={linkWhatsApp(convite)}
            target="_blank"
            rel="noopener noreferrer"
            className="botao-ouro flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold"
          >
            <IconeWhatsApp className="h-4 w-4" />
            WhatsApp
          </a>
        </div>
      </div>
    </main>
  );
}
