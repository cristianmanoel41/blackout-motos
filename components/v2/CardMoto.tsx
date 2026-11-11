import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Camera,
  KeyRound,
  PlayCircle,
  UserCheck,
  Wallet,
} from "lucide-react";
import {
  anoDaMoto,
  chegouAgora,
  convitePelaMoto,
  kmDaMoto,
  linkDaFicha,
  nomeDaMoto,
  numero,
  precoDaMoto,
  selosDaMoto,
  type MotoSite,
} from "@/lib/dados/moto-site";
import { linkWhatsApp } from "@/lib/dados/loja";
import { IconeWhatsApp } from "@/components/site/IconeWhatsApp";
import Inclinar from "@/components/v2/Inclinar";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import { TAXA_MINIMA, parcelaPrice } from "@/lib/dados/parcela";

/*
 * Os selos em uma linha só, com ícone e nome curto. Escritos
 * por extenso e em caixa alta, os três quebravam em duas linhas
 * e o card ficava poluído. O nome inteiro vai no title.
 */
const SELO_CURTO: Record<string, { Icone: typeof UserCheck; curto: string }> = {
  "Único dono": { Icone: UserCheck, curto: "1 dono" },
  "Com manual": { Icone: BookOpen, curto: "Manual" },
  "Chave reserva": { Icone: KeyRound, curto: "Chave reserva" },
};

/* O prazo da parcela que o card mostra. */
const MESES_DO_CARD = 48;

/*
 * O card de moto do site - um só, para a capa, o estoque, a
 * ferramenta de escolha e as parecidas da ficha.
 *
 * Eram dois cards com desenhos diferentes (este e o antigo
 * components/site/CardMoto), e a mesma moto aparecia de um
 * jeito na capa e de outro no estoque. Agora o que muda entre
 * os lugares é só o tamanho: `compacto` tira os botões, para a
 * vitrine da capa.
 *
 * O preço é a informação que decide, então tem corpo de título
 * e é a única coisa dourada grande do card. Marca, ano e km
 * ficam em cinza: quem já decidiu o modelo lê; quem não
 * decidiu, pula.
 *
 * Dois caminhos saem daqui - a ficha, para quem quer olhar com
 * calma, e o WhatsApp, para quem já quer falar. O do WhatsApp
 * já vai com a moto e o link da ficha escritos na mensagem,
 * senão a loja recebe "oi" e perde a conversa perguntando qual
 * é a moto.
 *
 * O card inteiro não é um link só porque o botão do WhatsApp
 * ficaria dentro dele, e link dentro de link não é permitido.
 *
 * Os selos saem do cadastro, não de texto fixo: "Único dono"
 * só aparece quando está marcado na ficha. Prometer o que não
 * está no dado seria inventar.
 */

