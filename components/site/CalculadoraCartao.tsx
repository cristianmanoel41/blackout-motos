"use client";

import { useState } from "react";
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
 * Serve para os dois usos da loja: passar a entrada no cartão e
 * financiar o resto, ou passar a moto inteira. Por isso o valor
 * vem de fora como número livre, e não do preço da moto.
 */

export default function PassosDoCartao({
  preco,
  moto = "",
  primeiroPasso = 1,
}: {
  preco: number;
  moto?: string;
  primeiroPasso?: number;
}) {
  const [escolhida, setEscolhida] = useState(12);

  const temConta = preco > 0;
  const conta = noCartao(preco, escolhida);

  const mensagem = [
    "Olá! Simulei no cartão pelo site:",
    "",
    moto ? `Moto: ${moto}` : "",
    `Valor: ${formatarMoeda(preco)}`,
    `${conta.parcelas}x de ${formatarMoeda(conta.parcela)}`,
    `Total no cartão: ${formatarMoeda(conta.total)}`,
    "",
    "Quero confirmar se dá para fechar assim.",
  ]
    .filter((linha) => linha !== "")
    .join("\n");

  return (
    <>
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
            {primeiroPasso}. Em quantas vezes
          </span>

          <ul className="overflow-hidden rounded-xl border border-[rgba(255,255,255,0.09)]">
            {CARTAO.map((linha) => {
              const item = noCartao(preco, linha.parcelas);
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

          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs texto-suave">No cartão</dt>
              <dd className="font-bold texto-claro">
                {formatarMoeda(preco)}
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
