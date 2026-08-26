import { createClient } from '@/lib/supabase/server'
import {
  BANCOS_FINANCIAMENTO,
  OPERADORA_CARTAO,
} from '@/lib/dados/financeiras'

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
      resultadoCapacetesComprados,
      resultadoCapacetesVendidos,
      resultadoEstoqueCapacetes,
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
          documentacao_entra_no_lucro,
          banco,
          valor_financiado
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

      supabase
        .from('helmet_purchases')
        .select(`
          valor_total,
          helmet_purchase_items (
            quantidade
          )
        `)
        .gte('data_compra', inicioMes)
        .lte('data_compra', fimMes),

      supabase
        .from('helmet_sale_items')
        .select('sale_id, quantidade, valor_unitario, custo_unitario')
        .gte('data', inicioMes)
        .lte('data', fimMes),

      supabase
        .from('helmet_models')
        .select('estoque_atual, custo_medio, preco_venda_padrao'),
    ])

    const erros = [
      resultadoCompras.error,
      resultadoVendas.error,
      resultadoGastosMotos.error,
      resultadoDespesas.error,
      resultadoEntradas.error,
      resultadoSaidas.error,
      resultadoCapacetesComprados.error,
      resultadoCapacetesVendidos.error,
      resultadoEstoqueCapacetes.error,
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

    /*
     * FINANCIAMENTOS POR BANCO
     */
    const financiamentos = vendas.filter(
      (venda) => numero(venda.valor_financiado) > 0
    )

    const totalFinanciado = financiamentos.reduce(
      (soma, venda) => soma + numero(venda.valor_financiado),
      0
    )

    const porBanco = new Map<
      string,
      { quantidade: number; valor: number }
    >()

    for (const banco of BANCOS_FINANCIAMENTO) {
      porBanco.set(banco, { quantidade: 0, valor: 0 })
    }

    for (const venda of financiamentos) {
      const nome =
        (venda.banco || '').trim() || 'Não informado'

      const atual =
        porBanco.get(nome) ?? { quantidade: 0, valor: 0 }

      porBanco.set(nome, {
        quantidade: atual.quantidade + 1,
        valor: atual.valor + numero(venda.valor_financiado),
      })
    }

    const bancos = Array.from(porBanco.entries())
      .map(([nome, dados]) => ({ nome, ...dados }))
      .sort(
        (a, b) =>
          b.valor - a.valor || a.nome.localeCompare(b.nome)
      )

    /*
     * CARTÃO (operadora da loja)
     */
    const idsVendas = vendas.map((venda) => venda.id)

    let cartaoMotos = 0

    if (idsVendas.length > 0) {
      const { data: pagamentosCartao } = await supabase
        .from('sale_payment_components')
        .select('valor')
        .eq('tipo', 'Cartão')
        .in('sale_id', idsVendas)

      cartaoMotos = (pagamentosCartao ?? []).reduce(
        (soma, item) => soma + numero(item.valor),
        0
      )
    }

    const { data: capacetesNoCartao } = await supabase
      .from('helmet_sales')
      .select('valor_total')
      .eq('forma_pagamento', 'Cartão')
      .gte('data_venda', inicioMes)
      .lte('data_venda', fimMes)

    const cartaoCapacetes = (capacetesNoCartao ?? []).reduce(
      (soma, venda) => soma + numero(venda.valor_total),
      0
    )

    /*
     * CAPACETES
     */
    const notasCapacetes =
      resultadoCapacetesComprados.data || []

    const itensCapacetesVendidos =
      resultadoCapacetesVendidos.data || []

    const modelosCapacete =
      resultadoEstoqueCapacetes.data || []

    const valorCapacetesComprados = notasCapacetes.reduce(
      (soma, nota) => soma + numero(nota.valor_total),
      0
    )

    const qtdCapacetesComprados = notasCapacetes.reduce(
      (soma, nota) =>
        soma +
        (nota.helmet_purchase_items || []).reduce(
          (total, item) => total + numero(item.quantidade),
          0
        ),
      0
    )

    const resumoCapacetes = itensCapacetesVendidos.reduce(
      (resumo, item) => {
        const quantidade = numero(item.quantidade)
        const valor = numero(item.valor_unitario)
        const custo = numero(item.custo_unitario)

        return {
          quantidade: resumo.quantidade + quantidade,

          receitaNaMoto:
            resumo.receitaNaMoto +
            (item.sale_id ? quantidade * valor : 0),

          receitaAvulsa:
            resumo.receitaAvulsa +
            (item.sale_id ? 0 : quantidade * valor),

          custo: resumo.custo + quantidade * custo,

          brindes:
            resumo.brindes + (valor === 0 ? quantidade : 0),
        }
      },
      {
        quantidade: 0,
        receitaNaMoto: 0,
        receitaAvulsa: 0,
        custo: 0,
        brindes: 0,
      }
    )

    const receitaCapacetes =
      resumoCapacetes.receitaNaMoto +
      resumoCapacetes.receitaAvulsa

    const lucroCapacetes =
      receitaCapacetes - resumoCapacetes.custo

    const estoqueCapacetes = modelosCapacete.reduce(
      (resumo, modelo) => {
        const estoque = Math.max(
          numero(modelo.estoque_atual),
          0
        )

        return {
          quantidade: resumo.quantidade + estoque,
          custo:
            resumo.custo +
            estoque * numero(modelo.custo_medio),
          venda:
            resumo.venda +
            estoque * numero(modelo.preco_venda_padrao),
        }
      },
      { quantidade: 0, custo: 0, venda: 0 }
    )

    const lucroBruto =
      faturamento +
      receitaDocumentacao +
      resumoCapacetes.receitaAvulsa -
      custoMotosVendidas -
      resumoCapacetes.custo

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

    /*
     * Vendedores saem das proprias vendas do mes, e nao de
     * uma lista fixa: quem vender aparece no relatorio.
     */
    const porVendedor = new Map<
      string,
      { nome: string; quantidade: number; faturamento: number }
    >()

    for (const venda of vendas) {
      const chave = normalizarVendedor(venda.vendedor)

      if (!chave) continue

      const atual =
        porVendedor.get(chave) ?? {
          nome: (venda.vendedor || '').trim(),
          quantidade: 0,
          faturamento: 0,
        }

      porVendedor.set(chave, {
        nome: atual.nome,
        quantidade: atual.quantidade + 1,
        faturamento:
          atual.faturamento + numero(venda.valor_total_venda),
      })
    }

    const vendedores = Array.from(porVendedor.values()).sort(
      (a, b) =>
        b.faturamento - a.faturamento ||
        a.nome.localeCompare(b.nome)
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
      ['Venda avulsa de capacetes', resumoCapacetes.receitaAvulsa.toFixed(2)],
      ['Custo dos capacetes vendidos', resumoCapacetes.custo.toFixed(2)],
      ['Lucro bruto', lucroBruto.toFixed(2)],
      ['Despesas da loja', totalDespesas.toFixed(2)],
      ['Lucro líquido', lucroLiquido.toFixed(2)],
      ['', ''],
      ['CAPACETES', ''],
      ['Capacetes comprados no mês', qtdCapacetesComprados],
      ['Gasto com capacetes no mês', valorCapacetesComprados.toFixed(2)],
      ['Capacetes vendidos no mês', resumoCapacetes.quantidade],
      ['Dados de brinde no mês', resumoCapacetes.brindes],
      ['Recebido com capacetes', receitaCapacetes.toFixed(2)],
      ['Custo da mercadoria vendida', resumoCapacetes.custo.toFixed(2)],
      ['Lucro com capacetes', lucroCapacetes.toFixed(2)],
      ['Capacetes em estoque (atual)', estoqueCapacetes.quantidade],
      ['Mercadoria disponível a custo', estoqueCapacetes.custo.toFixed(2)],
      ['Mercadoria disponível a preço de venda', estoqueCapacetes.venda.toFixed(2)],
      ['', ''],
      ['FINANCIAMENTOS POR BANCO', ''],
      ['Vendas financiadas no mês', financiamentos.length],
      ['Total financiado', totalFinanciado.toFixed(2)],
      ...bancos.map((banco) => [
        `${banco.nome} - contratos`,
        banco.quantidade,
      ]),
      ...bancos.map((banco) => [
        `${banco.nome} - valor financiado`,
        banco.valor.toFixed(2),
      ]),
      ['', ''],
      [`CARTÃO - operadora ${OPERADORA_CARTAO}`, ''],
      ['Cartão em vendas de moto', cartaoMotos.toFixed(2)],
      ['Cartão em vendas de capacete', cartaoCapacetes.toFixed(2)],
      [
        'Cartão total',
        (cartaoMotos + cartaoCapacetes).toFixed(2),
      ],
      ['', ''],
      ['VENDAS POR VENDEDOR', ''],
      ...vendedores.flatMap((vendedor) => [
        [`${vendedor.nome} - quantidade`, vendedor.quantidade],
        [
          `${vendedor.nome} - faturamento`,
          vendedor.faturamento.toFixed(2),
        ],
      ]),
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