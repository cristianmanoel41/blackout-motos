import {
  respostaXml,
  xmlDoCatalogo,
} from "@/lib/dados/catalogo-meta";

/*
 * O catálogo em XML, que é o que o Meta lê sem tropeçar.
 *
 * O CSV desanda no leitor deles: eles ignoram as aspas e
 * quebram a linha na primeira vírgula da descrição. Aqui cada
 * campo tem etiqueta própria e não há separador para errar.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return respostaXml(await xmlDoCatalogo());
}
