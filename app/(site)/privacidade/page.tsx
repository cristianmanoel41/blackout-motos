import type { Metadata } from "next";
import Link from "next/link";
import { ENDERECO_COMPLETO, LOJA } from "@/lib/dados/loja";

/*
 * Política de privacidade.
 *
 * Escrita sobre o que o site faz de verdade, não sobre um
 * modelo de internet: se um dia deixarmos de guardar alguma
 * coisa, esta página muda junto.
 *
 * Existe por dois motivos. O primeiro é a LGPD - o site pede
 * nome e WhatsApp na lista de interesse, e quem entrega o
 * contato tem o direito de saber o que acontece com ele. O
 * segundo é prático: TikTok, Google e afins exigem este
 * endereço para liberar integração.
 */

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: `Como a ${LOJA.nome.toUpperCase()} trata os dados de quem usa o site.`,
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

export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <p className="text-[11px] font-bold uppercase tracking-[0.3em] texto-ouro">
        Privacidade
      </p>

      <h1 className="mt-2 text-3xl font-black uppercase texto-claro sm:text-4xl">
        Política de privacidade
      </h1>

      <p className="mt-3 text-sm texto-suave">
        Atualizada em {ATUALIZADA}.
      </p>

      <Bloco titulo="Quem somos">
        <p>
          {LOJA.nome.toUpperCase()}, loja de motos seminovas
          em {LOJA.cidade}/{LOJA.estado}, com endereço em{" "}
          {ENDERECO_COMPLETO}. Falamos com você pelo WhatsApp{" "}
          {LOJA.whatsappExibicao}.
        </p>
      </Bloco>

      <Bloco titulo="O que pedimos, e só quando você digita">
        <p>
          <strong className="texto-claro">
            Lista de interesse.
          </strong>{" "}
          Se você pede para ser avisado quando chega moto
          nova, guardamos seu <strong>nome</strong>, seu{" "}
          <strong>WhatsApp</strong> e, se você escrever, a{" "}
          <strong>moto que procura</strong>. Usamos isso para
          uma coisa só: chamar você no WhatsApp quando entrar
          uma moto que combine. Nada de propaganda.
        </p>

        <p>
          <strong className="texto-claro">
            Simulação de financiamento.
          </strong>{" "}
          O que você preenche ali{" "}
          <strong>não é guardado por nós</strong>: os campos
          viram uma mensagem que abre no seu WhatsApp, e é
          você quem decide enviar. A partir daí a conversa
          corre no WhatsApp, como qualquer atendimento.
        </p>

        <p>
          Não pedimos CPF, RG, dado bancário nem documento por
          este site.
        </p>
      </Bloco>

      <Bloco titulo="O que o site conta sozinho">
        <p>
          Medimos quantas pessoas visitam o site e quais
          páginas são abertas, pela ferramenta de análise da
          Vercel, que hospeda o site. Essa contagem é{" "}
          <strong>anônima e agregada</strong>: ela{" "}
          <strong>não usa cookies</strong>, não cria perfil de
          ninguém e não segue você por outros sites. Serve
          para sabermos se as motos estão sendo vistas.
        </p>
      </Bloco>

      <Bloco titulo="Com quem os dados ficam">
        <p>
          Os contatos da lista de interesse ficam guardados no
          Supabase, o banco de dados do nosso sistema, com
          acesso restrito à equipe da loja.
        </p>

        <p>
          <strong className="texto-claro">
            Não vendemos, não alugamos e não trocamos seus
            dados com ninguém.
          </strong>{" "}
          Também não usamos seu contato para disparo em massa.
        </p>

        <p>
          O site tem links para WhatsApp, Google Maps, Waze e
          nossas redes sociais. Ao clicar, você entra no
          serviço deles, que tem as próprias regras — estas
          aqui valem para o nosso site.
        </p>
      </Bloco>

      <Bloco titulo="Por quanto tempo">
        <p>
          Guardamos seu contato enquanto fizer sentido avisar
          você de moto nova. Se pedir para sair, apagamos na
          hora.
        </p>
      </Bloco>

      <Bloco titulo="Seus direitos">
        <p>
          Pela Lei Geral de Proteção de Dados (Lei
          13.709/2018), você pode pedir para ver, corrigir ou
          apagar o que temos sobre você, e pode retirar o
          consentimento quando quiser.
        </p>

        <p>
          É só mandar mensagem no WhatsApp{" "}
          <a
            href={`https://wa.me/${LOJA.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold texto-ouro underline"
          >
            {LOJA.whatsappExibicao}
          </a>{" "}
          escrevendo &quot;quero sair da lista&quot;. Não
          precisa justificar, e resolvemos no mesmo dia.
        </p>
      </Bloco>

      <Bloco titulo="Mudanças">
        <p>
          Se o site passar a fazer algo diferente com os
          dados, esta página muda antes, e a data lá em cima
          muda junto.
        </p>
      </Bloco>

      <p className="mt-10 text-sm texto-suave">
        Veja também os{" "}
        <Link
          href="/termos"
          className="font-bold texto-ouro underline"
        >
          termos de uso
        </Link>
        .
      </p>
    </main>
  );
}
