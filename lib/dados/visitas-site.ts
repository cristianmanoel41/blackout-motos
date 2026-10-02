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

/*
 * Os quatro números de um período.
 *
 * `visitas` é gente entrando; `telas` é página aberta. Quem
 * entra e olha cinco motos é UMA visita e seis telas - e é
 * essa diferença que faz o painel parecer confuso quando os
 * dois aparecem com o mesmo nome.
 */
export type Resumo = {
  visitas: number;
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

/*
 * Um dia no gráfico.
 *
 * `visitas` é o que a barra desenha, e são PESSOAS: é essa a
 * pergunta que alguém faz olhando um gráfico por dia. A tela
 * aberta continua vindo junto e aparece no balão, para quem
 * quiser saber se a gente daquele dia olhou muita moto ou
 * entrou e saiu.
 *
 * O nome `visitas` é o que o gráfico espera de qualquer série;
 * daí ele não mudar aqui.
 */
export type Dia = {
  dia: string;
  rotulo: string;
  visitas: number;
  telas: number;
  whatsapp: number;
};

export type Hora = {
  hora: number;
  rotulo: string;
  visitas: number;
};

/*
 * O site está subindo ou caindo.
 *
 * Número solto não diz nada: 14 pessoas hoje é bom ou ruim
 * conforme o que vinha sendo. A comparação é de sete dias
 * contra os sete anteriores - períodos fechados e do mesmo
 * tamanho, que é a única comparação honesta. Comparar o dia de
 * hoje, que ainda não acabou, com uma média de dias inteiros
 * diria "caindo" toda manhã.
 */
export type Comparacao = {
  /* Pessoas por dia, em média, nos últimos 7 dias. */
  porDia: number;
  semana: number;
  semanaAnterior: number;
  /* `cedo` = ainda não há semana anterior para comparar. */
  rumo: "subindo" | "caindo" | "parado" | "cedo";
  /* Quanto mudou, em %, para mais ou para menos. */
  variacao: number;
};

export type Visitas = {
  /* A migração 0029 já rodou no banco. */
  instalado: boolean;
  /*
   * O banco ainda tem a versão antiga do resumo, de antes da
   * migração 0030 - a que não sabia contar visita, só tela.
   *
   * Sem perceber isso, o painel mostraria "0 visitas" com as
   * telas certas ao lado, e pareceria defeito em vez de SQL
   * que falta rodar.
   */
  precisaMigrar: boolean;
  /* Instalada, mas ainda sem nenhuma visita registrada. */
  vazio: boolean;
  hoje: Resumo;
  semana: Resumo;
  mes: Resumo;
  motos: MotoVista[];
  origens: Origem[];
  dias: Dia[];
  horas: Hora[];
  comparacao: Comparacao;
  /*
   * A lista traz só moto que está no pátio.
   *
   * Vendida e arquivada saem na migração 0031: o painel existe
   * para decidir o que fazer hoje, e moto que já saiu não
   * aceita decisão nenhuma - só empurra para baixo a que ainda
   * está para vender. O campo `vendida` continua aqui porque,
   * enquanto o SQL não for rodado, a tela precisa saber.
   */

  /*
   * A moto que mais gente abriu e ninguém chamou.
   *
   * É a única linha do painel que pede uma atitude: ou o preço
   * está alto, ou a descrição promete o que a foto não mostra.
   * Vem nula quando não há caso claro - inventar alarme todo
   * dia faz a loja parar de ler o painel.
   */
  atencao: MotoVista | null;
};

const ZERO: Resumo = {
  visitas: 0,
  telas: 0,
  fichas: 0,
  whatsapp: 0,
};

const SEM_RUMO: Comparacao = {
  porDia: 0,
  semana: 0,
  semanaAnterior: 0,
  rumo: "cedo",
  variacao: 0,
};

const VAZIO: Visitas = {
  instalado: false,
  precisaMigrar: false,
  vazio: true,
  hoje: ZERO,
  semana: ZERO,
  mes: ZERO,
  motos: [],
  origens: [],
  dias: [],
  horas: [],
  comparacao: SEM_RUMO,
  atencao: null,
};

/*
 * Quanto o site andou, comparando sete dias com os sete de
 * antes.
 *
 * `dias` chega do mais velho para o mais novo, então os
 * últimos sete do fim da lista são esta semana, e os sete
 * anteriores a eles são a semana passada.
 *
 * Mudança pequena é ruído, não notícia: abaixo de 15% o rumo é
 * "parado". Em loja de bairro, três pessoas a mais numa semana
 * não querem dizer nada, e apontar seta para cima por isso
 * ensina a loja a não confiar no painel.
 */
function compararSemanas(dias: Dia[]): Comparacao {
  if (dias.length < 8) return SEM_RUMO;

  const somar = (lista: Dia[]) =>
    lista.reduce((total, dia) => total + dia.visitas, 0);

  const semana = somar(dias.slice(-7));
  const anterior = somar(dias.slice(-14, -7));

  const porDia = Math.round((semana / 7) * 10) / 10;

  if (anterior === 0) {
    return {
      porDia,
      semana,
      semanaAnterior: 0,
      rumo: "cedo",
      variacao: 0,
    };
  }

  const variacao = Math.round(
    ((semana - anterior) / anterior) * 100
  );

  return {
    porDia,
    semana,
    semanaAnterior: anterior,
    rumo:
      Math.abs(variacao) < 15
        ? "parado"
        : variacao > 0
          ? "subindo"
          : "caindo",
    variacao,
  };
}

/*
 * A moto que muita gente abriu e ninguém chamou.
 *
 * Cinco visitas é o piso: abaixo disso não é sinal, é acaso -
 * duas pessoas olharem e não chamarem acontece em qualquer
 * moto, inclusive na que vai vender amanhã.
 */
function motoQuePedeAtencao(motos: MotoVista[]) {
  return (
    motos.find(
      (moto) =>
        !moto.vendida &&
        moto.whatsapp === 0 &&
        moto.visitas >= 5
    ) || null
  );
}

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
      visitas: inteiro((dado as Resumo)?.visitas),
      telas: inteiro((dado as Resumo)?.telas),
      fichas: inteiro((dado as Resumo)?.fichas),
      whatsapp: inteiro((dado as Resumo)?.whatsapp),
    };
  }

  const doMes = resumo(mes.data);

  /*
   * A versão antiga do resumo devolve as mesmas linhas, só que
   * sem a coluna de visita. Olhar se a chave existe é o único
   * jeito de distinguir "ninguém entrou" de "falta rodar o
   * SQL" - as duas dariam zero.
   */
  const primeira = Array.isArray(hoje.data)
    ? hoje.data[0]
    : hoje.data;

  const primeiroDia = Array.isArray(dias.data)
    ? dias.data[0]
    : null;

  const tem = (linha: unknown, coluna: string) =>
    !!linha &&
    Object.prototype.hasOwnProperty.call(linha, coluna);

  /*
   * Conferir as duas funções, e não só o resumo: a 0030 mexeu
   * em três, e quem rodou uma versão anterior dela pode ter o
   * resumo novo com o gráfico velho. Aí o gráfico mostraria
   * tela aberta com o rótulo "Pessoas" - errado em silêncio,
   * que é pior do que não mostrar.
   */
  const precisaMigrar =
    (!!primeira && !tem(primeira, "visitas")) ||
    (!!primeiroDia && !tem(primeiroDia, "pessoas"));

  const listaMotos: MotoVista[] = (
    (motos.data || []) as Record<string, unknown>[]
  ).map((linha) => ({
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
  }));

  const listaDias: Dia[] = (
    (dias.data || []) as Record<string, unknown>[]
  ).map((linha) => ({
    dia: String(linha.dia || ""),
    rotulo: diaCurto(String(linha.dia || "")),
    /* `pessoas` é a coluna nova, da migração 0030. Sem ela o
       gráfico cai para a contagem de tela, que é o que a versão
       antiga da função devolvia. */
    visitas: inteiro(linha.pessoas ?? linha.visitas),
    telas: inteiro(linha.telas ?? linha.visitas),
    whatsapp: inteiro(linha.whatsapp),
  }));

  return {
    instalado: true,
    precisaMigrar,
    vazio: doMes.telas === 0 && doMes.whatsapp === 0,
    hoje: resumo(hoje.data),
    semana: resumo(semana.data),
    mes: doMes,
    motos: listaMotos,
    dias: listaDias,
    comparacao: compararSemanas(listaDias),
    atencao: motoQuePedeAtencao(listaMotos),

    origens: (
      (origens.data || []) as Record<string, unknown>[]
    ).map((linha) => ({
      origem: String(linha.origem || "Direto"),
      chegadas: inteiro(linha.chegadas),
      whatsapp: inteiro(linha.whatsapp),
    })),

    horas: (
      (horas.data || []) as Record<string, unknown>[]
    ).map((linha) => ({
      hora: inteiro(linha.hora),
      rotulo: `${String(inteiro(linha.hora)).padStart(2, "0")}h`,
      visitas: inteiro(linha.visitas),
    })),
  };
}
