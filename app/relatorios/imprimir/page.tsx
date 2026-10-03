import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft } from "lucide-react";
import { LOJA, ENDERECO_COMPLETO } from "@/lib/dados/loja";
import BotaoImprimir from "./BotaoImprimir";
import estilo from "./imprimir.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Relatório mensal · Blackout Motos" };

/*
 * O RELATÓRIO MENSAL, EM FOLHA
 *
 * Antes só existia o CSV. CSV serve para conferir número no
 * Excel; não serve para guardar na pasta nem para mostrar ao
 * contador - sai sem timbre, sem o período em destaque e com as
 * colunas desalinhadas.
 *
 * Os números vêm da MESMA rota que gera o CSV, pedindo
 * formato=json. A conta não foi movida de lugar: é dinheiro, e
 * um recorte mal feito erraria em silêncio onde ninguém confere
 * de cabeça. Assim não há como o CSV mostrar um número e a
 * folha mostrar outro.
 */

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/*
 * O que é dinheiro e o que é quantidade.
 *
 * A rota já decide isso ao montar as linhas: valor em dinheiro
 * sai com duas casas ("18900.00"), quantidade sai inteira
 * ("3"). Então dá para saber pelo formato, sem manter uma
 * segunda lista de quais rótulos são dinheiro - lista dessas
 * sai de sincronia no dia em que alguém acrescenta uma linha.
 */
const ehDinheiro = (valor: string) => /^-?\d+\.\d{2}$/.test(valor);

const emReais = (valor: number) =>
  valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

function escrever(valor: string) {
  if (ehDinheiro(valor)) return emReais(Number(valor));

  return valor;
}

/* Os números que respondem "como foi o mês". */
const DESTAQUES = [
  "Motos compradas",
  "Motos vendidas",
  "Faturamento",
  "Lucro bruto",
  "Lucro líquido",
];

type Linha = [string, string | number];

export default async function ImprimirRelatorio({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ano?: string }>;
}) {
  const { mes: mesPedido, ano: anoPedido } = await searchParams;

  const hoje = new Date();
  const mes = Number(mesPedido) || hoje.getMonth() + 1;
  const ano = Number(anoPedido) || hoje.getFullYear();

  /*
   * A busca passa o cookie adiante.
   *
   * A rota do relatório fica atrás do login, e com razão: são
   * os números da loja. Sem repassar o cookie, o próprio
   * sistema levaria um "não autorizado" de si mesmo.
   */
  const cabecalhos = await headers();
  const host = cabecalhos.get("host") || "localhost:3000";
  const protocolo = host.startsWith("localhost") ? "http" : "https";

  const resposta = await fetch(
    `${protocolo}://${host}/api/relatorios/mensal?mes=${mes}&ano=${ano}&formato=json`,
    {
      headers: { cookie: cabecalhos.get("cookie") || "" },
      cache: "no-store",
    }
  );

  const dados = resposta.ok
    ? ((await resposta.json()) as { linhas: Linha[] })
    : { linhas: [] as Linha[] };

  const linhas = dados.linhas.map(
    ([rotulo, valor]) => [String(rotulo), String(valor)] as [string, string]
  );

  const achar = (rotulo: string) =>
    linhas.find(([r]) => r === rotulo)?.[1] ?? "";

  /*
   * "Despesas no geral" não existe pronto: a rota separa o que
   * se gastou nas motos do que se gastou na loja. Somar os dois
   * aqui responde a pergunta sem mexer na conta de lá - e o
   * rótulo diz o que foi somado, para ninguém precisar
   * adivinhar.
   */
  const despesasTotais =
    Number(achar("Gastos das motos no mês") || 0) +
    Number(achar("Despesas da loja") || 0);

  /*
   * As linhas viram blocos.
   *
   * Na lista, um título de bloco é a linha cuja segunda célula
   * está vazia, e a linha vazia é só respiro do CSV.
   */
  const blocos: Array<{ nome: string; linhas: [string, string][] }> = [];

  for (const [rotulo, valor] of linhas) {
    if (!rotulo && !valor) continue;
    if (rotulo === "RELATÓRIO MENSAL BLACKOUT MOTOS") continue;
    if (rotulo === "Período") continue;

    if (!valor) {
      blocos.push({ nome: rotulo, linhas: [] });
      continue;
    }

    if (blocos.length === 0) blocos.push({ nome: "Resumo", linhas: [] });

    blocos[blocos.length - 1].linhas.push([rotulo, valor]);
  }

  const geradoEm = hoje.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <div className={estilo.fundo}>
      <div className={estilo.barra}>
        <Link
          href="/relatorios"
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm font-bold text-[#c9ced4] transition hover:border-[#e0b129]/60 hover:text-[#f0c640]"
        >
          <ArrowLeft size={16} />
          Voltar para relatórios
        </Link>

        <BotaoImprimir />
      </div>

      <article className={estilo.folha}>
        <header className={estilo.timbre}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-blackout-menu.png" alt={LOJA.nome} />

          <div className={estilo.loja}>
            {ENDERECO_COMPLETO.split(" · ").map((parte) => (
              <div key={parte}>{parte}</div>
            ))}
            <div>{LOJA.telefone}</div>
          </div>
        </header>

        <h1 className={estilo.titulo}>Relatório mensal</h1>
        <p className={estilo.periodo}>
          {MESES[mes - 1]} de {ano}
        </p>

        {linhas.length === 0 ? (
          <p>Não foi possível carregar os números deste mês.</p>
        ) : (
          <>
            {/*
              * Os números que respondem "como foi o mês".
              *
              * Eles também aparecem lá embaixo, no bloco de
              * onde saíram. Repetir aqui é de propósito: quem
              * abre o relatório quer o resultado primeiro, e o
              * detalhe só se o resultado chamar atenção.
              */}
            <section className={estilo.bloco}>
              <h2 className={estilo.nomeDoBloco}>O mês em números</h2>

              {DESTAQUES.filter((rotulo) => achar(rotulo) !== "").map(
                (rotulo) => {
                  const valor = achar(rotulo);
                  const negativo = ehDinheiro(valor) && Number(valor) < 0;

                  return (
                    <div key={rotulo} className={estilo.linha}>
                      <span className={estilo.rotulo}>{rotulo}</span>
                      <span
                        className={`${estilo.valor} ${
                          negativo ? estilo.negativo : ""
                        }`}
                      >
                        {escrever(valor)}
                      </span>
                    </div>
                  );
                }
              )}

              <div className={estilo.linha}>
                <span className={estilo.rotulo}>
                  Despesas no mês (motos + loja)
                </span>
                <span className={estilo.valor}>{emReais(despesasTotais)}</span>
              </div>
            </section>

            {blocos
              .filter((bloco) => bloco.linhas.length > 0)
              .map((bloco) => (
                <section key={bloco.nome} className={estilo.bloco}>
                  <h2 className={estilo.nomeDoBloco}>{bloco.nome}</h2>

                  {bloco.linhas.map(([rotulo, valor]) => {
                    const negativo = ehDinheiro(valor) && Number(valor) < 0;

                    return (
                      <div key={rotulo} className={estilo.linha}>
                        <span className={estilo.rotulo}>{rotulo}</span>
                        <span
                          className={`${estilo.valor} ${
                            negativo ? estilo.negativo : ""
                          }`}
                        >
                          {escrever(valor)}
                        </span>
                      </div>
                    );
                  })}
                </section>
              ))}
          </>
        )}

        <footer className={estilo.rodape}>
          {LOJA.nome} · relatório gerado pelo sistema em {geradoEm}
        </footer>
      </article>
    </div>
  );
}
