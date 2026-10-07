/*
 * De onde o site tira as motos.
 *
 * Uma porta só para as duas páginas: a lista e a página da
 * moto. As funções do banco devolvem apenas colunas de vitrine
 * - valor de compra, gastos, fornecedor, placa, chassi, RENAVAM
 * e dado de cliente não passam por aqui.
 *
 * Só entra moto disponível e com foto: card sem imagem não
 * vende e, no meio dos outros, passa a impressão de estoque
 * malcuidado.
 */

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  slugsDoEstoque,
  type MotoSite,
} from "@/lib/dados/moto-site";
import {
  fotosDasMotos,
  type Fotos,
} from "@/lib/dados/fotos-site";

export type EstoqueDoSite = {
  motos: MotoSite[];
  fotos: Fotos;
  slugs: Record<string, string>;
  /*
   * A lista veio vazia porque o pátio está vazio, ou porque
   * a consulta quebrou?
   *
   * Antes isto se perdia: o erro era descartado e a lista
   * caía para vazia, então uma falha de banco chegava ao
   * cliente como "0 motos à pronta entrega — estamos
   * renovando o estoque". Dizer que a loja não tem moto
   * quando ela tem vinte e uma é o pior jeito de errar.
   */
  falhou: boolean;
};

/*
 * Envolvido em cache() porque agora duas partes da mesma
 * página pedem o estoque: a busca do cabeçalho, que mora na
 * moldura, e a capa. Sem isso seriam duas idas ao banco para
 * montar uma tela só. O cache vale por requisição - a página
 * seguinte pergunta de novo, e moto vendida some na hora.
 */
export const estoqueDoSite = cache(async function estoqueDoSite(): Promise<EstoqueDoSite> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("estoque_publico");

  if (error) {
    /* No log do servidor, para aparecer na Vercel. */
    console.error(
      "[estoque do site] a consulta falhou:",
      error.message
    );
  }

  const todas = (data || []) as MotoSite[];

  const fotos = await fotosDasMotos(
    todas.map((moto) => moto.id)
  );

  const motos = todas.filter(
    (moto) => (fotos.galerias[moto.id] || []).length > 0
  );

  return {
    motos,
    fotos,
    slugs: slugsDoEstoque(motos),
    /* Qualquer uma das duas consultas esvazia a vitrine. */
    falhou: Boolean(error) || Boolean(fotos.falhou),
  };
});

/*
 * Acha a moto pelo endereço.
 *
 * O slug é montado a partir dos dados da moto, não guardado no
 * banco, então a procura passa pelo estoque inteiro - são
 * poucas dezenas de linhas, e assim não é preciso criar coluna
 * nem manter slug sincronizado quando alguém corrige o modelo.
 */
export async function motoPorSlug(slug: string) {
  const estoque = await estoqueDoSite();

  const id = Object.keys(estoque.slugs).find(
    (chave) => estoque.slugs[chave] === slug
  );

  if (!id) return null;

  const moto = estoque.motos.find(
    (item) => item.id === id
  );

  if (!moto) return null;

  return { moto, estoque };
}
