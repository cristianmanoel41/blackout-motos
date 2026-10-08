"use client";

import { useState } from "react";
import CampoMoeda from "@/components/CampoMoeda";
import { IconeWhatsApp } from "@/components/site/IconeWhatsApp";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import { linkWhatsApp } from "@/lib/dados/loja";
import { CARTAO, noCartao } from "@/lib/dados/cartao-maquininha";

/*
 * A conta do cartão de crédito.
 *
 * Irmã da conta do financiamento, com uma diferença que muda
 * tudo: aqui não há análise de crédito, não há banco e não há
 * promessa a confirmar. A maquininha cobra o que cobra, e os
 * números saem da tabela dela. O que pode faltar é limite no
 * cartão do cliente - e isso só o cartão dele responde.
 *
 * A ENTRADA ABATE O QUE PASSA NO CARTÃO.
 *
 * Na loja quase nunca a moto inteira vai na maquininha: o
 * cliente dá uma parte em dinheiro, PIX ou débito - que não tem
 * acréscimo nenhum - e parcela o resto. Antes a conta era dele:
 * subtrair de cabeça e digitar o resultado no campo de valor.
 * Quem erra essa subtração sai com a parcela errada na cabeça, e
 * descobre o número certo só na hora de fechar.
 *
 * Então a entrada é um campo, e o acréscimo da maquininha cai
 * só sobre o que sobra - que é exatamente como a máquina cobra.
 */

/* O passo da barra, igual ao do financiamento. */
const PASSO_DA_ENTRADA = 100;

