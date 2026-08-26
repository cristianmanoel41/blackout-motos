import { createClient } from '@/lib/supabase/server'
import { formatarMoeda } from '@/lib/formatadores/moeda'
import { Bike, ShoppingCart, PlusCircle, Warehouse, DollarSign, TrendingUp, TrendingDown, Receipt, ArrowUpCircle, ArrowDownCircle, Wallet } from 'lucide-react'
import GraficoValores from '@/components/GraficoValores'

export default async function DashboardPage() {
  const supabase = await createClient()

  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10)
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10)

  // Motos disponíveis
  const { count: motosDisponiveis } = await supabase
    .from('motorcycles')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'disponivel')

  // Motos compradas no mês (tipo_entrada = compra_nova)
  const { count: motosCompradasMes } = await supabase
    .from('motorcycles')
    .select('*', { count: 'exact', head: true })
    .eq('tipo_entrada', 'compra_nova')
    .gte('data_entrada', inicioMes)
    .lte('data_entrada', fimMes)

  // Vendas do mês
  const { data: vendasMes } = await supabase
    .from('sales')
    .select('id, motorcycle_id, valor_total_venda, valor_documentacao, documentacao_entra_no_lucro')
    .eq('status', 'ativa')
    .gte('data_venda', inicioMes)
    .lte('data_venda', fimMes)

  const motosVendidasMes = vendasMes?.length ?? 0
  const faturamentoMes = vendasMes?.reduce((s, v) => s + Number(v.valor_total_venda), 0) ?? 0

  // Custo das motos vendidas no mês (valor_compra + gastos de cada moto)
  const idsMotosVendidas = vendasMes?.map((v) => v.motorcycle_id) ?? []
  let custoMotosVendidas = 0
  if (idsMotosVendidas.length > 0) {
    const { data: motosVendidas } = await supabase
      .from('motorcycles')
      .select('id, valor_compra')
      .in('id', idsMotosVendidas)

    const { data: gastosDessasMotos } = await supabase
      .from('motorcycle_expenses')
      .select('motorcycle_id, valor')
      .in('motorcycle_id', idsMotosVendidas)

    const gastosPorMoto: Record<string, number> = {}
    gastosDessasMotos?.forEach((g) => {
      gastosPorMoto[g.motorcycle_id] = (gastosPorMoto[g.motorcycle_id] || 0) + Number(g.valor)
    })

    custoMotosVendidas = motosVendidas?.reduce((s, m) => {
      return s + Number(m.valor_compra) + (gastosPorMoto[m.id] || 0)
    }, 0) ?? 0
  }

  const receitaDocumentacaoNoLucro = vendasMes?.reduce((s, v) => {
    return s + (v.documentacao_entra_no_lucro ? Number(v.valor_documentacao) : 0)
  }, 0) ?? 0

  const lucroBrutoMes = faturamentoMes + receitaDocumentacaoNoLucro - custoMotosVendidas

  // Despesas da loja no mês
  const { data: despesasMes } = await supabase
    .from('store_expenses')
    .select('valor')
    .gte('data', inicioMes)
    .lte('data', fimMes)

  const totalDespesasMes = despesasMes?.reduce((s, d) => s + Number(d.valor), 0) ?? 0
  const lucroLiquidoMes = lucroBrutoMes - totalDespesasMes

  // Valor investido em estoque (motos disponíveis + reservadas)
  const { data: motosEstoque } = await supabase
    .from('motorcycles')
    .select('id, valor_compra')
    .in('status', ['disponivel', 'reservada'])

  let valorInvestidoEstoque = 0
  if (motosEstoque && motosEstoque.length > 0) {
    const idsEstoque = motosEstoque.map((m) => m.id)
    const { data: gastosEstoque } = await supabase
      .from('motorcycle_expenses')
      .select('motorcycle_id, valor')
      .in('motorcycle_id', idsEstoque)

    const gastosPorMotoEstoque: Record<string, number> = {}
    gastosEstoque?.forEach((g) => {
      gastosPorMotoEstoque[g.motorcycle_id] = (gastosPorMotoEstoque[g.motorcycle_id] || 0) + Number(g.valor)
    })

    valorInvestidoEstoque = motosEstoque.reduce((s, m) => {
      return s + Number(m.valor_compra) + (gastosPorMotoEstoque[m.id] || 0)
    }, 0)
  }

  // Caixa do mês
  const { data: entradasMesData } = await supabase
    .from('cash_transactions')
    .select('valor')
    .eq('tipo', 'entrada')
    .gte('data', inicioMes)
    .lte('data', fimMes)

  const { data: saidasMesData } = await supabase
    .from('cash_transactions')
    .select('valor')
    .eq('tipo', 'saida')
    .gte('data', inicioMes)
    .lte('data', fimMes)

  const entradasMes = entradasMesData?.reduce((s, t) => s + Number(t.valor), 0) ?? 0
  const saidasMes = saidasMesData?.reduce((s, t) => s + Number(t.valor), 0) ?? 0

  // Saldo total do caixa (histórico completo)
  const { data: todasTransacoes } = await supabase.from('cash_transactions').select('tipo, valor')
  const totalEntradasGeral = todasTransacoes?.filter((t) => t.tipo === 'entrada').reduce((s, t) => s + Number(t.valor), 0) ?? 0
  const totalSaidasGeral = todasTransacoes?.filter((t) => t.tipo === 'saida').reduce((s, t) => s + Number(t.valor), 0) ?? 0
  const saldoCaixa = totalEntradasGeral - totalSaidasGeral

  const nomeMes = hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  // =========================================================
  // GRÁFICO: ÚLTIMOS 6 MESES
  // =========================================================

  const chaveMes = (ano: number, mes: number) =>
    `${ano}-${String(mes + 1).padStart(2, '0')}`

  const mesesGrafico = Array.from({ length: 6 }, (_, i) => {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - 5 + i, 1)

    return {
      chave: chaveMes(data.getFullYear(), data.getMonth()),
      rotulo: `${data
        .toLocaleDateString('pt-BR', { month: 'short' })
        .replace('.', '')}/${String(data.getFullYear()).slice(2)}`,
    }
  })

  const inicioJanela = `${mesesGrafico[0].chave}-01`

  const fimJanela = fimMes

  const { data: vendasJanela } = await supabase
    .from('sales')
    .select('motorcycle_id, valor_total_venda, valor_documentacao, documentacao_entra_no_lucro, data_venda')
    .eq('status', 'ativa')
    .gte('data_venda', inicioJanela)
    .lte('data_venda', fimJanela)

  const { data: despesasJanela } = await supabase
    .from('store_expenses')
    .select('valor, data')
    .gte('data', inicioJanela)
    .lte('data', fimJanela)

  const idsVendidasJanela =
    vendasJanela?.map((v) => v.motorcycle_id).filter(Boolean) ?? []

  const custoPorMoto: Record<string, number> = {}

  if (idsVendidasJanela.length > 0) {
    const { data: motosJanela } = await supabase
      .from('motorcycles')
      .select('id, valor_compra')
      .in('id', idsVendidasJanela)

    const { data: gastosJanela } = await supabase
      .from('motorcycle_expenses')
      .select('motorcycle_id, valor')
      .in('motorcycle_id', idsVendidasJanela)

    motosJanela?.forEach((m) => {
      custoPorMoto[m.id] = Number(m.valor_compra || 0)
    })

    gastosJanela?.forEach((g) => {
      custoPorMoto[g.motorcycle_id] =
        (custoPorMoto[g.motorcycle_id] || 0) + Number(g.valor || 0)
    })
  }

  const dadosGrafico = mesesGrafico.map(({ chave, rotulo }) => {
    const vendasDoMes =
      vendasJanela?.filter(
        (v) => String(v.data_venda).slice(0, 7) === chave
      ) ?? []

    const faturamento = vendasDoMes.reduce(
      (s, v) => s + Number(v.valor_total_venda || 0),
      0
    )

    const documentacao = vendasDoMes.reduce(
      (s, v) =>
        s + (v.documentacao_entra_no_lucro ? Number(v.valor_documentacao || 0) : 0),
      0
    )

    const custo = vendasDoMes.reduce(
      (s, v) => s + (custoPorMoto[v.motorcycle_id] || 0),
      0
    )

    const despesas =
      despesasJanela
        ?.filter((d) => String(d.data).slice(0, 7) === chave)
        .reduce((s, d) => s + Number(d.valor || 0), 0) ?? 0

    return {
      mes: rotulo,
      faturamento,
      despesas,
      lucro: faturamento + documentacao - custo - despesas,
    }
  })

  const Card = ({
    titulo,
    valor,
    icone: Icone,
    cor = 'text-dourado',
  }: {
    titulo: string
    valor: string
    icone: any
    cor?: string
  }) => (
    <div className="bg-grafite border border-grafite-claro rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-texto-suave">{titulo}</p>
        <Icone size={18} className={cor} />
      </div>
      <p className={`text-xl font-bold ${cor}`}>{valor}</p>
    </div>
  )

  return (
    <div>
      <h1 className="text-2xl font-bold text-dourado mb-1">Dashboard</h1>
      <p className="text-texto-suave text-sm mb-6 capitalize">{nomeMes}</p>

      <h2 className="text-texto-suave text-sm font-semibold uppercase tracking-wide mb-3">Operacional</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card titulo="Motos disponíveis" valor={String(motosDisponiveis ?? 0)} icone={Bike} />
        <Card titulo="Vendidas no mês" valor={String(motosVendidasMes)} icone={ShoppingCart} />
        <Card titulo="Compradas no mês" valor={String(motosCompradasMes ?? 0)} icone={PlusCircle} />
        <Card titulo="Valor em estoque" valor={formatarMoeda(valorInvestidoEstoque)} icone={Warehouse} />
      </div>

      <h2 className="text-texto-suave text-sm font-semibold uppercase tracking-wide mb-3">Financeiro do Mês</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card titulo="Faturamento" valor={formatarMoeda(faturamentoMes)} icone={DollarSign} />
        <Card titulo="Lucro bruto" valor={formatarMoeda(lucroBrutoMes)} icone={TrendingUp} cor={lucroBrutoMes >= 0 ? 'text-green-400' : 'text-red-400'} />
        <Card titulo="Despesas da loja" valor={formatarMoeda(totalDespesasMes)} icone={Receipt} cor="text-red-400" />
        <Card titulo="Lucro líquido" valor={formatarMoeda(lucroLiquidoMes)} icone={TrendingDown} cor={lucroLiquidoMes >= 0 ? 'text-green-400' : 'text-red-400'} />
      </div>

      <h2 className="text-texto-suave text-sm font-semibold uppercase tracking-wide mb-3">Evolução</h2>
      <div className="mb-8">
        <GraficoValores dados={dadosGrafico} />
      </div>

      <h2 className="text-texto-suave text-sm font-semibold uppercase tracking-wide mb-3">Caixa</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card titulo="Entradas do mês" valor={formatarMoeda(entradasMes)} icone={ArrowUpCircle} cor="text-green-400" />
        <Card titulo="Saídas do mês" valor={formatarMoeda(saidasMes)} icone={ArrowDownCircle} cor="text-red-400" />
        <Card titulo="Saldo atual do caixa" valor={formatarMoeda(saldoCaixa)} icone={Wallet} cor={saldoCaixa >= 0 ? 'text-dourado' : 'text-red-400'} />
      </div>
    </div>
  )
}