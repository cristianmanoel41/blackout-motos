"use client";

import { useState } from "react";
import CampoMoeda from "@/components/CampoMoeda";
import { IconeWhatsApp } from "@/components/site/IconeWhatsApp";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import { linkWhatsApp } from "@/lib/dados/loja";

/*
 * A conta da parcela no banco, antes da conversa.
 *
 * O formulário da página de proposta pede nome, CPF e data de
 * nascimento, porque ele monta uma proposta de verdade. Mas
 * quem está olhando moto às onze da noite não quer propor nada
 * ainda - quer saber se cabe no mês. Pedir CPF para responder
 * isso espanta mais gente do que converte.
 *
 * Então esta peça não pede nada de pessoal, não guarda nada e
 * não manda nada para servidor nenhum: a conta acontece no
 * navegador da pessoa e morre ali, a menos que ela mesma
 * resolva mandar no WhatsApp.
 *
 * A MOTO E O VALOR NÃO MORAM AQUI.
 *
 * Eles são do simulador que envolve esta peça, porque o cartão
 * usa os mesmos dois - e assim quem compara os dois caminhos
 * não digita duas vezes. Aqui ficam só os passos que são do
 * banco: entrada, prazo e o aviso da análise de crédito.
 */

/*
 * A taxa de base da simulação, que a loja define.
 *
 * Fica numa constante com nome porque é o número que muda
 * quando o mercado muda - e quem for mexer precisa achar isso
 * em um lugar só, não espalhado pela conta.
 */
const TAXA_MENSAL = 0.025;

/*
 * O mesmo número, escrito para a tela.
 *
 * Sai da constante de propósito. Escrito à mão em três lugares
 * - o cabeçalho, o aviso e o comentário -, bastava alguém
 * trocar a taxa e esquecer um deles para a tela prometer 2% e
 * a conta cobrar 2,5%. Promessa escrita que a conta desmente é
 * o pior defeito possível numa tela de preço.
 */
const TAXA_ESCRITA =
  (TAXA_MENSAL * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }) + "% ao mês";

const PARCELAS = [12, 24, 36, 48];

/* O passo da barra. R$ 100 dá movimento fino sem virar loteria
   de centavo quando o dedo arrasta no celular. */
const PASSO_DA_ENTRADA = 100;

/*
 * A parcela pela Tabela Price, que é como banco calcula.
 *
 * Parcelas iguais do começo ao fim: no início quase tudo é
 * juro, no fim quase tudo é a moto. É a conta que o cliente vai
 * encontrar na proposta do banco, então é a que deve aparecer
 * aqui - uma conta mais simples daria um número menor e
 * prometeria o que a loja não entrega.
 */
function parcelaPrice(
  financiado: number,
  juros: number,
  meses: number
) {
  if (financiado <= 0 || meses <= 0) return 0;

  if (juros === 0) return financiado / meses;

  return (
    (financiado * juros) / (1 - Math.pow(1 + juros, -meses))
  );
}

