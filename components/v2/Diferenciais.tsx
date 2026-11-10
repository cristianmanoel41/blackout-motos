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
    <section className="relative">

      <div className="relative mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:py-20">
        <AoEntrar>
          <h2 className="titulo text-[clamp(1.9rem,4.5vw,2.8rem)] claro">
            {/* Sem nowrap de proposito. No celular comum a marca
                ja cai inteira na segunda linha sozinha; travar a
                quebra so fazia o titulo furar a tela nos aparelhos
                de 320px - e marca cortada pela borda e pior do
                que marca em duas linhas. */}
            Diferenciais <span className="ouro">Blackout Motos</span>
          </h2>

          <p className="mt-2 text-sm suave sm:text-base">
            Mais que uma loja: gente que entende de moto.
          </p>
        </AoEntrar>

        {/* v4: sem caixa em volta de cada item - uma linha só,
            separada por fios finos, lida de uma vez. */}
        <div className="mt-10 grid overflow-hidden rounded-[18px] border border-white/[.08] sm:grid-cols-2 lg:grid-cols-4">
          {ITENS.map(({ Icone, titulo, texto }, i) => (
            <AoEntrar key={titulo} atraso={i * 90}>
              <div
                className={`h-full border-white/[.08] bg-white/[.015] px-6 py-8 ${
                  i < ITENS.length - 1 ? "max-sm:border-b" : ""
                } ${i < 2 ? "sm:max-lg:border-b" : ""} ${
                  i % 2 === 0 ? "sm:max-lg:border-r" : ""
                } ${i < ITENS.length - 1 ? "lg:border-r" : ""}`}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e0b129]/10">
                  <Icone size={21} className="ouro" />
                </span>

                <h3 className="mt-5 text-lg font-semibold tracking-tight claro">
                  {titulo}
                </h3>

                <p className="mt-1 text-sm suave">{texto}</p>
              </div>
            </AoEntrar>
          ))}
        </div>
      </div>
    </section>
  );
}
