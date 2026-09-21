import { createClient } from "@/lib/supabase/server";

/*
 * Conversa com o TikTok.
 *
 * O sistema NÃO publica nada: ele entrega o vídeo na caixa de
 * entrada da conta da loja, como rascunho. Quem escolhe som,
 * capa e texto, e quem aperta publicar, é a pessoa, no
 * aplicativo. É por isso que este caminho não depende da
 * auditoria do TikTok - do lado deles, quem posta é gente.
 *
 * O token de acesso vale 24 horas e é trocado sozinho quando
 * está perto de vencer. O de renovação vale um ano; passou
 * disso, a loja autoriza de novo em Configurações.
 *
 * Tudo aqui é de servidor: o client_secret e os tokens nunca
 * chegam ao navegador.
 */

const AUTORIZAR = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN = "https://open.tiktokapis.com/v2/oauth/token/";
const RASCUNHO =
  "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/";
const SITUACAO =
  "https://open.tiktokapis.com/v2/post/publish/status/fetch/";

/*
 * Só o necessário para mandar o rascunho. Pedir escopo a mais
 * atrasa a análise do TikTok e assusta na tela de autorização.
 */
export const ESCOPO = "video.upload";

/* Troca o token cinco minutos antes de ele vencer. */
const FOLGA = 5 * 60 * 1000;

/*
 * Pedaços de 32 MB.
 *
 * O TikTok aceita de 5 a 64 MB por pedaço; o último leva o
 * resto. Vídeo de até 64 MB - que é o caso de quase todo
 * clipe de moto - vai inteiro, de uma vez só.
 */
const PEDACO = 32 * 1024 * 1024;
const INTEIRO = 64 * 1024 * 1024;

export type Conta = {
  open_id: string | null;
  nome_usuario: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expira_em: string | null;
  refresh_expira_em: string | null;
  conectado_em: string | null;
};

export function configurado() {
  return Boolean(
    process.env.TIKTOK_CLIENT_KEY &&
      process.env.TIKTOK_CLIENT_SECRET
  );
}

/*
 * O endereço de volta precisa bater letra por letra com o que
 * está cadastrado no app do TikTok, senão eles recusam antes
 * mesmo de mostrar a tela de autorização.
 */
export function enderecoDeVolta() {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://blackoutmotos.com.br";

  return `${base.replace(/\/$/, "")}/api/tiktok/retorno`;
}

export function enderecoDeAutorizacao(estado: string) {
  const busca = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY || "",
    scope: ESCOPO,
    response_type: "code",
    redirect_uri: enderecoDeVolta(),
    state: estado,
  });

  return `${AUTORIZAR}?${busca}`;
}

/* ---------------------------------------------------------- */
/* TOKENS                                                      */
/* ---------------------------------------------------------- */

async function pedirToken(campos: Record<string, string>) {
  const resposta = await fetch(TOKEN, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache",
    },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY || "",
      client_secret: process.env.TIKTOK_CLIENT_SECRET || "",
      ...campos,
    }),
  });

  const corpo = await resposta.json().catch(() => null);

  if (!resposta.ok || corpo?.error) {
    throw new Error(
      corpo?.error_description ||
        corpo?.error ||
        `o TikTok recusou (${resposta.status})`
    );
  }

  return corpo as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    refresh_expires_in: number;
    open_id: string;
    scope: string;
  };
}

function emSegundos(segundos: number) {
  return new Date(
    Date.now() + Number(segundos || 0) * 1000
  ).toISOString();
}

async function guardar(dados: {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  open_id?: string;
  scope?: string;
}) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("tiktok_conta")
    .upsert({
      id: "principal",
      open_id: dados.open_id || null,
      access_token: dados.access_token,
      refresh_token: dados.refresh_token,
      expira_em: emSegundos(dados.expires_in),
      refresh_expira_em: emSegundos(
        dados.refresh_expires_in
      ),
      escopo: dados.scope || ESCOPO,
      atualizado_em: new Date().toISOString(),
    });

  if (error) throw new Error(error.message);
}

/* A primeira autorização, logo depois da tela do TikTok. */
export async function trocarCodigo(codigo: string) {
  const dados = await pedirToken({
    code: codigo,
    grant_type: "authorization_code",
    redirect_uri: enderecoDeVolta(),
  });

  await guardar(dados);

  return dados;
}

export async function contaSalva(): Promise<Conta | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("tiktok_conta")
    .select("*")
    .eq("id", "principal")
    .maybeSingle();

  return (data as Conta) || null;
}

