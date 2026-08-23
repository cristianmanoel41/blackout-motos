import { createClient } from '@/lib/supabase/server'
import { formatarMoeda } from '@/lib/formatadores/moeda'

const nomesMeses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export default async function RelatorioMensalPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ano?: string }>
}) {
  const params = await searchParams
  const hoje = new Date()
  const mesSelecionado = params.mes ? Number(params.mes) : hoje.getMonth() + 1
  const anoSelecionado = params.ano ? Number(params.ano) : hoje.getFullYear()

  const inicioMes = new Date(anoSelecionado, mesSelecionado - 1, 1).toISOString().slice(0, 10)
  const fimMes = new Date(anoSelecionado, mesSelecionado, 0).toISOString().slice(0, 10)

  const supabase = await createClient()

  // Motos compradas no mês
  const { data: motosCompradas } = await supabase
    .from('motorcycles')
    .select('valor_compra')
    .eq('tipo_entrada', 'compra_nova')
    .gte('data_entrada', inicioMes)
    .lte('data_entrada', fimMes)

  const qtdMotosCompradas = motosCompradas?.length ?? 0
  const valorMotosCompradas = motosCompradas?.reduce((s, m) => s + Number(m.valor_compra), 0) ?? 0

  // Vendas do mês
  const { data: vendasMes } = await supabase
    .from('sales')
    .select('id, motorcycle_id, valor_total_venda, valor_documentacao, documentacao_entra_no_lucro')
    .eq('status', 'ativa')
    .gte('data_venda', inicioMes)
    .lte('data_venda', fimMes)

  const qtdMotosVendidas = vendasMes?.length ?? 0
  const faturamento = vendasMes?.reduce((s, v) => s + Number(v.valor_total_venda), 0) ?? 0
  const receitaDocNoLucro = vendasMes?.reduce((s, v) => s + (v.documentacao_entra_no_lucro ? Number(v.valor_documentacao) : 0), 0) ?? 0

  const idsMotosVendidas = vendasMes?.map((v) => v.motorcycle_id) ?? []
  let custoMotosVendidas = 0
  if (idsMotosVendidas.length > 0) {
    const { data: motosVendidas } = await supabase.from('motorcycles').select('id, valor_compra').in('id', idsMotosVendidas)
    const { data: gastosDessasMotos } = await supabase.from('motorcycle_expenses').select('motorcycle_id, valor').in('motorcycle_id', idsMotosVendidas)

    const gastosPorMoto: Record<string, number> = {}
    gastosDessasMotos?.forEach((g) => {
      gastosPorMoto[g.motorcycle_id] = (gastosPorMoto[g.motorcycle_id] || 0) + Number(g.valor)
    })

    custoMotosVendidas = motosVendidas?.reduce((s, m) => s + Number(m.valor_compra) + (gastosPorMoto[m.id] || 0), 0) ?? 0
  }

  const lucroBruto = faturamento + receitaDocNoLucro - custoMotosVendidas

  // Gastos de motos registrados no mês (qualquer moto)
  const { data: gastosMotosMes } = await supabase.from('motorcycle_expenses').select('valor').gte('data', inicioMes).lte('data', fimMes)
  const totalGastosMotosMes = gastosMotosMes?.reduce((s, g) => s + Number(g.valor), 0) ?? 0

  // Despesas da loja no mês
  const { data: despesasMes } = await supabase.from('store_expenses').select('valor').gte('data', inicioMes).lte('data', fimMes)
  const totalDespesasMes = despesasMes?.reduce((s, d) => s + Number(d.valor), 0) ?? 0

  const lucroLiquido = lucroBruto - totalDespesasMes

  // Caixa do mês
  const { data: entradasMesData } = await supabase.from('cash_transactions').select('valor').eq('tipo', 'entrada').gte('data', inicioMes).lte('data', fimMes)
  const { data: saidasMesData } = await supabase.from('cash_transactions').select('valor').eq('tipo', 'saida').gte('data', inicioMes).lte('data', fimMes)
  const entradasCaixa = entradasMesData?.reduce((s, t) => s + Number(t.valor), 0) ?? 0
  const saidasCaixa = saidasMesData?.reduce((s, t) => s + Number(t.valor), 0) ?? 0
  const saldoPeriodo = entradasCaixa - saidasCaixa

  // Estoque final (situação atual)
  const { count: estoqueFinal } = await supabase.from('motorcycles').select('*', { count: 'exact', head: true }).in('status', ['disponivel', 'reservada'])

  const { data: motosEstoque } = await supabase.from('motorcycles').select('id, valor_compra').in('status', ['disponivel', 'reservada'])
  let valorEstoque = 0
  if (motosEstoque && motosEstoque.length > 0) {
    const idsEstoque = motosEstoque.map((m) => m.id)
    const { data: gastosEstoque } = await supabase.from('motorcycle_expenses').select('motorcycle_id, valor').in('motorcycle_id', idsEstoque)
    const gastosPorMotoEstoque: Record<string, number> = {}
    gastosEstoque?.forEach((g) => {
      gastosPorMotoEstoque[g.motorcycle_id] = (gastosPorMotoEstoque[g.motorcycle_id] || 0) + Number(g.valor)
    })
    valorEstoque = motosEstoque.reduce((s, m) => s + Number(m.valor_compra) + (gastosPorMotoEstoque[m.id] || 0), 0)
  }

  const anos = Array.from({ length: 5 }, (_, i) => hoje.getFullYear() - i)

  const linha = (label: string, valor: string, destaque = false) => (
    <div className={`flex items-center justify-between py-3 px-5 ${destaque ? 'bg-grafite-claro' : ''}`}>
      <span className="text-texto-suave text-sm">{label}</span>
      <span className={`font-semibold ${destaque ? 'text-dourado text-lg' : 'text-texto'}`}>{valor}</span>
    </div>
  )

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-dourado mb-6">Relatório Mensal</h1>

      <form method="GET" className="flex gap-3 mb-6">
        <select name="mes" defaultValue={mesSelecionado} className="rounded-lg bg-grafite-claro border border-grafite-claro text-texto px-4 py-2 outline-none focus:border-dourado">
          {nomesMeses.map((nome, i) => (
            <option key={i} value={i + 1}>{nome}</option>
          ))}
        </select>
        <select name="ano" defaultValue={anoSelecionado} className="rounded-lg bg-grafite-claro border border-grafite-claro text-texto px-4 py-2 outline-none focus:border-dourado">
          {anos.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <button type="submit" className="bg-dourado hover:bg-dourado-claro text-preto font-semibold rounded-lg px-6 py-2 transition">
          Gerar
        </button>
      </form>

      <div className="bg-grafite border border-grafite-claro rounded-xl overflow-hidden mb-4 divide-y divide-grafite-claro">
        <div className="px-5 py-3 bg-grafite-claro">
          <h2 className="text-dourado font-semibold">Motos</h2>
        </div>
        {linha('Motos compradas', String(qtdMotosCompradas))}
        {linha('Valor das compras', formatarMoeda(valorMotosCompradas))}
        {linha('Motos vendidas', String(qtdMotosVendidas))}
        {linha('Estoque final (atual)', String(estoqueFinal ?? 0))}
        {linha('Valor do estoque (atual)', formatarMoeda(valorEstoque))}
      </div>

      <div className="bg-grafite border border-grafite-claro rounded-xl overflow-hidden mb-4 divide-y divide-grafite-claro">
        <div className="px-5 py-3 bg-grafite-claro">
          <h2 className="text-dourado font-semibold">Financeiro</h2>
        </div>
        {linha('Faturamento', formatarMoeda(faturamento))}
        {linha('Custo das motos vendidas', formatarMoeda(custoMotosVendidas))}
        {linha('Gastos das motos (mês)', formatarMoeda(totalGastosMotosMes))}
        {linha('Lucro bruto', formatarMoeda(lucroBruto), true)}
        {linha('Despesas da loja', formatarMoeda(totalDespesasMes))}
        {linha('Lucro líquido', formatarMoeda(lucroLiquido), true)}
      </div>

      <div className="bg-grafite border border-grafite-claro rounded-xl overflow-hidden divide-y divide-grafite-claro">
        <div className="px-5 py-3 bg-grafite-claro">
          <h2 className="text-dourado font-semibold">Caixa do Período</h2>
        </div>
        {linha('Entradas de caixa', formatarMoeda(entradasCaixa))}
        {linha('Saídas de caixa', formatarMoeda(saidasCaixa))}
        {linha('Saldo do período', formatarMoeda(saldoPeriodo), true)}
      </div>
    </div>
  )
}