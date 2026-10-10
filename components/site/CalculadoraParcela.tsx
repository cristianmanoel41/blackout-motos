"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Info, TriangleAlert } from "lucide-react";
import CampoMoeda from "@/components/CampoMoeda";
import BarraDoResultado from "@/components/site/BarraDoResultado";
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
 * As taxas da simulação, que a loja define: a média mais baixa
 * e a média mais alta que os bancos têm cobrado.
 *
 * Uma taxa só prometia um número que metade dos clientes não
 * ia conseguir. A faixa mostra o melhor e o pior caso, e a
 * análise de crédito decide onde a pessoa cai.
 *
 * Ficam em constantes com nome porque são os números que mudam
 * quando o mercado muda - e quem for mexer precisa achar isso
 * em um lugar só, não espalhado pela conta.
 */
const TAXA_MINIMA = 0.025;
const TAXA_MAXIMA = 0.035;

/*
 * O mesmo número, escrito para a tela.
 *
 * Sai da constante de propósito. Escrito à mão em três lugares
 * - o cabeçalho, o aviso e o comentário -, bastava alguém
 * trocar a taxa e esquecer um deles para a tela prometer 2% e
 * a conta cobrar 2,5%. Promessa escrita que a conta desmente é
 * o pior defeito possível numa tela de preço.
 */
function taxaEscrita(taxa: number) {
  return (
    (taxa * 100).toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    }) + "%"
  );
}

