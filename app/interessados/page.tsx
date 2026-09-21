"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatarDataHora } from "@/lib/formatadores/data";
import {
  nomeDaMoto,
  precoDaMoto,
  procuraCombina,
  slugsDoEstoque,
  type MotoSite,
} from "@/lib/dados/moto-site";
import { LOJA } from "@/lib/dados/loja";
import {
  BellRing,
  Check,
  MessageCircle,
  Search,
  Target,
  Trash2,
  Users,
} from "lucide-react";

/*
 * Lista de interesse: quem se cadastrou no site pedindo para
 * ser avisado quando entra moto nova.
 *
 * A loja não dispara mensagem sozinha - quem manda é a pessoa,
 * pelo WhatsApp dela. Cada linha tem um botão que abre a
 * conversa com o texto já escrito; é um clique por cliente,
 * mas é conversa de gente, não disparo em massa, que é o que
 * derruba número no WhatsApp.
 *
 * Ao abrir a conversa a pessoa fica marcada como avisada.
 * Assim, na próxima moto, dá para ver de relance quem ainda
 * está faltando.
 */

const supabase = createClient();

type Interessado = {
  id: string;
  nome: string;
  telefone: string;
  procura: string | null;
  origem: string | null;
  avisado_em: string | null;
  criado_em: string;
};

function formatarTelefone(numero: string) {
  const n = (numero || "").replace(/\D/g, "");

  if (n.length === 11) {
    return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  }

  if (n.length === 10) {
    return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  }

  return n;
}

