"use client";

import { useEffect, useMemo, useState } from "react";
import CampoMoeda from "@/components/CampoMoeda";
import EscolherMoto, {
  type MotoDaLista,
} from "@/components/site/EscolherMoto";
import PassosDoFinanciamento from "@/components/site/CalculadoraParcela";
import PassosDoCartao from "@/components/site/CalculadoraCartao";
import { registrarSimulacao } from "@/components/site/medicao";

/*
 * O SIMULADOR, COM A PERGUNTA CERTA NA FRENTE
 *
 * Antes eram dois blocos empilhados: a calculadora do banco e,
 * logo abaixo, a do cartão. Cada uma com o próprio campo de
 * moto, o próprio campo de valor, o próprio título. Quem
 * chegava via a mesma pergunta duas vezes e não entendia que
 * eram dois caminhos para a mesma coisa - parecia a página ter
 * se repetido.
 *
 * Agora a primeira pergunta é a que a pessoa já sabe responder:
 * banco ou cartão. Só depois dela aparecem a moto, o valor e as
 * parcelas - e só os campos daquele caminho.
 *
 * A MOTO E O VALOR FICAM AQUI, não dentro de cada caminho.
 *
 * É o que faz valer a pena juntar: quem escolheu a moto, viu a
 * parcela do banco e quer comparar com o cartão, troca o botão
 * de cima e os números já estão lá. Se cada caminho guardasse o
 * seu, comparar custaria digitar tudo de novo - e ninguém
 * compara duas vezes.
 */

type Metodo = "" | "financiamento" | "cartao";

/*
 * "R$ 16.500,00" vira 16500.
 *
 * O estoque entrega o preço já escrito para leitura, e moto sem
 * preço vem como "Consultar" - que não tem dígito nenhum e
 * devolve zero, do jeito certo.
 */
function numeroDoPreco(texto: string) {
  const digitos = (texto || "").replace(/\D/g, "");

  return digitos ? Number(digitos) / 100 : 0;
}

const CAMINHOS: {
  chave: Exclude<Metodo, "">;
  nome: string;
  abaixo: string;
}[] = [
  {
    chave: "financiamento",
    nome: "Financiamento",
    abaixo: "No banco, com entrada",
  },
  {
    chave: "cartao",
    nome: "Cartão de crédito",
    abaixo: "Na maquininha, até 24x",
  },
];

export default function SimuladorDePagamento({
  estoque = [],
  motoInicial = "",
}: {
  estoque?: MotoDaLista[];
  motoInicial?: string;
}) {
  /* Só entram na lista as motos com preço: simular sobre uma
     moto "a consultar" não tem como dar número. */
  const comPreco = useMemo(
    () => estoque.filter((item) => numeroDoPreco(item.preco) > 0),
    [estoque]
  );

  const [metodo, setMetodo] = useState<Metodo>("");
  const [moto, setMoto] = useState(motoInicial);
  const [valor, setValor] = useState("");

  /*
   * Escolher moto preenche o valor.
   *
   * Quem chega pela ficha de uma moto já encontra tudo pronto;
   * quem chega pelo menu escolhe aqui. O campo continua
   * digitável depois - serve para quem está de olho numa moto
   * que ainda não entrou no site, ou, no cartão, para quem vai
   * passar só a entrada.
   */
  useEffect(() => {
    const achada = comPreco.find((item) => item.nome === moto);

    if (!achada) return;

    setValor(String(numeroDoPreco(achada.preco)));
  }, [moto, comPreco]);

  const preco = Number(valor) || 0;
  const escolheu = metodo !== "";

  /*
   * Conta a simulação quando a parcela aparece: método
   * escolhido e valor na tela. Só encostar no botão sem valor
   * não é simulação - não deu número nenhum.
   */
  useEffect(() => {
    if (metodo && preco > 0) registrarSimulacao(metodo);
  }, [metodo, preco]);

  /*
   * A numeração dos passos é contada, não escrita.
   *
   * Sem moto com preço no estoque, o passo da moto não existe -
   * e uma tela que pula do "1." para o "3." parece quebrada.
   */
  const temLista = comPreco.length > 0;
  const passoDaMoto = 2;
  const passoDoValor = temLista ? 3 : 2;
  const proximoPasso = passoDoValor + 1;

  const campo =
    "w-full rounded-xl border px-4 py-3 text-sm outline-none";

  const rotulo =
    "mb-1.5 block text-xs font-semibold texto-suave";

  return (
    <div className="cartao-3d rounded-2xl p-5 sm:p-8">
      <h2 className="text-xl font-black texto-claro sm:text-2xl">
        Simule o seu <span className="texto-ouro">pagamento</span>
      </h2>

      <p className="mt-2 text-sm leading-6 texto-suave">
        Sem cadastro e sem compromisso — a conta acontece aqui
        mesmo, no seu celular.
      </p>

      <div className="mt-6">
        <span className={rotulo}>1. Como você quer pagar?</span>

        {/*
          * Dois botões grandes, com o que cada um é escrito
          * embaixo.
          *
          * "Financiamento" e "Cartão" sozinhos obrigam a pessoa
          * a saber a diferença antes de escolher. A linha de
          * baixo responde isso na própria escolha.
          */}
        <div className="grid gap-2 sm:grid-cols-2">
          {CAMINHOS.map((caminho) => {
            const atual = metodo === caminho.chave;

            return (
              <button
                key={caminho.chave}
                type="button"
                onClick={() => setMetodo(caminho.chave)}
                aria-pressed={atual}
                className={`rounded-xl px-5 py-3.5 text-left transition ${
                  atual ? "botao-ouro" : "botao-vidro"
                }`}
              >
                <span className="block text-sm font-bold">
                  {caminho.nome}
                </span>

                <span
                  className={`mt-0.5 block text-[11px] leading-4 ${
                    atual ? "opacity-70" : "texto-suave"
                  }`}
                >
                  {caminho.abaixo}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/*
        * Enquanto não há caminho escolhido, o resto não existe.
        *
        * Uma tela com seis campos ao mesmo tempo faz a pessoa
        * decidir por onde começar antes de decidir qualquer
        * coisa útil - e quem está no celular desiste nessa hora.
        */}
      {!escolheu && (
        <p className="mt-5 text-sm leading-6 texto-suave">
          Escolha um dos dois acima e a moto, o valor e as
          parcelas aparecem aqui.
        </p>
      )}

      {escolheu && (
        <>
          {temLista && (
            <div className="mt-5">
              <span className={rotulo}>
                {passoDaMoto}. Escolha a moto
              </span>

              <EscolherMoto
                valor={moto}
                aoEscolher={setMoto}
                estoque={comPreco}
                rolagemInterna={false}
                comecaFechada
              />
            </div>
          )}

          <div className="mt-5">
            <label htmlFor="valor-simulado" className={rotulo}>
              {passoDoValor}. Valor da moto
            </label>

            <CampoMoeda
              id="valor-simulado"
              value={valor}
              onChange={setValor}
              placeholder="0,00"
              className={campo}
            />

            {metodo === "cartao" && (
              <p className="mt-1.5 text-[11px] leading-4 texto-suave">
                Escolher a moto preenche o preço. A entrada, no
                passo seguinte, desconta o que vai no cartão.
              </p>
            )}
          </div>

          {metodo === "financiamento" ? (
            <PassosDoFinanciamento
              preco={preco}
              moto={moto}
              primeiroPasso={proximoPasso}
            />
          ) : (
            <PassosDoCartao
              preco={preco}
              moto={moto}
              primeiroPasso={proximoPasso}
            />
          )}
        </>
      )}
    </div>
  );
}
