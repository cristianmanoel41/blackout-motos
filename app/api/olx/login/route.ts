import {
  credenciais,
  enderecoDeLogin,
} from "@/lib/olx";

/*
 * Manda a loja para a OLX autorizar o sistema.
 *
 * O "state" e um numero sorteado que volta junto no retorno -
 * serve para provar que quem voltou foi quem saiu daqui.
 */

export const dynamic = "force-dynamic";

export async function GET(requisicao: Request) {
  const { id, segredo } = credenciais();

  if (!id || !segredo) {
    return Response.json(
      {
        error:
          "Faltam as credenciais da OLX. Configure OLX_CLIENT_ID e OLX_CLIENT_SECRET.",
      },
      { status: 500 }
    );
  }

  const estado = crypto.randomUUID();

  return new Response(null, {
    status: 302,
    headers: {
      Location: enderecoDeLogin(requisicao, estado),
      "Set-Cookie": `olx_state=${estado}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
    },
  });
}
