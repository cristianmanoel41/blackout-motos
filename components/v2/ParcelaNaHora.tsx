"use client";

import { useState } from "react";
import Link from "next/link";
import { Calculator, CreditCard, Info, Landmark } from "lucide-react";
import CampoMoeda from "@/components/CampoMoeda";
import { IconeWhatsApp } from "@/components/site/IconeWhatsApp";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import { linkWhatsApp } from "@/lib/dados/loja";
import {
  MAXIMA_ESCRITA,
  MINIMA_ESCRITA,
  PARCELAS,
  PASSO_DA_ENTRADA,
  TAXA_MAXIMA,
  TAXA_MINIMA,
  parcelaPrice,
} from "@/lib/dados/parcela";
import { noCartao } from "@/lib/dados/cartao-maquininha";

/*
 * A PARCELA NA HORA, DENTRO DA PÁGINA DA MOTO
 *
 * Quem olha a moto quer saber se cabe no mês. Ir até o
 * simulador, achar a moto e digitar o valor de novo era passo
 * demais. Aqui o valor já vem da moto: a pessoa só arrasta a
 * entrada e escolhe o prazo.
 *
 * Duas formas, na mesma caixa:
 *
 *   - Financiamento: a conta e as taxas são as do simulador
 *     (lib/dados/parcela), para os dois darem o mesmo número.
 *   - Cartão de crédito: a tabela da maquininha da loja
 *     (lib/dados/cartao-maquininha), a mesma do simulador
 *     completo. A entrada abate o que passa no cartão e o
 *     acréscimo cai só sobre o resto - como a máquina cobra.
 *
 * A entrada digitada vale para as duas: quem troca de aba não
 * perde o que escreveu. Nada sai do navegador a menos que a
 * pessoa mande no WhatsApp, e a mensagem já vai com a moto, a
 * entrada e o prazo escritos.
 */

/*
 * Os prazos do cartão que viram botão. A maquininha vai de 1x
 * a 24x; oito botões cobrem o que se pergunta sem virar uma
 * grade de 24.
 */
const PRAZOS_DO_CARTAO = [1, 3, 6, 10, 12, 15, 18, 24];

type Forma = "financiamento" | "cartao";

const FORMAS = [
  { chave: "financiamento", nome: "Financiamento", Icone: Landmark },
  { chave: "cartao", nome: "Cartão de crédito", Icone: CreditCard },
] as const;

const botaoDePrazo = (ativo: boolean) =>
  `rounded-lg border py-2 text-sm font-bold transition ${
    ativo
      ? "border-[#e0b129] bg-[#e0b129] text-black"
      : "border-white/10 text-white/80 hover:border-[#e0b129]/60"
  }`;

