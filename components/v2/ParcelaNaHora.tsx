"use client";

import { useState } from "react";
import Link from "next/link";
import { Calculator, Info } from "lucide-react";
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

/*
 * A PARCELA NA HORA, DENTRO DA PÁGINA DA MOTO
 *
 * Quem olha a moto quer saber se cabe no mês. Ir até o
 * simulador, achar a moto e digitar o valor de novo era passo
 * demais. Aqui o valor já vem da moto: a pessoa só arrasta a
 * entrada e escolhe o prazo.
 *
 * A conta e as taxas são as do simulador (lib/dados/parcela),
 * para os dois darem o mesmo número. Nada sai do navegador a
 * menos que a pessoa mande no WhatsApp, e a mensagem já vai
 * com a moto, a entrada e o prazo escritos.
 */
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
  const [entrada, setEntrada] = useState("");
  /* 48x de saída: é o prazo que a maioria pergunta primeiro. */
  const [meses, setMeses] = useState(48);

  if (!(preco > 0)) return null;

  const paga = Math.min(Number(entrada) || 0, preco);
  const financiado = preco - paga;

  const minima = parcelaPrice(financiado, TAXA_MINIMA, meses);
  const maxima = parcelaPrice(financiado, TAXA_MAXIMA, meses);

  const mensagem = [
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

      <div className="mt-3 flex items-end justify-between gap-3">
        <label htmlFor="entrada-na-hora" className="text-[13px] suave">
          Entrada
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

      <div className="mt-3 grid grid-cols-4 gap-1.5" role="group" aria-label="Prazo">
        {PARCELAS.map((quantas) => (
          <button
            key={quantas}
            type="button"
            onClick={() => setMeses(quantas)}
            aria-pressed={meses === quantas}
            className={`rounded-lg border py-2 text-sm font-bold transition ${
              meses === quantas
                ? "border-[#e0b129] bg-[#e0b129] text-black"
                : "border-white/10 text-white/80 hover:border-[#e0b129]/60"
            }`}
          >
            {quantas}x
          </button>
        ))}
      </div>

      {financiado > 0 ? (
        <div className="mt-4 rounded-xl bg-black/40 px-4 py-3 text-center">
          <p className="text-[12px] suave">{meses}x estimado de</p>
          <p className="titulo mt-0.5 text-[1.7rem] leading-tight claro">
            {formatarMoeda(minima)}
          </p>
          <p className="text-[13px] suave">
            até <strong className="claro">{formatarMoeda(maxima)}</strong> por mês
          </p>
        </div>
      ) : (
        <p className="mt-4 rounded-xl bg-black/40 px-4 py-3 text-center text-sm suave">
          A entrada já cobre o valor da moto.
        </p>
      )}

      {financiado > 0 && (
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
        * O texto completo está no simulador.
        */}
      <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-4 suave">
        <Info size={13} className="mt-px shrink-0" />
        <span>
          Simulação ilustrativa, com taxa de {MINIMA_ESCRITA} a{" "}
          {MAXIMA_ESCRITA} ao mês. Parcela e entrada sujeitas à análise
          de crédito do banco; sem entrada pode não ser aprovado. Não
          inclui IOF, tarifas nem seguros.{" "}
          <Link href={simulador} className="font-bold underline ouro">
            Ver simulação completa
          </Link>
        </span>
      </p>
    </div>
  );
}
