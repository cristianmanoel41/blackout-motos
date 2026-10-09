"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw, Sparkles, Wallet } from "lucide-react";
import CardMoto from "@/components/v2/CardMoto";
import { IconeWhatsApp } from "@/components/site/IconeWhatsApp";
import { rastrear } from "@/components/site/Pixel";
import { linkWhatsApp } from "@/lib/dados/loja";
import {
  CATEGORIAS,
  FAIXAS_DE_PRECO,
  USOS,
  anoDaMoto,
  cabeNaFaixa,
  categoriaDaMoto,
  nomeDaMoto,
  numero,
  serveParaUso,
  type Categoria,
  type MotoSite,
  type Uso,
} from "@/lib/dados/moto-site";

/*
 * ENCONTRE SUA MOTO IDEAL
 *
 * Quatro perguntas de um toque cada - quanto quer gastar, que
 * tipo de moto, para que vai usar e se pretende financiar - e
 * a resposta aparece embaixo enquanto a pessoa escolhe. Sem
 * "próximo", sem formulário: quem chega do Instagram não tem
 * paciência para assistente de cinco telas.
 *
 * A resposta sai do estoque de verdade, o mesmo da vitrine.
 * Nada é sugerido que não esteja no pátio hoje.
 *
 * COMO A ESCOLHA É FEITA
 *
 * Preço e tipo são regra: quem disse "até 15 mil" não quer ver
 * moto de 30, e quem pediu scooter não quer trail. O uso é
 * preferência - as motos que servem para ele sobem na lista,
 * mas uma boa opção não some só porque o cadastro não tem
 * cilindrada. Se a regra não deixar nada, a ferramenta diz isso
 * com franqueza e mostra as mais próximas do preço, em vez de
 * uma tela vazia.
 */

type Resposta = {
  preco: string;
  tipo: Categoria;
  uso: Uso | "";
  financiar: "sim" | "nao" | "";
};

const VAZIA: Resposta = { preco: "", tipo: "todas", uso: "", financiar: "" };