function primeiroNome(nome: string) {
  return (nome || "").trim().split(" ")[0] || "";
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://blackoutmotos.com.br";

export default function InteressadosPage() {
  const [lista, setLista] = useState<Interessado[]>([]);
  const [motos, setMotos] = useState<MotoSite[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [motoId, setMotoId] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [soFaltando, setSoFaltando] = useState(false);
  const [soCombina, setSoCombina] = useState(false);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);

    const [pessoas, estoque] = await Promise.all([
      supabase
        .from("interessados")
        .select("*")
        .order("criado_em", { ascending: false }),
      supabase.rpc("estoque_publico"),
    ]);

    if (pessoas.error) {
      setErro(`Não foi possível carregar a lista: ${pessoas.error.message}`);

      setCarregando(false);
      return;
    }

    setLista((pessoas.data as Interessado[]) || []);
    setMotos((estoque.data as MotoSite[]) || []);
    setCarregando(false);
  }

  const slugs = useMemo(() => slugsDoEstoque(motos), [motos]);

  const moto = motos.find((item) => item.id === motoId);

  /*
   * O texto padrão muda conforme a moto escolhida, mas o campo
   * continua editável: cada chegada tem um detalhe que só quem
   * está na loja sabe contar.
   */
  const textoPadrao = useMemo(() => {
    if (!moto) {
      return `chegou moto nova aqui na ${LOJA.nome}! Você pediu para avisar quando entrasse novidade no estoque. Dá uma olhada: ${SITE}/estoque`;
    }

    return `chegou uma ${nomeDaMoto(
      moto,
    )} aqui na ${LOJA.nome}, por ${precoDaMoto(
      moto,
    )}. Você pediu para avisar quando entrasse novidade no estoque. Veja as fotos: ${SITE}/estoque/${
      slugs[moto.id]
    }`;
  }, [moto, slugs]);

  const texto = mensagem.trim() || textoPadrao;

  function linkDoWhats(pessoa: Interessado) {
    const nome = primeiroNome(pessoa.nome);

    const corpo = `Oi${nome ? `, ${nome}` : ""}! ${texto}`;

    return `https://wa.me/55${pessoa.telefone}?text=${encodeURIComponent(
      corpo,
    )}`;
  }

  async function avisar(pessoa: Interessado) {
    window.open(linkDoWhats(pessoa), "_blank", "noopener,noreferrer");

    const agora = new Date().toISOString();

    /* Marca na tela na hora; o banco confirma em seguida. */
    setLista((atual) =>
      atual.map((item) =>
        item.id === pessoa.id ? { ...item, avisado_em: agora } : item,
      ),
    );

    const { error } = await supabase
      .from("interessados")
      .update({ avisado_em: agora })
      .eq("id", pessoa.id);

    if (error) {
      setErro(
        `A conversa abriu, mas não deu para marcar como avisado: ${error.message}`,
      );
    }
  }

  /* Volta a valer para a próxima moto que chegar. */
  async function desmarcarTodos() {
    const confirmar = window.confirm(
      "Marcar todo mundo como não avisado de novo? Use quando chegar uma moto nova.",
    );

    if (!confirmar) return;

    setErro("");

    const { error } = await supabase
      .from("interessados")
      .update({ avisado_em: null })
      .not("avisado_em", "is", null);

    if (error) {
      setErro(`Não foi possível liberar a lista: ${error.message}`);

      return;
    }

    await carregar();
  }

  async function apagar(pessoa: Interessado) {
    const confirmar = window.confirm(`Tirar ${pessoa.nome} da lista?`);

    if (!confirmar) return;

    setErro("");

    const { data: apagados, error } = await supabase
      .from("interessados")
      .delete()
      .eq("id", pessoa.id)
      .select("id");

    if (error || !apagados?.length) {
      setErro(`Não foi possível apagar: ${error?.message || "sem permissão"}`);

      return;
    }

    await carregar();
  }

  const faltando = lista.filter((item) => !item.avisado_em);

  /*
   * Quem escreveu a moto que procura e recebeu justo ela sobe
   * para o topo da lista: e a conversa com mais chance de
   * virar venda, e a que nao pode ficar para depois.
   */
  const combinam = useMemo(
    () =>
      moto ? lista.filter((item) => procuraCombina(item.procura, moto)) : [],
    [lista, moto],
  );

  const visiveis = useMemo(() => {
    let itens = soFaltando ? faltando : lista;

    if (!moto) return itens;

    if (soCombina) {
      itens = itens.filter((item) => procuraCombina(item.procura, moto));
    }

    return [...itens].sort(
      (a, b) =>
        Number(procuraCombina(b.procura, moto)) -
        Number(procuraCombina(a.procura, moto)),
    );
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [lista, faltando, moto, soFaltando, soCombina]);

  const campoClass =
    "w-full rounded-lg border border-grafite-claro bg-preto px-3 py-2.5 text-sm text-white outline-none transition focus:border-dourado";

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-dourado">
          <Users size={24} />
          Lista de Interesse
        </h1>

        <p className="mt-1 text-sm text-texto-suave">
          Quem se cadastrou no site para ser avisado quando chega moto nova.
          Escolha a moto, confira o texto e chame um por um no WhatsApp.
        </p>
      </div>

      {erro && (
        <div className="mb-5 rounded-lg border border-red-700 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {erro}
        </div>
      )}

      {/* A MENSAGEM */}

      <div className="mb-6 rounded-xl border border-dourado/40 bg-grafite p-5">
        <h2 className="flex items-center gap-2 font-semibold text-dourado">
          <BellRing size={18} />
          Avisar de qual moto
        </h2>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,320px)_1fr]">
          <div>
            <label className="mb-1 block text-xs text-texto-suave">
              Moto do estoque
            </label>

            <select
              value={motoId}
              onChange={(evento) => {
                setMotoId(evento.target.value);
                setMensagem("");
              }}
              className={campoClass}
            >
              <option value="">Sem moto específica</option>

              {motos.map((item) => (
                <option key={item.id} value={item.id}>
                  {nomeDaMoto(item)} · {precoDaMoto(item)}
                </option>
              ))}
            </select>

            <p className="mt-2 text-xs leading-5 text-texto-suave">
              A mensagem começa com o primeiro nome de quem vai receber.
              Escolhida a moto, quem procura justo ela aparece primeiro na
              lista.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs text-texto-suave">
              Texto da mensagem
            </label>

            <textarea
              value={mensagem}
              onChange={(evento) => setMensagem(evento.target.value)}
              rows={4}
              placeholder={textoPadrao}
              className={`${campoClass} resize-y`}
            />

            <p className="mt-2 text-xs leading-5 text-texto-suave">
              Deixe em branco para usar o texto sugerido.
            </p>
          </div>
        </div>
      </div>

      {/* A LISTA */}

      <div className="overflow-hidden rounded-xl border border-grafite-claro bg-grafite">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-grafite-claro px-5 py-3">
          <h2 className="font-semibold text-dourado">Cadastrados</h2>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-texto-suave">
              {lista.length} {lista.length === 1 ? "pessoa" : "pessoas"} ·{" "}
              <strong className="text-white">{faltando.length} a avisar</strong>
            </span>

            {moto && (
              <button
                type="button"
                onClick={() => setSoCombina((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-bold transition ${
                  soCombina
                    ? "border-dourado bg-dourado text-preto"
                    : "border-grafite-claro text-texto-suave hover:text-white"
                }`}
              >
                <Target size={12} />
                Procuram esta moto ({combinam.length})
              </button>
            )}

            <button
              type="button"
              onClick={() => setSoFaltando((v) => !v)}
              className={`rounded-lg border px-3 py-1 text-xs font-bold transition ${
                soFaltando
                  ? "border-dourado bg-dourado text-preto"
                  : "border-grafite-claro text-texto-suave hover:text-white"
              }`}
            >
              Só quem falta
            </button>

            <button
              type="button"
              onClick={desmarcarTodos}
              className="rounded-lg border border-grafite-claro px-3 py-1 text-xs font-bold text-texto-suave transition hover:text-white"
            >
              Liberar para nova moto
            </button>
          </div>
        </div>

        {carregando ? (
          <p className="p-8 text-center text-texto-suave">Carregando...</p>
        ) : visiveis.length === 0 ? (
          <p className="p-8 text-center text-texto-suave">
            {lista.length === 0
              ? "Ninguém se cadastrou ainda. O formulário fica no fim da página inicial e do estoque, no site."
              : "Todo mundo já foi avisado desta vez."}
          </p>
        ) : (
          <div className="divide-y divide-grafite-claro">
            {visiveis.map((pessoa) => (
              <div
                key={pessoa.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold text-white">
                    {pessoa.nome}

                    {pessoa.avisado_em && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-verde/15 px-2 py-0.5 text-[11px] font-bold text-verde">
                        <Check size={11} />
                        Avisado
                      </span>
                    )}
                  </p>

                  {pessoa.procura && (
                    <p
                      className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        moto && procuraCombina(pessoa.procura, moto)
                          ? "bg-dourado/15 text-dourado"
                          : "bg-preto/50 text-texto-suave"
                      }`}
                    >
                      <Search size={11} />
                      Procura: {pessoa.procura}
                    </p>
                  )}

                  <p className="mt-0.5 text-sm text-texto-suave">
                    {formatarTelefone(pessoa.telefone)} · entrou em{" "}
                    {formatarDataHora(pessoa.criado_em)}
                    {pessoa.origem ? ` · ${pessoa.origem}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => avisar(pessoa)}
                    className="inline-flex items-center gap-2 rounded-lg bg-dourado px-4 py-2 text-sm font-bold text-preto transition hover:opacity-90"
                  >
                    <MessageCircle size={15} />
                    {pessoa.avisado_em ? "Chamar de novo" : "Avisar"}
                  </button>

                  <button
                    type="button"
                    onClick={() => apagar(pessoa)}
                    aria-label={`Tirar ${pessoa.nome} da lista`}
                    className="rounded-lg border border-grafite-claro p-2 text-texto-suave transition hover:border-red-700 hover:text-red-400"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
