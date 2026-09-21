import type { Metadata } from "next";
import Link from "next/link";
import { ENDERECO_COMPLETO, LOJA } from "@/lib/dados/loja";

/*
 * Termos de uso do site.
 *
 * Curtos e honestos: o site é uma vitrine, não uma loja
 * virtual. Nada se compra por aqui, e é isso que estes termos
 * precisam deixar claro - principalmente sobre preço e
 * disponibilidade, que mudam mais rápido que a página.
 */

export const metadata: Metadata = {
  title: "Termos de uso",
  description: `Regras de uso do site da ${LOJA.nome.toUpperCase()}.`,
};

const ATUALIZADA = "21 de setembro de 2026";

function Bloco({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-9">
      <h2 className="text-lg font-black uppercase texto-claro sm:text-xl">
        {titulo}
      </h2>

      <div className="mt-3 space-y-3 text-sm leading-7 texto-suave">
        {children}
      </div>
    </section>
  );
}

export default function TermosPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <p className="text-[11px] font-bold uppercase tracking-[0.3em] texto-ouro">
        Termos
      </p>

      <h1 className="mt-2 text-3xl font-black uppercase texto-claro sm:text-4xl">
        Termos de uso
      </h1>

      <p className="mt-3 text-sm texto-suave">
        Atualizados em {ATUALIZADA}.
      </p>

      <Bloco titulo="Para que serve este site">
        <p>
          Este site é a vitrine da{" "}
          {LOJA.nome.toUpperCase()},{" "}
          {ENDERECO_COMPLETO}. Ele mostra as motos que temos
          no pátio e serve para você falar com a gente.
        </p>

        <p>
          <strong className="texto-claro">
            Não é uma loja virtual:
          </strong>{" "}
          nada é comprado, reservado ou pago por aqui. A
          negociação acontece no WhatsApp ou na loja.
        </p>
      </Bloco>

      <Bloco titulo="Preço e disponibilidade">
        <p>
          Os preços e as fichas são atualizados pelo nosso
          sistema e valem para pagamento à vista. Eles podem
          mudar sem aviso, e uma moto pode ser vendida antes
          de sair da página.
        </p>

        <p>
          Anúncio aqui não é proposta de venda nem garantia de
          que a moto ainda está disponível. Confirme no
          WhatsApp antes de vir.
        </p>
      </Bloco>

      <Bloco titulo="Fotos e informações da moto">
        <p>
          As fotos são das motos de verdade, tiradas na loja.
          Ano, quilometragem e itens vêm do cadastro de cada
          uma. Erro de digitação acontece; se algo não bater
          com a moto na hora da visita, o que vale é a moto.
        </p>
      </Bloco>

      <Bloco titulo="Simulação de financiamento">
        <p>
          O que o site calcula é{" "}
          <strong className="texto-claro">estimativa</strong>
          . Quem aprova crédito, define taxa e número de
          parcelas é o banco, depois da análise. O valor final
          pode ficar diferente do simulado.
        </p>
      </Bloco>

      <Bloco titulo="Avisos de moto nova">
        <p>
          Se você deixar seu contato para ser avisado, vamos
          usá-lo só para isso. Você sai da lista quando
          quiser, pedindo no WhatsApp. O que fazemos com esses
          dados está na{" "}
          <Link
            href="/privacidade"
            className="font-bold texto-ouro underline"
          >
            política de privacidade
          </Link>
          .
        </p>
      </Bloco>

      <Bloco titulo="Uso do conteúdo">
        <p>
          As fotos, textos e a marca são da loja. Copiar para
          anunciar as nossas motos em outro lugar, não.
          Compartilhar o link de uma moto com quem tem
          interesse, pode e agradecemos.
        </p>
      </Bloco>

      <Bloco titulo="Falar com a gente">
        <p>
          Dúvida sobre estes termos, sobre uma moto ou sobre
          seus dados: WhatsApp{" "}
          <a
            href={`https://wa.me/${LOJA.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold texto-ouro underline"
          >
            {LOJA.whatsappExibicao}
          </a>
          .
        </p>
      </Bloco>
    </main>
  );
}
