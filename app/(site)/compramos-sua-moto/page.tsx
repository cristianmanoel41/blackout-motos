import type { Metadata } from "next";
import { Banknote, FileCheck2, ShieldCheck } from "lucide-react";
import FormVenderMoto from "@/components/v4/FormVenderMoto";
import { LOJA } from "@/lib/dados/loja";

/*
 * "COMPRAMOS SUA MOTO" - A PÁGINA
 *
 * Pedida pela loja em 11/11/2026, no desenho da referência que
 * ela mandou: três passos numerados em cima, e o formulário em
 * blocos ("A moto", "A situação", "Seus dados") com campos de
 * linha só embaixo.
 *
 * O envio é pelo WhatsApp (ver components/v4/FormVenderMoto):
 * nada fica gravado no site.
 */

export const metadata: Metadata = {
  title: "Compramos sua moto",
  description: `Venda sua moto para a ${LOJA.nome.toUpperCase()} em ${LOJA.cidade}: preencha os dados, mande as fotos no WhatsApp e receba a proposta. Pagamento no PIX.`,
  alternates: { canonical: "/compramos-sua-moto" },
};

const PASSOS = [
  {
    numero: "01",
    titulo: "Você manda a moto",
    texto:
      "Dados aqui embaixo, fotos e, se puder, dois vídeos: um dando a volta na moto e outro com o motor ligado.",
  },
  {
    numero: "02",
    titulo: "A gente avalia",
    texto:
      "Olhamos o histórico, a tabela e o mercado da região. Se a placa vier, a consulta é na hora.",
  },
  {
    numero: "03",
    titulo: "Proposta e pagamento",
    texto:
      "Se fechar, a documentação sai pela loja e o pagamento é à vista, no PIX.",
  },
];

const GARANTIAS = [
  { Icone: Banknote, texto: "Pagamento à vista no PIX" },
  { Icone: FileCheck2, texto: "Documentação feita pela loja" },
  { Icone: ShieldCheck, texto: "Proposta sem compromisso" },
];

export default function CompramosSuaMotoPage() {
  return (
    <main className="mx-auto max-w-[1100px] px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] ouro">
        Avaliação sem compromisso
      </p>

      <h1 className="titulo mt-4 max-w-3xl text-[clamp(2rem,5vw,3.2rem)] claro">
        Compramos sua moto. <span className="ouro">Pagamento no PIX.</span>
      </h1>

      <p className="mt-4 max-w-2xl text-[15px] leading-7 suave sm:text-base">
        Preencha os dados da moto, envie pelo WhatsApp com as fotos e receba
        a proposta da {LOJA.nome}. Também aceitamos a sua moto na troca por
        outra do nosso estoque.
      </p>

      <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
        {GARANTIAS.map(({ Icone, texto }) => (
          <li key={texto} className="flex items-center gap-2 text-[13.5px] text-white/75">
            <Icone size={16} className="text-[#e0b129]" />
            {texto}
          </li>
        ))}
      </ul>

      {/* Os três passos, como na referência: número pequeno, título, texto. */}
      <ol className="mt-12 grid gap-8 border-y border-white/[.08] py-9 sm:grid-cols-3 sm:gap-10">
        {PASSOS.map((passo) => (
          <li key={passo.numero}>
            <span className="font-mono text-[12px] ouro">{passo.numero}</span>
            <h2 className="mt-1.5 text-[16.5px] font-semibold text-white">{passo.titulo}</h2>
            <p className="mt-2 text-[14px] leading-6 suave">{passo.texto}</p>
          </li>
        ))}
      </ol>

      <div className="mt-12">
        <FormVenderMoto />
      </div>
    </main>
  );
}
