"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatarDataHora } from "@/lib/formatadores/data";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import CampoMoeda from "@/components/CampoMoeda";
import { LOJA } from "@/lib/dados/loja";
import {
  ChevronDown,
  HandCoins,
  MessageCircle,
  Trash2,
} from "lucide-react";

/*
 * MOTOS OFERECIDAS
 *
 * As fichas que chegam pela página "Compramos sua moto" do
 * site. A pessoa também manda tudo no WhatsApp, mas aqui fica
 * a lista - inclusive de quem preencheu e desistiu antes de
 * mandar a mensagem.
 *
 * Cada ficha tem uma situação (Nova → Avaliando → Proposta
 * feita → Comprada / Não fechou), o valor proposto e uma
 * anotação livre. Nada disso mexe em caixa, estoque ou vendas:
 * comprar a moto continua sendo em "Comprar moto".
 *
 * O banco está em supabase/migrations/0042_motos_oferecidas.sql.
 */

const supabase = createClient();

type Situacao = "nova" | "avaliando" | "proposta" | "comprada" | "nao_fechou";

type Ficha = {
  id: string;
  marca: string;
  modelo: string;
  versao: string | null;
  ano_fabricacao: number | null;
  ano_modelo: number | null;
  km: number | null;
  cor: string | null;
  placa: string | null;
  intencao: string | null;
  financiada: boolean;
  falta_quitar: number | null;
  doc_em_dia: string | null;
  unico_dono: string | null;
  manual: string | null;
  chave_reserva: string | null;
  sinistro: string | null;
  valor_esperado: number | null;
  observacoes: string | null;
  nome: string;
  telefone: string;
  cidade: string | null;
  situacao: Situacao;
  valor_proposta: number | null;
  anotacao: string | null;
  criado_em: string;
};

const SITUACOES: { valor: Situacao; nome: string; cor: string }[] = [
  { valor: "nova", nome: "Nova", cor: "bg-dourado text-preto" },
  { valor: "avaliando", nome: "Avaliando", cor: "bg-sky-500/20 text-sky-300" },
  { valor: "proposta", nome: "Proposta feita", cor: "bg-violet-500/20 text-violet-300" },
  { valor: "comprada", nome: "Comprada", cor: "bg-verde/20 text-verde" },
  { valor: "nao_fechou", nome: "Não fechou", cor: "bg-white/10 text-texto-suave" },
];

const nomeDaSituacao = (s: Situacao) => SITUACOES.find((x) => x.valor === s) ?? SITUACOES[0];

function formatarTelefone(numero: string) {
  const n = (numero || "").replace(/\D/g, "");
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return n;
}

const simNao = (v: string | null) => (v === "sim" ? "Sim" : v === "nao" ? "Não" : "—");

const nomeDaMoto = (f: Ficha) => [f.marca, f.modelo, f.versao].filter(Boolean).join(" ");

const anos = (f: Ficha) =>
  f.ano_fabricacao || f.ano_modelo ? `${f.ano_fabricacao ?? "?"}/${f.ano_modelo ?? "?"}` : "";

const kmEscrito = (km: number | null) =>
  km == null ? "" : `${new Intl.NumberFormat("pt-BR").format(km)} km`;

type Filtro = "abertas" | "todas" | Situacao;

