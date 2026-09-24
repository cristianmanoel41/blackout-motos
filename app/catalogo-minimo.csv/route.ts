import { estoqueDoSite } from "@/lib/dados/estoque-site";
import {
  anoDaMoto,
  nomeDaMoto,
  numero,
} from "@/lib/dados/moto-site";

/*
 * Catálogo mínimo: uma moto, nove colunas, texto simples.
 *
 * Existe para achar o campo que o Meta recusa. Ele leu o
 * arquivo cheio e disse que faltavam link e image_link, sendo
 * que as duas colunas estavam lá e o robô dele alcança nosso
 * site (o depurador devolveu 200). Então algo em algum campo
 * derruba a leitura no meio.
 *
 * Aqui não há acento, vírgula, ponto médio nem coluna extra.
 * Se este entrar, o problema está no que eu tirei - e volto
 * somando um campo por vez.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://blackoutmotos.com.br";

function semAcento(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "");
}

export async function GET() {
  const { motos, fotos, slugs } = await estoqueDoSite();

  const moto = motos[0];

  const linhas = [
    "id,title,description,availability,condition,price,link,image_link,brand",
  ];

  if (moto) {
    const nome = semAcento(
      `${nomeDaMoto(moto)} ${anoDaMoto(moto)}`
    );

    linhas.push(
      [
        moto.id,
        nome,
        `Moto seminova revisada da Blackout Motos`,
        "in stock",
        "used",
        `${(numero(moto.preco_anunciado) || 0).toFixed(2)} BRL`,
        `${SITE}/estoque/${slugs[moto.id]}`,
        fotos.capas[moto.id] || "",
        semAcento(moto.marca || "Moto"),
      ].join(",")
    );
  }

  const corpo = Buffer.from(`${linhas.join("\n")}\n`, "utf8");

  return new Response(corpo, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Length": String(corpo.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
