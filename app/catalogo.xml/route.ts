import {
  respostaXml,
  xmlDoCatalogo,
} from "@/lib/dados/catalogo-meta";

/*
 * O catálogo na raiz do site.
 *
 * Mesmo conteúdo de /api/meta/catalogo.xml. Existe porque o
 * leitor de feed do Meta recusou o outro endereço sem dizer o
 * porquê, e "/api/" no caminho é a diferença mais visível
 * entre ele e o que esses leitores esperam: um arquivo na
 * raiz, com extensão.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return respostaXml(await xmlDoCatalogo());
}
