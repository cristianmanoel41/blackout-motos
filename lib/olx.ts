import { createClient } from "@/lib/supabase/server";

/*
 * Conversa com a OLX.
 *
 * Tudo que e endereco ou formato deles mora aqui: quando
 * mudarem alguma coisa, o conserto e num lugar so.
 *
 * O fluxo e: a loja autoriza uma vez, o token fica guardado, e
 * dai em diante o sistema manda o estoque. A OLX publica,
 * atualiza preco e tira do ar quando a moto sai - sem ninguem
 * lembrar de baixar anuncio.
 */

const AUTORIZAR = "https://auth.olx.com.br/oauth";

const TOKEN = "https://auth.olx.com.br/oauth/token";

const IMPORTAR =
  "https://apps.olx.com.br/autoupload/import";

/* O que esta no ar agora, direto da OLX. */
const PUBLICADOS =
  "https://apps.olx.com.br/autoupload/v1/published";

/* Tabelas de codigo da OLX: marca, modelo e cilindrada. */
const MOTO_INFO =
  "https://apps.olx.com.br/autoupload/moto_info";

const CILINDRADAS =
  "https://apps.olx.com.br/autoupload/moto_cubiccms_info";

/* autoupload publica; basic_user_info diz quem autorizou. */
const ESCOPOS = "basic_user_info autoupload";

/* Moto na OLX. Carro, caminhao e barco tem outros. */
export const CATEGORIA_MOTO = 2060;

export function credenciais() {
  return {
    id: process.env.OLX_CLIENT_ID || "",
    segredo: process.env.OLX_CLIENT_SECRET || "",
  };
}

export function enderecoDeRetorno(requisicao: Request) {
  const configurado = process.env.OLX_REDIRECT_URI;

  if (configurado) return configurado;

  return `${new URL(requisicao.url).origin}/api/olx/callback`;
}

export function enderecoDeLogin(
  requisicao: Request,
  estado: string
) {
  const { id } = credenciais();

  const parametros = new URLSearchParams({
    client_id: id,
    redirect_uri: enderecoDeRetorno(requisicao),
    response_type: "code",
    scope: ESCOPOS,
    state: estado,
  });

  return `${AUTORIZAR}?${parametros.toString()}`;
}

export async function trocarCodigoPorToken(
  codigo: string,
  redirecionamento: string
) {
  const { id, segredo } = credenciais();

  const resposta = await fetch(TOKEN, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      code: codigo,
      client_id: id,
      client_secret: segredo,
      redirect_uri: redirecionamento,
      grant_type: "authorization_code",
    }),
  });

  const dados = await resposta.json().catch(() => null);

  if (!resposta.ok || !dados?.access_token) {
    throw new Error(
      dados?.error_description ||
        dados?.message ||
        `A OLX recusou o pedido (${resposta.status}).`
    );
  }

  return dados;
}

export async function salvarConta(dados: any) {
  const supabase = await createClient();

  const expira = dados.expires_in
    ? new Date(
        Date.now() + Number(dados.expires_in) * 1000
      ).toISOString()
    : null;

  const { error } = await supabase
    .from("olx_conta")
    .upsert({
      id: "principal",
      access_token: dados.access_token || null,
      refresh_token: dados.refresh_token || null,
      expira_em: expira,
      atualizado_em: new Date().toISOString(),
    });

  if (error) throw error;
}

export async function tokenSalvo() {
  const supabase = await createClient();

  const { data: conta } = await supabase
    .from("olx_conta")
    .select("access_token")
    .eq("id", "principal")
    .maybeSingle();

  if (!conta?.access_token) {
    throw new Error(
      "A OLX ainda não está conectada. Conecte em Configurações."
    );
  }

  return conta.access_token as string;
}

/*
 * As tabelas de codigo.
 *
 * Sao POST com o token no corpo - nao GET, como o resto da
 * API. E exigem User-Agent de navegador: sem ele a OLX
 * responde 404, como se o endereco nao existisse.
 */
export async function marcasDeMoto(token: string) {
  return buscarTabela(MOTO_INFO, token);
}

export async function modelosDaMarca(
  token: string,
  marca: string
) {
  return buscarTabela(`${MOTO_INFO}/${marca}`, token);
}

/* A versao e obrigatoria no anuncio e depende do modelo. */
export async function versoesDoModelo(
  token: string,
  marca: string,
  modelo: string
) {
  return buscarTabela(
    `${MOTO_INFO}/${marca}/${modelo}`,
    token
  );
}

export async function cilindradas(token: string) {
  return buscarTabela(CILINDRADAS, token);
}

async function buscarTabela(
  endereco: string,
  token: string
) {
  const resposta = await fetch(endereco, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0",
    },
    body: JSON.stringify({ access_token: token }),
  });

  if (!resposta.ok) {
    throw new Error(
      `A OLX não devolveu a tabela (${resposta.status}).`
    );
  }

  return resposta.json();
}

/*
 * O que a OLX tem publicado desta conta.
 *
 * Diferente do resto da API, esta chamada quer o token no
 * cabecalho, no formato Bearer - e nao no corpo. Traz ate
 * fetch_size anuncios por vez.
 */
export async function anunciosPublicados(
  token: string,
  quantidade = 100
) {
  const endereco = `${PUBLICADOS}?ads_status=published&fetch_size=${quantidade}`;

  const resposta = await fetch(endereco, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!resposta.ok) {
    throw new Error(
      `A OLX não devolveu os anúncios (${resposta.status}).`
    );
  }

  return resposta.json();
}

/*
 * Como foi uma importacao especifica. O token do processo vale
 * 7 dias na OLX; depois disso ela responde 404.
 */
export async function statusDaImportacao(
  token: string,
  processo: string
) {
  const resposta = await fetch(
    `${IMPORTAR}/${processo}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0",
      },
    }
  );

  if (!resposta.ok) {
    throw new Error(
      `A OLX não devolveu o status (${resposta.status}).`
    );
  }

  return resposta.json();
}

/*
 * Manda anuncios para a OLX.
 *
 * A resposta nao diz se o anuncio foi aceito - diz que a
 * importacao comecou, e devolve um token de processo. O status
 * de cada anuncio sai depois, consultado por esse token.
 */
export async function importarAnuncios(
  token: string,
  anuncios: any[]
) {
  const resposta = await fetch(IMPORTAR, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      /*
       * Sem User-Agent de navegador a OLX responde 404, como
       * se o endereco nao existisse - o mesmo que acontecia
       * com as tabelas de codigo. Publicar e remover anuncio
       * passam por aqui, entao os dois quebravam.
       */
      "User-Agent": "Mozilla/5.0",
    },
    body: JSON.stringify({
      access_token: token,
      ad_list: anuncios,
    }),
  });

  const dados = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    throw new Error(
      dados?.statusMessage ||
        dados?.message ||
        `A OLX recusou a importação (${resposta.status}).`
    );
  }

  return dados;
}
