import {
  Headset,
  Repeat2,
  ShieldCheck,
  Wallet,
} from "lucide-react";

/*
 * A faixa de benefícios logo abaixo da capa.
 *
 * São as quatro coisas que a loja faz em toda negociação, do
 * jeito que o Cristian descreve para o cliente.
 */

const ITENS = [
  {
    Icone: ShieldCheck,
    titulo: "Motos revisadas",
    texto: "Segurança e procedência",
  },
  {
    Icone: Wallet,
    titulo: "Financiamento facilitado",
    texto: "As melhores condições",
  },
  {
    Icone: Repeat2,
    titulo: "Aceitamos sua moto na troca",
    texto: "Mais valor no seu usado",
  },
  {
    Icone: Headset,
    titulo: "Atendimento especializado",
    texto: "Do início ao fim",
  },
];

export default function Beneficios() {
  return (
    <section className="relative z-10 mx-auto -mt-10 grid max-w-7xl gap-3 px-4 sm:grid-cols-2 lg:grid-cols-4">
      {ITENS.map(({ Icone, titulo, texto }) => (
        <article
          key={titulo}
          className="cartao-3d flex items-center gap-3 rounded-2xl px-4 py-4"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e0b129]/10 ring-1 ring-[#e0b129]/25">
            <Icone size={20} className="texto-ouro" />
          </span>

          <span className="min-w-0">
            <span className="block text-sm font-bold leading-tight texto-claro">
              {titulo}
            </span>

            <span className="mt-0.5 block text-xs texto-suave">
              {texto}
            </span>
          </span>
        </article>
      ))}
    </section>
  );
}
