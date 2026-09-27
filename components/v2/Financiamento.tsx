import Link from "next/link";
import {
  ArrowRight,
  BadgePercent,
  Timer,
  Wallet,
} from "lucide-react";
import AoEntrar from "@/components/v2/AoEntrar";

/*
 * A faixa do financiamento.
 *
 * Sem foto de moto: esta faixa fala de condição de pagamento,
 * não de uma moto específica. A que estava aqui era escolhida
 * pela ordem de entrada no pátio e acabava parecendo a oferta
 * da vez - o que não é.
 *
 * Também não repete o simulador: ele já existe em
 * /financiamento, com as financeiras e as contas certas. Dois
 * simuladores no mesmo site dariam dois resultados diferentes
 * no dia em que alguém mexesse em um deles.
 *
 * Os três pontos falam do que a loja resolve, sem número de
 * juros nem prazo: taxa muda por banco, por perfil e por mês,
 * e número velho na tela vira discussão no balcão.
 */

const PONTOS = [
  {
    Icone: BadgePercent,
    titulo: "As melhores",
    texto: "condições",
  },
  {
    Icone: Timer,
    titulo: "Aprovação",
    texto: "rápida",
  },
  {
    Icone: Wallet,
    titulo: "Entrada",
    texto: "facilitada",
  },
];

export default function Financiamento() {
  return (
    <section className="mx-auto max-w-[1400px] px-4 pb-4 sm:px-6">
      <AoEntrar>
        <div className="vidro grao relative overflow-hidden px-6 py-10 sm:px-10 lg:py-14">
          <span
            className="brasa h-[26rem] w-[26rem]"
            style={{ top: "-10rem", right: "-6rem" }}
          />

          <div className="relative grid gap-9 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-12">
            <div>
              <p className="titulo text-[clamp(1.4rem,3.5vw,2rem)] text-white/70">
                Realize seu sonho
              </p>

              <h2 className="titulo text-[clamp(1.9rem,5vw,3rem)] ouro">
                com financiamento
              </h2>

              <p className="mt-4 max-w-md text-sm leading-7 suave">
                A loja cuida da proposta, da documentação e da
                entrega. Você escolhe a moto.
              </p>
            </div>

            <div>
              <div className="grid gap-3 sm:grid-cols-3">
                {PONTOS.map(({ Icone, titulo, texto }) => (
                  <span
                    key={titulo}
                    className="vidro flex items-center gap-2.5 px-4 py-3"
                  >
                    <Icone
                      size={18}
                      className="shrink-0 ouro"
                    />

                    <span className="text-[12px] leading-4 claro">
                      {titulo}
                      <br />
                      <span className="suave">{texto}</span>
                    </span>
                  </span>
                ))}
              </div>

              <Link
                href="/financiamento"
                className="botao-ouro mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-4 text-sm sm:w-auto"
              >
                Simule agora
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </AoEntrar>
    </section>
  );
}
