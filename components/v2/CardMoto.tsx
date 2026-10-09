import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Camera, PlayCircle, Wallet } from "lucide-react";
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
  const selos = compacto ? [] : selosDaMoto(moto).slice(0, 2);
  const novidade = chegouAgora(moto);

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
            <span className="absolute left-3 top-3 rounded-full border border-[#e0b129]/40 bg-black/70 px-3 py-1 text-[11px] font-bold uppercase tracking-wider ouro backdrop-blur-sm">
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
            compacto ? "p-4" : "p-5"
          }`}
        >
          <Link href={`/estoque/${slug}`} className="block">
            <h3 className="titulo text-[1.05rem] claro">
              {nome}
            </h3>

            <p className="mt-1.5 text-[13px] suave">
              {anoDaMoto(moto)} · {kmDaMoto(moto.quilometragem)}
              {cilindrada ? ` · ${cilindrada} cc` : ""}
            </p>

            <p className="titulo mt-3 text-[1.45rem] ouro">
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
              className="mt-1.5 inline-flex w-fit items-center gap-1.5 py-1 text-[12px] font-bold ouro"
            >
              <Wallet size={13} />
              Simular parcela
            </Link>
          )}

          {selos.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {selos.map((selo) => (
                <li
                  key={selo}
                  className="rounded-md border border-[#e0b129]/25 bg-[#e0b129]/[0.07] px-2 py-1 text-[10px] font-bold uppercase tracking-wide ouro"
                >
                  {selo}
                </li>
              ))}
            </ul>
          )}

          {!compacto && (
            <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
              <Link
                href={`/estoque/${slug}`}
                className="botao-vidro flex min-h-11 items-center justify-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-2.5 text-[12px]"
              >
                Ver detalhes
                <ArrowUpRight size={14} />
              </Link>

              <a
                href={linkWhatsApp(
                  convitePelaMoto(moto, linkDaFicha(slug))
                )}
                target="_blank"
                rel="noopener noreferrer"
                data-moto-card={moto.id}
                className="botao-ouro flex min-h-11 items-center justify-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-2.5 text-[12px]"
              >
                <IconeWhatsApp className="h-3.5 w-3.5" />
                WhatsApp
              </a>
            </div>
          )}
        </div>
      </article>
    </Inclinar>
  );
}
