import Image from "next/image";
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
 * Não repete o simulador: ele já existe em /financiamento,
 * com as financeiras e as contas certas. Aqui é só a chamada -
 * dois simuladores no mesmo site dariam dois resultados
 * diferentes no dia em que alguém mexesse em um deles.
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

export default function Financiamento({
  foto,
}: {
  foto?: string;
}) {
  return (
    <section className="mx-auto max-w-[1400px] px-4 pb-4 sm:px-6">
      <AoEntrar>
        <div className="vidro grao relative overflow-hidden">
          <span
            className="brasa h-[26rem] w-[26rem]"
            style={{ bottom: "-12rem", right: "-6rem" }}
          />

          <div className="relative grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="relative aspect-[16/10] w-full lg:aspect-auto lg:h-full lg:min-h-[19rem]">
              {foto && (
                <Image
                  src={foto}
                  alt=""
                  aria-hidden="true"
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover"
                />
              )}

              <span
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#101014]"
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-[#101014] via-transparent to-transparent lg:bg-gradient-to-t lg:from-transparent"
              />
            </div>

            <div className="px-6 pb-8 lg:px-8 lg:py-10">
              <p className="titulo text-[clamp(1.4rem,3.5vw,2rem)] text-white/70">
                Realize seu sonho
              </p>

              <h2 className="titulo text-[clamp(1.9rem,5vw,3rem)] ouro">
                com financiamento
              </h2>

              <p className="mt-3 max-w-md text-sm leading-7 suave">
                A loja cuida da proposta, da documentação e da
                entrega. Você escolhe a moto.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                {PONTOS.map(({ Icone, titulo, texto }) => (
                  <span
                    key={titulo}
                    className="vidro flex items-center gap-2.5 px-4 py-3"
                  >
                    <Icone size={17} className="ouro" />

                    <span className="text-[12px] leading-4 claro">
                      {titulo}
                      <br />
                      <span className="suave">{texto}</span>
                    </span>
                  </span>
                ))}

                <Link
                  href="/financiamento"
                  className="botao-ouro inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm"
                >
                  Simule agora
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </AoEntrar>
    </section>
  );
}
