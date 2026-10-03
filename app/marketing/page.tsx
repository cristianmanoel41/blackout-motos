import Link from "next/link";
import { ChevronLeft, ChevronRight, Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  montarCampanha,
  nomeDoMes,
  prepararMotos,
  type Formato,
  type Post,
} from "@/lib/dados/campanha";
import BotaoCopiar from "./BotaoCopiar";

export const metadata = { title: "Marketing · Blackout Motos" };

/*
 * A CAMPANHA DO MÊS
 *
 * A campanha de outubro de 2026 foi escrita à mão, e o trabalho
 * dela era mecânico: achar pares de preço igual no pátio,
 * distribuir pelas terças, quintas e sábados, e trocar a moto
 * dentro de quatro moldes de legenda.
 *
 * Esta tela faz isso sozinha, com o pátio de hoje. Moto vendida
 * sai da campanha do mês que vem sem ninguém mexer.
 *
 * O que ela não faz é publicar - ver o comentário no fim do
 * arquivo.
 */

const CORES: Record<Formato, { fundo: string; letra: string; nome: string }> = {
  duelo: {
    fundo: "bg-[#e0b129]/12 border-[#e0b129]/35",
    letra: "text-[#f0c640]",
    nome: "Duelo",
  },
  avaliacao: {
    fundo: "bg-emerald-400/10 border-emerald-400/30",
    letra: "text-emerald-400",
    nome: "Quanto vale a sua",
  },
  carrossel: {
    fundo: "bg-sky-400/10 border-sky-400/30",
    letra: "text-sky-400",
    nome: "Carrossel salvável",
  },
  role: {
    fundo: "bg-orange-400/10 border-orange-400/30",
    letra: "text-orange-400",
    nome: "Rolê",
  },
};

