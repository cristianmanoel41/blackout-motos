import Link from "next/link";
import {
  ArrowRight,
  Award,
  Handshake,
  MapPin,
  Users,
} from "lucide-react";
import { LOJA } from "@/lib/dados/loja";

/*
 * A seção institucional.
 *
 * Os quatro pontos da direita são fatos que a loja sustenta -
 * endereço, atendimento, procedência -, não número inventado
 * de vendas ou de anos de mercado.
 */

const PONTOS = [
  { Icone: Award, texto: "Procedência garantida" },
  { Icone: Handshake, texto: "Atendimento de verdade" },
  {
    Icone: MapPin,
    texto: `Loja em ${LOJA.cidade}`,
  },
  { Icone: Users, texto: "Clientes satisfeitos" },
];

export default function Institucional() {
  return (
    <section className="border-y border-white/[.07] bg-[#0d0d10]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 lg:grid-cols-2 lg:py-20">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] texto-ouro">
            {LOJA.nome}
          </p>

          <h2 className="mt-3 text-3xl font-black uppercase leading-tight texto-claro sm:text-4xl">
            Mais que motos,
            <br />
            <span className="texto-ouro">
              realizamos sonhos.
            </span>
          </h2>

          <p className="mt-5 max-w-lg text-sm leading-7 texto-suave">
            Aqui você encontra qualidade, confiança e
            parceria para seguir sempre em frente. Cada moto
            passa pela nossa revisão antes de entrar no
            pátio, a documentação é resolvida pela loja e a
            sua moto usada entra na troca com uma avaliação
            justa. Financiamos com os principais bancos e
            acompanhamos você do primeiro contato até a
            entrega da chave.
          </p>

          <Link
            href="/sobre"
            className="botao-vidro mt-7 inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold"
          >
            Conheça nossa história
            <ArrowRight size={15} />
          </Link>
        </div>

        <ul className="grid gap-4 self-center sm:grid-cols-2 lg:grid-cols-1 lg:border-l lg:border-white/[.07] lg:pl-10">
          {PONTOS.map(({ Icone, texto }) => (
            <li
              key={texto}
              className="flex items-center gap-3.5"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e0b129]/10 ring-1 ring-[#e0b129]/25">
                <Icone size={20} className="texto-ouro" />
              </span>

              <span className="text-sm font-semibold texto-claro">
                {texto}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
