/*
 * As avaliações da loja no Google.
 *
 * Roda só no servidor. A chave fica em GOOGLE_PLACES_API_KEY,
 * sem o prefixo NEXT_PUBLIC_ de propósito: com ele a chave iria
 * junto no pacote do navegador e qualquer visitante poderia
 * copiá-la e gastar a cota da loja.
 *
 * O resultado fica em cache por 24 horas. O Google cobra por
 * consulta, e avaliação de loja não muda de um dia para o
 * outro - sem o cache, cada visita ao site viraria uma
 * cobrança. Com ele, o site consulta uma vez por dia, e a
 * mesma resposta serve para todos os visitantes.
 *
 * Quando a chave falta, a API está desligada ou o Google não
 * responde, devolve nulo e a seção cai de volta nos botões.
 * Site no ar vale mais que avaliação na tela.
 */

import { GOOGLE } from "@/lib/dados/loja";

const HORAS = 60 * 60;

export type AvaliacaoGoogle = {
  autor: string;
  foto: string | null;
  nota: number;
  texto: string;
  quando: string;
  link: string | null;
};

export type ResumoGoogle = {
  nota: number | null;
  total: number | null;
  avaliacoes: AvaliacaoGoogle[];
};

export async function avaliacoesDoGoogle(): Promise<ResumoGoogle | null> {
  const chave = process.env.GOOGLE_PLACES_API_KEY;

  if (!chave) return null;

  try {
    const resposta = await fetch(
      `https://places.googleapis.com/v1/places/${GOOGLE.placeId}?languageCode=pt-BR`,
      {
        headers: {
          "X-Goog-Api-Key": chave,
          "X-Goog-FieldMask":
            "rating,userRatingCount,reviews",
        },
        next: { revalidate: 24 * HORAS },
      }
    );

    if (!resposta.ok) return null;

    const dados = await resposta.json();

    const avaliacoes: AvaliacaoGoogle[] = (
      dados?.reviews || []
    )
      .map((item: any) => ({
        autor:
          item?.authorAttribution?.displayName || "Cliente",
        foto: item?.authorAttribution?.photoUri || null,
        nota: Number(item?.rating) || 0,
        texto:
          item?.originalText?.text ||
          item?.text?.text ||
          "",
        quando:
          item?.relativePublishTimeDescription || "",
        link: item?.googleMapsUri || null,
      }))
      /* Avaliação só com estrela, sem texto, não diz nada. */
      .filter(
        (item: AvaliacaoGoogle) => item.texto.trim().length > 0
      );

    return {
      nota: Number(dados?.rating) || null,
      total: Number(dados?.userRatingCount) || null,
      avaliacoes,
    };
  } catch {
    return null;
  }
}
