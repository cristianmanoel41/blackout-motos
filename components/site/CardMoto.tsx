import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
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
 * Card da moto.
 *
 * Os selos embaixo do preço saem do cadastro, não de texto
 * fixo: "Único dono", "Com manual" e "Chave reserva" só
 * aparecem quando estão marcados na ficha. Prometer revisão ou
 * documentação em dia sem ter o dado seria inventar.
 */

export default function CardMoto({
  moto,
  slug,
  capa,
  fotos,
  destaque = false,
  prioridade = false,
}: {
  moto: MotoSite;
  slug: string;
  capa?: string;
  fotos: number;
  destaque?: boolean;
  prioridade?: boolean;
}) {
  const nome = nomeDaMoto(moto);
  const cilindrada = numero(moto.cilindrada);

  const selos = [
    moto.unico_dono ? "Único dono" : null,
    moto.possui_manual ? "Com manual" : null,
    moto.possui_chave_reserva ? "Chave reserva" : null,
  ].filter(Boolean) as string[];

  return (
    <article className="cartao-3d flex flex-col overflow-hidden rounded-2xl">
      <Link
        href={`/estoque/${slug}`}
        className="relative block aspect-[4/3] overflow-hidden bg-black"
      >
        {capa ? (
          <Image
            src={capa}
            alt={nome}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            priority={prioridade}
            className="object-cover transition duration-500 hover:scale-105"
          />
        ) : null}

        {destaque && (
          <span className="botao-ouro absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider">
            Destaque
          </span>
        )}

        {fotos > 1 && (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/75 px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/15">
            {fotos} fotos
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-base font-bold leading-tight texto-claro">
          {nome}
        </h3>

        <p className="mt-1.5 text-xs texto-suave">
          {anoDaMoto(moto)} · {kmDaMoto(moto.quilometragem)}
          {cilindrada ? ` · ${cilindrada} cc` : ""}
        </p>

        <p className="mt-2.5 text-2xl font-black tracking-tight texto-ouro">
          {precoDaMoto(moto)}
        </p>

        {selos.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {selos.map((selo) => (
              <li
                key={selo}
                className="flex items-center gap-2 text-xs texto-suave"
              >
                <CheckCircle2
                  size={14}
                  className="shrink-0 texto-ouro"
                />
                {selo}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-col gap-2 pt-1">
          <Link
            href={`/estoque/${slug}`}
            className="botao-ouro flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold"
          >
            Ver detalhes
            <ArrowRight size={15} />
          </Link>

          <a
            href={linkWhatsApp(convitePelaMoto(moto))}
            target="_blank"
            rel="noopener noreferrer"
            className="botao-vidro flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold"
          >
            <IconeWhatsApp className="h-4 w-4" />
            Chamar no WhatsApp
          </a>
        </div>
      </div>
    </article>
  );
}
