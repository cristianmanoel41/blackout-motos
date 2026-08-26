"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/*
 * Usuário logado, com o nome do perfil.
 *
 * É esse nome que entra automaticamente como vendedor nas
 * vendas, para ninguém precisar escolher na mão.
 */

export type UsuarioAtual = {
  id: string;
  nome: string;
  papel: string | null;
  email: string | null;
};

const supabase = createClient();

export function useUsuarioAtual() {
  const [usuario, setUsuario] =
    useState<UsuarioAtual | null>(null);

  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelado) {
          setUsuario(null);
          setCarregando(false);
        }
        return;
      }

      const { data: perfil } = await supabase
        .from("profiles")
        .select("nome, papel, email")
        .eq("id", user.id)
        .single();

      if (cancelado) return;

      setUsuario({
        id: user.id,
        /*
         * Sem perfil cadastrado, usa a parte do e-mail antes
         * do @ - melhor do que deixar a venda sem vendedor.
         */
        nome:
          perfil?.nome?.trim() ||
          user.email?.split("@")[0] ||
          "Usuário",
        papel: perfil?.papel ?? null,
        email: perfil?.email ?? user.email ?? null,
      });

      setCarregando(false);
    }

    carregar();

    return () => {
      cancelado = true;
    };
  }, []);

  return { usuario, carregando };
}

/*
 * Lista de nomes para o campo de vendedor: os vendedores da
 * loja mais o nome de quem está logado, se for outro.
 */
export function opcoesDeVendedor(
  vendedores: readonly string[],
  nomeAtual?: string | null
): string[] {
  const lista = [...vendedores];

  const atual = (nomeAtual || "").trim();

  if (
    atual &&
    !lista.some(
      (nome) =>
        nome.toLowerCase() === atual.toLowerCase()
    )
  ) {
    lista.unshift(atual);
  }

  return lista;
}

export const VENDEDORES = [
  "Cristian",
  "Bruno",
] as const;
