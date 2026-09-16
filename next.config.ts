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
