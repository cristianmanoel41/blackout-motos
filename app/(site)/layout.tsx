import type { Metadata } from "next";
import "./site.css";
import "./v2.css";
import {
  fonteSite,
  fonteTitulo,
} from "@/lib/fonte-site";
import { Analytics } from "@vercel/analytics/next";
import Pixel from "@/components/site/Pixel";
import Medidor from "@/components/site/Medidor";
import { scriptDoWhatsApp } from "@/components/site/medicao";
import Cabecalho from "@/components/v2/Cabecalho";
import Rodape from "@/components/v2/Rodape";
import { estoqueDoSite } from "@/lib/dados/estoque-site";
import { anoDaMoto, nomeDaMoto } from "@/lib/dados/moto-site";
import type { MotoBusca } from "@/components/v2/Busca";
import {
  ENDERECO_COMPLETO,
  GOOGLE,
  HORARIOS,
  LOJA,
  REDES,
} from "@/lib/dados/loja";

/*
 * Moldura do site público.
 *
 * O AppShell já deixa estas rotas passarem sem o menu do
 * sistema; aqui entra a moldura do site: cabeçalho fixo,
 * rodapé e o tema escuro.
 *
 * O cabeçalho traz a busca, e a busca precisa saber o que a
 * loja tem hoje - por isso a moldura carrega o estoque. A
 * função é envolvida em cache(), então a capa pede o mesmo
 * estoque sem custar uma segunda ida ao banco.
 *
 * "only light" do painel não vale aqui - este é o único canto
 * escuro de propósito, e color-scheme dark evita que o
 * navegador clareie campo e barra de rolagem.
 */

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
      "https://blackoutmotos.com.br"
  ),
  title: {
    default: `${LOJA.nome.toUpperCase()} | Motos Seminovas em ${LOJA.cidade}`,
    template: `%s | ${LOJA.nome.toUpperCase()}`,
  },

  /*
   * Prova ao Meta que este domínio é da loja.
   *
   * Sem isso ele recusa o catálogo inteiro: entende que os
   * links das motos não são "do domínio da sua empresa" e não
   * carrega item nenhum. Também é o que libera anúncio com
   * link para o site.
   */
  verification: {
    other: {
      "facebook-domain-verification":
        "y375blqoxqyb5qrls92mo7ssk6m187",
    },
  },
  description: `Motos selecionadas, financiamento e troca em ${LOJA.cidade}. Confira o estoque da ${LOJA.nome.toUpperCase()}.`,
  keywords: [
    "motos seminovas",
    "moto usada",
    LOJA.cidade,
    "financiamento de moto",
    LOJA.nome,
  ],
  openGraph: {
    siteName: LOJA.nome,
    locale: "pt_BR",
    type: "website",
    title: `${LOJA.nome.toUpperCase()} | Motos Seminovas em ${LOJA.cidade}`,
    description: ENDERECO_COMPLETO,
    images: ["/logo-blackout-site.png"],
  },
  icons: {
    icon: "/logo-blackout-site.png",
    apple: "/logo-blackout-site.png",
  },
  robots: { index: true, follow: true },
};

/*
 * A ficha da loja em linguagem de buscador.
 *
 * É por aqui que o Google entende endereço, telefone e
 * horário de funcionamento - e pode mostrar "aberto agora"
 * direto no resultado da busca, sem a pessoa entrar no site.
 */
const FICHA_DA_LOJA = {
  "@context": "https://schema.org",
  "@type": "MotorcycleDealer",
  name: LOJA.nome,
  /*
   * O endereço do site e a ficha no Google, juntos: é assim
   * que o buscador entende que o site e a loja do mapa são
   * a mesma empresa, e não dois resultados concorrendo.
   */
  url:
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://blackoutmotos.com.br",
  image: "/logo-blackout-site.png",
  priceRange: "$",
  telephone: LOJA.whatsappExibicao,
  address: {
    "@type": "PostalAddress",
    streetAddress: LOJA.endereco,
    addressLocality: LOJA.cidade,
    addressRegion: LOJA.estado,
    postalCode: LOJA.cep,
    addressCountry: "BR",
  },
  openingHoursSpecification: HORARIOS.filter(
    (item) => item.dias.length > 0
  ).map((item) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: item.dias,
    opens: item.abre,
    closes: item.fecha,
  })),
  sameAs: REDES.filter((rede) => rede.url).map(
    (rede) => rede.url
  ),
  hasMap: GOOGLE.perfil,
};

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /*
   * Agora TODA página do site passa por aqui, inclusive as que
   * não dependem de banco - privacidade, termos, contato. Se o
   * estoque falhar, o cabeçalho fica sem busca e o resto da
   * página continua de pé: site no ar vale mais que caixa de
   * procura na tela.
   */
  let paraBusca: MotoBusca[] = [];

  try {
    const { motos, slugs } = await estoqueDoSite();

    paraBusca = motos.map((moto) => ({
      nome: nomeDaMoto(moto),
      slug: slugs[moto.id],
      ano: anoDaMoto(moto),
    }));
  } catch {
    paraBusca = [];
  }

  return (
    <div
      className={`${fonteSite.variable} ${fonteTitulo.variable} site-blackout v2 min-h-screen`}
    >
      <style>{`
        html, body {
          background-color: #0a0a0c;
          color-scheme: dark;
        }
      `}</style>

      {/*
        * Avisa a página que tem JS antes do primeiro quadro.
        * As seções que sobem ao entrar na tela só se escondem
        * quando esta etiqueta existe - sem script, elas
        * aparecem normalmente em vez de ficarem invisíveis.
        */}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.dataset.js="sim"`,
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(FICHA_DA_LOJA),
        }}
      />

      {/*
        * O clique no WhatsApp, escutado desde o primeiro
        * instante.
        *
        * O botao do WhatsApp e um link comum: funciona assim
        * que o HTML aparece na tela, bem antes de o React
        * terminar de carregar. Quem clica rapido - e no
        * celular, na rua, e quase sempre rapido - cairia numa
        * fresta onde o WhatsApp abre e o clique nao conta.
        *
        * Por isso este vem plantado no HTML, e nao dentro do
        * <Medidor />. E o unico numero que liga visita a
        * conversa; nao pode depender de carregamento.
        */}
      <script
        dangerouslySetInnerHTML={{ __html: scriptDoWhatsApp() }}
      />

      <Cabecalho motos={paraBusca} />

      {children}

      <Rodape />

      {/*
        * A contagem de acessos, da propria Vercel.
        *
        * So no site: o sistema da loja fica de fora, senao o
        * dia inteiro de trabalho de voces entraria na conta e
        * o numero de visitante deixaria de valer.
        *
        * Nao usa cookie e nao segue ninguem de site em site,
        * entao nao pede aviso de cookies. Nada roda no
        * localhost - so no que esta publicado.
        */}
      <Analytics />

      {/*
        * A nossa propria contagem, do lado da Vercel.
        *
        * A dela diz quanta gente entrou; esta diz QUAL MOTO a
        * pessoa abriu e se ela chamou no WhatsApp - o que a
        * Vercel nao tem como saber, porque para ela o endereco
        * da ficha e so um texto.
        *
        * Tambem nao usa cookie e tambem nao segue ninguem, por
        * isso fica fora do aviso. E so mede no site publicado.
        */}
      <Medidor />

      {/*
        * O pixel do Meta e o aviso de cookies. Sem a
        * variavel de ambiente, nao renderiza nada.
        */}
      <Pixel />
    </div>
  );
}
