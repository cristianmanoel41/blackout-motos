import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { Eye, FileCheck2 } from "lucide-react";
import { LOJA } from "@/lib/dados/loja";
import BaixarContrato from "@/components/BaixarContrato";

export const dynamic = "force-dynamic";

/*
 * A PÁGINA QUE O CLIENTE ABRE
 *
 * Antes este endereço devolvia o PDF cru. Funcionava, mas o
 * cliente caía num leitor de PDF sem nome nem contexto, e
 * dependia do menu do navegador dele - que muda de aparelho
 * para aparelho - para conseguir salvar.
 *
 * Agora é uma página da loja: diz o que é, de quando é, e dá os
 * dois caminhos em botão grande - ver e baixar.
 *
 * NÃO ENTRA NO GRUPO (site)
 *
 * Fica fora de propósito. O layout do site carrega o estoque
 * inteiro para a busca do cabeçalho e dispara a medição de
 * visita; nada disso faz sentido para quem veio ver o próprio
 * contrato - e medir a visita de alguém lendo o contrato dele é
 * o tipo de coisa que não se faz.
 */

export const metadata: Metadata = {
  title: "Seu contrato",
  /* Fora do Google: é documento de uma pessoa só. */
  robots: { index: false, follow: false },
};

type Contrato = {
  arquivo: string;
  paginas: number;
  criado_em: string;
};

export default async function ContratoDoCliente({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const endereco = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chaveDeServico = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let contrato: Contrato | undefined;

  if (endereco && chaveDeServico) {
    const supabase = createClient(endereco, chaveDeServico, {
      auth: { persistSession: false },
    });

    const { data } = await supabase.rpc("contrato_assinado", {
      p_token: token,
    });

    contrato = (data || [])[0] as Contrato | undefined;
  }

  const moldura =
    "mx-auto w-full max-w-lg rounded-2xl border border-[#e0b129]/25 bg-[#121216] p-6 sm:p-8";

  if (!contrato) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#08080a] px-4 py-12">
        <div className={`${moldura} text-center`}>
          <h1 className="text-xl font-black uppercase text-[#f5f5f5]">
            Link indisponível
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#a7adb6]">
            Este link não está mais valendo. Se você precisa da
            cópia do seu contrato, fale com a gente que a gente
            manda de novo.
          </p>

          <a
            href={`https://wa.me/${LOJA.whatsapp}`}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-[#e0b129] px-6 py-3 text-sm font-bold text-[#08080a]"
          >
            Chamar no WhatsApp
          </a>
        </div>
      </main>
    );
  }

  const quando = new Date(contrato.criado_em).toLocaleDateString(
    "pt-BR",
    { day: "2-digit", month: "long", year: "numeric" }
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#08080a] px-4 py-12">
      <div className={moldura}>
        <header className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-blackout-marca.png"
            alt={LOJA.nome}
            className="mx-auto h-12 w-auto object-contain"
          />

          <p className="mt-6 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-[#e0b129]">
            <FileCheck2 size={14} />
            Contrato assinado
          </p>

          <h1 className="mt-3 text-2xl font-black uppercase leading-tight text-[#f5f5f5]">
            Sua cópia está aqui
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#a7adb6]">
            {contrato.paginas}{" "}
            {contrato.paginas === 1 ? "folha" : "folhas"},
            assinadas pelas duas partes em {quando}.
          </p>
        </header>

        <div className="mt-7 flex flex-col gap-3">
          {/*
            * Baixar vem primeiro e em dourado.
            *
            * Quem abre este link quer ficar com o documento -
            * foi para isso que a loja mandou. Ver é o segundo
            * passo, de quem só quer conferir uma cláusula.
            */}
          <BaixarContrato token={token} />

          <a
            href={`/contrato/${token}/arquivo`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-3.5 text-sm font-bold text-[#f5f5f5] transition"
          >
            <Eye size={16} />
            Ver na tela
          </a>
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-[#a7adb6]">
          Guarde este link: ele não vence, e o contrato continua
          aqui sempre que você precisar.
        </p>

        <footer className="mt-7 border-t border-white/[.07] pt-5 text-center">
          <p className="text-xs text-[#a7adb6]">
            Dúvida sobre o contrato?
          </p>

          <a
            href={`https://wa.me/${LOJA.whatsapp}`}
            className="mt-1 inline-block text-sm font-bold text-[#e0b129]"
          >
            Falar com a {LOJA.nome}
          </a>
        </footer>
      </div>
    </main>
  );
}
