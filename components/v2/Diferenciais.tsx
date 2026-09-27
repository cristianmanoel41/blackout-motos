import {
  Banknote,
  Headset,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import AoEntrar from "@/components/v2/AoEntrar";

/*
 * Os diferenciais.
 *
 * Quatro, não oito: lista comprida de qualidade vira ruído e
 * ninguém lê até o fim. Cada um é uma coisa que a loja faz de
 * verdade, escrita como o cliente falaria.
 *
 * Os cards sobem um de cada vez, com um atraso curto entre
 * eles - é o que dá a impressão de tela montando, em vez de
 * quatro caixas piscando juntas.
 */

const ITENS = [
  {
    Icone: ShieldCheck,
    titulo: "Motos revisadas",
    texto: "Com procedência conferida",
  },
  {
    Icone: Wallet,
    titulo: "Financiamento",
    texto: "Condições facilitadas",
  },
  {
    Icone: Banknote,
    titulo: "Compramos sua moto",
    texto: "Pagamento no PIX",
  },
  {
    Icone: Headset,
    titulo: "Atendimento",
    texto: "Especializado",
  },
];

export default function Diferenciais() {
  return (
    <section className="grao relative border-y border-white/[.07] bg-[#0c0c10]">
      <span
        className="brasa h-[30rem] w-[30rem]"
        style={{ top: "-14rem", left: "-10rem" }}
      />

      <div className="relative mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:py-20">
        <AoEntrar>
          <h2 className="titulo text-[clamp(1.9rem,4.5vw,2.8rem)] claro">
            Diferenciais <span className="ouro">Blackout</span>
          </h2>

          <p className="mt-2 text-sm suave sm:text-base">
            Mais que uma loja: gente que entende de moto.
          </p>
        </AoEntrar>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ITENS.map(({ Icone, titulo, texto }, i) => (
            <AoEntrar key={titulo} atraso={i * 90}>
              <div className="vidro vidro-sobe h-full px-6 py-8 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e0b129]/10 ring-1 ring-[#e0b129]/25">
                  <Icone size={24} className="ouro" />
                </span>

                <h3 className="titulo mt-5 text-[1.05rem] claro">
                  {titulo}
                </h3>

                <p className="mt-2 text-[13px] leading-6 suave">
                  {texto}
                </p>
              </div>
            </AoEntrar>
          ))}
        </div>
      </div>
    </section>
  );
}
