"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import { Loader2, RefreshCw } from "lucide-react";

/*
 * A TABELA FIPE DE CADA MOTO (pedido de 20/11/2026)
 *
 * O Santander libera financiamento até 10% acima do valor da
 * FIPE; pedir mais que isso exige entrada do cliente. O nome do
 * modelo na FIPE quase nunca bate com o cadastrado aqui (a FIPE
 * separa por motor/combustível - "CG 160 FAN Flex", "CG 160 FAN
 * ESDi FLEXONE"...), então a equipe busca e escolhe o certo uma
 * vez; depois é só "Atualizar valor agora" todo mês, com os
 * mesmos códigos.
 *
 * A busca (marcas/modelos/anos/valor) vai direto da tela para a
 * API pública da FIPE - ela libera qualquer origem (CORS aberto)
 * e é de graça. Só o que fica salvo aqui vai para o Supabase.
 */

const BASE = "https://fipe.parallelum.com.br/api/v2/motorcycles";

type Opcao = { code: string; name: string };

export type DadosFipe = {
  fipe_marca_codigo: string | null;
  fipe_modelo_codigo: string | null;
  fipe_modelo_nome: string | null;
  fipe_ano_codigo: string | null;
  fipe_valor: number | null;
  fipe_mes_referencia: string | null;
  fipe_atualizado_em: string | null;
};

function valorDoPreco(texto: string) {
  return Number(String(texto).replace(/[^\d,]/g, "").replace(",", "."));
}

