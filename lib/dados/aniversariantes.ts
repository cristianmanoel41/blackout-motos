/*
 * Quem faz aniversário hoje, e quem faz nos próximos dias.
 *
 * Mensagem de aniversário só vale no dia. Se a loja descobrir
 * depois, é pior do que não ter mandado - então o painel
 * mostra também a semana que vem, para quem fecha no domingo
 * ou tira folga não perder ninguém.
 *
 * A data vem do cadastro do cliente (`data_nascimento`), que
 * já existia na ficha. Nada de novo no banco.
 */

import { createClient } from "@/lib/supabase/server";

export type Aniversariante = {
  id: string;
  nome: string;
  telefone: string | null;
  /* "23/07" */
  dia: string;
  /* Quantos anos completa. Nulo quando o ano não faz sentido. */
  idade: number | null;
  /* 0 = hoje, 1 = amanhã, ... */
  faltam: number;
};

export type Aniversarios = {
  hoje: Aniversariante[];
  proximos: Aniversariante[];
  /* Quantos clientes não têm data de nascimento preenchida. */
  semData: number;
  /* Falhou a leitura: o painel avisa em vez de mentir "ninguém". */
  erro: boolean;
};

const VAZIO: Aniversarios = {
  hoje: [],
  proximos: [],
  semData: 0,
  erro: false,
};

/* Quantos dias à frente o painel olha. */
const JANELA = 7;

/*
 * O dia de hoje no horário de Brasília.
 *
 * O servidor roda em UTC: sem fixar o fuso, das 21h em diante
 * o aniversário de amanhã já apareceria como o de hoje, e a
 * loja mandaria a mensagem um dia antes.
 */
function hojeAqui() {
  const texto = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });

  const [ano, mes, dia] = texto.split("-").map(Number);

  return { ano, mes, dia };
}

/*
 * Quantos dias faltam para o próximo aniversário.
 *
 * Compara só dia e mês, contando a virada do ano: em 28 de
 * dezembro, quem faz em 2 de janeiro aparece como "faltam 5",
 * e não como um ano inteiro.
 *
 * 29 de fevereiro em ano comum cai em 28: quem nasceu no dia
 * extra recebe a mensagem, e não some do painel por três anos.
 */
function diasAte(
  mesNascimento: number,
  diaNascimento: number,
  hoje: { ano: number; mes: number; dia: number }
) {
  const bissexto =
    (hoje.ano % 4 === 0 && hoje.ano % 100 !== 0) ||
    hoje.ano % 400 === 0;

  const dia =
    mesNascimento === 2 && diaNascimento === 29 && !bissexto
      ? 28
      : diaNascimento;

  const marco = Date.UTC(hoje.ano, mesNascimento - 1, dia);
  const agora = Date.UTC(hoje.ano, hoje.mes - 1, hoje.dia);

  const distancia = Math.round(
    (marco - agora) / 86400000
  );

  if (distancia >= 0) return distancia;

  /* Já passou este ano: o próximo é no ano que vem. */
  const proximo = Date.UTC(
    hoje.ano + 1,
    mesNascimento - 1,
    dia
  );

  return Math.round((proximo - agora) / 86400000);
}

export async function aniversariantes(): Promise<Aniversarios> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .select("id, nome, telefone, data_nascimento");

  if (error) {
    console.error("Aniversariantes:", error);

    return { ...VAZIO, erro: true };
  }

  const hoje = hojeAqui();

  const comData: Aniversariante[] = [];

  let semData = 0;

  for (const cliente of data || []) {
    const texto = String(cliente.data_nascimento || "").slice(
      0,
      10
    );

    const [ano, mes, dia] = texto.split("-").map(Number);

    if (!mes || !dia || mes < 1 || mes > 12) {
      semData += 1;
      continue;
    }

    const faltam = diasAte(mes, dia, hoje);

    if (faltam > JANELA) continue;

    /*
     * A idade que a pessoa completa, e não a que ela tem: a
     * mensagem é do dia do aniversário. Ano de nascimento
     * ausente ou absurdo some em vez de inventar número.
     */
    const anoDoAniversario = new Date(
      Date.UTC(hoje.ano, hoje.mes - 1, hoje.dia) +
        faltam * 86400000
    ).getUTCFullYear();

    const idade =
      ano > 1900 && ano <= hoje.ano
        ? anoDoAniversario - ano
        : null;

    comData.push({
      id: String(cliente.id),
      nome: String(cliente.nome || "Cliente"),
      telefone: cliente.telefone || null,
      dia: `${String(dia).padStart(2, "0")}/${String(
        mes
      ).padStart(2, "0")}`,
      idade,
      faltam,
    });
  }

  comData.sort((a, b) => a.faltam - b.faltam);

  return {
    hoje: comData.filter((pessoa) => pessoa.faltam === 0),
    proximos: comData.filter((pessoa) => pessoa.faltam > 0),
    semData,
    erro: false,
  };
}

/*
 * A mensagem mora em mensagem-aniversario.ts, sozinha.
 *
 * Ela e usada tambem pela ficha do cliente, que e tela de
 * navegador; deixando-a aqui, o import arrastava este arquivo
 * - e o Supabase de servidor que ele usa - para dentro do
 * navegador, e o build de producao recusava.
 *
 * Continua saindo por aqui para quem ja importava deste
 * endereco nao precisar mudar.
 */
export { mensagemDeAniversario } from "./mensagem-aniversario";

