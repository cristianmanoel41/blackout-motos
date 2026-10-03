import type { NextConfig } from "next";

/*
 * As fotos das motos ficam no Storage do Supabase, em outro
 * domínio. O next/image só otimiza imagem de fora quando o
 * domínio está liberado aqui - sem isto a foto nem carrega.
 *
 * O endereço sai da própria variável de ambiente, então
 * trocar de projeto no Supabase não exige mexer neste arquivo.
 */
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL;

const hostSupabase = supabase
  ? new URL(supabase).hostname
  : undefined;

const nextConfig: NextConfig = {
  /*
   * Em desenvolvimento o Next só atende o endereço com que
   * subiu. Para abrir o site do celular ou do notebook da loja
   * - pela rede daqui ou pelo Tailscale - esses endereços
   * precisam estar liberados, senão o CSS e o JS não chegam e
   * a página aparece sem forma nenhuma.
   *
   * Vale só no dev: em produção o Next ignora esta lista.
   */
  allowedDevOrigins: [
    "192.168.15.11",
    "desktop-fap6db3.tail309103.ts.net",
    "*.tail309103.ts.net",
  ],

  /*
   * A versao trabalhada morou em /novo enquanto era teste.
   * Agora ela e a capa, e quem guardou o endereco antigo cai
   * no lugar certo em vez de dar em pagina inexistente.
   */
  async redirects() {
    return [
      { source: "/novo", destination: "/", permanent: false },
      { source: "/v2", destination: "/", permanent: false },
    ];
  },

  images: {
    /*
     * AS FOTOS DAS MOTOS SAO PEQUENAS E NAO DA PARA MUDAR ISSO
     * AQUI
     *
     * Os arquivos no Storage tem 720x1280 e vem do WhatsApp -
     * o nome deles ainda diz isso. O WhatsApp recomprime e
     * corta para 1280 no lado maior, entao a nitidez ja chega
     * perdida. Nenhuma configuracao inventa pixel que nao
     * existe.
     *
     * O que da para fazer e nao perder MAIS:
     *
     * - AVIF antes de WebP: na mesma banda ele guarda bem mais
     *   detalhe, e detalhe e o que falta numa foto ja
     *   recomprimida.
     * - qualidade 90 liberada para as fotos de moto. O padrao
     *   do Next e 75, que e bom para foto grande e ruim para
     *   foto pequena: a perda cai duas vezes em cima da mesma
     *   imagem.
     */
    formats: ["image/avif", "image/webp"],
    qualities: [75, 90],

    remotePatterns: hostSupabase
      ? [
          {
            protocol: "https",
            hostname: hostSupabase,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
