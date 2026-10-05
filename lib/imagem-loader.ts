"use client";

/*
 * Quem entrega as fotos do site.
 *
 * Até 05/10/2026 quem redimensionava era a Vercel: toda foto
 * passava por /_next/image, que gerava uma versão no tamanho da
 * tela de quem acessava. Funcionava, até a cota do plano acabar
 * - e aí ela passou a responder 402 "Payment required". Doze das
 * vinte e duas fotos do estoque sumiram da página, e o cliente
 * via o quadradinho de imagem quebrada.
 *
 * O Supabase, que é onde as fotos moram, sabe redimensionar
 * sozinho. Trocar `/object/public/` por `/render/image/public/`
 * e pedir a largura devolve a foto já no tamanho certo - medido:
 * 154 KB crua contra 113 KB em 640px.
 *
 * Então a Vercel sai do caminho da imagem. Sem intermediário não
 * há cota para estourar, e o site deixa de depender de um limite
 * mensal que ninguém acompanha até ele quebrar a vitrine.
 *
 * O QUE NÃO É DO SUPABASE PASSA DIRETO
 *
 * Logo, ícone e arte ficam em /public, já no tamanho e no peso
 * certos - são servidos como estão. Endereço que este leitor não
 * reconhece volta intacto, que é a resposta segura: no pior caso
 * a imagem aparece sem redimensionar, nunca quebrada.
 */

type Pedido = {
  src: string;
  width: number;
  quality?: number;
};

/* O caminho do arquivo cru, e o caminho de quem redimensiona. */
const CRU = "/storage/v1/object/public/";
const REDIMENSIONA = "/storage/v1/render/image/public/";

/*
 * Teto de largura: 1600.
 *
 * O next/image pede até 3840 para telas grandes, mas as fotos
 * da loja saem do WhatsApp com 720 de largura - pedir 3840 numa
 * foto de 720 não inventa detalhe, só gasta. Medido: de 828 em
 * diante o arquivo devolvido é exatamente o mesmo.
 *
 * 1600 cobre com folga a foto aberta em tela cheia num celular
 * de 3x, que é o uso mais exigente que o site tem.
 */
const LARGURA_MAXIMA = 1600;

/*
 * Teto de qualidade: 80.
 *
 * Os cards pedem 90, escolha feita quando quem comprimia era a
 * Vercel, em AVIF. O Supabase devolve WebP, e nele o 90 fica
 * caro demais: 178 KB contra 114 KB do 80 - e o arquivo ORIGINAL
 * tem 154 KB. Ou seja, a qualidade 90 entregaria ao cliente uma
 * foto mais pesada do que a que está guardada, sem ganho nenhum
 * de nitidez numa imagem que o WhatsApp já recomprimiu.
 *
 * O teto é teto, não valor fixo: quem pedir menos continua
 * recebendo menos.
 */
const QUALIDADE_MAXIMA = 80;

export default function imagemDaLoja({
  src,
  width,
  quality,
}: Pedido) {
  /* Só mexe no que vem do Supabase e ainda não foi convertido. */
  if (!src.includes(CRU)) return src;

  const endereco = src.replace(CRU, REDIMENSIONA);

  const procurados = new URLSearchParams({
    width: String(Math.min(width, LARGURA_MAXIMA)),
    quality: String(Math.min(quality || 75, QUALIDADE_MAXIMA)),
    /* `contain` não corta a moto: a foto inteira cabe dentro da
       largura pedida, e a altura acompanha. Cortar sozinho
       decepa guidão e roda em foto tirada em pé. */
    resize: "contain",
  });

  return `${endereco}?${procurados.toString()}`;
}
