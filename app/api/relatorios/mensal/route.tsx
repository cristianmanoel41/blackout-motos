import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function csvCell(valor: unknown) {
  const texto = String(valor ?? '')
  return `"${texto.replace(/"/g, '""')}"`
}

function numero(valor: unknown) {
  return Number(valor || 0)
}

function normalizarVendedor(valor: string | null | undefined) {
  return (valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)

    const hoje = new Date()
    const mes = Number(url.searchParams.get('mes')) || hoje.getMonth() + 1
    const ano = Number(url.searchParams.get('ano')) || hoje.getFullYear()

    if (mes < 1 || mes > 12 || ano < 2000 || ano > 2100) {
      return Response.json(
        { error: 'Mês ou ano inválido.' },
        { status: 400 }
      )
    }

    const ultimoDia = new Date(ano, mes, 0).getDate()

    const inicioMes =
      `${ano}-${String(mes).padStart(2, '0')}-01`

    const fimMes =
      `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`

    const supabase = await createClient()

    const [
      resultadoCompras,
      resultadoVendas,
      resultadoGastosMotos,
      resultadoDespesas,
      resultadoEntradas,
      resultadoSaidas,
    ] = await Promise.all([
      supabase
        .from('motorcycles')
        .select('id, valor_compra')
        .eq('tipo_entrada', 'compra_nova')
        .gte('data_entrada', inicioMes)
        .lte('data_entrada', fimMes),

      supabase
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
        .lte('data_venda', fimMes),

      supabase
        .from('motorcycle_expenses')
        .select('valor')
        .gte('data', inicioMes)
        .lte('data', fimMes),

      supabase
        .from('store_expenses')
        .select('valor')
        .gte('data', inicioMes)
        .lte('data', fimMes),

      supabase
        .from('cash_transactions')
        .select('valor, origem, descricao')
        .eq('tipo', 'entrada')
        .gte('data', inicioMes)
        .lte('data', fimMes),

      supabase
        .from('cash_transactions')
        .select('valor')
        .eq('tipo', 'saida')
        .gte('data', inicioMes)
        .lte('data', fimMes),
    ])

    const erros = [
      resultadoCompras.error,
      resultadoVendas.error,
      resultadoGastosMotos.error,
      resultadoDespesas.error,
      resultadoEntradas.error,
      resultadoSaidas.error,
    ].filter(Boolean)

    if (erros.length > 0) {
      console.error(erros)
      return Response.json(
        { error: 'Não foi possível gerar o relatório.' },
        { status: 500 }
      )
    }

    const compras = resultadoCompras.data || []
    const vendas = resultadoVendas.data || []
    const gastosMotos = resultadoGastosMotos.data || []
    const despesas = resultadoDespesas.data || []
    const entradas = resultadoEntradas.data || []
    const saidas = resultadoSaidas.data || []

    const qtdMotosCompradas = compras.length
    const valorMotosCompradas = compras.reduce(
      (soma, item) => soma + numero(item.valor_compra),
      0
    )

    const qtdMotosVendidas = vendas.length
    const faturamento = vendas.reduce(
      (soma, item) => soma + numero(item.valor_total_venda),
      0
    )

    const receitaDocumentacao = vendas.reduce(
      (soma, item) =>
        soma +
        (item.documentacao_entra_no_lucro
          ? numero(item.valor_documentacao)
          : 0),
      0
    )

    const idsMotosVendidas = vendas
      .map((venda) => venda.motorcycle_id)
      .filter((id): id is string => Boolean(id))

    let custoMotosVendidas = 0

    if (idsMotosVendidas.length > 0) {
      const [motosResult, gastosResult] = await Promise.all([
        supabase
          .from('motorcycles')
          .select('id, valor_compra')
          .in('id', idsMotosVendidas),

        supabase
          .from('motorcycle_expenses')
          .select('motorcycle_id, valor')
          .in('motorcycle_id', idsMotosVendidas),
      ])

      if (motosResult.error || gastosResult.error) {
        console.error(motosResult.error, gastosResult.error)
        return Response.json(
          { error: 'Não foi possível calcular o custo das motos vendidas.' },
          { status: 500 }
        )
      }

      const gastosPorMoto: Record<string, number> = {}

      for (const gasto of gastosResult.data || []) {
        gastosPorMoto[gasto.motorcycle_id] =
          (gastosPorMoto[gasto.motorcycle_id] || 0) +
          numero(gasto.valor)
      }

      custoMotosVendidas = (motosResult.data || []).reduce(
        (soma, moto) =>
          soma +
          numero(moto.valor_compra) +
          (gastosPorMoto[moto.id] || 0),
        0
      )
    }

    const totalGastosMotos = gastosMotos.reduce(
      (soma, item) => soma + numero(item.valor),
      0
    )

    const totalDespesas = despesas.reduce(
      (soma, item) => soma + numero(item.valor),
      0
    )

    const lucroBruto =
      faturamento +
      receitaDocumentacao -
      custoMotosVendidas

    const lucroLiquido =
      lucroBruto - totalDespesas

    const entradasCaixa = entradas
      .filter(
        (item) =>
          !(
            item.origem === 'outro' &&
            item.descricao === 'Saldo inicial do caixa'
          )
      )
      .reduce(
        (soma, item) => soma + numero(item.valor),
        0
      )

    const saidasCaixa = saidas.reduce(
      (soma, item) => soma + numero(item.valor),
      0
    )

    const saldoCaixa =
      entradasCaixa - saidasCaixa

    const vendasCristian = vendas.filter((venda) =>
      normalizarVendedor(venda.vendedor).includes('cristian')
    )

    const vendasBruno = vendas.filter((venda) =>
      normalizarVendedor(venda.vendedor).includes('bruno')
    )

    const faturamentoCristian = vendasCristian.reduce(
      (soma, venda) => soma + numero(venda.valor_total_venda),
      0
    )

    const faturamentoBruno = vendasBruno.reduce(
      (soma, venda) => soma + numero(venda.valor_total_venda),
      0
    )

    const semVendedor = vendas.filter(
      (venda) => !normalizarVendedor(venda.vendedor)
    ).length

    const linhas = [
      ['RELATÓRIO MENSAL BLACKOUT MOTOS', ''],
      ['Período', `${String(mes).padStart(2, '0')}/${ano}`],
      ['', ''],
      ['MOTOS', ''],
      ['Motos compradas', qtdMotosCompradas],
      ['Valor das compras', valorMotosCompradas.toFixed(2)],
      ['Motos vendidas', qtdMotosVendidas],
      ['', ''],
      ['FINANCEIRO', ''],
      ['Faturamento', faturamento.toFixed(2)],
      ['Custo das motos vendidas', custoMotosVendidas.toFixed(2)],
      ['Gastos das motos no mês', totalGastosMotos.toFixed(2)],
      ['Lucro bruto', lucroBruto.toFixed(2)],
      ['Despesas da loja', totalDespesas.toFixed(2)],
      ['Lucro líquido', lucroLiquido.toFixed(2)],
      ['', ''],
      ['VENDAS POR VENDEDOR', ''],
      ['Cristian - quantidade', vendasCristian.length],
      ['Cristian - faturamento', faturamentoCristian.toFixed(2)],
      ['Bruno - quantidade', vendasBruno.length],
      ['Bruno - faturamento', faturamentoBruno.toFixed(2)],
      ['Sem vendedor informado', semVendedor],
      ['', ''],
      ['CAIXA DO PERÍODO', ''],
      ['Entradas', entradasCaixa.toFixed(2)],
      ['Saídas', saidasCaixa.toFixed(2)],
      ['Saldo', saldoCaixa.toFixed(2)],
    ]

    const csv =
      '\uFEFF' +
      linhas
        .map((linha) =>
          linha.map(csvCell).join(';')
        )
        .join('\r\n')

    const nomeArquivo =
      `relatorio-blackout-${ano}-${String(mes).padStart(2, '0')}.csv`

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error(error)

    return Response.json(
      { error: 'Não foi possível gerar o relatório.' },
      { status: 500 }
    )
  }
}