function CartaoDoPost({ post }: { post: Post }) {
  const cor = CORES[post.formato];
  const legenda = post.legenda.join("\n\n");

  return (
    <article className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[linear-gradient(160deg,#16181c,#0d0f12)]">
      <header className="flex flex-wrap items-center gap-3 border-b border-white/[0.07] px-5 py-3.5">
        <span
          className={`rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${cor.fundo} ${cor.letra}`}
        >
          {cor.nome}
        </span>

        <p className="text-[13px] font-black capitalize text-[#e8eaed]">
          {post.diaEscrito}
        </p>

        <div className="ml-auto">
          <BotaoCopiar texto={legenda} />
        </div>
      </header>

      <div className="px-5 py-4">
        {post.motos.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2.5">
            {post.motos.map((moto) => (
              <div
                key={moto.id}
                className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] py-1.5 pl-1.5 pr-3"
              >
                {moto.capa ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={moto.capa}
                    alt=""
                    className="h-10 w-14 rounded-lg object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-14 items-center justify-center rounded-lg bg-black/50 text-[9px] font-bold text-white/30">
                    sem foto
                  </span>
                )}

                <span>
                  <span className="block text-[12px] font-black leading-tight text-[#e8eaed]">
                    {moto.nome}
                  </span>
                  <span className="block text-[11px] font-bold text-[#f0c640]">
                    {moto.precoEscrito}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}

        <p className="mb-3 text-[12px] font-semibold leading-relaxed text-[#8d949d]">
          {post.comoMontar}
        </p>

        {post.slides.length > 0 && (
          <ol className="mb-3 space-y-1">
            {post.slides.map((slide, i) => (
              <li
                key={slide}
                className="text-[12px] font-semibold text-[#a7adb6]"
              >
                {i + 1}. {slide}
              </li>
            ))}
          </ol>
        )}

        {/*
          * A legenda num bloco com barra dourada.
          *
          * Quem vai copiar precisa ver onde ela começa e onde
          * acaba sem ler - é o mesmo tratamento do PDF.
          */}
        <div className="space-y-1.5 border-l-[3px] border-[#e0b129] bg-white/[0.025] py-2.5 pl-4 pr-3">
          {post.legenda.map((linha, i) => (
            <p
              key={i}
              className="text-[13px] font-semibold leading-relaxed text-[#e8eaed]"
            >
              {linha}
            </p>
          ))}
        </div>
      </div>
    </article>
  );
}

export default async function MarketingPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes: pedido } = await searchParams;

  const hoje = new Date();

  /*
   * O mês vem do endereço, para as setas funcionarem sem
   * JavaScript e para o link de um mês ser compartilhável.
   */
  const [anoPedido, mesPedido] = String(pedido || "")
    .split("-")
    .map(Number);

  const ano =
    Number.isFinite(anoPedido) && anoPedido > 2000
      ? anoPedido
      : hoje.getFullYear();
  const mes =
    Number.isFinite(mesPedido) && mesPedido >= 1 && mesPedido <= 12
      ? mesPedido - 1
      : hoje.getMonth();

  const supabase = await createClient();

  const [estoque, fotos] = await Promise.all([
    supabase
      .from("motorcycles")
      .select("id, marca, modelo, versao, ano_modelo, preco_anunciado")
      .eq("status", "disponivel")
      .order("data_entrada", { ascending: false, nullsFirst: false }),
    supabase
      .from("motorcycle_photos")
      .select("motorcycle_id, url")
      .eq("principal", true),
  ]);

  const capas: Record<string, string> = {};

  (fotos.data || []).forEach((foto) => {
    if (foto.url) capas[String(foto.motorcycle_id)] = String(foto.url);
  });

  const motos = prepararMotos(estoque.data || [], capas);
  const posts = montarCampanha(motos, ano, mes);

  const anterior = new Date(ano, mes - 1, 1);
  const seguinte = new Date(ano, mes + 1, 1);
  const comoParametro = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const seta =
    "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-[#a7adb6] transition hover:border-[#e0b129]/50 hover:text-[#f0c640]";

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-5 pb-6">
      <header className="flex flex-wrap items-center gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#e0b129]/35 bg-[#e0b129]/10 text-[#f0c640]">
          <Megaphone size={19} />
        </span>

        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-black capitalize text-[#f1f3f5]">
            {nomeDoMes(mes)} de {ano}
          </h1>
          <p className="text-xs font-bold text-[#8d949d]">
            {posts.length} posts montados com as {motos.length} motos do pátio
          </p>
        </div>

        <nav className="flex items-center gap-2">
          <Link
            href={`/marketing?mes=${comoParametro(anterior)}`}
            className={seta}
            aria-label="Mês anterior"
          >
            <ChevronLeft size={17} />
          </Link>
          <Link
            href={`/marketing?mes=${comoParametro(seguinte)}`}
            className={seta}
            aria-label="Próximo mês"
          >
            <ChevronRight size={17} />
          </Link>
        </nav>
      </header>

      {posts.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-8 text-center text-sm font-bold text-[#a7adb6]">
          Não deu para montar a campanha: o pátio precisa de pelo menos duas
          motos com preço anunciado.
        </p>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <CartaoDoPost key={post.chave} post={post} />
          ))}
        </div>
      )}

      {/*
        * Por que esta tela não publica sozinha.
        *
        * Publicar pelo Instagram pede conta Comercial ligada a
        * uma Página, um app aprovado na Meta e um token de longa
        * duração - nada disso existe aqui hoje.
        *
        * E há uma parte que não se deve automatizar nem quando
        * existir: responder comentário. É a resposta que faz o
        * post continuar circulando, e resposta automática o
        * cliente percebe na hora.
        */}
      <p className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-5 py-4 text-xs font-semibold leading-relaxed text-[#8d949d]">
        A campanha se refaz sozinha a cada mês, com o pátio do dia. Moto
        vendida sai, moto nova entra. Publicar continua sendo no braço — e
        responder os comentários na primeira hora é o que faz o post render.
      </p>
    </div>
  );
}
