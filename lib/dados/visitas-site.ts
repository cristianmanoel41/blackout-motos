/*
 * O que as visitas ao site contam, para o painel da loja.
 *
 * A contagem da Vercel diz quanta gente entrou. Esta diz o que
 * a gente fez: qual moto abriu, se chamou no WhatsApp, de onde
 * veio e a que horas. São perguntas que só se responde cruzando
 * a visita com o estoque - por isso a medição é nossa.
 *
 * Tudo sai de funções do banco, que somam lá dentro. Trazer as
 * linhas cruas para cá seria trazer um mês de visitas para
 * montar oito números.
 *
 * Enquanto a migração 0029 não for rodada, as funções não
 * existem e isto devolve `instalado: false` - o painel explica
 * o que falta em vez de quebrar a tela inteira.
 */

import { createClient } from "@/lib/supabase/server";

export type Resumo = {
  telas: number;
  fichas: number;
  whatsapp: number;
};

export type MotoVista = {
  id: string;
  nome: string;
  ano: string;
  preco: number | null;
  vendida: boolean;
  diasNoPatio: number | null;
  visitas: number;
  whatsapp: number;
};

export type Origem = {
  origem: string;
  chegadas: number;
  whatsapp: number;
};

export type Dia = {
  dia: string;
  rotulo: string;
  visitas: number;
  whatsapp: number;
};

export type Hora = {
  hora: number;
  rotulo: string;
  visitas: number;
};

export type Visitas = {
  /* A migração 0029 já rodou no banco. */
  instalado: boolean;
  /* Instalada, mas ainda sem nenhuma visita registrada. */
  vazio: boolean;
  hoje: Resumo;
  semana: Resumo;
  mes: Resumo;
  motos: MotoVista[];
  origens: Origem[];
  dias: Dia[];
  horas: Hora[];
};

const ZERO: Resumo = { telas: 0, fichas: 0, whatsapp: 0 };

const VAZIO: Visitas = {
  instalado: false,
  vazio: true,
  hoje: ZERO,
  semana: ZERO,
  mes: ZERO,
  motos: [],
  origens: [],
  dias: [],
  horas: [],
};

function inteiro(valor: unknown) {
  const numero = Number(valor || 0);

  return Number.isFinite(numero) ? numero : 0;
}

/*
 * Quantos dias a moto está no pátio.
 *
 * Vai junto do número de visitas porque um sozinho não decide
 * nada: quarenta visitas sem ninguém chamar é normal numa moto
 * que entrou ontem, e é preço alto numa que está há dois meses.
 */
function diasDesde(data: string | null) {
  if (!data) return null;

  const entrada = new Date(`${String(data).slice(0, 10)}T12:00:00-03:00`);

  if (Number.isNaN(entrada.getTime())) return null;

  const dias = Math.floor(
    (Date.now() - entrada.getTime()) / 86400000
  );

  return dias < 0 ? 0 : dias;
}

/* 2026-09-29 → 29/09, que é como a loja lê data em gráfico. */
function diaCurto(data: string) {
  const partes = String(data).slice(0, 10).split("-");

  if (partes.length !== 3) return String(data);

  return `${partes[2]}/${partes[1]}`;
}

export async function visitasDoSite(): Promise<Visitas> {
  const supabase = await createClient();

  const [hoje, semana, mes, motos, origens, dias, horas] =
    await Promise.all([
      supabase.rpc("visitas_resumo", { p_dias: 1 }),
      supabase.rpc("visitas_resumo", { p_dias: 7 }),
      supabase.rpc("visitas_resumo", { p_dias: 30 }),
      supabase.rpc("visitas_por_moto", {
        p_dias: 30,
        p_quanto: 8,
      }),
      supabase.rpc("visitas_por_origem", { p_dias: 30 }),
      supabase.rpc("visitas_por_dia", { p_dias: 30 }),
      supabase.rpc("visitas_por_hora", { p_dias: 30 }),
    ]);

  /*
   * Erro na primeira pergunta é erro em todas: ou as funções
   * existem, ou nenhuma existe. Basta olhar uma.
   */
  if (hoje.error) {
    console.error("Visitas do site:", hoje.error);

    return VAZIO;
  }

  function resumo(linha: unknown): Resumo {
    /* A função devolve uma linha só, mas devolve em lista. */
    const dado = Array.isArray(linha) ? linha[0] : linha;

    return {
      telas: inteiro((dado as Resumo)?.telas),
      fichas: inteiro((dado as Resumo)?.fichas),
      whatsapp: inteiro((dado as Resumo)?.whatsapp),
    };
  }

  const doMes = resumo(mes.data);

  return {
    instalado: true,
    vazio: doMes.telas === 0 && doMes.whatsapp === 0,
    hoje: resumo(hoje.data),
    semana: resumo(semana.data),
    mes: doMes,

    motos: ((motos.data || []) as Record<string, unknown>[]).map(
      (linha) => ({
        id: String(linha.moto_id || ""),
        nome:
          [linha.marca, linha.modelo, linha.versao]
            .filter(Boolean)
            .join(" ") || "Moto",
        ano: String(linha.ano_modelo || "—"),
        preco:
          linha.preco_anunciado === null ||
          linha.preco_anunciado === undefined
            ? null
            : Number(linha.preco_anunciado),
        vendida: String(linha.status || "") === "vendida",
        diasNoPatio: diasDesde(
          (linha.data_entrada as string) || null
        ),
        visitas: inteiro(linha.visitas),
        whatsapp: inteiro(linha.whatsapp),
      })
    ),

    origens: ((origens.data || []) as Record<string, unknown>[]).map(
      (linha) => ({
        origem: String(linha.origem || "Direto"),
        chegadas: inteiro(linha.chegadas),
        whatsapp: inteiro(linha.whatsapp),
      })
    ),

    dias: ((dias.data || []) as Record<string, unknown>[]).map(
      (linha) => ({
        dia: String(linha.dia || ""),
        rotulo: diaCurto(String(linha.dia || "")),
        visitas: inteiro(linha.visitas),
        whatsapp: inteiro(linha.whatsapp),
      })
    ),

    horas: ((horas.data || []) as Record<string, unknown>[]).map(
      (linha) => ({
        hora: inteiro(linha.hora),
        rotulo: `${String(inteiro(linha.hora)).padStart(2, "0")}h`,
        visitas: inteiro(linha.visitas),
      })
    ),
  };
}
