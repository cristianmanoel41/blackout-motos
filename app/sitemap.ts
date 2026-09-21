import type { MetadataRoute } from "next";
import { estoqueDoSite } from "@/lib/dados/estoque-site";

/*
 * O mapa do site para os buscadores.
 *
 * As páginas de moto entram uma a uma, com o endereço que o
 * cliente vê. Moto vendida sai do estoque e some daqui na
 * mesma hora - o Google não fica insistindo num link morto.
 *
 * As telas do sistema (dashboard, caixa, vendas) nunca entram:
 * são privadas e o robots.txt já as bloqueia.
 */

export const dynamic = "force-dynamic";

/*
 * O endereço do site. A variável manda; o valor abaixo é o
 * domínio da loja, usado quando ela não está definida.
 *
 * Ele precisa bater com o domínio que o visitante digitou:
 * endereço errado aqui faz o Google indexar um site que
 * ninguém acessa.
 */
const ENDERECO =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://blackoutmotos.com.br";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixas = [
    { url: "/", prioridade: 1 },
    { url: "/estoque", prioridade: 0.9 },
    { url: "/financiamento", prioridade: 0.7 },
    { url: "/sobre", prioridade: 0.6 },
    { url: "/contato", prioridade: 0.6 },
    { url: "/privacidade", prioridade: 0.2 },
    { url: "/termos", prioridade: 0.2 },
  ].map((pagina) => ({
    url: `${ENDERECO}${pagina.url}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: pagina.prioridade,
  }));

  try {
    const { motos, slugs } = await estoqueDoSite();

    const dasMotos = motos.map((moto) => ({
      url: `${ENDERECO}/estoque/${slugs[moto.id]}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));

    return [...fixas, ...dasMotos];
  } catch {
    /*
     * Se o banco não responder, o mapa sai só com as páginas
     * fixas em vez de a rota inteira falhar.
     */
    return fixas;
  }
}
