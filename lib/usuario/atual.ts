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

/*
 * Nome decente a partir do e-mail, para quem ainda não
 * preencheu o perfil: cristian@admin.com -> Cristian.
 */
function nomeAPartirDoEmail(email?: string | null) {
  const usuario = String(email || "")
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .trim();

  if (!usuario) return "";

  return usuario
    .split(/\s+/)
    .map(
      (parte) =>
        parte.charAt(0).toUpperCase() +
        parte.slice(1).toLowerCase()
    )
    .join(" ");
}

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
          nomeAPartirDoEmail(user.email) ||
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
 * Vendedores da loja: a lista e as funções ficam em
 * lib/dados/vendedores.ts, que não tem "use client" e por
 * isso serve também para os relatórios, que rodam no
 * servidor. Reexportados aqui para as telas que já os
 * importavam deste arquivo.
 */
export {
  VENDEDORES,
  vendedorDoUsuario,
  nomeCurtoVendedor,
} from "@/lib/dados/vendedores";
