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

  images: {
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
