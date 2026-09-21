/*
 * Os acessos ao site, lidos da Vercel.
 *
 * A contagem é a mesma que aparece no painel dela - aqui só
 * trazemos o número para dentro do sistema, para a loja ver
 * junto do resto sem abrir outro site.
 *
 * Precisa de duas coisas no ambiente: VERCEL_TOKEN e
 * VERCEL_PROJECT_ID. Sem elas a função devolve "não
 * configurado" em vez de quebrar a tela - o painel continua
 * de pé, só sem esse pedaço.
 *
 * O resultado fica guardado por dez minutos. Acesso não é
 * número que se olha de segundo em segundo, e assim abrir o
 * painel dez vezes no dia não vira dez idas à Vercel.
 */

const API =
  "https://api.vercel.com/v1/query/web-analytics/visits/count";

const GUARDAR = 600;

export type Contagem = {
  visitantes: number;
  paginas: number;
};

export type Acessos = {
  configurado: boolean;
  /* Falhou a leitura mesmo estando configurado. */
  erro: boolean;
  hoje: Contagem | null;
  semana: Contagem | null;
  mes: Contagem | null;
};

/*
 * Meia-noite de hoje no horário de Brasília.
 *
 * O servidor roda em UTC: sem fixar o fuso, das 21h em diante
 * o "hoje" da loja já seria o dia seguinte lá, e o número
 * apareceria zerado no meio do expediente.
 */
function meiaNoite(diasAtras = 0) {
  const dia = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });

  const data = new Date(`${dia}T00:00:00-03:00`);

  data.setDate(data.getDate() - diasAtras);

  return data;
}

async function contar(
  desde: Date
): Promise<Contagem | null> {
  const token = process.env.VERCEL_TOKEN;
  const projeto = process.env.VERCEL_PROJECT_ID;

  if (!token || !projeto) return null;

  const busca = new URLSearchParams({
    projectId: projeto,
    since: String(desde.getTime()),
    until: String(Date.now()),
  });

  /* Conta em time tem o dono separado do projeto. */
  if (process.env.VERCEL_TEAM_ID) {
    busca.set("teamId", process.env.VERCEL_TEAM_ID);
  }

  try {
    const resposta = await fetch(`${API}?${busca}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      next: { revalidate: GUARDAR },
    });

    if (!resposta.ok) {
      console.error(
        "Acessos: a Vercel recusou",
        resposta.status,
        await resposta.text()
      );

      return null;
    }

    const corpo = await resposta.json();

    return {
      visitantes: Number(corpo?.data?.visitors || 0),
      paginas: Number(corpo?.data?.pageviews || 0),
    };
  } catch (erro) {
    console.error("Acessos: não deu para ler", erro);
    return null;
  }
}

export async function acessosDoSite(): Promise<Acessos> {
  const configurado = Boolean(
    process.env.VERCEL_TOKEN &&
      process.env.VERCEL_PROJECT_ID
  );

  if (!configurado) {
    return {
      configurado: false,
      erro: false,
      hoje: null,
      semana: null,
      mes: null,
    };
  }

  /* Sete dias contando hoje, e trinta contando hoje. */
  const [hoje, semana, mes] = await Promise.all([
    contar(meiaNoite(0)),
    contar(meiaNoite(6)),
    contar(meiaNoite(29)),
  ]);

  return {
    configurado: true,
    erro: !hoje && !semana && !mes,
    hoje,
    semana,
    mes,
  };
}