export default function ParcelaNaHora({
  preco,
  moto,
  simulador,
}: {
  preco: number;
  moto: string;
  /* A página do simulador completo, com a moto já escolhida. */
  simulador: string;
}) {
  const [forma, setForma] = useState<Forma>("financiamento");
  const [entrada, setEntrada] = useState("");
  /* 48x de saída: é o prazo que a maioria pergunta primeiro. */
  const [meses, setMeses] = useState(48);
  /* 12x de saída no cartão: é o prazo com promoção da maquininha. */
  const [vezes, setVezes] = useState(12);

  if (!(preco > 0)) return null;

  const noCartaoAgora = forma === "cartao";

  const paga = Math.min(Number(entrada) || 0, preco);
  /* No financiamento é o que vai para o banco; no cartão, o que passa na máquina. */
  const resto = preco - paga;

  const minima = parcelaPrice(resto, TAXA_MINIMA, meses);
  const maxima = parcelaPrice(resto, TAXA_MAXIMA, meses);

  const cartao = noCartao(resto, vezes);

  const mensagem = noCartaoAgora
    ? [
        "Olá! Simulei no cartão pelo site:",
        "",
        `Moto: ${moto}`,
        `Valor: ${formatarMoeda(preco)}`,
        paga > 0 ? `Entrada: ${formatarMoeda(paga)}` : "",
        `No cartão: ${formatarMoeda(resto)}`,
        `${cartao.parcelas}x de ${formatarMoeda(cartao.parcela)}`,
        `Total no cartão: ${formatarMoeda(cartao.total)}`,
        "",
        "Quero confirmar se dá para fechar assim.",
      ]
        .filter((linha) => linha !== "")
        .join("\n")
    : [
        "Olá! Fiz uma simulação no site:",
        "",
        `Moto: ${moto}`,
        `Valor: ${formatarMoeda(preco)}`,
        `Entrada: ${paga > 0 ? formatarMoeda(paga) : "sem entrada"}`,
        `Parcelas: ${meses}x de ${formatarMoeda(minima)} a ${formatarMoeda(maxima)}`,
        "",
        "Quero ver as condições reais do banco.",
      ].join("\n");

  return (
    <div className="mt-5 rounded-2xl border border-[#e0b129]/20 bg-[#e0b129]/[0.04] p-4">
      <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em] ouro">
        <Calculator size={15} />
        Parcela na hora
      </p>

      <div
        className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-black/40 p-1"
        role="tablist"
        aria-label="Forma de pagamento"
      >
        {FORMAS.map(({ chave, nome, Icone }) => (
          <button
            key={chave}
            type="button"
            role="tab"
            aria-selected={forma === chave}
            aria-label={nome}
            onClick={() => setForma(chave)}
            className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg py-2 text-[13px] font-semibold transition ${
              forma === chave
                ? "bg-[#e0b129] text-black"
                : "text-white/70 hover:text-white"
            }`}
          >
            <Icone size={15} className="shrink-0" />
            {chave === "cartao" ? (
              <span>
                Cartão
                {/* No celular estreito o nome inteiro quebrava em duas linhas. */}
                <span className="max-[440px]:hidden"> de crédito</span>
              </span>
            ) : (
              nome
            )}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <label htmlFor="entrada-na-hora" className="text-[13px] suave">
          Entrada{noCartaoAgora ? " (dinheiro, PIX ou débito)" : ""}
        </label>
        <span className="text-[11px] suave">
          {Math.round((paga / preco) * 100)}% do valor
        </span>
      </div>

      <CampoMoeda
        id="entrada-na-hora"
        value={paga ? String(paga) : ""}
        onChange={setEntrada}
        placeholder="Sem entrada"
        className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white outline-none focus:border-[#e0b129]/60"
      />

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

      {noCartaoAgora ? (
        <div className="mt-3 grid grid-cols-4 gap-1.5" role="group" aria-label="Parcelas no cartão">
          {PRAZOS_DO_CARTAO.map((quantas) => (
            <button
              key={quantas}
              type="button"
              onClick={() => setVezes(quantas)}
              aria-pressed={vezes === quantas}
              className={botaoDePrazo(vezes === quantas)}
            >
              {quantas}x
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-4 gap-1.5" role="group" aria-label="Prazo">
          {PARCELAS.map((quantas) => (
            <button
              key={quantas}
              type="button"
              onClick={() => setMeses(quantas)}
              aria-pressed={meses === quantas}
              className={botaoDePrazo(meses === quantas)}
            >
              {quantas}x
            </button>
          ))}
        </div>
      )}

      {resto <= 0 ? (
        <p className="mt-4 rounded-xl bg-black/40 px-4 py-3 text-center text-sm suave">
          A entrada já cobre o valor da moto.
        </p>
      ) : noCartaoAgora ? (
        <div className="mt-4 rounded-xl bg-black/40 px-4 py-3 text-center">
          <p className="text-[12px] suave">
            {cartao.parcelas === 1
              ? "À vista no cartão"
              : `${cartao.parcelas}x no cartão de`}
          </p>
          <p className="titulo mt-0.5 text-[1.7rem] leading-tight claro">
            {formatarMoeda(cartao.parcela)}
          </p>
          <p className="text-[13px] suave">
            total no cartão{" "}
            <strong className="claro">{formatarMoeda(cartao.total)}</strong>
          </p>
          {cartao.promocional && (
            <p className="mt-1.5 text-[11.5px] font-semibold ouro">
              Promoção da maquininha: o total sai menor que em{" "}
              {cartao.parcelas - 1}x
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-xl bg-black/40 px-4 py-3 text-center">
          <p className="text-[12px] suave">{meses}x estimado de</p>
          <p className="titulo mt-0.5 text-[1.7rem] leading-tight claro">
            {formatarMoeda(minima)}
          </p>
          <p className="text-[13px] suave">
            até <strong className="claro">{formatarMoeda(maxima)}</strong> por mês
          </p>
        </div>
      )}

      {resto > 0 && (
        <a
          href={linkWhatsApp(mensagem)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#e0b129]/50 px-4 py-2.5 text-sm font-bold ouro transition hover:bg-[#e0b129]/10"
        >
          <IconeWhatsApp className="h-4 w-4" />
          Mandar esta simulação
        </a>
      )}

      {/*
        * O aviso fica junto do número: quem lê "R$ 480 por mês"
        * precisa ler na mesma olhada que ainda passa por análise.
        * No cartão não há análise de banco - o que pode faltar é
        * limite, e isso o aviso diz.
        */}
      <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-4 suave">
        <Info size={13} className="mt-px shrink-0" />
        {noCartaoAgora ? (
          <span>
            Valores da maquininha da loja, com o acréscimo do parcelamento
            já incluso. Sem análise de crédito: só precisa ter limite no
            cartão.{" "}
            <Link href={simulador} className="font-bold underline ouro">
              Ver simulação completa
            </Link>
          </span>
        ) : (
          <span>
            Simulação ilustrativa, com taxa de {MINIMA_ESCRITA} a{" "}
            {MAXIMA_ESCRITA} ao mês. Parcela e entrada sujeitas à análise
            de crédito do banco; sem entrada pode não ser aprovado. Não
            inclui IOF, tarifas nem seguros.{" "}
            <Link href={simulador} className="font-bold underline ouro">
              Ver simulação completa
            </Link>
          </span>
        )}
      </p>
    </div>
  );
}
