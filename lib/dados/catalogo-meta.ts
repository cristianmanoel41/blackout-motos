import { estoqueDoSite } from "@/lib/dados/estoque-site";
import {
  anoDaMoto,
  kmDaMoto,
  nomeDaMoto,
  numero,
  type MotoSite,
} from "@/lib/dados/moto-site";
import { LOJA } from "@/lib/dados/loja";

/*
 * O catálogo de motos para o Meta (Facebook e Instagram).
 *
 * Um CSV que o Commerce Manager busca sozinho, de hora em
 * hora. Com ele o anúncio deixa de ser imagem solta: aparece a
 * moto certa, com preço, e a conversa no WhatsApp já começa
 * falando dela.
 *
 * O ganho que mais importa numa loja: moto vendida some do
 * catálogo na busca seguinte. Ninguém precisa lembrar de
 * baixar anúncio, e a loja para de pagar para anunciar o que
 * já saiu do pátio.
 *
 * A lista é a mesma do site - só moto disponível e com foto.
 * Card sem imagem o Meta recusa, e moto vendida no anúncio
 * queima dinheiro e paciência de cliente.
 */

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://blackoutmotos.com.br";

/*
 * Campo de CSV: aspas dobradas por dentro, e o valor inteiro
 * entre aspas. Descrição de moto tem vírgula em quase toda
 * frase; sem isso o arquivo desmonta na primeira.
 */
function campo(valor: unknown) {
  const texto = String(valor ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/"/g, '""')
    .trim();

  return `"${texto}"`;
}

/* O Meta quer o número puro e a moeda: 18900.00 BRL. */
function preco(moto: MotoSite) {
  const valor = numero(moto.preco_anunciado) || 0;

  return `${valor.toFixed(2)} BRL`;
}

function descricao(moto: MotoSite) {
  const partes: string[] = [];

  const cilindrada = numero(moto.cilindrada);

  partes.push(
    `${nomeDaMoto(moto)} ${anoDaMoto(moto)}, ${kmDaMoto(
      moto.quilometragem
    )}${cilindrada ? `, ${cilindrada} cc` : ""}${
      moto.cor ? `, ${moto.cor.toLowerCase()}` : ""
    }.`
  );

  /*
   * Só entra o que está marcado na ficha. Prometer revisão ou
   * dono único sem o dado seria inventar - e o cliente cobra
   * na hora da visita.
   */
  const selos = [
    moto.unico_dono ? "único dono" : null,
    moto.possui_manual ? "com manual" : null,
    moto.possui_chave_reserva ? "chave reserva" : null,
  ].filter(Boolean);

  if (selos.length > 0) {
    partes.push(
      `${selos
        .join(", ")
        .replace(/^./, (l) => l.toUpperCase())}.`
    );
  }

  partes.push(
    `Revisada e com procedência. ${LOJA.nome.toUpperCase()}, ${
      LOJA.cidade
    }/${LOJA.estado}.`
  );

  return partes.join(" ");
}

/*
 * As colunas. As obrigatórias do Meta são id, title,
 * description, availability, condition, price, link,
 * image_link e brand; o resto ajuda a segmentar campanha sem
 * precisar mexer no anúncio depois.
 */
const COLUNAS = [
  "id",
  "title",
  "description",
  "availability",
  "condition",
  "price",
  "link",
  "image_link",
  "additional_image_link",
  "brand",
  "product_type",
  "quantity_to_sell_on_facebook",
  "custom_label_0",
  "custom_label_1",
  "custom_label_2",
];

export async function csvDoCatalogo() {
  const { motos, fotos, slugs } = await estoqueDoSite();

  const linhas = [COLUNAS.join(",")];

  motos.forEach((moto) => {
    const galeria = (fotos.galerias[moto.id] || []).filter(
      (url) => url !== fotos.capas[moto.id]
    );

    const cilindrada = numero(moto.cilindrada);

    linhas.push(
      [
        campo(moto.id),
        /* O Meta corta o título em 200; nome e ano cabem. */
        campo(`${nomeDaMoto(moto)} ${anoDaMoto(moto)}`),
        campo(descricao(moto)),
        campo("in stock"),
        campo("used"),
        campo(preco(moto)),
        campo(`${SITE}/estoque/${slugs[moto.id]}`),
        campo(fotos.capas[moto.id] || ""),
        /* Até 10 fotos extras, separadas por vírgula. */
        campo(galeria.slice(0, 10).join(",")),
        campo(moto.marca || "Moto"),
        campo("Motos"),
        /* Uma moto, uma unidade: não é loja de peça. */
        campo(1),
        campo(cilindrada ? `${cilindrada}cc` : ""),
        campo(anoDaMoto(moto)),
        campo(moto.marca || ""),
      ].join(",")
    );
  });

  /* Quebra de linha no fim: leitor de CSV antigo engasga sem. */
  return `${linhas.join("\n")}\n`;
}

/*
 * A resposta pronta, igual nos dois endereços que servem este
 * arquivo. O Meta descobre o formato pela extensão do
 * endereço, então o que vale para ele é o /catalogo.csv - o
 * outro fica de pé para não quebrar quem já o usa.
 */
export function respostaCsv(csv: string) {
  const corpo = Buffer.from(csv, "utf8");

  return new Response(corpo, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",

      /*
       * Tamanho declarado, em vez de resposta em pedaços.
       * Leitor de feed simples costuma recusar o que chega
       * sem saber o tamanho, e o do Meta parece ser um
       * deles.
       */
      "Content-Length": String(corpo.byteLength),

      "Content-Disposition":
        'inline; filename="catalogo-blackout.csv"',
      /*
       * O Meta busca de hora em hora; guardar por dez minutos
       * evita ler o banco a cada curioso que abrir o endereço.
       */
      "Cache-Control":
        "public, max-age=600, s-maxage=600",
    },
  });
}
