import { createClient } from '@/lib/supabase/server'
import { formatarMoeda } from '@/lib/formatadores/moeda'

const nomesMeses = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export default async function RelatorioMensalPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ano?: string }>
}) {
  const params = await searchParams
  const hoje = new Date()

  const mesSelecionado = params.mes
    ? Number(params.mes)
    : hoje.getMonth() + 1

  const anoSelecionado = params.ano
    ? Number(params.ano)
    : hoje.getFullYear()

  const inicioMes = new Date(
    anoSelecionado,
    mesSelecionado - 1,
    1
  )
    .toISOString()
    .slice(0, 10)

  const fimMes = new Date(
    anoSelecionado,
    mesSelecionado,
    0
  )
    .toISOString()
    .slice(0, 10)

  const supabase = await createClient()

  // =========================================================
  // MOTOS COMPRADAS NO MÊS
  // =========================================================

  const { data: motosCompradas } = await supabase
    .from('motorcycles')
    .select('valor_compra')
    .eq('tipo_entrada', 'compra_nova')
    .gte('data_entrada', inicioMes)
    .lte('data_entrada', fimMes)

  const qtdMotosCompradas =
    motosCompradas?.length ?? 0

  const valorMotosCompradas =
    motosCompradas?.reduce(
      (soma, moto) =>
        soma + Number(moto.valor_compra || 0),
      0
    ) ?? 0

  // =========================================================
  // VENDAS DO MÊS
  // =========================================================

  const { data: vendasMes } = await supabase
    .from('sales')
    .select(`
      id,
      motorcycle_id,
      vendedor,
      valor_total_venda,
      valor_documentacao,
      documentacao_entra_no_lucro
    `)
    .eq('status', 'ativa')
    .gte('data_venda', inicioMes)
    .lte('data_venda', fimMes)

  const qtdMotosVendidas =
    vendasMes?.length ?? 0

  const faturamento =
    vendasMes?.reduce(
      (soma, venda) =>
        soma + Number(venda.valor_total_venda || 0),
      0
    ) ?? 0

  const normalizarVendedor = (valor: string | null | undefined) =>
    (valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()

  const vendasCristian =
    vendasMes?.filter(
      (venda) =>
        normalizarVendedor(venda.vendedor).includes('cristian')
    ) ?? []

  const vendasBruno =
    vendasMes?.filter(
      (venda) =>
        normalizarVendedor(venda.vendedor).includes('bruno')
    ) ?? []

  const qtdVendasCristian =
    vendasCristian.length

  const qtdVendasBruno =
    vendasBruno.length

  const faturamentoCristian =
    vendasCristian.reduce(
      (soma, venda) =>
        soma + Number(venda.valor_total_venda || 0),
      0
    )

  const faturamentoBruno =
    vendasBruno.reduce(
      (soma, venda) =>
        soma + Number(venda.valor_total_venda || 0),
      0
    )

  const vendasSemVendedor =
    vendasMes?.filter(
      (venda) => !normalizarVendedor(venda.vendedor)
    ).length ?? 0

  const receitaDocNoLucro =
    vendasMes?.reduce(
      (soma, venda) =>
        soma +
        (venda.documentacao_entra_no_lucro
          ? Number(venda.valor_documentacao || 0)
          : 0),
      0
    ) ?? 0

  // =========================================================
  // CUSTO DAS MOTOS VENDIDAS
  // =========================================================

  const idsMotosVendidas =
    vendasMes
      ?.map((venda) => venda.motorcycle_id)
      .filter(Boolean) ?? []

  let custoMotosVendidas = 0

  if (idsMotosVendidas.length > 0) {
    const { data: motosVendidas } =
      await supabase
        .from('motorcycles')
        .select('id, valor_compra')
        .in('id', idsMotosVendidas)

    const { data: gastosDessasMotos } =
      await supabase
        .from('motorcycle_expenses')
        .select('motorcycle_id, valor')
        .in('motorcycle_id', idsMotosVendidas)

    const gastosPorMoto: Record<string, number> = {}

    gastosDessasMotos?.forEach((gasto) => {
      gastosPorMoto[gasto.motorcycle_id] =
        (gastosPorMoto[gasto.motorcycle_id] || 0) +
        Number(gasto.valor || 0)
    })

    custoMotosVendidas =
      motosVendidas?.reduce(
        (soma, moto) =>
          soma +
          Number(moto.valor_compra || 0) +
          (gastosPorMoto[moto.id] || 0),
        0
      ) ?? 0
  }

  // =========================================================
  // LUCRO BRUTO
  // =========================================================

  const lucroBruto =
    faturamento +
    receitaDocNoLucro -
    custoMotosVendidas

  // =========================================================
  // GASTOS DAS MOTOS NO MÊS
  // =========================================================

  const { data: gastosMotosMes } =
    await supabase
      .from('motorcycle_expenses')
      .select('valor')
      .gte('data', inicioMes)
      .lte('data', fimMes)

  const totalGastosMotosMes =
    gastosMotosMes?.reduce(
      (soma, gasto) =>
        soma + Number(gasto.valor || 0),
      0
    ) ?? 0

  // =========================================================
  // DESPESAS DA LOJA
  // =========================================================

  const { data: despesasMes } =
    await supabase
      .from('store_expenses')
      .select('valor')
      .gte('data', inicioMes)
      .lte('data', fimMes)

  const totalDespesasMes =
    despesasMes?.reduce(
      (soma, despesa) =>
        soma + Number(despesa.valor || 0),
      0
    ) ?? 0

  const lucroLiquido =
    lucroBruto - totalDespesasMes

  // =========================================================
  // CAIXA DO PERÍODO
  // =========================================================

  const { data: entradasMesData } =
    await supabase
      .from('cash_transactions')
      .select('valor, origem, descricao')
      .eq('tipo', 'entrada')
      .gte('data', inicioMes)
      .lte('data', fimMes)

  const { data: saidasMesData } =
    await supabase
      .from('cash_transactions')
      .select('valor')
      .eq('tipo', 'saida')
      .gte('data', inicioMes)
      .lte('data', fimMes)

  // Não contar saldo inicial como entrada operacional
  const entradasCaixa =
    entradasMesData
      ?.filter(
        (t) =>
          !(
            t.origem === 'outro' &&
            t.descricao === 'Saldo inicial do caixa'
          )
      )
      .reduce(
        (soma, transacao) =>
          soma + Number(transacao.valor || 0),
        0
      ) ?? 0

  const saidasCaixa =
    saidasMesData?.reduce(
      (soma, transacao) =>
        soma + Number(transacao.valor || 0),
      0
    ) ?? 0

  const saldoPeriodo =
    entradasCaixa - saidasCaixa

  // =========================================================
  // ESTOQUE ATUAL
  // =========================================================

  const { count: estoqueFinal } =
    await supabase
      .from('motorcycles')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .in('status', [
        'disponivel',
        'reservada',
      ])

  const { data: motosEstoque } =
    await supabase
      .from('motorcycles')
      .select('valor_compra')
      .in('status', [
        'disponivel',
        'reservada',
      ])

  /*
   * VALOR DO ESTOQUE ATUAL:
   * soma somente o valor de compra das motos que ainda
   * estão disponíveis ou reservadas.
   *
   * Os gastos das motos ficam separados e continuam
   * compondo o custo real da moto para cálculo de lucro.
   */
  const valorEstoque =
    motosEstoque?.reduce(
      (soma, moto) =>
        soma +
        Number(moto.valor_compra || 0),
      0
    ) ?? 0

  // =========================================================
  // ANOS DO FILTRO
  // =========================================================

  const anos = Array.from(
    { length: 5 },
    (_, i) => hoje.getFullYear() - i
  )

  // =========================================================
  // COMPONENTE DE LINHA
  // =========================================================

  const linha = (
    label: string,
    valor: string,
    destaque = false
  ) => (
    <div
      className={`flex items-center justify-between gap-4 px-5 py-3 ${
        destaque
          ? 'bg-grafite-claro'
          : ''
      }`}
    >
      <span className="text-sm text-texto-suave">
        {label}
      </span>

      <span
        className={`whitespace-nowrap font-semibold ${
          destaque
            ? 'text-lg text-dourado'
            : 'text-texto'
        }`}
      >
        {valor}
      </span>
    </div>
  )

  // =========================================================
  // TELA
  // =========================================================

  return (
    <div className="w-full max-w-none">
      <h1 className="mb-6 text-2xl font-bold text-dourado">
        Relatório Mensal
      </h1>

      {/* FILTROS */}

      <form
        method="GET"
        className="mb-6 flex flex-wrap gap-3"
      >
        <select
          name="mes"
          defaultValue={mesSelecionado}
          className="rounded-lg border border-grafite-claro bg-grafite-claro px-4 py-2 text-texto outline-none focus:border-dourado"
        >
          {nomesMeses.map(
            (nome, i) => (
              <option
                key={i}
                value={i + 1}
              >
                {nome}
              </option>
            )
          )}
        </select>

        <select
          name="ano"
          defaultValue={anoSelecionado}
          className="rounded-lg border border-grafite-claro bg-grafite-claro px-4 py-2 text-texto outline-none focus:border-dourado"
        >
          {anos.map((ano) => (
            <option
              key={ano}
              value={ano}
            >
              {ano}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="rounded-lg bg-dourado px-6 py-2 font-semibold text-preto transition hover:bg-dourado-claro"
        >
          Gerar
        </button>
      </form>

      {/* PRIMEIRA LINHA */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

        {/* MOTOS */}

        <div className="w-full overflow-hidden rounded-xl border border-grafite-claro bg-grafite divide-y divide-grafite-claro">
          <div className="bg-grafite-claro px-5 py-3">
            <h2 className="font-semibold text-dourado">
              Motos
            </h2>
          </div>

          {linha(
            'Motos compradas',
            String(qtdMotosCompradas)
          )}

          {linha(
            'Valor das compras',
            formatarMoeda(
              valorMotosCompradas
            )
          )}

          {linha(
            'Motos vendidas',
            String(qtdMotosVendidas)
          )}

          {linha(
            'Estoque final (atual)',
            String(
              estoqueFinal ?? 0
            )
          )}

          {linha(
            'Valor do estoque (atual)',
            formatarMoeda(
              valorEstoque
            )
          )}
        </div>

        {/* FINANCEIRO */}

        <div className="w-full overflow-hidden rounded-xl border border-grafite-claro bg-grafite divide-y divide-grafite-claro">
          <div className="bg-grafite-claro px-5 py-3">
            <h2 className="font-semibold text-dourado">
              Financeiro
            </h2>
          </div>

          {linha(
            'Faturamento',
            formatarMoeda(
              faturamento
            )
          )}

          {linha(
            'Custo das motos vendidas',
            formatarMoeda(
              custoMotosVendidas
            )
          )}

          {linha(
            'Gastos das motos (mês)',
            formatarMoeda(
              totalGastosMotosMes
            )
          )}

          {linha(
            'Lucro bruto',
            formatarMoeda(
              lucroBruto
            ),
            true
          )}

          {linha(
            'Despesas da loja',
            formatarMoeda(
              totalDespesasMes
            )
          )}

          {linha(
            'Lucro líquido',
            formatarMoeda(
              lucroLiquido
            ),
            true
          )}
        </div>

        {/* VENDAS POR VENDEDOR */}

        <div className="w-full overflow-hidden rounded-xl border border-grafite-claro bg-grafite xl:col-span-2">
          <div className="bg-grafite-claro px-5 py-3">
            <h2 className="font-semibold text-dourado">
              Vendas por Vendedor
            </h2>

            <p className="mt-1 text-xs text-texto-suave">
              {nomesMeses[mesSelecionado - 1]} de {anoSelecionado}
            </p>
          </div>

          <div className="grid grid-cols-1 divide-y divide-grafite-claro md:grid-cols-2 md:divide-x md:divide-y-0">
            <div className="p-5">
              <p className="text-sm font-semibold text-white">
                Vendedor Cristian
              </p>

              <p className="mt-3 text-3xl font-bold text-dourado">
                {qtdVendasCristian}
              </p>

              <p className="text-xs text-texto-suave">
                vendas no mês
              </p>

              <div className="mt-4 border-t border-grafite-claro pt-3">
                <p className="text-xs text-texto-suave">
                  Faturamento
                </p>

                <p className="mt-1 font-semibold text-green-400">
                  {formatarMoeda(faturamentoCristian)}
                </p>
              </div>
            </div>

            <div className="p-5">
              <p className="text-sm font-semibold text-white">
                Vendedor Bruno
              </p>

              <p className="mt-3 text-3xl font-bold text-dourado">
                {qtdVendasBruno}
              </p>

              <p className="text-xs text-texto-suave">
                vendas no mês
              </p>

              <div className="mt-4 border-t border-grafite-claro pt-3">
                <p className="text-xs text-texto-suave">
                  Faturamento
                </p>

                <p className="mt-1 font-semibold text-green-400">
                  {formatarMoeda(faturamentoBruno)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 border-t border-grafite-claro md:grid-cols-2">
            <div className="px-5 py-3">
              <span className="text-sm text-texto-suave">
                Total de vendas do mês
              </span>

              <span className="float-right font-bold text-white">
                {qtdMotosVendidas}
              </span>
            </div>

            <div className="border-t border-grafite-claro px-5 py-3 md:border-l md:border-t-0">
              <span className="text-sm text-texto-suave">
                Sem vendedor informado
              </span>

              <span className="float-right font-bold text-yellow-400">
                {vendasSemVendedor}
              </span>
            </div>
          </div>
        </div>

        {/* CAIXA DO PERÍODO */}

        <div className="w-full overflow-hidden rounded-xl border border-grafite-claro bg-grafite divide-y divide-grafite-claro xl:col-span-2">
          <div className="bg-grafite-claro px-5 py-3">
            <h2 className="font-semibold text-dourado">
              Caixa do Período
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3">

            <div className="border-b border-grafite-claro px-5 py-5 md:border-b-0 md:border-r">
              <p className="text-xs text-texto-suave">
                Entradas de caixa
              </p>

              <p className="mt-1 text-xl font-bold text-green-400">
                {formatarMoeda(
                  entradasCaixa
                )}
              </p>
            </div>

            <div className="border-b border-grafite-claro px-5 py-5 md:border-b-0 md:border-r">
              <p className="text-xs text-texto-suave">
                Saídas de caixa
              </p>

              <p className="mt-1 text-xl font-bold text-red-400">
                {formatarMoeda(
                  saidasCaixa
                )}
              </p>
            </div>

            <div className="px-5 py-5">
              <p className="text-xs text-texto-suave">
                Saldo do período
              </p>

              <p
                className={`mt-1 text-xl font-bold ${
                  saldoPeriodo >= 0
                    ? 'text-dourado'
                    : 'text-red-400'
                }`}
              >
                {formatarMoeda(
                  saldoPeriodo
                )}
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}