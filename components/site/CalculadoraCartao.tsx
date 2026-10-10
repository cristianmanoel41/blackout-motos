"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import CampoMoeda from "@/components/CampoMoeda";
import BarraDoResultado from "@/components/site/BarraDoResultado";
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
  painel = null,
}: {
  preco: number;
  moto?: string;
  primeiroPasso?: number;
  /* A coluna do simulador onde a conta é escrita. */
  painel?: HTMLElement | null;
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

  const resumo = (
    <>
      {!temConta && (
        <div className="sim-vazio">
          <p className="text-sm font-bold texto-claro">
            {entradaMaior
              ? "Nada vai no cartão"
              : "Falta o valor da moto"}
          </p>

          <p className="max-w-[16rem] text-xs leading-5 texto-suave">
            {entradaMaior
              ? "A entrada já cobre o valor da moto."
              : "Escolha a moto ou digite o valor para ver as parcelas."}
          </p>
        </div>
      )}

      {temConta && (
        <div className="sim-resultado">
          <p className="sim-rotulo">
            No cartão · {conta.parcelas}x
          </p>

          <p className="sim-valor mt-2">
            {formatarMoeda(conta.parcela)}
          </p>

          <p className="mt-1 text-sm texto-suave">
            por mês, acréscimo incluso
          </p>

          <dl className="sim-linhas">
            {paga > 0 && (
              <div>
                <dt>Entrada</dt>
                <dd>{formatarMoeda(paga)}</dd>
              </div>
            )}

            <div>
              <dt>Valor no cartão</dt>
              <dd>{formatarMoeda(naMaquina)}</dd>
            </div>

            <div>
              <dt>Acréscimo</dt>
              <dd>{formatarMoeda(conta.juros)}</dd>
            </div>

            <div>
              <dt>Total no cartão</dt>
              <dd>{formatarMoeda(conta.total)}</dd>
            </div>

            {/*
              * Com entrada, o total no cartão não é o total da
              * moto - e é o total da moto que a pessoa compara
              * com o preço anunciado.
              */}
            {paga > 0 && (
              <div>
                <dt>Total pela moto</dt>
                <dd>{formatarMoeda(paga + conta.total)}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {temConta && (
        <a
          href={linkWhatsApp(mensagem)}
          target="_blank"
          rel="noopener noreferrer"
          className="botao-ouro mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold"
        >
          <IconeWhatsApp className="h-5 w-5" />
          Confirmar no WhatsApp
        </a>
      )}

      {/*
        * O aviso, que aqui é outro.
        *
        * No financiamento o risco é a análise mudar o número.
        * No cartão o número é esse mesmo - o risco é o limite
        * não cobrir, e isso o site não tem como saber.
        */}
      <p className="sim-aviso">
        <Info aria-hidden="true" />
        <span>
          Valores da <strong>tabela da maquininha da loja</strong>,
          com o acréscimo já incluso na parcela. O que pode mudar é
          o seu <strong>limite disponível</strong> — e algumas
          bandeiras limitam o número de parcelas. Confirme com a
          gente antes de vir.
        </span>
      </p>
    </>
  );

  return (
    <>
      <div className="sim-passo">
        <div className="flex items-start justify-between gap-3">
          <label
            htmlFor="entrada-cartao"
            className="sim-passo-titulo"
          >
            <span className="sim-numero">{primeiroPasso}</span>
            Entrada (se tiver)
          </label>

          {preco > 0 && paga > 0 && (
            <span className="sim-selo shrink-0">
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
          * A barra, igual à do financiamento: aqui ela mostra o
          * acréscimo da maquininha encolhendo junto com o valor
          * parcelado.
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

        <p className="mt-3 text-[11px] leading-4 texto-suave">
          Em dinheiro, PIX ou débito não tem acréscimo — o
          acréscimo da maquininha cai só sobre o que for
          parcelado.
        </p>

        {/* Quanto sobra para o cartão, dito antes da tabela:
            é o número de que a tabela toda depende. */}
        {temConta && paga > 0 && (
          <p className="sim-dado mt-3 text-sm texto-suave">
            Vai no cartão:{" "}
            <strong className="texto-claro">
              {formatarMoeda(naMaquina)}
            </strong>
          </p>
        )}
      </div>

      {/*
        * A tabela inteira, não quatro botões.
        *
        * Aqui são vinte e quatro prazos, e o que a pessoa quer é
        * justamente COMPARAR: ver a parcela caindo e o total
        * subindo. E é comparando que aparece o 12x: ele custa
        * menos no total do que o 11x.
        */}
      {temConta && (
        <div className="sim-passo">
          <div className="flex items-baseline justify-between gap-3">
            <p className="sim-passo-titulo">
              <span className="sim-numero">{primeiroPasso + 1}</span>
              Em quantas vezes
            </p>

            <p className="hidden text-[11px] texto-suave sm:block">
              Parcela · total e acréscimo
            </p>
          </div>

          <ul className="sim-tabela">
            {CARTAO.map((linha) => {
              const item = noCartao(naMaquina, linha.parcelas);
              const atual = escolhida === linha.parcelas;

              return (
                <li key={linha.parcelas}>
                  <button
                    type="button"
                    onClick={() => setEscolhida(linha.parcelas)}
                    aria-pressed={atual}
                    className="flex w-full items-baseline gap-3 border-b border-[rgba(255,255,255,0.06)] bg-transparent px-4 py-2.5 text-left transition"
                  >
                    <span
                      className={`w-10 shrink-0 text-sm font-bold tabular-nums ${
                        atual ? "texto-ouro" : "texto-suave"
                      }`}
                    >
                      {linha.parcelas}x
                    </span>

                    <span className="min-w-0 flex-1 text-sm font-bold tabular-nums texto-claro">
                      {formatarMoeda(item.parcela)}
                    </span>

                    <span className="shrink-0 text-right text-[11px] leading-4 tabular-nums texto-suave">
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
        </div>
      )}

      {painel && createPortal(resumo, painel)}

      {temConta && (
        <BarraDoResultado
          rotulo={`${conta.parcelas}x no cartão`}
          valor={formatarMoeda(conta.parcela)}
          alvo={painel}
        />
      )}
    </>
  );
}
