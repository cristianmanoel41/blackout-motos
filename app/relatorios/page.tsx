import { createClient } from '@/lib/supabase/server'
import { formatarMoeda } from '@/lib/formatadores/moeda'
import {
  BANCOS_FINANCIAMENTO,
  OPERADORA_CARTAO,
} from '@/lib/dados/financeiras'
import RelatorioFiltro from '@/components/RelatorioFiltro'

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

  const ultimoDiaMes = new Date(
    anoSelecionado,
    mesSelecionado,
    0
  ).getDate()

  const inicioMes =
    `${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}-01`

  const fimMes =
    `${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}-${String(
      ultimoDiaMes
    ).padStart(2, '0')}`

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
      documentacao_entra_no_lucro,
      banco,
      valor_financiado,
      parcelas_financiamento
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

  /*
   * Os vendedores saem das próprias vendas do mês, e não de
   * uma lista fixa: quem vender aparece aqui, sem precisar
   * mexer no código quando entrar ou sair alguém.
   */
  const porVendedor = new Map<
    string,
    { nome: string; quantidade: number; faturamento: number }
  >()

  vendasMes?.forEach((venda) => {
    const chave = normalizarVendedor(venda.vendedor)

    if (!chave) return

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
        atual.faturamento +
        Number(venda.valor_total_venda || 0),
    })
  })

  const vendedores = Array.from(porVendedor.values()).sort(
    (a, b) =>
      b.faturamento - a.faturamento ||
      a.nome.localeCompare(b.nome)
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
  // FINANCIAMENTOS POR BANCO
  // =========================================================

  const normalizarBanco = (
    valor: string | null | undefined
  ) =>
    (valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()

  const mapaBancosOficiais = new Map(
    BANCOS_FINANCIAMENTO.map((banco) => [
      normalizarBanco(banco),
      banco,
    ])
  )

  const financiamentosMes =
    vendasMes?.filter(
      (venda) => Number(venda.valor_financiado || 0) > 0
    ) ?? []

  const porBanco = new Map<
    string,
    { quantidade: number; valor: number }
  >()

  // Todos os bancos oficiais aparecem, mesmo com zero contratos.
  BANCOS_FINANCIAMENTO.forEach((banco) => {
    porBanco.set(banco, {
      quantidade: 0,
      valor: 0,
    })
  })

  // Só soma vendas cujo banco exista na lista oficial.
  financiamentosMes.forEach((venda) => {
    const bancoOficial = mapaBancosOficiais.get(
      normalizarBanco(venda.banco)
    )

    if (!bancoOficial) {
      return
    }

    const atual =
      porBanco.get(bancoOficial) ?? {
        quantidade: 0,
        valor: 0,
      }

    porBanco.set(bancoOficial, {
      quantidade: atual.quantidade + 1,
      valor:
        atual.valor + Number(venda.valor_financiado || 0),
    })
  })

  const totalFinanciadoMes =
    Array.from(porBanco.values()).reduce(
      (soma, banco) => soma + banco.valor,
      0
    )

  const bancos = BANCOS_FINANCIAMENTO.map((nome) => {
    const dados =
      porBanco.get(nome) ?? {
        quantidade: 0,
        valor: 0,
      }

    return {
      nome,
      quantidade: dados.quantidade,
      valor: dados.valor,
      participacao:
        totalFinanciadoMes > 0
          ? (dados.valor / totalFinanciadoMes) * 100
          : 0,
    }
  })

  // =========================================================
  // CARTÃO (OPERADORA)
  // =========================================================

  const idsVendasMes =
    vendasMes?.map((venda) => venda.id) ?? []

  let cartaoMotos = { quantidade: 0, valor: 0 }

  if (idsVendasMes.length > 0) {
    const { data: pagamentosCartao } = await supabase
      .from('sale_payment_components')
      .select('valor, parcelas')
      .eq('tipo', 'Cartão')
      .in('sale_id', idsVendasMes)

    cartaoMotos = (pagamentosCartao ?? []).reduce(
      (resumo, item) => ({
        quantidade: resumo.quantidade + 1,
        valor: resumo.valor + Number(item.valor || 0),
      }),
      { quantidade: 0, valor: 0 }
    )
  }

  const { data: capacetesNoCartao } = await supabase
    .from('helmet_sales')
    .select('valor_total')
    .eq('forma_pagamento', 'Cartão')
    .gte('data_venda', inicioMes)
    .lte('data_venda', fimMes)

  const cartaoCapacetes = (capacetesNoCartao ?? []).reduce(
    (resumo, venda) => ({
      quantidade: resumo.quantidade + 1,
      valor: resumo.valor + Number(venda.valor_total || 0),
    }),
    { quantidade: 0, valor: 0 }
  )

  const totalCartao =
    cartaoMotos.valor + cartaoCapacetes.valor

  const quantidadeCartao =
    cartaoMotos.quantidade + cartaoCapacetes.quantidade

  // =========================================================
  // CAPACETES
  // =========================================================

  const { data: comprasCapacetes } = await supabase
    .from('helmet_purchases')
    .select(`
      valor_total,
      helmet_purchase_items (
        quantidade
      )
    `)
    .gte('data_compra', inicioMes)
    .lte('data_compra', fimMes)

  const valorCapacetesComprados =
    comprasCapacetes?.reduce(
      (soma, nota) =>
        soma + Number(nota.valor_total || 0),
      0
    ) ?? 0

  const qtdCapacetesComprados =
    comprasCapacetes?.reduce(
      (soma, nota) =>
        soma +
        (nota.helmet_purchase_items ?? []).reduce(
          (total, item) =>
            total + Number(item.quantidade || 0),
          0
        ),
      0
    ) ?? 0

  const { data: capacetesVendidos } = await supabase
    .from('helmet_sale_items')
    .select(
      'sale_id, quantidade, valor_unitario, custo_unitario'
    )
    .gte('data', inicioMes)
    .lte('data', fimMes)

  const resumoCapacetes =
    capacetesVendidos?.reduce(
      (resumo, item) => {
        const quantidade = Number(item.quantidade || 0)
        const valor = Number(item.valor_unitario || 0)
        const custo = Number(item.custo_unitario || 0)

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
    ) ?? {
      quantidade: 0,
      receitaNaMoto: 0,
      receitaAvulsa: 0,
      custo: 0,
      brindes: 0,
    }

  const receitaCapacetes =
    resumoCapacetes.receitaNaMoto +
    resumoCapacetes.receitaAvulsa

  const lucroCapacetes =
    receitaCapacetes - resumoCapacetes.custo

  const { data: estoqueCapacetes } = await supabase
    .from('helmet_models')
    .select('estoque_atual, custo_medio, preco_venda_padrao')

  const totaisEstoqueCapacetes =
    estoqueCapacetes?.reduce(
      (resumo, modelo) => {
        const estoque = Math.max(
          Number(modelo.estoque_atual || 0),
          0
        )

        return {
          quantidade: resumo.quantidade + estoque,

          custo:
            resumo.custo +
            estoque * Number(modelo.custo_medio || 0),

          venda:
            resumo.venda +
            estoque * Number(modelo.preco_venda_padrao || 0),
        }
      },
      { quantidade: 0, custo: 0, venda: 0 }
    ) ?? { quantidade: 0, custo: 0, venda: 0 }

  // =========================================================
  // LUCRO BRUTO
  // =========================================================

  /*
   * O faturamento das vendas já inclui os capacetes
   * que saíram junto com a moto. As vendas avulsas
   * de capacete entram aqui, e o custo da mercadoria
   * vendida é descontado.
   */
  const lucroBruto =
    faturamento +
    receitaDocNoLucro +
    resumoCapacetes.receitaAvulsa -
    custoMotosVendidas -
    resumoCapacetes.custo

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
      .select('id, valor_compra')
      .in('status', [
        'disponivel',
        'reservada',
      ])

  let valorEstoque = 0

  if (
    motosEstoque &&
    motosEstoque.length > 0
  ) {
    const idsEstoque =
      motosEstoque.map((moto) => moto.id)

    const { data: gastosEstoque } =
      await supabase
        .from('motorcycle_expenses')
        .select('motorcycle_id, valor')
        .in('motorcycle_id', idsEstoque)

    const gastosPorMotoEstoque:
      Record<string, number> = {}

    gastosEstoque?.forEach((gasto) => {
      gastosPorMotoEstoque[
        gasto.motorcycle_id
      ] =
        (gastosPorMotoEstoque[
          gasto.motorcycle_id
        ] || 0) +
        Number(gasto.valor || 0)
    })

    valorEstoque =
      motosEstoque.reduce(
        (soma, moto) =>
          soma +
          Number(moto.valor_compra || 0) +
          (gastosPorMotoEstoque[
            moto.id
          ] || 0),
        0
      )
  }

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

      <RelatorioFiltro
        mes={mesSelecionado}
        ano={anoSelecionado}
        meses={nomesMeses}
        anos={anos}
      />

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
            'Venda avulsa de capacetes',
            formatarMoeda(
              resumoCapacetes.receitaAvulsa
            )
          )}

          {linha(
            'Custo dos capacetes vendidos',
            formatarMoeda(
              resumoCapacetes.custo
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

        {/* FINANCIAMENTOS POR BANCO */}

        <div className="w-full overflow-hidden rounded-xl border border-grafite-claro bg-grafite xl:col-span-2">
          <div className="bg-grafite-claro px-5 py-3">
            <h2 className="font-semibold text-dourado">
              Financiamentos por Banco
            </h2>

            <p className="mt-1 text-xs text-texto-suave">
              {nomesMeses[mesSelecionado - 1]} de{' '}
              {anoSelecionado} · {financiamentosMes.length}{' '}
              venda
              {financiamentosMes.length === 1 ? '' : 's'}{' '}
              financiada
              {financiamentosMes.length === 1 ? '' : 's'} ·
              total {formatarMoeda(totalFinanciadoMes)}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="border-b border-grafite-claro text-left text-xs uppercase tracking-wide text-texto-suave">
                <tr>
                  <th className="px-5 py-3">Banco</th>
                  <th className="px-5 py-3 text-right">
                    Contratos
                  </th>
                  <th className="px-5 py-3 text-right">
                    Valor financiado
                  </th>
                  <th className="px-5 py-3 text-right">
                    Participação
                  </th>
                </tr>
              </thead>

              <tbody>
                {bancos.map((banco) => (
                  <tr
                    key={banco.nome}
                    className="border-b border-grafite-claro/60 text-white last:border-0"
                  >
                    <td className="px-5 py-3 font-medium text-white">
                      {banco.nome}
                    </td>

                    <td className="px-5 py-3 text-right text-white">
                      {banco.quantidade}
                    </td>

                    <td className="px-5 py-3 text-right font-semibold text-white">
                      {formatarMoeda(banco.valor)}
                    </td>

                    <td className="px-5 py-3 text-right text-white">
                      {banco.participacao.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-grafite-claro px-5 py-4">
            <p className="text-xs text-texto-suave">
              Cartão · operadora {OPERADORA_CARTAO}
            </p>

            <p className="mt-1 font-semibold text-texto">
              {formatarMoeda(totalCartao)}{' '}
              <span className="text-xs font-normal text-texto-suave">
                em {quantidadeCartao} pagamento
                {quantidadeCartao === 1 ? '' : 's'} (
                {formatarMoeda(cartaoMotos.valor)} em motos ·{' '}
                {formatarMoeda(cartaoCapacetes.valor)} em
                capacetes)
              </span>
            </p>
          </div>
        </div>

        {/* CAPACETES */}

        <div className="w-full overflow-hidden rounded-xl border border-grafite-claro bg-grafite divide-y divide-grafite-claro xl:col-span-2">
          <div className="bg-grafite-claro px-5 py-3">
            <h2 className="font-semibold text-dourado">
              Capacetes
            </h2>

            <p className="mt-1 text-xs text-texto-suave">
              Compras e vendas de {nomesMeses[mesSelecionado - 1]}{' '}
              de {anoSelecionado} · estoque é sempre o atual
            </p>
          </div>

          {linha(
            'Capacetes comprados no mês',
            String(qtdCapacetesComprados)
          )}

          {linha(
            'Gasto com capacetes no mês',
            formatarMoeda(
              valorCapacetesComprados
            )
          )}

          {linha(
            'Capacetes vendidos no mês',
            String(resumoCapacetes.quantidade)
          )}

          {linha(
            'Dados de brinde no mês',
            String(resumoCapacetes.brindes)
          )}

          {linha(
            'Recebido com capacetes',
            formatarMoeda(receitaCapacetes)
          )}

          {linha(
            'Custo da mercadoria vendida',
            formatarMoeda(resumoCapacetes.custo)
          )}

          {linha(
            'Lucro com capacetes',
            formatarMoeda(lucroCapacetes),
            true
          )}

          {linha(
            'Capacetes em estoque (atual)',
            String(totaisEstoqueCapacetes.quantidade)
          )}

          {linha(
            'Mercadoria disponível (a custo)',
            formatarMoeda(
              totaisEstoqueCapacetes.custo
            ),
            true
          )}

          {linha(
            'Mercadoria disponível (a preço de venda)',
            formatarMoeda(
              totaisEstoqueCapacetes.venda
            )
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

          {vendedores.length === 0 && (
            <p className="px-5 py-6 text-sm text-texto-suave">
              Nenhuma venda com vendedor informado neste mês.
            </p>
          )}

          {vendedores.length > 0 && (
            <div className="grid grid-cols-1 divide-y divide-grafite-claro sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-3">
              {vendedores.map((vendedor) => (
                <div key={vendedor.nome} className="p-5">
                  <p className="text-sm font-semibold text-white">
                    {vendedor.nome}
                  </p>

                  <p className="mt-3 text-3xl font-bold text-dourado">
                    {vendedor.quantidade}
                  </p>

                  <p className="text-xs text-texto-suave">
                    venda{vendedor.quantidade === 1 ? '' : 's'} no
                    mês
                  </p>

                  <div className="mt-4 border-t border-grafite-claro pt-3">
                    <p className="text-xs text-texto-suave">
                      Faturamento
                    </p>

                    <p className="mt-1 font-semibold text-green-400">
                      {formatarMoeda(vendedor.faturamento)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

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