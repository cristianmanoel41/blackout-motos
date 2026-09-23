import {
  csvDoCatalogo,
  respostaCsv,
} from "@/lib/dados/catalogo-meta";

/*
 * O mesmo catálogo, no endereço sem extensão.
 *
 * Fica de pé para não quebrar quem já anotou este endereço.
 * Quem o Meta busca é o /catalogo.csv - lá está o porquê.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return respostaCsv(await csvDoCatalogo());
}
