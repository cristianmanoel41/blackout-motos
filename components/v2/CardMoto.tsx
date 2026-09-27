import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  anoDaMoto,
  convitePelaMoto,
  kmDaMoto,
  nomeDaMoto,
  precoDaMoto,
  type MotoSite,
} from "@/lib/dados/moto-site";
import { linkWhatsApp } from "@/lib/dados/loja";
import { IconeWhatsApp } from "@/components/site/IconeWhatsApp";

/*
 * O card de moto da versão 2.
 *
 * O preço é a informação que decide, então tem corpo de título
 * e é a única coisa dourada do card. Marca, ano e km ficam em
 * cinza: quem já decidiu o modelo lê; quem não decidiu, pula.
 *
 * Dois caminhos saem daqui - a ficha, para quem quer olhar com
 * calma, e o WhatsApp, para quem já quer falar. O do WhatsApp
 * já vai com a moto escrita na mensagem, senão a loja recebe
 * "oi" e perde a conversa perguntando qual é a moto.
 *
 * O card inteiro não é um link só porque o botão do WhatsApp
 * ficaria dentro dele, e link dentro de link não é permitido.
 */

export default function CardMoto({
  moto,
  slug,
  foto,
  prioridade = false,
  compacto = false,
}: {
  moto: MotoSite;
  slug: string;
  foto?: string;
  prioridade?: boolean;
  compacto?: boolean;
}) {
  const nome = nomeDaMoto(moto);

  return (
    <article className="vidro vidro-sobe relative overflow-hidden">
      <Link
        href={`/estoque/${slug}`}
        className="zoom block"
        aria-label={`Ver ${nome}`}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-black">
          {foto ? (
            <Image
              src={foto}
              alt={nome}
              fill
              sizes="(max-width: 640px) 80vw, (max-width: 1024px) 45vw, 22vw"
              priority={prioridade}
              className="object-cover"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-xs suave">
              Foto a caminho
            </span>
          )}

          {/* Só entra no site moto disponível - o selo diz isso. */}
          <span className="absolute left-3 top-3 rounded-full border border-[#e0b129]/40 bg-black/70 px-3 py-1 text-[11px] font-bold uppercase tracking-wider ouro backdrop-blur-sm">
            Disponível
          </span>
        </div>
      </Link>

      <div className={compacto ? "p-4" : "p-5"}>
        <Link href={`/estoque/${slug}`} className="block">
          <h3 className="titulo text-[1.05rem] claro">
            {nome}
          </h3>

          <p className="mt-1.5 text-[13px] suave">
            {anoDaMoto(moto)} · {kmDaMoto(moto.quilometragem)}
          </p>

          <p className="titulo mt-3 text-[1.45rem] ouro">
            {precoDaMoto(moto)}
          </p>
        </Link>

        {!compacto && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              href={`/estoque/${slug}`}
              className="botao-vidro flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-[13px]"
            >
              Ver detalhes
              <ArrowUpRight size={14} />
            </Link>

            <a
              href={linkWhatsApp(convitePelaMoto(moto))}
              target="_blank"
              rel="noopener noreferrer"
              className="botao-ouro flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-[13px]"
            >
              <IconeWhatsApp className="h-3.5 w-3.5" />
              WhatsApp
            </a>
          </div>
        )}
      </div>
    </article>
  );
}
