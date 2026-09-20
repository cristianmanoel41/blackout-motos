import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import {
  anoDaMoto,
  convitePelaMoto,
  kmDaMoto,
  nomeDaMoto,
  numero,
  precoDaMoto,
  type MotoSite,
} from "@/lib/dados/moto-site";
import { linkWhatsApp } from "@/lib/dados/loja";
import { IconeWhatsApp } from "@/components/site/IconeWhatsApp";

/*
 * O cartão da moto na versão nova.
 *
 * Mudanças em relação ao que está no ar: a foto ocupa mais
 * espaço, o preço fica sobre ela num selo de vidro, e o card
 * inteiro reage ao ponteiro - sobe, acende a borda e deixa um
 * brilho atravessar a imagem.
 *
 * Os selos continuam saindo do cadastro: "Único dono", "Com
 * manual" e "Chave reserva" só aparecem quando estão marcados
 * na ficha. Prometer o que não está registrado seria inventar.
 */

export default function CardNovo({
  moto,
  slug,
  capa,
  fotos,
  posicao,
  destaque = false,
}: {
  moto: MotoSite;
  slug: string;
  capa?: string;
  fotos: number;
  posicao: number;
  destaque?: boolean;
}) {
  const nome = nomeDaMoto(moto);
  const cilindrada = numero(moto.cilindrada);

  const selos = [
    moto.unico_dono ? "Único dono" : null,
    moto.possui_manual ? "Com manual" : null,
    moto.possui_chave_reserva ? "Chave reserva" : null,
  ].filter(Boolean) as string[];

  return (
    <article
      className="cartao sobe flex flex-col overflow-hidden"
      /* Escalonado: os cards entram um logo depois do outro. */
      style={{ animationDelay: `${posicao * 70}ms` }}
    >
      <Link
        href={`/estoque/${slug}`}
        className="relative block aspect-[4/3] overflow-hidden bg-black"
      >
        {capa && (
          <Image
            src={capa}
            alt={nome}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            priority={posicao < 2}
            className="foto object-cover"
          />
        )}

        <span className="reflexo" />

        {/* A sombra faz o preço legível sobre qualquer foto. */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 to-transparent"
        />

        {destaque && (
          <span className="ouro-cheio absolute left-3 top-3 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]">
            Destaque
          </span>
        )}

        {fotos > 1 && (
          <span className="absolute right-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/15 backdrop-blur">
            {fotos} fotos
          </span>
        )}

        <span className="absolute bottom-3 left-3 rounded-xl bg-black/45 px-3 py-1.5 text-lg font-black tracking-tight text-white ring-1 ring-white/15 backdrop-blur">
          {precoDaMoto(moto)}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-base font-bold leading-tight claro">
          {nome}
        </h3>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {[
            anoDaMoto(moto),
            kmDaMoto(moto.quilometragem),
            cilindrada ? `${cilindrada} cc` : null,
            moto.cor,
          ]
            .filter(Boolean)
            .map((dado) => (
              <span
                key={String(dado)}
                className="rounded-full bg-white/[.05] px-2.5 py-1 text-[11px] suave ring-1 ring-white/[.06]"
              >
                {dado}
              </span>
            ))}
        </div>

        {selos.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {selos.map((selo) => (
              <li
                key={selo}
                className="flex items-center gap-2 text-xs suave"
              >
                <Check
                  size={13}
                  strokeWidth={3}
                  className="shrink-0 ouro"
                />
                {selo}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex gap-2 pt-5">
          <Link
            href={`/estoque/${slug}`}
            className="ouro-cheio flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-sm font-bold"
          >
            Ver detalhes
            <ArrowUpRight size={15} />
          </Link>

          <a
            href={linkWhatsApp(convitePelaMoto(moto))}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Chamar no WhatsApp sobre ${nome}`}
            title="Chamar no WhatsApp"
            className="vidro flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl"
          >
            <IconeWhatsApp className="h-5 w-5" />
          </a>
        </div>
      </div>
    </article>
  );
}
