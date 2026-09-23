import {
  csvDoCatalogo,
  respostaCsv,
} from "@/lib/dados/catalogo-meta";

/*
 * O catálogo com extensão no endereço.
 *
 * O Meta descobre o formato do arquivo pelo fim da URL, não
 * pelo Content-Type: sem o ".csv" ele recusa dizendo "formato
 * de feed incompatível", sem nem ler o conteúdo. Por isso
 * existe este endereço, que é o cadastrado no Commerce
 * Manager.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return respostaCsv(await csvDoCatalogo());
}