const MINIMA_ESCRITA = taxaEscrita(TAXA_MINIMA);
const MAXIMA_ESCRITA = taxaEscrita(TAXA_MAXIMA);

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
  painel = null,
}: {
  preco: number;
  moto?: string;
  primeiroPasso?: number;
  /* A coluna do simulador onde a conta é escrita. */
  painel?: HTMLElement | null;
}) {
  const [entrada, setEntrada] = useState("");
  const [meses, setMeses] = useState(24);

  const paga = Math.min(Number(entrada) || 0, preco);
  const financiado = preco - paga;

  const parcelaMinima = parcelaPrice(financiado, TAXA_MINIMA, meses);
  const parcelaMaxima = parcelaPrice(financiado, TAXA_MAXIMA, meses);

  const totalMinimo = parcelaMinima * meses + paga;
  const totalMaximo = parcelaMaxima * meses + paga;

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
    `Parcelas: ${meses}x de ${formatarMoeda(parcelaMinima)} a ${formatarMoeda(parcelaMaxima)}`,
    "",
    "Quero ver as condições reais do banco.",
  ]
    .filter((linha) => linha !== "")
    .join("\n");

  const campo =
    "w-full rounded-xl border px-4 py-3 text-sm outline-none";

  const conta = (
    <>
      {!temConta && (
        <div className="sim-vazio">
          <p className="text-sm font-bold texto-claro">
            {entradaMaior
              ? "Não há o que financiar"
              : "Falta o valor da moto"}
          </p>

          <p className="max-w-[16rem] text-xs leading-5 texto-suave">
            {entradaMaior
              ? "A entrada já cobre o valor da moto."
              : "Escolha a moto ou digite o valor para ver a parcela."}
          </p>
        </div>
      )}

      {temConta && (
        <div className="sim-resultado">
          <p className="sim-rotulo">Parcela estimada · {meses}x</p>

          {/*
            * A faixa, com a parcela menor em destaque e a maior
            * logo abaixo, escrita como faixa ("até"). Dois
            * valores grandes lado a lado não cabem no celular.
            */}
          <p className="sim-valor mt-2">
            {formatarMoeda(parcelaMinima)}
          </p>

          <p className="mt-1 text-sm texto-suave">
            até{" "}
            <strong className="text-base font-black tabular-nums texto-claro">
              {formatarMoeda(parcelaMaxima)}
            </strong>{" "}
            por mês
          </p>

          <dl className="sim-linhas">
            <div>
              <dt>Valor da moto</dt>
              <dd>{formatarMoeda(preco)}</dd>
            </div>

            <div>
              <dt>Entrada</dt>
              <dd>{paga > 0 ? formatarMoeda(paga) : "Sem entrada"}</dd>
            </div>

            <div>
              <dt>Valor financiado</dt>
              <dd>{formatarMoeda(financiado)}</dd>
            </div>

            <div>
              <dt>Taxa estimada</dt>
              <dd>
                {MINIMA_ESCRITA} a {MAXIMA_ESCRITA} a.m.
              </dd>
            </div>

            <div>
              <dt>Total a prazo</dt>
              <dd>
                {formatarMoeda(totalMinimo)}
                <br />a {formatarMoeda(totalMaximo)}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {/*
        * O botão chama para o que a pessoa quer de verdade: a
        * condição real. A mensagem do WhatsApp sai com moto,
        * valor, entrada e parcela escritos - o vendedor recebe
        * a conta feita e continua dali.
        */}
      {temConta && (
        <div className="mt-4">
          <a
            href={linkWhatsApp(mensagem)}
            target="_blank"
            rel="noopener noreferrer"
            className="botao-ouro inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold"
          >
            <IconeWhatsApp className="h-5 w-5" />
            Consultar condições reais
          </a>

          <p className="mt-2 text-center text-xs texto-suave">
            A gente consulta os bancos para você. Resposta
            rápida e sem compromisso.
          </p>
        </div>
      )}

      {/*
        * O aviso fica junto do número, não no rodapé da
        * página: quem lê "R$ 480 por mês" precisa ler na mesma
        * olhada que aquilo ainda passa por análise.
        */}
      <p className="sim-aviso">
        <Info aria-hidden="true" />
        <span>
          Esta é <strong>apenas uma simulação ilustrativa</strong>,
          calculada com a taxa média mínima de {MINIMA_ESCRITA} e a
          máxima de {MAXIMA_ESCRITA} ao mês. A taxa final pode ser
          maior ou menor, mediante análise de crédito feita pelo
          banco. O valor da parcela e o valor da entrada estão{" "}
          <strong>sujeitos à análise de crédito</strong> e podem
          mudar conforme o banco, o prazo e o seu perfil. A
          simulação sem entrada pode não ser aprovada, conforme a
          análise de crédito e o ano da moto. Não inclui IOF,
          tarifas nem seguros.
        </span>
      </p>
    </>
  );

  return (
    <>
      <div className="sim-passo">
        <div className="flex items-start justify-between gap-3">
          <label
            htmlFor="valor-entrada"
            className="sim-passo-titulo"
          >
            <span className="sim-numero">{primeiroPasso}</span>
            Entrada
          </label>

          {preco > 0 && (
            <span className="sim-selo shrink-0">
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
          * é aí que ela entende quanto precisa juntar.
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
              className="faixa-entrada mt-4 w-full"
            />

            <div className="mt-1 flex justify-between text-[11px] texto-suave">
              <span>Sem entrada</span>
              <span>{formatarMoeda(preco)}</span>
            </div>
          </>
        )}

        {/*
          * O aviso do "sem entrada".
          *
          * Fica no passo da entrada: é aqui que a pessoa arrasta
          * a barra até zero e conclui que dá. Com a entrada
          * zerada ele acende, porque é exatamente a conta que o
          * banco pode recusar.
          */}
        <div
          className="sim-alerta mt-4"
          data-aceso={paga === 0 ? "true" : undefined}
          role="note"
        >
          <TriangleAlert className="sim-alerta-icone" aria-hidden />
          <p>
            <strong>Financiamento sem entrada pode não ser possível.</strong>{" "}
            A aprovação depende de critérios definidos pelo banco:
            a <strong>análise de crédito do cliente</strong> e o{" "}
            <strong>ano da moto</strong>. Dependendo desses fatores,
            o banco pode exigir uma entrada.
          </p>
        </div>
      </div>

      <div className="sim-passo">
        <p className="sim-passo-titulo">
          <span className="sim-numero">{primeiroPasso + 1}</span>
          Em quantas vezes
        </p>

        {/*
          * Botões em vez de lista suspensa: são quatro opções e
          * o dedo acerta de primeira; lista suspensa no celular
          * esconde justamente o número que a pessoa quer ver
          * mudar.
          */}
        <div className="sim-prazos" role="group" aria-label="Prazo">
          {PARCELAS.map((quantas) => (
            <button
              key={quantas}
              type="button"
              onClick={() => setMeses(quantas)}
              aria-pressed={meses === quantas}
              className="sim-chip"
            >
              {quantas}x
            </button>
          ))}
        </div>
      </div>

      {painel && createPortal(conta, painel)}

      {temConta && (
        <BarraDoResultado
          rotulo={`${meses}x no banco · estimativa`}
          valor={`${formatarMoeda(parcelaMinima)} a ${formatarMoeda(parcelaMaxima)}`}
          alvo={painel}
        />
      )}
    </>
  );
}
