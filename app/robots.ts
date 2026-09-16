import type { MetadataRoute } from "next";

/*
 * O que os buscadores podem ler.
 *
 * O site é aberto; o sistema de gestão, não. As telas internas
 * já exigem login, mas bloqueá-las aqui evita que apareçam em
 * busca por endereço e que o robô fique batendo numa página
 * que só devolve redirecionamento para o login.
 *
 * A vitrine por link também fica de fora: aquele endereço é
 * para a loja mandar a quem ela escolher, não para virar
 * resultado de busca.
 */

const ENDERECO =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://blackout-motos-amber.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/dashboard",
        "/vendas",
        "/caixa",
        "/relatorios",
        "/clientes",
        "/despesas",
        "/gastos",
        "/capacetes",
        "/motos/",
        "/documentos/",
        "/recibos/",
        "/historico",
        "/anotacoes",
        "/configuracoes",
        "/olx",
        "/vitrine/",
        "/login",
      ],
    },
    sitemap: `${ENDERECO}/sitemap.xml`,
  };
}