export default function TabelaFipe({
  motoId,
  marca,
  dados,
  onAtualizado,
}: {
  motoId: string;
  marca: string | null;
  dados: DadosFipe;
  onAtualizado: (dados: DadosFipe) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [marcas, setMarcas] = useState<Opcao[]>([]);
  const [marcaEscolhida, setMarcaEscolhida] = useState("");
  const [modelos, setModelos] = useState<Opcao[]>([]);
  const [busca, setBusca] = useState("");
  const [modeloEscolhido, setModeloEscolhido] = useState("");
  const [anos, setAnos] = useState<Opcao[]>([]);
  const [anoEscolhido, setAnoEscolhido] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!aberto || marcas.length) return;
    fetch(`${BASE}/brands`, { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((lista: Opcao[]) => {
        setMarcas(lista);
        const nome = (marca || "").toUpperCase().trim();
        const bateu = nome && lista.find((m) => m.name.toUpperCase() === nome);
        if (bateu) setMarcaEscolhida(bateu.code);
      })
      .catch(() => setErro("Não consegui abrir a lista de marcas da FIPE."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  useEffect(() => {
    if (!marcaEscolhida) {
      setModelos([]);
      return;
    }
    setCarregando(true);
    setErro("");
    fetch(`${BASE}/brands/${marcaEscolhida}/models`, { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then(setModelos)
      .catch(() => setErro("Não consegui abrir a lista de modelos."))
      .finally(() => setCarregando(false));
  }, [marcaEscolhida]);

  useEffect(() => {
    if (!marcaEscolhida || !modeloEscolhido) {
      setAnos([]);
      return;
    }
    setCarregando(true);
    setErro("");
    fetch(`${BASE}/brands/${marcaEscolhida}/models/${modeloEscolhido}/years`, { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then(setAnos)
      .catch(() => setErro("Não consegui abrir os anos desse modelo."))
      .finally(() => setCarregando(false));
  }, [marcaEscolhida, modeloEscolhido]);

  const modelosFiltrados = busca.trim()
    ? modelos.filter((m) => m.name.toLowerCase().includes(busca.toLowerCase()))
    : modelos;

  async function buscarValorEsalvar(codigos: { marca: string; modelo: string; ano: string }, nomeModelo?: string) {
    setSalvando(true);
    setErro("");
    try {
      const resposta = await fetch(
        `${BASE}/brands/${codigos.marca}/models/${codigos.modelo}/years/${codigos.ano}`,
        { headers: { Accept: "application/json" } }
      );
      if (!resposta.ok) throw new Error();
      const valor = await resposta.json();

      const novosDados: DadosFipe = {
        fipe_marca_codigo: codigos.marca,
        fipe_modelo_codigo: codigos.modelo,
        fipe_modelo_nome: nomeModelo || dados.fipe_modelo_nome,
        fipe_ano_codigo: codigos.ano,
        fipe_valor: valorDoPreco(valor.price),
        fipe_mes_referencia: valor.referenceMonth,
        fipe_atualizado_em: new Date().toISOString(),
      };

      const supabase = createClient();
      const { error } = await supabase.from("motorcycles").update(novosDados).eq("id", motoId);
      if (error) throw error;

      onAtualizado(novosDados);
      setAberto(false);
    } catch {
      setErro("Não consegui salvar o valor da FIPE. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  function vincular() {
    if (!marcaEscolhida || !modeloEscolhido || !anoEscolhido) return;
    const nomeModelo = modelos.find((m) => m.code === modeloEscolhido)?.name || "";
    const nomeAno = anos.find((a) => a.code === anoEscolhido)?.name || "";
    buscarValorEsalvar(
      { marca: marcaEscolhida, modelo: modeloEscolhido, ano: anoEscolhido },
      `${nomeModelo} ${nomeAno}`.trim()
    );
  }

  function atualizarValor() {
    if (!dados.fipe_marca_codigo || !dados.fipe_modelo_codigo || !dados.fipe_ano_codigo) return;
    buscarValorEsalvar({
      marca: dados.fipe_marca_codigo,
      modelo: dados.fipe_modelo_codigo,
      ano: dados.fipe_ano_codigo,
    });
  }

  const limite = dados.fipe_valor ? dados.fipe_valor * 1.1 : null;

  return (
    <div className="mt-5 border-t border-grafite-claro pt-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Tabela FIPE</p>
        <button
          type="button"
          className="text-xs font-bold text-dourado hover:underline"
          onClick={() => setAberto((a) => !a)}
        >
          {dados.fipe_valor ? "Trocar vínculo" : "Vincular à FIPE"}
        </button>
      </div>

      {dados.fipe_valor ? (
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-texto-suave">Vinculado a</p>
            <p className="text-sm font-medium text-texto">{dados.fipe_modelo_nome}</p>
          </div>
          <div>
            <p className="text-xs text-texto-suave">Valor FIPE ({dados.fipe_mes_referencia})</p>
            <p className="text-sm font-medium text-texto">{formatarMoeda(dados.fipe_valor)}</p>
          </div>
          <div>
            <p className="text-xs text-texto-suave">Limite Santander (FIPE +10%)</p>
            <p className="text-sm font-medium text-dourado">{limite ? formatarMoeda(limite) : "—"}</p>
          </div>
        </div>
      ) : (
        <p className="mt-1 text-xs text-texto-suave">
          Ainda não vinculada - sem isso não dá pra saber o limite de financiamento do Santander.
        </p>
      )}

      {dados.fipe_valor && (
        <button
          type="button"
          className="mt-2 flex items-center gap-1 text-xs font-bold text-texto-suave hover:text-dourado disabled:opacity-50"
          disabled={salvando}
          onClick={atualizarValor}
        >
          {salvando ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Atualizar valor agora
        </button>
      )}

      {erro && <p className="mt-2 text-xs font-bold text-red-400">{erro}</p>}

      {aberto && (
        <div className="mt-3 space-y-2 rounded-xl border border-grafite-claro bg-preto p-3">
          <select
            className="w-full rounded-lg border border-grafite-claro bg-grafite px-3 py-2 text-sm text-white"
            value={marcaEscolhida}
            onChange={(e) => {
              setMarcaEscolhida(e.target.value);
              setModeloEscolhido("");
              setAnoEscolhido("");
            }}
          >
            <option value="">Marca na FIPE…</option>
            {marcas.map((m) => (
              <option key={m.code} value={m.code}>
                {m.name}
              </option>
            ))}
          </select>

          {marcaEscolhida && (
            <>
              <input
                className="w-full rounded-lg border border-grafite-claro bg-grafite px-3 py-2 text-sm text-white"
                placeholder="Buscar modelo…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
              <select
                size={6}
                className="w-full rounded-lg border border-grafite-claro bg-grafite px-3 py-2 text-sm text-white"
                value={modeloEscolhido}
                onChange={(e) => {
                  setModeloEscolhido(e.target.value);
                  setAnoEscolhido("");
                }}
              >
                {modelosFiltrados.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.name}
                  </option>
                ))}
              </select>
            </>
          )}

          {modeloEscolhido && (
            <select
              className="w-full rounded-lg border border-grafite-claro bg-grafite px-3 py-2 text-sm text-white"
              value={anoEscolhido}
              onChange={(e) => setAnoEscolhido(e.target.value)}
            >
              <option value="">Ano / combustível…</option>
              {anos.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.name}
                </option>
              ))}
            </select>
          )}

          {carregando && <p className="text-xs text-texto-suave">Carregando…</p>}

          <button
            type="button"
            className="w-full rounded-lg bg-dourado py-2 text-sm font-bold text-preto disabled:opacity-50"
            disabled={!anoEscolhido || salvando}
            onClick={vincular}
          >
            {salvando ? "Salvando…" : "Vincular e salvar valor"}
          </button>
        </div>
      )}
    </div>
  );
}
