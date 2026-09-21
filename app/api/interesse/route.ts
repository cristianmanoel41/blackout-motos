import { createClient } from "@/lib/supabase/server";

/*
 * Cadastro na lista de interesse, feito pelo site.
 *
 * A rota não escreve na tabela: chama a função do banco, que é
 * a única com permissão para isso. Assim o visitante nunca tem
 * acesso à tabela, e a lista de telefones dos clientes não
 * pode ser lida de fora.
 *
 * A validação é repetida aqui só para devolver uma mensagem
 * em português. Quem manda é a função do banco - validação de
 * tela ninguém é obrigado a respeitar.
 */

export const runtime = "nodejs";

export async function POST(requisicao: Request) {
  const corpo = await requisicao.json().catch(() => null);

  const nome = String(corpo?.nome || "").trim();

  const telefone = String(corpo?.telefone || "").replace(
    /\D/g,
    ""
  );

  if (nome.length < 2) {
    return Response.json(
      { error: "Escreva o seu nome." },
      { status: 400 }
    );
  }

  if (telefone.length < 10 || telefone.length > 11) {
    return Response.json(
      { error: "Informe o telefone com DDD." },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "cadastrar_interesse",
    {
      p_nome: nome,
      p_telefone: telefone,
      p_procura:
        String(corpo?.procura || "")
          .trim()
          .slice(0, 80) || null,
      p_origem: String(corpo?.origem || "site").slice(0, 40),
    }
  );

  if (error) {
    console.error("Erro ao cadastrar interesse:", error);

    return Response.json(
      {
        error:
          "Não foi possível cadastrar agora. Tente de novo em instantes.",
      },
      { status: 502 }
    );
  }

  return Response.json({ ok: true });
}