export default function CardMoto({
  moto,
  slug,
  foto,
  fotos = 0,
  videos = 0,
  prioridade = false,
  compacto = false,
}: {
  moto: MotoSite;
  slug: string;
  foto?: string;
  fotos?: number;
  videos?: number;
  prioridade?: boolean;
  compacto?: boolean;
}) {
  const nome = nomeDaMoto(moto);
  const cilindrada = numero(moto.cilindrada);
  const selos = compacto ? [] : selosDaMoto(moto);
  const novidade = chegouAgora(moto);

  /*
   * A menor parcela possível: sem entrada, na taxa mais baixa
   * do simulador (lib/dados/parcela). Por isso "a partir de" e
   * "estimativa" - o simulador mostra a faixa e o aviso inteiro.
   */
  const preco = numero(moto.preco_anunciado) || 0;
  const parcela = parcelaPrice(preco, TAXA_MINIMA, MESES_DO_CARD);

  return (
    <Inclinar className="h-full">
      <article className="vidro vidro-sobe group relative flex h-full flex-col overflow-hidden">
        <Link
          href={`/estoque/${slug}`}
          className="zoom block"
          aria-label={`Ver ${nome}`}
        >
          <div className="relative aspect-[4/3] overflow-hidden bg-black">
            {foto ? (
              <Image
                src={foto}
                alt={`${nome} ${anoDaMoto(moto)}`}
                fill
                sizes="(max-width: 640px) 88vw, (max-width: 1024px) 45vw, 24vw"
                quality={80}
                priority={prioridade}
                className="object-cover"
              />
            ) : (
              <span className="flex h-full items-center justify-center text-xs suave">
                Foto a caminho
              </span>
            )}

            {/* O reflexo que segue o mouse (ver Inclinar). */}
            <span aria-hidden="true" className="reflexo" />

            {/* Escurece o pé da foto para o selo ler em qualquer moto. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent"
            />

            {/* Só entra no site moto disponível - o selo diz isso. */}
            <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11.5px] font-semibold text-white ring-1 ring-white/15 backdrop-blur-md">
              <span className={`h-1.5 w-1.5 rounded-full ${novidade ? "bg-[#e0b129]" : "bg-[#4ade80]"}`} />
              {novidade ? "Chegou agora" : "Disponível"}
            </span>

            {(fotos > 1 || videos > 0) && (
              <span className="absolute bottom-3 right-3 flex items-center gap-2 rounded-full bg-black/75 px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/15">
                {fotos > 1 && (
                  <span className="flex items-center gap-1">
                    <Camera size={12} aria-hidden="true" />
                    {fotos}
                    <span className="sr-only"> fotos</span>
                  </span>
                )}

                {videos > 0 && (
                  <span className="flex items-center gap-1 ouro">
                    <PlayCircle size={12} aria-hidden="true" />
                    Vídeo
                  </span>
                )}
              </span>
            )}
          </div>
        </Link>

        <div
          className={`flex flex-1 flex-col ${
            compacto ? "p-3 sm:p-4" : "p-3 sm:p-5"
          }`}
        >
          <Link href={`/estoque/${slug}`} className="block">
            <h3 className="titulo text-[.92rem] leading-snug claro sm:text-[1.05rem]">
              {nome}
            </h3>

            <p className="mt-1 text-[11.5px] suave sm:mt-1.5 sm:text-[13px]">
              {anoDaMoto(moto)} · {kmDaMoto(moto.quilometragem)}
              {cilindrada ? (
                <span className="max-sm:hidden">{` · ${cilindrada} cc`}</span>
              ) : null}
            </p>

            <p className="titulo mt-2 whitespace-nowrap text-[clamp(.9rem,4.6vw,1.1rem)] ouro sm:mt-3 sm:text-[1.45rem]">
              {precoDaMoto(moto)}
            </p>
          </Link>

          {/*
            * "Quanto fica por mês?" logo embaixo do preço.
            *
            * É a pergunta que vem na cabeça de quem lê o valor à
            * vista. Fica fora dos dois botões de propósito: eles
            * são "ver a moto" e "falar com a loja", decisões
            * diferentes - um terceiro botão do mesmo tamanho faria
            * os três competirem.
            */}
          {!compacto && (
            <Link
              href={`/financiamento?moto=${encodeURIComponent(
                `${nome} ${anoDaMoto(moto)}`
              )}`}
              title="Estimativa sem entrada, com a menor taxa do simulador. Sujeita à análise de crédito do banco."
              className="mt-1 inline-flex w-fit items-center gap-1.5 py-1 text-[11px] font-bold ouro sm:mt-1.5 sm:text-[12px]"
            >
              <Wallet size={13} className="shrink-0 max-sm:hidden" />
              {parcela > 0 ? (
                <span>
                  {MESES_DO_CARD}x <span className="max-sm:hidden">a partir </span>de {formatarMoeda(parcela)}
                  <span className="ml-1 font-normal suave max-sm:hidden">· estimativa</span>
                </span>
              ) : (
                "Simular parcela"
              )}
            </Link>
          )}

          {selos.length > 0 && (
            <ul className="mt-2 hidden flex-wrap gap-x-3 gap-y-1 sm:flex">
              {selos.map((selo) => {
                const { Icone, curto } = SELO_CURTO[selo] || {
                  Icone: UserCheck,
                  curto: selo,
                };

                return (
                  <li
                    key={selo}
                    title={selo}
                    className="flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold claro"
                  >
                    <Icone size={13} className="ouro" />
                    {curto}
                  </li>
                );
              })}
            </ul>
          )}

          {!compacto && (
            <div className="mt-auto grid grid-cols-[1fr_auto] gap-1.5 pt-3 sm:grid-cols-2 sm:gap-2 sm:pt-4">
              <Link
                href={`/estoque/${slug}`}
                className="botao-vidro flex min-h-11 items-center justify-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-2.5 text-[12px]"
              >
                <span className="sm:hidden">Ver</span>
                <span className="max-sm:hidden">Ver detalhes</span>
                <ArrowUpRight size={14} />
              </Link>

              <a
                href={linkWhatsApp(
                  convitePelaMoto(moto, linkDaFicha(slug))
                )}
                target="_blank"
                rel="noopener noreferrer"
                data-moto-card={moto.id}
                aria-label={`Chamar no WhatsApp sobre a ${nome}`}
                className="botao-ouro flex min-h-11 min-w-11 items-center justify-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-2.5 text-[12px]"
              >
                <IconeWhatsApp className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                <span className="max-sm:hidden">WhatsApp</span>
              </a>
            </div>
          )}
        </div>
      </article>
    </Inclinar>
  );
}