export default function MotosOferecidasPage() {
  const [lista, setLista] = useState<Ficha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("abertas");
  const [aberta, setAberta] = useState<string | null>(null);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);

    const { data, error } = await supabase
      .from("motos_oferecidas")
      .select("*")
      .order("criado_em", { ascending: false });

    if (error) {
      setErro(
        error.message.includes("motos_oferecidas")
          ? "A tabela ainda não existe no banco. Rode o arquivo supabase/migrations/0042_motos_oferecidas.sql no SQL Editor do Supabase."
          : `Não foi possível carregar a lista: ${error.message}`,
      );
      setCarregando(false);
      return;
    }

    setLista((data as Ficha[]) || []);
    setCarregando(false);
  }

  /* Muda na tela na hora; o banco confirma em seguida. */
  async function salvar(ficha: Ficha, mudanca: Partial<Ficha>) {
    setErro("");
    setLista((atual) => atual.map((f) => (f.id === ficha.id ? { ...f, ...mudanca } : f)));

    const { error } = await supabase
      .from("motos_oferecidas")
      .update({ ...mudanca, atualizado_em: new Date().toISOString() })
      .eq("id", ficha.id);

    if (error) {
      setErro(`Não foi possível salvar: ${error.message}`);
      await carregar();
    }
  }

  async function apagar(ficha: Ficha) {
    if (!window.confirm(`Apagar a ficha de ${ficha.nome} (${nomeDaMoto(ficha)})?`)) return;

    setErro("");

    const { data: apagados, error } = await supabase
      .from("motos_oferecidas")
      .delete()
      .eq("id", ficha.id)
      .select("id");

    if (error || !apagados?.length) {
      setErro(`Não foi possível apagar: ${error?.message || "sem permissão"}`);
      return;
    }

    await carregar();
  }

  function chamar(ficha: Ficha) {
    const nome = (ficha.nome || "").trim().split(" ")[0];
    const texto = `Oi${nome ? `, ${nome}` : ""}! Aqui é da ${LOJA.nome}, sobre a sua ${nomeDaMoto(ficha)} que você mandou para avaliação.`;

    window.open(
      `https://wa.me/55${ficha.telefone}?text=${encodeURIComponent(texto)}`,
      "_blank",
      "noopener,noreferrer",
    );

    if (ficha.situacao === "nova") salvar(ficha, { situacao: "avaliando" });
  }

  const contagem = useMemo(() => {
    const c: Record<string, number> = {};
    for (const f of lista) c[f.situacao] = (c[f.situacao] || 0) + 1;
    return c;
  }, [lista]);

  const abertas = lista.filter((f) => f.situacao !== "comprada" && f.situacao !== "nao_fechou");

  const visiveis =
    filtro === "todas" ? lista : filtro === "abertas" ? abertas : lista.filter((f) => f.situacao === filtro);

  const campoClass =
    "w-full rounded-lg border border-grafite-claro bg-preto px-3 py-2.5 text-sm text-white outline-none transition focus:border-dourado";

  const FILTROS: { valor: Filtro; nome: string; n: number }[] = [
    { valor: "abertas", nome: "Em aberto", n: abertas.length },
    ...SITUACOES.map((s) => ({ valor: s.valor as Filtro, nome: s.nome, n: contagem[s.valor] || 0 })),
    { valor: "todas", nome: "Todas", n: lista.length },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-dourado">
          <HandCoins size={24} />
          Motos oferecidas
        </h1>

        <p className="mt-1 text-sm text-texto-suave">
          Fichas de quem quer vender ou dar a moto na troca, enviadas pela página
          “Compramos sua moto” do site. Fica aqui mesmo se a pessoa não mandou a
          mensagem no WhatsApp.
        </p>
      </div>

      {erro && (
        <div className="mb-5 rounded-lg border border-red-700 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {erro}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            type="button"
            onClick={() => setFiltro(f.valor)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
              filtro === f.valor
                ? "border-dourado bg-dourado text-preto"
                : "border-grafite-claro text-texto-suave hover:text-white"
            }`}
          >
            {f.nome} ({f.n})
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-grafite-claro bg-grafite">
        {carregando ? (
          <p className="p-8 text-center text-texto-suave">Carregando...</p>
        ) : visiveis.length === 0 ? (
          <p className="p-8 text-center text-texto-suave">
            {lista.length === 0
              ? "Nenhuma ficha chegou ainda. Elas vêm da página “Compramos sua moto” do site."
              : "Nenhuma ficha nesta situação."}
          </p>
        ) : (
          <div className="divide-y divide-grafite-claro">
            {visiveis.map((ficha) => {
              const s = nomeDaSituacao(ficha.situacao);
              const expandida = aberta === ficha.id;

              return (
                <div key={ficha.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setAberta(expandida ? null : ficha.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="flex flex-wrap items-center gap-2 font-semibold text-white">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${s.cor}`}>{s.nome}</span>
                        {nomeDaMoto(ficha)}
                        {anos(ficha) && <span className="font-normal text-texto-suave">{anos(ficha)}</span>}
                        <ChevronDown
                          size={15}
                          className={`text-texto-suave transition ${expandida ? "rotate-180" : ""}`}
                        />
                      </p>

                      <p className="mt-1 text-sm text-texto-suave">
                        {[
                          kmEscrito(ficha.km),
                          ficha.financiada ? "Financiada" : "Quitada",
                          ficha.intencao === "trocar" ? "Quer trocar" : "Quer vender",
                          ficha.valor_esperado ? `espera ${formatarMoeda(Number(ficha.valor_esperado))}` : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>

                      <p className="mt-0.5 text-sm text-texto-suave">
                        <strong className="text-white">{ficha.nome}</strong> · {formatarTelefone(ficha.telefone)}
                        {ficha.cidade ? ` · ${ficha.cidade}` : ""} · {formatarDataHora(ficha.criado_em)}
                      </p>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => chamar(ficha)}
                        className="inline-flex items-center gap-2 rounded-lg bg-dourado px-4 py-2 text-sm font-bold text-preto transition hover:opacity-90"
                      >
                        <MessageCircle size={15} />
                        Chamar
                      </button>

                      <button
                        type="button"
                        onClick={() => apagar(ficha)}
                        aria-label={`Apagar a ficha de ${ficha.nome}`}
                        className="rounded-lg border border-grafite-claro p-2 text-texto-suave transition hover:border-red-700 hover:text-red-400"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {expandida && (
                    <div className="mt-4 grid gap-5 rounded-lg border border-grafite-claro bg-preto/40 p-4 lg:grid-cols-2">
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        {[
                          ["Placa", ficha.placa || "—"],
                          ["Cor", ficha.cor || "—"],
                          ["Km", kmEscrito(ficha.km) || "—"],
                          ["Ano", anos(ficha) || "—"],
                          [
                            "Situação",
                            ficha.financiada
                              ? `Financiada${ficha.falta_quitar ? ` (faltam ${formatarMoeda(Number(ficha.falta_quitar))})` : ""}`
                              : "Quitada",
                          ],
                          ["Documentação em dia", simNao(ficha.doc_em_dia)],
                          ["Único dono", simNao(ficha.unico_dono)],
                          ["Manual", simNao(ficha.manual)],
                          ["Chave reserva", simNao(ficha.chave_reserva)],
                          ["Sinistro ou leilão", simNao(ficha.sinistro)],
                          [
                            "Espera receber",
                            ficha.valor_esperado ? formatarMoeda(Number(ficha.valor_esperado)) : "—",
                          ],
                        ].map(([rotulo, valor]) => (
                          <div key={rotulo}>
                            <dt className="text-xs text-texto-suave">{rotulo}</dt>
                            <dd className="text-white">{valor}</dd>
                          </div>
                        ))}

                        {ficha.observacoes && (
                          <div className="col-span-2">
                            <dt className="text-xs text-texto-suave">Observações</dt>
                            <dd className="whitespace-pre-wrap text-white">{ficha.observacoes}</dd>
                          </div>
                        )}
                      </dl>

                      <div className="space-y-3">
                        <div>
                          <label className="mb-1 block text-xs text-texto-suave">Situação</label>
                          <select
                            value={ficha.situacao}
                            onChange={(e) => salvar(ficha, { situacao: e.target.value as Situacao })}
                            className={campoClass}
                          >
                            {SITUACOES.map((op) => (
                              <option key={op.valor} value={op.valor}>
                                {op.nome}
                              </option>
                            ))}
                          </select>
                        </div>

                        <EdicaoDaFicha ficha={ficha} campoClass={campoClass} aoSalvar={salvar} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/*
 * Valor proposto e anotação: editados aqui e salvos no botão,
 * para não gravar a cada letra digitada.
 */
function EdicaoDaFicha({
  ficha,
  campoClass,
  aoSalvar,
}: {
  ficha: Ficha;
  campoClass: string;
  aoSalvar: (ficha: Ficha, mudanca: Partial<Ficha>) => Promise<void>;
}) {
  const [proposta, setProposta] = useState(ficha.valor_proposta ? String(ficha.valor_proposta) : "");
  const [anotacao, setAnotacao] = useState(ficha.anotacao || "");
  const [salvo, setSalvo] = useState(false);

  const mudou =
    (Number(proposta) || null) !== (ficha.valor_proposta ? Number(ficha.valor_proposta) : null) ||
    anotacao.trim() !== (ficha.anotacao || "");

  async function salvar() {
    await aoSalvar(ficha, {
      valor_proposta: Number(proposta) > 0 ? Number(proposta) : null,
      anotacao: anotacao.trim() || null,
    });
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  }

  return (
    <>
      <div>
        <label className="mb-1 block text-xs text-texto-suave">Valor da proposta</label>
        <CampoMoeda value={proposta} onChange={setProposta} placeholder="R$ 0,00" className={campoClass} />
      </div>

      <div>
        <label className="mb-1 block text-xs text-texto-suave">Anotação da loja</label>
        <textarea
          value={anotacao}
          onChange={(e) => setAnotacao(e.target.value)}
          rows={3}
          placeholder="Ex.: viu a moto dia 12, pneu traseiro gasto, aceita 15 mil"
          className={`${campoClass} resize-y`}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={salvar}
          disabled={!mudou}
          className="rounded-lg bg-dourado px-4 py-2 text-sm font-bold text-preto transition hover:opacity-90 disabled:opacity-40"
        >
          Salvar
        </button>
        {salvo && <span className="text-sm text-verde">Salvo.</span>}
      </div>
    </>
  );
}
