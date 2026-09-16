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
};

export async function estoqueDoSite(): Promise<EstoqueDoSite> {
  const supabase = await createClient();

  const { data } = await supabase.rpc("estoque_publico");

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
  };
}

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
