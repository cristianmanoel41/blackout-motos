import type { NextConfig } from "next";

/*
 * O endereço do Supabase não precisa mais ser liberado aqui.
 *
 * Ele existia para o otimizador da Vercel aceitar imagem de
 * outro domínio. Desde que o redimensionamento passou para o
 * próprio Supabase (veja `images`, abaixo), não há otimizador
 * nenhum para autorizar: o endereço da foto vai inteiro do
 * banco para o navegador.
 */

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
    /*
     * O IP do Tailscale, além do nome.
     *
     * Quem digita `100.91.144.52:3000` no celular não está
     * usando o nome, e o Next trata endereço fora da lista como
     * origem estranha: bloqueia os recursos de desenvolvimento
     * e a página abre com o cabeçalho e o resto preto. Não dá
     * erro na tela - só fica vazio.
     */
    "100.91.144.52",
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
    /*
     * QUEM REDIMENSIONA AGORA E O SUPABASE, NAO A VERCEL
     *
     * Em 05/10/2026 a cota de otimizacao de imagem do plano
     * acabou e a Vercel passou a responder 402 "Payment
     * required": doze das vinte e duas fotos do estoque sumiram
     * da pagina, e quem chegava do Instagram via quadradinho de
     * imagem quebrada no lugar da moto.
     *
     * O Supabase, onde as fotos ja moram, redimensiona sozinho.
     * Com o leitor de imagem proprio em lib/imagem-loader.ts a
     * Vercel sai do caminho - e sem intermediario nao ha cota
     * mensal para estourar de novo, em silencio, num sabado.
     *
     * `formats` e `remotePatterns` sumiram porque so valiam para
     * o otimizador da Vercel. `qualities` fica: ele continua
     * validando o quality={90} que os cards pedem.
     */
    loader: "custom",
    loaderFile: "./lib/imagem-loader.ts",
    qualities: [75, 90],
  },
};

export default nextConfig;
