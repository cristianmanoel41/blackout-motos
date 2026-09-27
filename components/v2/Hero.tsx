import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  CONVITE_GERAL,
  linkWhatsApp,
  LOJA,
} from "@/lib/dados/loja";
import { IconeWhatsApp } from "@/components/site/IconeWhatsApp";
import AoEntrar from "@/components/v2/AoEntrar";
import { nomeDaMoto, type MotoSite } from "@/lib/dados/moto-site";

/*
 * A capa.
 *
 * A foto é de uma moto do pátio, não de banco de imagem: o
 * cliente vai encontrar essa moto no estoque logo abaixo, e
 * foto genérica de piloto na estrada promete uma loja que não
 * é esta.
 *
 * O texto fica à esquerda, sobre o preto, e a foto à direita,
 * com um degradê que apaga a borda de encontro ao fundo -
 * assim a imagem não vira um retângulo colado na tela.
 *
 * Os três selos não inventam nada: dizem o que a loja faz em
 * toda moto antes de anunciar.
 */

const SELOS = [
  {
    Icone: BadgeCheck,
    titulo: "Qualidade",
    texto: "Motos revisadas",
  },
  {
    Icone: ShieldCheck,
    titulo: "Procedência",
    texto: "Cautelar antes de comprar",
  },
  {
    Icone: Sparkles,
    titulo: "Confiança",
    texto: "Atendimento especializado",
  },
];

export default function Hero({
  moto,
  foto,
  slug,
  quantas,
}: {
  moto?: MotoSite;
  foto?: string;
  slug?: string;
  quantas: number;
}) {
  return (
    <section className="grao relative overflow-hidden border-b border-white/[.07]">
      <span
        className="brasa h-[40rem] w-[40rem]"
        style={{ top: "-16rem", right: "-8rem" }}
      />

      <div className="relative mx-auto grid max-w-[1400px] items-center gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:gap-8 lg:pb-20 lg:pt-16">
        <AoEntrar className="relative z-10">
          <p className="rotulo">{LOJA.nome}</p>

          <h1 className="titulo mt-5 text-[clamp(2.7rem,8vw,4.8rem)]">
            <span className="ouro">Liberdade</span>
            <br />
            <span className="claro">sobre duas rodas</span>
          </h1>

          <p className="mt-5 max-w-lg text-[1rem] leading-8 suave sm:text-[1.05rem]">
            Motos seminovas com procedência, garantia e as
            melhores condições de {LOJA.cidade}.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/estoque"
              className="botao-ouro flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm"
            >
              Ver motos em estoque
              <ArrowRight size={16} />
            </Link>

            <a
              href={linkWhatsApp(CONVITE_GERAL)}
              target="_blank"
              rel="noopener noreferrer"
              className="botao-vidro flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm"
            >
              <IconeWhatsApp className="h-4 w-4" />
              Falar no WhatsApp
            </a>
          </div>

          {quantas > 0 && (
            <p className="mt-6 text-[13px] suave">
              <span className="font-bold ouro">{quantas}</span>{" "}
              moto{quantas === 1 ? "" : "s"} à pronta entrega
              agora
            </p>
          )}
        </AoEntrar>

        <AoEntrar atraso={120} className="relative">
          {foto && moto ? (
            <Link
              href={slug ? `/estoque/${slug}` : "/estoque"}
              className="zoom group relative block overflow-hidden rounded-2xl"
              aria-label={`Ver ${nomeDaMoto(moto)}`}
            >
              <div className="relative aspect-[4/3] w-full lg:aspect-[16/11]">
                <Image
                  src={foto}
                  alt={nomeDaMoto(moto)}
                  fill
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  priority
                  className="object-cover"
                />

                {/*
                  * O degradê apaga a foto para dentro do preto
                  * nas duas bordas onde ela encontra o fundo.
                  */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-r from-[#08080a] via-transparent to-transparent"
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-[#08080a] via-transparent to-transparent"
                />
              </div>

              <span className="absolute bottom-4 left-4 rounded-full border border-[#e0b129]/40 bg-black/70 px-4 py-1.5 text-[12px] font-bold claro backdrop-blur-sm">
                {nomeDaMoto(moto)}
              </span>
            </Link>
          ) : (
            <div className="vidro aspect-[16/11] w-full" />
          )}

          {/*
            * No computador os selos ficam sobre a foto, como na
            * referência; no celular descem para baixo dela,
            * senão cobririam a moto inteira.
            */}
          <ul className="mt-4 grid gap-2 sm:grid-cols-3 lg:absolute lg:right-3 lg:top-1/2 lg:mt-0 lg:w-60 lg:-translate-y-1/2 lg:grid-cols-1 lg:gap-3">
            {SELOS.map(({ Icone, titulo, texto }) => (
              <li
                key={titulo}
                className="vidro flex items-center gap-3 px-4 py-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e0b129]/10 ring-1 ring-[#e0b129]/25">
                  <Icone size={17} className="ouro" />
                </span>

                <span className="min-w-0">
                  <span className="block text-[12px] font-bold uppercase tracking-wider claro">
                    {titulo}
                  </span>
                  <span className="block truncate text-[11px] suave">
                    {texto}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </AoEntrar>
      </div>
    </section>
  );
}
