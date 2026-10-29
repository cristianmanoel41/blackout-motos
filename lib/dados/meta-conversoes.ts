/*
 * A API DE CONVERSÕES DO META
 *
 * O pixel conta do navegador, e o navegador perde evento:
 * bloqueador de anúncio, Safari do iPhone, aba fechada antes
 * do script terminar. O mesmo evento, mandado também daqui do
 * servidor, chega ao Meta mesmo quando o navegador falhou. O
 * Meta junta os dois pelo event_id e conta uma vez só.
 *
 * Só manda evento de quem clicou em "Aceitar" no aviso de
 * cookies: quem chama esta função é a rota /api/meta/evento,
 * e o site só chama a rota depois do aceite (ver Pixel.tsx).
 * Quem recusou continua sem ser medido, aqui também.
 *
 * Precisa de NEXT_PUBLIC_META_PIXEL_ID e META_CAPI_TOKEN no
 * ambiente. Sem o token, não manda nada e o pixel segue como
 * antes. META_CAPI_TEST_CODE (o "TEST..." da aba Eventos de
 * teste do Gerenciador de Eventos) serve para conferir os
 * eventos chegando, e deve sair do ambiente depois do teste.
 */

const VERSAO = process.env.META_API_VERSION || "v24.0";

const PIXEL = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";
const TOKEN = process.env.META_CAPI_TOKEN || "";
const TESTE = process.env.META_CAPI_TEST_CODE || "";

export const CONVERSOES_LIGADAS = Boolean(PIXEL && TOKEN);

export type EventoDoSite = {
  nome: string;
  id: string;
  url: string;
  ip: string;
  agente: string;
  fbp: string;
  fbc: string;
  dados?: Record<string, unknown>;
};

/*
 * Nenhum dado digitado pela pessoa vai junto - nem o telefone
 * da lista de interesse, que a política de privacidade promete
 * usar para uma coisa só. O Meta reconhece a pessoa pelos
 * cookies do pixel, pelo IP e pelo navegador.
 */
export async function enviarEvento(evento: EventoDoSite) {
  if (!CONVERSOES_LIGADAS) return;

  const usuario: Record<string, unknown> = {
    client_ip_address: evento.ip || undefined,
    client_user_agent: evento.agente || undefined,
    fbp: evento.fbp || undefined,
    fbc: evento.fbc || undefined,
  };

  const corpo: Record<string, unknown> = {
    data: [
      {
        event_name: evento.nome,
        event_time: Math.floor(Date.now() / 1000),
        event_id: evento.id,
        action_source: "website",
        event_source_url: evento.url,
        user_data: usuario,
        custom_data: evento.dados || undefined,
      },
    ],
  };

  if (TESTE) corpo.test_event_code = TESTE;

  const resposta = await fetch(
    `https://graph.facebook.com/${VERSAO}/${encodeURIComponent(
      PIXEL
    )}/events?access_token=${encodeURIComponent(TOKEN)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(5000),
    }
  ).catch((erro) => {
    console.error("Conversão não enviada ao Meta:", erro);
    return null;
  });

  if (resposta && !resposta.ok) {
    console.error(
      "Meta recusou a conversão:",
      resposta.status,
      await resposta.text().catch(() => "")
    );
  }
}
