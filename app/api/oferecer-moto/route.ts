import { createClient } from "@/lib/supabase/server";

/*
 * Ficha "Compramos sua moto", vinda do site.
 *
 * O formulário chama esta rota no mesmo toque que abre o
 * WhatsApp. Assim a ficha fica guardada no sistema (tela
 * "Motos oferecidas") mesmo se a pessoa desistir de mandar a
 * mensagem.
 *
 * Igual à lista de interesse: a rota não escreve na tabela,
 * chama a função do banco (oferecer_moto), que confere tudo de
 * novo e é a única com permissão para gravar. O visitante
 * nunca lê nada de volta.
 *
 * Contra robô, três camadas:
 *   - o campo "site" fica escondido na página; gente não vê e
 *     não preenche, robô preenche tudo - aí respondemos "ok" e
 *     não gravamos;
 *   - no máximo 5 envios por IP a cada 10 minutos;
 *   - no banco, no máximo 5 fichas por telefone por dia.
 */

export const runtime = "nodejs";

const JANELA = 10 * 60 * 1000;
const MAXIMO = 5;
const envios = new Map<string, number[]>();

function passouDoLimite(ip: string) {
  const agora = Date.now();
  const recentes = (envios.get(ip) || []).filter((t) => agora - t < JANELA);

  if (recentes.length >= MAXIMO) {
    envios.set(ip, recentes);
    return true;
  }

  recentes.push(agora);
  envios.set(ip, recentes);

  /* Não deixa o mapa crescer para sempre. */
  if (envios.size > 5000) envios.clear();

  return false;
}

const texto = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const digitos = (v: unknown, max: number) => String(v ?? "").replace(/\D/g, "").slice(0, max);
/* Valor em reais vindo do CampoMoeda ("20.87"). Fora disso, vazio. */
const valor = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 && n < 1e9 ? n.toFixed(2) : "";
};
const simNao = (v: unknown) => (v === "sim" || v === "nao" ? v : "");

export async function POST(requisicao: Request) {
  const corpo = await requisicao.json().catch(() => null);

  if (!corpo || typeof corpo !== "object") {
    return Response.json({ error: "Ficha vazia." }, { status: 400 });
  }

  /* O campo escondido veio preenchido: é robô. Finge que deu certo. */
  if (texto(corpo.site, 200)) {
    return Response.json({ ok: true });
  }

  const ip =
    requisicao.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requisicao.headers.get("x-real-ip") ||
    "sem-ip";

  if (passouDoLimite(ip)) {
    return Response.json(
      { error: "Muitos envios seguidos. Tente de novo em alguns minutos." },
      { status: 429 }
    );
  }

  const ficha = {
    marca: texto(corpo.marca, 40),
    modelo: texto(corpo.modelo, 60),
    versao: texto(corpo.versao, 60),
    ano_fabricacao: digitos(corpo.anoFab, 4),
    ano_modelo: digitos(corpo.anoMod, 4),
    km: digitos(corpo.km, 7),
    cor: texto(corpo.cor, 30),
    placa: texto(corpo.placa, 8),
    intencao: corpo.intencao === "trocar" ? "trocar" : "vender",
    financiada: corpo.quitada === "financiada" ? "true" : "false",
    falta_quitar: corpo.quitada === "financiada" ? valor(corpo.falta) : "",
    doc_em_dia: simNao(corpo.docEmDia),
    unico_dono: simNao(corpo.unicoDono),
    manual: simNao(corpo.manual),
    chave_reserva: simNao(corpo.chaveReserva),
    sinistro: simNao(corpo.sinistro),
    valor_esperado: valor(corpo.espera),
    observacoes: texto(corpo.obs, 600),
    nome: texto(corpo.nome, 80),
    telefone: digitos(corpo.telefone, 11),
    cidade: texto(corpo.cidade, 60),
  };

  if (ficha.nome.length < 2 || ficha.telefone.length < 10 || !ficha.marca || !ficha.modelo) {
    return Response.json({ error: "Faltam dados da ficha." }, { status: 400 });
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("oferecer_moto", { p: ficha });

  if (error) {
    console.error("Erro ao guardar moto oferecida:", error);

    return Response.json(
      { error: "Não foi possível guardar a ficha agora." },
      { status: 502 }
    );
  }

  return Response.json({ ok: true });
}