export default function PassosDoFinanciamento({
  preco,
  moto = "",
  primeiroPasso = 1,
}: {
  preco: number;
  moto?: string;
  primeiroPasso?: number;
}) {
  const [entrada, setEntrada] = useState("");
  const [meses, setMeses] = useState(24);

  const paga = Math.min(Number(entrada) || 0, preco);
  const financiado = preco - paga;

  const parcela = parcelaPrice(financiado, TAXA_MENSAL, meses);

  const total = parcela * meses + paga;

  const porcentagem = preco > 0 ? (paga / preco) * 100 : 0;

  /* Só vale mostrar conta quando há o que financiar. */
  const temConta = preco > 0 && financiado > 0;

  const entradaMaior = preco > 0 && financiado <= 0;

  const mensagem = [
    "Olá! Fiz uma simulação no site:",
    "",
    moto ? `Moto: ${moto}` : "",
    `Valor: ${formatarMoeda(preco)}`,
    `Entrada: ${paga > 0 ? formatarMoeda(paga) : "sem entrada"}`,
    `Parcelas: ${meses}x de ${formatarMoeda(parcela)}`,
    "",
    "Quero saber as condições reais.",
  ]
    .filter((linha) => linha !== "")
    .join("\n");

  const campo =
    "w-full rounded-xl border px-4 py-3 text-sm outline-none";

  return (
    <>
      <div className="mt-5">
        <div className="mb-1.5 flex items-end justify-between gap-3">
          <label
            htmlFor="valor-entrada"
            className="text-xs font-semibold texto-suave"
          >
            {primeiroPasso}. Entrada
          </label>

          {preco > 0 && (
            <span className="text-xs font-bold texto-ouro">
              {Math.round(porcentagem)}% do valor
            </span>
          )}
        </div>

        <CampoMoeda
          id="valor-entrada"
          value={paga ? String(paga) : ""}
          onChange={setEntrada}
          placeholder="0,00"
          className={campo}
        />

        {/*
          * A barra de arrastar.
          *
          * Digitar entrada é decisão; arrastar é descoberta. Com
          * a barra a pessoa vê a parcela caindo enquanto puxa, e
          * é aí que ela entende quanto precisa juntar - coisa
          * que digitar valor por valor não mostra.
          *
          * Só aparece com valor na mão: barra sem limite não
          * sabe para onde ir.
          */}
        {preco > 0 && (
          <>
            <input
              type="range"
              min={0}
              max={Math.floor(preco)}
              step={PASSO_DA_ENTRADA}
              value={paga}
              onChange={(evento) => setEntrada(evento.target.value)}
              aria-label="Valor da entrada"
              className="faixa-entrada mt-3 w-full"
            />

            <div className="mt-1 flex justify-between text-[11px] texto-suave">
              <span>sem entrada</span>
              <span>{formatarMoeda(preco)}</span>
            </div>
          </>
        )}
      </div>

      <div className="mt-5">
        <span className="mb-1.5 block text-xs font-semibold texto-suave">
          {primeiroPasso + 1}. Em quantas vezes
        </span>

        {/*
          * Botões em vez de lista suspensa.
          *
          * São quatro opções e o dedo acerta de primeira; lista
          * suspensa no celular abre uma roleta por cima da tela
          * e esconde justamente o número que a pessoa quer ver
          * mudar.
          */}
        <div className="flex flex-wrap gap-2">
          {PARCELAS.map((quantas) => (
            <button
              key={quantas}
              type="button"
              onClick={() => setMeses(quantas)}
              aria-pressed={meses === quantas}
              className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${
                meses === quantas ? "botao-ouro" : "botao-vidro"
              }`}
            >
              {quantas}x
            </button>
          ))}
        </div>
      </div>

      {entradaMaior && (
        <p className="mt-5 text-sm leading-6 texto-suave">
          A entrada já cobre o valor da moto — nesse caso não há
          o que financiar.
        </p>
      )}

      {temConta && (
        <div className="mt-6 rounded-2xl border border-[rgba(224,177,41,0.28)] bg-[rgba(224,177,41,0.08)] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] texto-ouro">
            {meses} parcelas de
          </p>

          <p className="mt-1 text-3xl font-black texto-claro sm:text-4xl">
            {formatarMoeda(parcela)}
          </p>

          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs texto-suave">
                Valor financiado
              </dt>
              <dd className="font-bold texto-claro">
                {formatarMoeda(financiado)}
              </dd>
            </div>

            <div>
              <dt className="text-xs texto-suave">Entrada</dt>
              <dd className="font-bold texto-claro">
                {paga > 0 ? formatarMoeda(paga) : "—"}
              </dd>
            </div>

            <div>
              <dt className="text-xs texto-suave">
                Total a prazo
              </dt>
              <dd className="font-bold texto-claro">
                {formatarMoeda(total)}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {/*
        * O aviso.
        *
        * Fica junto do número, não no rodapé da página: quem lê
        * "R$ 480 por mês" e sai feliz precisa ler na mesma
        * olhada que aquilo ainda passa por análise. Aviso longe
        * do número não é aviso, é formalidade.
        */}
      <p className="mt-5 text-xs leading-5 texto-suave">
        Esta é <strong>apenas uma simulação ilustrativa</strong>,
        calculada sobre {TAXA_ESCRITA}. O valor da parcela e o
        valor da entrada estão{" "}
        <strong>sujeitos à análise de crédito</strong> e podem
        mudar conforme o banco, o prazo e o seu perfil. Não
        inclui IOF, tarifas nem seguros.
      </p>

      {/*
        * Uma saída só, e ela já leva tudo.
        *
        * A mensagem do WhatsApp sai com moto, valor, entrada e
        * parcela escritos - o vendedor recebe a conta feita e
        * continua dali. Quem quer a proposta formal continua
        * achando: o convite para ela fica logo abaixo, na
        * própria página.
        */}
      {temConta && (
        <a
          href={linkWhatsApp(mensagem)}
          target="_blank"
          rel="noopener noreferrer"
          className="botao-ouro mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold sm:w-auto"
        >
          <IconeWhatsApp className="h-5 w-5" />
          Mandar esta simulação no WhatsApp
        </a>
      )}
    </>
  );
}
