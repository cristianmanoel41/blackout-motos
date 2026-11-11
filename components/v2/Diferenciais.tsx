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

      <div className="relative mx-auto max-w-[1400px] px-4 py-10 sm:px-6 sm:py-16 lg:py-20">
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
        {/* No celular, 2x2: um embaixo do outro, os quatro
            ocupavam uma tela e meia para dizer quatro frases. */}
        <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-[18px] border border-white/[.08] sm:mt-10 lg:grid-cols-4">
          {ITENS.map(({ Icone, titulo, texto }, i) => (
            <AoEntrar key={titulo} atraso={i * 90}>
              <div
                className={`h-full border-white/[.08] bg-white/[.015] px-4 py-5 sm:px-6 sm:py-8 ${
                  i < 2 ? "max-lg:border-b" : ""
                } ${i % 2 === 0 ? "max-lg:border-r" : ""} ${
                  i < ITENS.length - 1 ? "lg:border-r" : ""
                }`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e0b129]/10 sm:h-11 sm:w-11">
                  <Icone size={19} className="ouro" />
                </span>

                <h3 className="mt-3 text-[15px] font-semibold leading-snug tracking-tight claro sm:mt-5 sm:text-lg">
                  {titulo}
                </h3>

                <p className="mt-1 text-[13px] suave sm:text-sm">{texto}</p>
              </div>
            </AoEntrar>
          ))}
        </div>
      </div>
    </section>
  );
}