export default function PassosDoCartao({
  preco,
  moto = "",
  primeiroPasso = 1,
}: {
  preco: number;
  moto?: string;
  primeiroPasso?: number;
}) {
  const [entrada, setEntrada] = useState("");
  const [escolhida, setEscolhida] = useState(12);

  const paga = Math.min(Number(entrada) || 0, preco);
  const naMaquina = preco - paga;

  const porcentagem = preco > 0 ? (paga / preco) * 100 : 0;

  /* Só vale mostrar a tabela quando sobra algo para parcelar. */
  const temConta = preco > 0 && naMaquina > 0;
  const entradaMaior = preco > 0 && naMaquina <= 0;

  const conta = noCartao(naMaquina, escolhida);

  const mensagem = [
    "Olá! Simulei no cartão pelo site:",
    "",
    moto ? `Moto: ${moto}` : "",
    `Valor: ${formatarMoeda(preco)}`,
    paga > 0 ? `Entrada: ${formatarMoeda(paga)}` : "",
    `No cartão: ${formatarMoeda(naMaquina)}`,
    `${conta.parcelas}x de ${formatarMoeda(conta.parcela)}`,
    `Total no cartão: ${formatarMoeda(conta.total)}`,
    "",
    "Quero confirmar se dá para fechar assim.",
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
            htmlFor="entrada-cartao"
            className="text-xs font-semibold texto-suave"
          >
            {primeiroPasso}. Entrada (se tiver)
          </label>

          {preco > 0 && paga > 0 && (
            <span className="text-xs font-bold texto-ouro">
              {Math.round(porcentagem)}% do valor
            </span>
          )}
        </div>

        <CampoMoeda
          id="entrada-cartao"
          value={paga ? String(paga) : ""}
          onChange={setEntrada}
          placeholder="0,00"
          className={campo}
        />

        {/*
          * A barra, igual à do financiamento.
          *
          * Aqui ela mostra uma coisa que o campo não mostra: o
          * acréscimo da maquininha encolhendo junto com o valor
          * parcelado. Puxar a entrada e ver a parcela cair é o
          * que faz a pessoa entender quanto vale adiantar.
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

        <p className="mt-2 text-[11px] leading-4 texto-suave">
          Em dinheiro, PIX ou débito não tem acréscimo — o
          acréscimo da maquininha cai só sobre o que for
          parcelado.
        </p>
      </div>

      {/*
        * Quanto sobra para o cartão, dito antes da tabela.
        *
        * É o número de que a tabela toda depende. Sem ele à
        * mostra, quem pôs entrada vê vinte e quatro parcelas e
        * não sabe de que valor elas saíram.
        */}
      {temConta && paga > 0 && (
        <p className="mt-4 rounded-xl border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm texto-suave">
          Vai no cartão:{" "}
          <strong className="texto-claro">
            {formatarMoeda(naMaquina)}
          </strong>
        </p>
      )}

      {entradaMaior && (
        <p className="mt-5 text-sm leading-6 texto-suave">
          A entrada já cobre o valor — nesse caso não precisa
          passar nada no cartão.
        </p>
      )}

      {/*
        * A tabela inteira, não quatro botões.
        *
        * No financiamento são quatro prazos e o dedo acerta de
        * primeira. Aqui são vinte e quatro, e o que a pessoa
        * quer é justamente COMPARAR: ver a parcela caindo e o
        * total subindo, e decidir onde parar. Esconder vinte
        * linhas para mostrar quatro seria esconder a decisão.
        *
        * E é comparando que aparece o 12x: ele custa menos no
        * total do que o 11x. Quem só visse quatro botões nunca
        * saberia disso.
        */}
      {temConta && (
        <div className="mt-5">
          <span className="mb-1.5 block text-xs font-semibold texto-suave">
            {primeiroPasso + 1}. Em quantas vezes
          </span>

          <ul className="overflow-hidden rounded-xl border border-[rgba(255,255,255,0.09)]">
            {CARTAO.map((linha) => {
              const item = noCartao(naMaquina, linha.parcelas);
              const atual = escolhida === linha.parcelas;

              return (
                <li key={linha.parcelas}>
                  <button
                    type="button"
                    onClick={() => setEscolhida(linha.parcelas)}
                    aria-pressed={atual}
                    className={`flex w-full items-baseline gap-3 border-b border-[rgba(255,255,255,0.06)] px-4 py-2.5 text-left transition ${
                      atual
                        ? "bg-[rgba(224,177,41,0.12)]"
                        : "bg-transparent"
                    }`}
                  >
                    <span
                      className={`w-10 shrink-0 text-sm font-bold ${
                        atual ? "texto-ouro" : "texto-suave"
                      }`}
                    >
                      {linha.parcelas}x
                    </span>

                    <span className="min-w-0 flex-1 text-sm font-bold texto-claro">
                      {formatarMoeda(item.parcela)}
                    </span>

                    <span className="shrink-0 text-right text-[11px] leading-4 texto-suave">
                      {formatarMoeda(item.total)}
                      <br />
                      {linha.promocional ? (
                        <strong className="texto-ouro">
                          melhor que {linha.parcelas - 1}x
                        </strong>
                      ) : (
                        <>
                          +
                          {(linha.acrescimo * 100).toLocaleString(
                            "pt-BR",
                            { maximumFractionDigits: 2 }
                          )}
                          %
                        </>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="mt-1.5 text-[11px] leading-4 texto-suave">
            À esquerda a parcela; à direita o total e o
            acréscimo.
          </p>
        </div>
      )}

      {temConta && (
        <div className="mt-6 rounded-2xl border border-[rgba(224,177,41,0.28)] bg-[rgba(224,177,41,0.08)] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] texto-ouro">
            {conta.parcelas} parcelas de
          </p>

          <p className="mt-1 text-3xl font-black texto-claro sm:text-4xl">
            {formatarMoeda(conta.parcela)}
          </p>

          <dl
            className={`mt-4 grid gap-2 text-sm ${
              paga > 0 ? "sm:grid-cols-4" : "sm:grid-cols-3"
            }`}
          >
            {paga > 0 && (
              <div>
                <dt className="text-xs texto-suave">Entrada</dt>
                <dd className="font-bold texto-claro">
                  {formatarMoeda(paga)}
                </dd>
              </div>
            )}

            <div>
              <dt className="text-xs texto-suave">No cartão</dt>
              <dd className="font-bold texto-claro">
                {formatarMoeda(naMaquina)}
              </dd>
            </div>

            <div>
              <dt className="text-xs texto-suave">Acréscimo</dt>
              <dd className="font-bold texto-claro">
                {formatarMoeda(conta.juros)}
              </dd>
            </div>

            <div>
              <dt className="text-xs texto-suave">
                Total no cartão
              </dt>
              <dd className="font-bold texto-claro">
                {formatarMoeda(conta.total)}
              </dd>
            </div>
          </dl>

          {/*
            * Com entrada, o total no cartão não é o total da
            * moto - e é o total da moto que a pessoa compara
            * com o preço anunciado.
            */}
          {paga > 0 && (
            <p className="mt-3 text-xs leading-5 texto-suave">
              Entrada mais cartão:{" "}
              <strong className="texto-claro">
                {formatarMoeda(paga + conta.total)}
              </strong>{" "}
              pela moto.
            </p>
          )}
        </div>
      )}

      {/*
        * O aviso, que aqui é outro.
        *
        * No financiamento o risco é a análise mudar o número.
        * No cartão o número é esse mesmo - o risco é o limite
        * não cobrir, e isso o site não tem como saber. Dizer
        * "sujeito a análise de crédito" aqui seria copiar um
        * aviso que não vale e deixar de dar o que vale.
        */}
      <p className="mt-5 text-xs leading-5 texto-suave">
        Valores da <strong>tabela da maquininha da loja</strong>,
        com o acréscimo já incluso na parcela. O que pode mudar é
        o seu <strong>limite disponível</strong> — e algumas
        bandeiras limitam o número de parcelas. Confirme com a
        gente antes de vir.
      </p>

      {temConta && (
        <a
          href={linkWhatsApp(mensagem)}
          target="_blank"
          rel="noopener noreferrer"
          className="botao-ouro mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold sm:w-auto"
        >
          <IconeWhatsApp className="h-5 w-5" />
          Confirmar no WhatsApp
        </a>
      )}
    </>
  );
}