export default function EncontreSuaMoto({
  motos,
  slugs,
  capas,
  totalFotos = {},
  totalVideos = {},
  quantos = 6,
}: {
  motos: MotoSite[];
  slugs: Record<string, string>;
  capas: Record<string, string>;
  totalFotos?: Record<string, number>;
  totalVideos?: Record<string, number>;
  quantos?: number;
}) {
  const [resposta, setResposta] = useState<Resposta>(VAZIA);
  const avisou = useRef(false);

  function responder<T extends keyof Resposta>(campo: T, valor: Resposta[T]) {
    setResposta((atual) => ({
      ...atual,
      /* Tocar de novo na mesma opção desmarca. */
      [campo]: atual[campo] === valor ? VAZIA[campo] : valor,
    }));

    /*
     * Conta para o Meta, uma vez por visita, que a pessoa
     * procurou moto por perfil - só acontece se ela aceitou os
     * cookies (ver Pixel).
     */
    if (!avisou.current) {
      avisou.current = true;
      rastrear("Search", { search_string: "encontre-sua-moto" });
    }
  }

  const tipos = CATEGORIAS.filter(
    (item) =>
      item.chave === "todas" ||
      motos.some((m) => categoriaDaMoto(m) === item.chave)
  );

  const respondeu = Boolean(
    resposta.preco || resposta.tipo !== "todas" || resposta.uso || resposta.financiar
  );

  const resultado = useMemo(() => {
    const dentro = motos.filter(
      (moto) =>
        (!resposta.preco || cabeNaFaixa(moto, resposta.preco)) &&
        (resposta.tipo === "todas" || categoriaDaMoto(moto) === resposta.tipo)
    );

    const ordenadas = resposta.uso
      ? [...dentro].sort(
          (a, b) =>
            Number(serveParaUso(b, resposta.uso as Uso)) -
            Number(serveParaUso(a, resposta.uso as Uso))
        )
      : dentro;

    if (ordenadas.length > 0) {
      return { exatas: true, lista: ordenadas.slice(0, quantos), total: ordenadas.length };
    }

    /* Nada na regra: as mais perto do teto que a pessoa deu. */
    const faixa = FAIXAS_DE_PRECO.find((f) => f.chave === resposta.preco);
    const alvo = faixa ? faixa.ate ?? faixa.de : 0;

    const proximas = [...motos]
      .filter((m) => numero(m.preco_anunciado) !== null)
      .sort(
        (a, b) =>
          Math.abs((numero(a.preco_anunciado) || 0) - alvo) -
          Math.abs((numero(b.preco_anunciado) || 0) - alvo)
      )
      .slice(0, Math.min(quantos, 3));

    return { exatas: false, lista: proximas, total: 0 };
  }, [motos, resposta, quantos]);

  const primeira = resultado.lista[0];

  const pedido = [
    "Olá! Usei o \"Encontre sua moto ideal\" no site.",
    resposta.preco
      ? `Orçamento: ${FAIXAS_DE_PRECO.find((f) => f.chave === resposta.preco)?.nome}.`
      : null,
    resposta.tipo !== "todas"
      ? `Tipo: ${CATEGORIAS.find((c) => c.chave === resposta.tipo)?.nome}.`
      : null,
    resposta.uso ? `Uso: ${USOS.find((u) => u.chave === resposta.uso)?.nome}.` : null,
    resposta.financiar === "sim" ? "Quero financiar." : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <div className="vidro grid gap-6 p-5 sm:p-7 lg:grid-cols-2">
        <Pergunta numero="1" titulo="Quanto pretende investir?">
          {FAIXAS_DE_PRECO.map((faixa) => (
            <Opcao
              key={faixa.chave}
              ligada={resposta.preco === faixa.chave}
              onClick={() => responder("preco", faixa.chave)}
            >
              {faixa.nome}
            </Opcao>
          ))}
        </Pergunta>

        <Pergunta numero="2" titulo="Que tipo de moto você prefere?">
          {tipos.map((item) => (
            <Opcao
              key={item.chave}
              ligada={resposta.tipo === item.chave}
              onClick={() => responder("tipo", item.chave)}
            >
              {item.chave === "todas" ? "Tanto faz" : item.nome}
            </Opcao>
          ))}
        </Pergunta>

        <Pergunta numero="3" titulo="Para que vai usar?">
          {USOS.map((uso) => (
            <Opcao
              key={uso.chave}
              ligada={resposta.uso === uso.chave}
              onClick={() => responder("uso", uso.chave)}
              dica={uso.texto}
            >
              {uso.nome}
            </Opcao>
          ))}
        </Pergunta>

        <Pergunta numero="4" titulo="Pretende financiar?">
          <Opcao
            ligada={resposta.financiar === "sim"}
            onClick={() => responder("financiar", "sim")}
          >
            Sim, quero parcelar
          </Opcao>
          <Opcao
            ligada={resposta.financiar === "nao"}
            onClick={() => responder("financiar", "nao")}
          >
            Não, à vista
          </Opcao>
        </Pergunta>
      </div>

      <div className="mt-8" aria-live="polite">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <p className="titulo text-[1.3rem] claro">
            {!respondeu ? (
              <>
                Comece tocando nas <span className="ouro">opções acima</span>
              </>
            ) : resultado.exatas ? (
              <>
                {resultado.total} moto{resultado.total === 1 ? "" : "s"}{" "}
                <span className="ouro">combina{resultado.total === 1 ? "" : "m"} com você</span>
              </>
            ) : (
              <>
                Nenhuma exata agora - <span className="ouro">veja as mais próximas</span>
              </>
            )}
          </p>

          {respondeu && (
            <button
              type="button"
              onClick={() => setResposta(VAZIA)}
              className="flex min-h-10 items-center gap-1.5 text-sm font-semibold suave hover:text-white"
            >
              <RotateCcw size={14} />
              Recomeçar
            </button>
          )}
        </div>

        {/*
          * Quem vai financiar vê a parcela antes do resto: é a
          * conta que decide se a moto cabe no mês, e o simulador
          * já chega com a primeira moto escolhida.
          */}
        {resposta.financiar === "sim" && primeira && (
          <Link
            href={`/financiamento?moto=${encodeURIComponent(
              `${nomeDaMoto(primeira)} ${anoDaMoto(primeira)}`
            )}`}
            className="vidro mb-5 flex items-center justify-between gap-4 p-4 sm:p-5"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e0b129]/10 ring-1 ring-[#e0b129]/30">
                <Wallet size={18} className="ouro" />
              </span>
              <span>
                <span className="block text-sm font-bold claro">
                  Simule a parcela da {nomeDaMoto(primeira)}
                </span>
                <span className="block text-[13px] suave">
                  Entrada, prazo e parcela na hora - sem compromisso
                </span>
              </span>
            </span>
            <ArrowRight size={18} className="shrink-0 ouro" />
          </Link>
        )}

        {(respondeu ? resultado.lista : motos.slice(0, Math.min(quantos, 3))).length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(respondeu ? resultado.lista : motos.slice(0, Math.min(quantos, 3))).map(
              (moto) => (
                <CardMoto
                  key={moto.id}
                  moto={moto}
                  slug={slugs[moto.id]}
                  foto={capas[moto.id]}
                  fotos={totalFotos[moto.id] || 0}
                  videos={totalVideos[moto.id] || 0}
                />
              )
            )}
          </div>
        )}

        {respondeu && (
          <div className="mt-6 flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-center">
            <a
              href={linkWhatsApp(pedido)}
              target="_blank"
              rel="noopener noreferrer"
              className="botao-ouro flex min-h-12 items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm"
            >
              <IconeWhatsApp className="h-4 w-4" />
              {resultado.exatas
                ? "Falar com um vendedor sobre estas"
                : "Avise-me quando chegar uma assim"}
            </a>

            <Link
              href="/estoque"
              className="botao-vidro flex min-h-12 items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm"
            >
              <Sparkles size={15} className="ouro" />
              Ver o estoque completo
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function Pergunta({
  numero: posicao,
  titulo,
  children,
}: {
  numero: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="flex items-center gap-3 text-[15px] font-bold claro">
        <span className="titulo flex h-8 w-8 items-center justify-center rounded-full border border-[#e0b129]/40 text-[13px] ouro">
          {posicao}
        </span>
        {titulo}
      </legend>

      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function Opcao({
  ligada,
  onClick,
  dica,
  children,
}: {
  ligada: boolean;
  onClick: () => void;
  dica?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={ligada}
      onClick={onClick}
      title={dica}
      className={`min-h-11 rounded-full px-4 py-2 text-left text-[13px] ${
        ligada ? "pilula pilula-ligada" : "pilula"
      }`}
    >
      {children}
      {dica && (
        <span className={`block text-[11px] font-medium ${ligada ? "text-black/70" : "suave"}`}>
          {dica}
        </span>
      )}
    </button>
  );
}
