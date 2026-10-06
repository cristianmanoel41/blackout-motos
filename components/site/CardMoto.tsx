import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Wallet } from "lucide-react";
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
    <article className="cartao-3d group flex flex-col overflow-hidden rounded-2xl">
      <Link
        href={`/estoque/${slug}`}
        className="relative block aspect-[4/3] overflow-hidden bg-black"
      >
        {capa ? (
          <Image
            src={capa}
            alt={nome}
            fill
            sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 23vw"
            quality={90}
            priority={prioridade}
            className="object-cover"
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

        {/*
          * "Quanto fica por mês?" logo embaixo do preço.
          *
          * É a pergunta que vem na cabeça de quem lê o valor à
          * vista, e até agora ela só tinha resposta na ficha da
          * moto - um clique adiante. Aqui a pessoa vai direto do
          * preço para a parcela, com a moto já escolhida.
          *
          * Fica fora dos dois botões de propósito: eles são "ver
          * a moto" e "falar com a loja", decisões diferentes.
          * Mais um botão do mesmo tamanho faria as três
          * competirem e nenhuma se destacar.
          */}
        <Link
          href={`/financiamento?moto=${encodeURIComponent(
            `${nome} ${anoDaMoto(moto)}`
          )}`}
          className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] font-bold texto-ouro"
        >
          <Wallet size={13} />
          Simular parcela
        </Link>

        {/*
          * Os selos eram uma lista de pe, um embaixo do outro,
          * com circulo dourado em cada linha: tres linhas de
          * altura por card, repetidas em quase todos. Em
          * etiqueta eles ocupam uma linha e continuam dizendo o
          * mesmo - e o card para de ser uma coluna de texto.
          */}
        {selos.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {selos.map((selo) => (
              <li
                key={selo}
                className="rounded-md border border-[#e0b129]/25 bg-[#e0b129]/[0.07] px-2 py-1 text-[10px] font-bold uppercase tracking-wide texto-ouro"
              >
                {selo}
              </li>
            ))}
          </ul>
        )}
        {/*
          * Lado a lado, e nao empilhados: dois botoes de largura
          * inteira faziam o pe do card pesar mais que a moto. O
          * dourado continua sendo so um - quem decide e "ver
          * detalhes".
          */}
        <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
          <Link
            href={`/estoque/${slug}`}
            className="botao-ouro flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-[13px] font-bold"
          >
            Ver detalhes
            <ArrowRight size={14} />
          </Link>

          <a
            href={linkWhatsApp(convitePelaMoto(moto))}
            target="_blank"
            rel="noopener noreferrer"
            className="botao-vidro flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-[13px] font-bold"
          >
            <IconeWhatsApp className="h-3.5 w-3.5" />
            WhatsApp
          </a>
        </div>
      </div>
    </article>
  );
}
