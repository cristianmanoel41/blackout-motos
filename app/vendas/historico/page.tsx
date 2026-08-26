import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import HistoricoGeral, {
  type RegistroHistorico,
} from "@/components/HistoricoGeral";
import { Plus, HardHat } from "lucide-react";

/*
 * Histórico geral: vendas de moto e vendas de capacete
 * de balcão na mesma tela.
 *
 * Capacete vendido JUNTO com uma moto não vira uma linha
 * separada: ele já está dentro do valor da venda da moto,
 * e aparece como um selo "+ N capacete(s)" na linha dela.
 */

function moeda(valor: number | string | null | undefined) {
  return formatarMoeda(valor);
}

function horaBrasil(hora: string | null | undefined) {
  if (!hora) return null;

  return String(hora).slice(0, 5);
}

type MotoHistorico = {
  id: string;
  codigo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  versao?: string | null;
  ano_modelo?: string | number | null;
  placa?: string | null;
};

function erro(mensagem: string) {
  return (
    <div className="p-6">
      <div className="rounded-xl border border-red-700 bg-red-950/30 p-4 text-red-300">
        {mensagem}
      </div>
    </div>
  );
}

export default async function HistoricoVendasPage() {
  const supabase = await createClient();

  // ==========================================
  // 1. VENDAS DE MOTO
  // ==========================================

  const { data: vendas, error: vendasError } = await supabase
    .from("sales")
    .select("*")
    .order("data_venda", { ascending: false })
    .order("hora_venda", { ascending: false });

  if (vendasError) {
    return erro(
      `Erro ao carregar vendas: ${vendasError.message}`
    );
  }

  const listaVendas = vendas || [];

  // ==========================================
  // 2. MOTOS DESSAS VENDAS
  // ==========================================

  const idsMotos = Array.from(
    new Set(
      listaVendas
        .map((venda) => venda.motorcycle_id)
        .filter(Boolean)
        .map(String)
    )
  );

  let motos: MotoHistorico[] = [];

  if (idsMotos.length > 0) {
    const { data: motosData, error: motosError } =
      await supabase
        .from("motorcycles")
        .select(
          `
          id,
          codigo,
          marca,
          modelo,
          versao,
          ano_modelo,
          placa
        `
        )
        .in("id", idsMotos);

    if (motosError) {
      return erro(
        `Erro ao carregar motos: ${motosError.message}`
      );
    }

    motos = (motosData || []) as MotoHistorico[];
  }

  const mapaMotos = new Map<string, MotoHistorico>();

  motos.forEach((moto) => {
    mapaMotos.set(String(moto.id), moto);
  });

  // ==========================================
  // 3. CAPACETES QUE SAÍRAM JUNTO COM AS MOTOS
  // ==========================================

  const { data: capacetesDasMotos } = await supabase
    .from("helmet_sale_items")
    .select("sale_id, quantidade")
    .not("sale_id", "is", null);

  const capacetesPorVenda = new Map<string, number>();

  (capacetesDasMotos || []).forEach((item) => {
    const chave = String(item.sale_id);

    capacetesPorVenda.set(
      chave,
      (capacetesPorVenda.get(chave) || 0) +
        (Number(item.quantidade) || 0)
    );
  });

  // ==========================================
  // 4. VENDAS DE CAPACETE (BALCÃO)
  // ==========================================

  const { data: vendasCapacete, error: capaceteError } =
    await supabase
      .from("helmet_sales")
      .select(
        `
        id,
        data_venda,
        cliente_nome,
        cliente_cpf,
        cliente_telefone,
        vendedor,
        forma_pagamento,
        parcelas,
        valor_total,
        criado_em,
        helmet_sale_items (
          produto,
          marca,
          modelo,
          cor,
          tamanho,
          quantidade
        )
      `
      )
      .order("data_venda", { ascending: false });

  if (capaceteError) {
    return erro(
      `Erro ao carregar vendas de capacete: ${capaceteError.message}`
    );
  }

  // ==========================================
  // 5. JUNTA TUDO NUMA LISTA SÓ
  // ==========================================

  const registrosMotos: RegistroHistorico[] = listaVendas.map(
    (venda) => {
      const moto = venda.motorcycle_id
        ? mapaMotos.get(String(venda.motorcycle_id))
        : undefined;

      const quantidadeCapacetes =
        capacetesPorVenda.get(String(venda.id)) || 0;

      const financiado = Number(venda.valor_financiado) || 0;

      return {
        id: String(venda.id),
        tipo: "moto",
        data: venda.data_venda || "",
        hora: horaBrasil(venda.hora_venda),
        titulo: moto
          ? `${moto.marca || ""} ${moto.modelo || ""}`.trim() ||
            "Moto"
          : "Moto não encontrada",
        detalhe: [
          moto?.codigo,
          moto?.ano_modelo,
          moto?.placa,
        ]
          .filter(Boolean)
          .join(" · "),
        cliente: venda.cliente || "Não informado",
        contato: venda.telefone || "",
        telefone: venda.telefone || null,
        vendedor: venda.vendedor || "",
        valor:
          Number(
            venda.valor_total_venda ?? venda.valor_venda
          ) || 0,
        pagamento: venda.forma_pagamento || "-",
        observacaoPagamento:
          financiado > 0
            ? `Financiado ${moeda(financiado)}${
                venda.banco ? ` · ${venda.banco}` : ""
              }`
            : `Entrada ${moeda(
                venda.entrada_total ?? venda.entrada
              )}`,
        extra:
          quantidadeCapacetes > 0
            ? `+ ${quantidadeCapacetes} capacete${
                quantidadeCapacetes === 1 ? "" : "s"
              }`
            : "",
      };
    }
  );

  const registrosCapacetes: RegistroHistorico[] = (
    vendasCapacete || []
  ).map((venda: any) => {
    const itens = venda.helmet_sale_items || [];

    const quantidade = itens.reduce(
      (soma: number, item: any) =>
        soma + (Number(item.quantidade) || 0),
      0
    );

    const primeiro = itens[0];

    const titulo = primeiro
      ? [primeiro.produto, primeiro.marca, primeiro.modelo]
          .filter(Boolean)
          .join(" ")
      : "Capacete";

    const detalhe = primeiro
      ? [
          primeiro.cor,
          primeiro.tamanho,
          itens.length > 1
            ? `+ ${itens.length - 1} item(ns)`
            : "",
        ]
          .filter(Boolean)
          .join(" · ")
      : "";

    return {
      id: String(venda.id),
      tipo: "capacete",
      data: venda.data_venda || "",
      hora: null,
      titulo,
      detalhe,
      cliente: venda.cliente_nome || "Não informado",
      contato: venda.cliente_telefone || venda.cliente_cpf || "",
      telefone: venda.cliente_telefone || null,
      vendedor: venda.vendedor || "",
      valor: Number(venda.valor_total) || 0,
      pagamento: venda.forma_pagamento || "-",
      observacaoPagamento:
        venda.parcelas && Number(venda.parcelas) > 1
          ? `${venda.parcelas}x`
          : "",
      extra:
        quantidade > 1 ? `${quantidade} unidades` : "",
    };
  });

  const registros = [
    ...registrosMotos,
    ...registrosCapacetes,
  ].sort((a, b) => {
    if (a.data !== b.data) {
      return a.data < b.data ? 1 : -1;
    }

    return (b.hora || "").localeCompare(a.hora || "");
  });

  // ==========================================
  // 6. TELA
  // ==========================================

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dourado">
            Histórico de Vendas
          </h1>

          <p className="mt-1 text-sm text-texto-suave">
            Motos e capacetes na mesma lista. Gere contratos e
            recibos direto daqui.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/capacetes/vendas/nova"
            className="flex items-center justify-center gap-2 rounded-lg border border-grafite-claro px-4 py-2 font-semibold text-texto transition hover:border-dourado hover:text-dourado"
          >
            <HardHat size={18} />
            Vender Capacete
          </Link>

          <Link
            href="/vendas"
            className="flex items-center justify-center gap-2 rounded-lg bg-dourado px-4 py-2 font-semibold text-preto transition hover:bg-dourado-claro"
          >
            <Plus size={18} />
            Nova Venda
          </Link>
        </div>
      </div>

      <HistoricoGeral registros={registros} />
    </div>
  );
}