/*
 * O token pronto para usar.
 *
 * Se está perto de vencer, renova antes de devolver - assim
 * quem chama nunca precisa saber que existe renovação. Se a
 * renovação também venceu, devolve nulo: só autorizando de
 * novo.
 */
export async function tokenValido() {
  const conta = await contaSalva();

  if (!conta?.access_token || !conta.refresh_token) {
    return null;
  }

  const vence = conta.expira_em
    ? new Date(conta.expira_em).getTime()
    : 0;

  if (vence - FOLGA > Date.now()) {
    return conta.access_token;
  }

  const dados = await pedirToken({
    grant_type: "refresh_token",
    refresh_token: conta.refresh_token,
  });

  await guardar(dados);

  return dados.access_token;
}

/* ---------------------------------------------------------- */
/* O ENVIO                                                     */
/* ---------------------------------------------------------- */

type Pedaco = { inicio: number; fim: number };

/*
 * Como o arquivo vai ser fatiado.
 *
 * Todos os pedaços têm o mesmo tamanho, menos o último, que
 * leva o resto - é a regra do TikTok. Vídeo pequeno vai
 * inteiro, num pedaço só.
 */
function fatiar(tamanho: number): Pedaco[] {
  if (tamanho <= INTEIRO) {
    return [{ inicio: 0, fim: tamanho - 1 }];
  }

  const quantos = Math.floor(tamanho / PEDACO);
  const pedacos: Pedaco[] = [];

  for (let i = 0; i < quantos; i++) {
    const inicio = i * PEDACO;

    const fim =
      i === quantos - 1
        ? tamanho - 1
        : inicio + PEDACO - 1;

    pedacos.push({ inicio, fim });
  }

  return pedacos;
}

export async function mandarParaORascunho({
  url,
  tamanho,
  tipo,
}: {
  url: string;
  tamanho: number;
  tipo: string;
}) {
  const token = await tokenValido();

  if (!token) {
    throw new Error(
      "A loja não está conectada ao TikTok. Conecte em Configurações."
    );
  }

  const pedacos = fatiar(tamanho);

  /* 1. Avisa o TikTok do que vem por aí e pega o endereço. */
  const abertura = await fetch(RASCUNHO, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      source_info: {
        source: "FILE_UPLOAD",
        video_size: tamanho,
        chunk_size:
          pedacos[0].fim - pedacos[0].inicio + 1,
        total_chunk_count: pedacos.length,
      },
    }),
  });

  const inicio = await abertura.json().catch(() => null);

  const erro = inicio?.error;

  if (!abertura.ok || (erro?.code && erro.code !== "ok")) {
    throw new Error(
      erro?.message ||
        `o TikTok recusou o envio (${abertura.status})`
    );
  }

  const destino: string = inicio?.data?.upload_url;
  const publishId: string = inicio?.data?.publish_id;

  if (!destino) {
    throw new Error(
      "O TikTok não devolveu para onde mandar o vídeo."
    );
  }

  /*
   * 2. Entrega o arquivo, pedaço por pedaço.
   *
   * Cada pedaço é buscado no Supabase por faixa de bytes e
   * repassado na hora. O arquivo inteiro nunca fica na
   * memória do servidor - vídeo de moto passa fácil de 100 MB.
   */
  for (const pedaco of pedacos) {
    const parte = await fetch(url, {
      headers: {
        Range: `bytes=${pedaco.inicio}-${pedaco.fim}`,
      },
    });

    if (!parte.ok) {
      throw new Error(
        `Não deu para ler o vídeo guardado (${parte.status}).`
      );
    }

    const bytes = await parte.arrayBuffer();

    const envio = await fetch(destino, {
      method: "PUT",
      headers: {
        "Content-Type": tipo || "video/mp4",
        "Content-Length": String(bytes.byteLength),
        "Content-Range": `bytes ${pedaco.inicio}-${pedaco.fim}/${tamanho}`,
      },
      body: bytes,
    });

    if (!envio.ok) {
      throw new Error(
        `O TikTok recusou um pedaço do vídeo (${envio.status}).`
      );
    }
  }

  return { publishId };
}

/* Em que pé está o rascunho, do lado do TikTok. */
export async function situacaoDoEnvio(publishId: string) {
  const token = await tokenValido();

  if (!token) return null;

  const resposta = await fetch(SITUACAO, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({ publish_id: publishId }),
  });

  const corpo = await resposta.json().catch(() => null);

  return corpo?.data?.status || null;
}
