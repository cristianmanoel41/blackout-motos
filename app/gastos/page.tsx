import { createClient } from "@/lib/supabase/server";
import NovoGastoBotao from "./NovoGastoBotao";
import ListaDeGastos, {
  type Mes,
  type MotoComGastos,
} from "./ListaDeGastos";

/*
 * Gastos das Motos.
 *
 * Aqui só se busca e se organiza: quem mostra é ListaDeGastos,
 * que filtra no navegador para a busca responder a cada letra.
 *
 * A organização é por MOTO, não por mês. A pergunta que se faz
 * nesta tela é sempre "quanto gastei nesta moto" - e, separada
 * por mês, a mesma moto aparecia uma vez em cada mês, obrigando
 * a somar de cabeça.
 */

const NOMES_MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/*
 * O texto pelo qual a moto é encontrada.
 *
 * Sem acento e sem pontuação, tudo junto: assim "ABC-1D23"
 * acha quem digitou "abc1d23", e "Fan Preta" acha quem digitou
 * "fanpreta". Fica pronto aqui, no servidor, para o navegador
 * só comparar.
 */
function paraBusca(partes: (string | number | null | undefined)[]) {
  return partes
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function mesDoGasto(data: string | null | undefined) {
  const valor = String(data || "").slice(0, 10);
  const [ano, mes] = valor.split("-");

  const numero = Number(mes);

  if (!ano || !Number.isInteger(numero) || numero < 1 || numero > 12) {
    return { chave: "sem-data", titulo: "Sem data" };
  }

  return {
    chave: `${ano}-${mes}`,
    titulo: `${NOMES_MESES[numero - 1]} de ${ano}`,
  };
}

export default async function GastosMotosPage() {
  const supabase = await createClient();

  const { data: gastos, error } = await supabase
    .from("motorcycle_expenses")
    .select(
      `
      *,
      motorcycles (
        id,
        codigo,
        marca,
        modelo,
        versao,
        placa,
        ano_modelo,
        cor,
        status
      )
    `
    )
    .order("data", { ascending: false });

  /*
   * Motos que ainda estão na loja primeiro: gasto de moto
   * vendida existe, mas é exceção.
   */
  const { data: motosParaGasto } = await supabase
    .from("motorcycles")
    .select("id, codigo, marca, modelo, placa, status")
    .order("status", { ascending: true })
    .order("codigo", { ascending: false });

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-700 bg-red-950/30 p-4 text-red-300">
          Erro ao carregar gastos: {error.message}
        </div>
      </div>
    );
  }

  const porMoto = new Map<string, MotoComGastos>();
  const mesesVistos = new Map<string, Mes>();

  for (const gasto of gastos ?? []) {
    const mes = mesDoGasto(gasto.data);

    if (!mesesVistos.has(mes.chave)) {
      mesesVistos.set(mes.chave, mes);
    }

    const moto = gasto.motorcycles;

    /* Gasto que perdeu a moto continua aparecendo: ele saiu do
       caixa, e sumir da tela seria pior do que aparecer sem
       nome. */
    const chave = moto?.id
      ? String(moto.id)
      : `sem-moto-${gasto.id}`;

    if (!porMoto.has(chave)) {
      porMoto.set(chave, {
        id: moto?.id ? String(moto.id) : null,
        chave,
        nome:
          [moto?.marca, moto?.modelo, moto?.versao]
            .filter(Boolean)
            .join(" ") || "Moto não encontrada",
        detalhe:
          [moto?.codigo, moto?.placa, moto?.ano_modelo, moto?.cor]
            .filter(Boolean)
            .join(" · ") || "sem identificação",
        vendida: String(moto?.status || "") === "vendida",
        busca: paraBusca([
          moto?.codigo,
          moto?.marca,
          moto?.modelo,
          moto?.versao,
          moto?.placa,
          moto?.ano_modelo,
          moto?.cor,
        ]),
        gastos: [],
      });
    }

    porMoto.get(chave)!.gastos.push({
      id: String(gasto.id),
      data: gasto.data || null,
      mes: mes.chave,
      categoria: gasto.categoria || null,
      descricao: gasto.descricao || null,
      formaPagamento: gasto.forma_pagamento || null,
      valor: Number(gasto.valor || 0),
    });
  }

  const meses = Array.from(mesesVistos.values()).sort((a, b) =>
    b.chave.localeCompare(a.chave)
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dourado">
            Gastos das Motos
          </h1>

          <p className="mt-1 text-sm text-texto-suave">
            Uma linha por moto. Digite para achar.
          </p>
        </div>

        <NovoGastoBotao motos={motosParaGasto || []} />
      </div>

      <ListaDeGastos
        motos={Array.from(porMoto.values())}
        meses={meses}
      />
    </div>
  );
}
