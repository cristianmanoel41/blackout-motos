import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowDownCircle,
  ArrowRight,
  ArrowUpCircle,
  Bike,
  CalendarDays,
  ChevronDown,
  DollarSign,
  PlusCircle,
  Receipt,
  ShoppingCart,
  Timer,
  TrendingUp,
  Wallet,
  Warehouse,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { nomeCurtoVendedor } from '@/lib/dados/vendedores'
import { formatarMoeda } from '@/lib/formatadores/moeda'
import GraficoValores from '@/components/GraficoValores'
import styles from './dashboard.module.css'

type MotoParada = MotoResumo & {
  codigo?: string | null
  data_entrada?: string | null
}

type MotoResumo = {
  id: string
  marca?: string | null
  modelo?: string | null
  versao?: string | null
  ano_modelo?: string | number | null
  quilometragem?: string | number | null
  preco_anunciado?: string | number | null
}

type VendaRecente = {
  id: string
  motorcycle_id?: string | null
  valor_total_venda?: string | number | null
  data_venda?: string | null
  vendedor?: string | null
}

function nomeMoto(moto?: MotoResumo) {
  if (!moto) return 'Moto não localizada'
  return [moto.marca, moto.modelo, moto.versao].filter(Boolean).join(' ') || 'Moto sem nome'
}

function dataBR(data?: string | null) {
  if (!data) return '—'
  const partes = data.slice(0, 10).split('-')
  if (partes.length !== 3) return data
  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

function kmBR(valor?: string | number | null) {
  const numero = Number(valor || 0)
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(numero)
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10)
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10)

  const { count: motosDisponiveis } = await supabase
    .from('motorcycles')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'disponivel')

  const { count: motosCompradasMes } = await supabase
    .from('motorcycles')
    .select('*', { count: 'exact', head: true })
    .eq('tipo_entrada', 'compra_nova')
    .gte('data_entrada', inicioMes)
    .lte('data_entrada', fimMes)

  const { data: vendasMes } = await supabase
    .from('sales')
    .select('id, motorcycle_id, valor_total_venda, transferencia_cliente, documentacao_concluida')
    .eq('status', 'ativa')
    .gte('data_venda', inicioMes)
    .lte('data_venda', fimMes)

  const idsDeOutraLoja = new Set<string>()

  {
    const ids = vendasMes?.map((v) => v.motorcycle_id).filter(Boolean) ?? []

    if (ids.length > 0) {
      const { data: motosParceiras } = await supabase
        .from('motorcycles')
        .select('id')
        .eq('tipo_entrada', 'outra_loja')
        .in('id', ids)

      motosParceiras?.forEach((moto) =>
        idsDeOutraLoja.add(String(moto.id))
      )
    }
  }

  const vendasProprias =
    vendasMes?.filter(
      (v) => !idsDeOutraLoja.has(String(v.motorcycle_id))
    ) ?? []

  const motosVendidasMes = vendasProprias.length
  const faturamentoMes = vendasProprias.reduce((s, v) => s + Number(v.valor_total_venda || 0), 0)

  const idsMotosVendidas = vendasProprias.map((v) => v.motorcycle_id).filter(Boolean)
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
      gastosPorMoto[String(g.motorcycle_id)] =
        (gastosPorMoto[String(g.motorcycle_id)] || 0) + Number(g.valor || 0)
    })

    custoMotosVendidas =
      motosVendidas?.reduce(
        (s, m) => s + Number(m.valor_compra || 0) + (gastosPorMoto[String(m.id)] || 0),
        0
      ) ?? 0
  }

  /*
   * DOCUMENTAÇÃO
   *
   * O valor que o cliente entrega para a loja cuidar do
   * documento entra no caixa, mas nao e faturamento: ele
   * existe para pagar vistoria, taxas e despachante.
   *
   * O que entra no lucro e a SOBRA, e so depois de a
   * documentacao ser dada por concluida - ate la ainda pode
   * aparecer custo. Se os custos passarem do recebido, a
   * diferenca desconta do lucro.
   */
  const idsVendasMes = vendasMes?.map((v) => v.id) ?? []

  const custosPorVenda: Record<string, number> = {}

  if (idsVendasMes.length > 0) {
    const { data: custosDoc } = await supabase
      .from('sale_documentation_costs')
      .select('sale_id, valor')
      .in('sale_id', idsVendasMes)

    custosDoc?.forEach((custo) => {
      custosPorVenda[String(custo.sale_id)] =
        (custosPorVenda[String(custo.sale_id)] || 0) +
        Number(custo.valor || 0)
    })
  }

  const resultadoDocumentacao =
    vendasMes?.reduce((soma, venda) => {
      if (!venda.documentacao_concluida) return soma

      const recebido = Number(venda.transferencia_cliente || 0)
      const custos = custosPorVenda[String(venda.id)] || 0

      return soma + (recebido - custos)
    }, 0) ?? 0

  const lucroBrutoMes = faturamentoMes + resultadoDocumentacao - custoMotosVendidas

  const { data: despesasMes } = await supabase
    .from('store_expenses')
    .select('valor')
    .gte('data', inicioMes)
    .lte('data', fimMes)

  const totalDespesasMes = despesasMes?.reduce((s, d) => s + Number(d.valor || 0), 0) ?? 0
  const lucroLiquidoMes = lucroBrutoMes - totalDespesasMes

  const { data: motosEstoque } = await supabase
    .from('motorcycles')
    .select('valor_compra')
    .in('status', ['disponivel', 'reservada'])

  const valorInvestidoEstoque = motosEstoque?.reduce((s, m) => s + Number(m.valor_compra || 0), 0) ?? 0

  const { data: entradasMesData } = await supabase
    .from('cash_transactions')
    .select('valor')
    .eq('tipo', 'entrada')
    .eq('confirmado', true)
    .gte('data', inicioMes)
    .lte('data', fimMes)

  const { data: saidasMesData } = await supabase
    .from('cash_transactions')
    .select('valor')
    .eq('tipo', 'saida')
    .eq('confirmado', true)
    .gte('data', inicioMes)
    .lte('data', fimMes)

  const entradasMes = entradasMesData?.reduce((s, t) => s + Number(t.valor || 0), 0) ?? 0
  const saidasMes = saidasMesData?.reduce((s, t) => s + Number(t.valor || 0), 0) ?? 0

  const { data: todasTransacoes } = await supabase
    .from('cash_transactions')
    .select('tipo, valor')
    .eq('confirmado', true)
  const totalEntradasGeral =
    todasTransacoes?.filter((t) => t.tipo === 'entrada').reduce((s, t) => s + Number(t.valor || 0), 0) ?? 0
  const totalSaidasGeral =
    todasTransacoes?.filter((t) => t.tipo === 'saida').reduce((s, t) => s + Number(t.valor || 0), 0) ?? 0
  const saldoCaixa = totalEntradasGeral - totalSaidasGeral

  const chaveMes = (ano: number, mes: number) => `${ano}-${String(mes + 1).padStart(2, '0')}`

  const mesesGrafico = Array.from({ length: 6 }, (_, i) => {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - 5 + i, 1)
    return {
      chave: chaveMes(data.getFullYear(), data.getMonth()),
      rotulo: `${data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}/${String(
        data.getFullYear()
      ).slice(2)}`,
    }
  })

  const inicioJanela = `${mesesGrafico[0].chave}-01`

  const { data: vendasJanela } = await supabase
    .from('sales')
    .select('id, motorcycle_id, valor_total_venda, transferencia_cliente, documentacao_concluida, data_venda')
    .eq('status', 'ativa')
    .gte('data_venda', inicioJanela)
    .lte('data_venda', fimMes)

  const { data: despesasJanela } = await supabase
    .from('store_expenses')
    .select('valor, data')
    .gte('data', inicioJanela)
    .lte('data', fimMes)

  const idsVendidasJanela = vendasJanela?.map((v) => v.motorcycle_id).filter(Boolean) ?? []
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
      custoPorMoto[String(m.id)] = Number(m.valor_compra || 0)
    })

    gastosJanela?.forEach((g) => {
      custoPorMoto[String(g.motorcycle_id)] =
        (custoPorMoto[String(g.motorcycle_id)] || 0) + Number(g.valor || 0)
    })
  }

  const custosDocJanela: Record<string, number> = {}

  const idsJanela =
    vendasJanela?.map((venda) => venda.id).filter(Boolean) ?? []

  if (idsJanela.length > 0) {
    const { data: custosJanela } = await supabase
      .from('sale_documentation_costs')
      .select('sale_id, valor')
      .in('sale_id', idsJanela)

    custosJanela?.forEach((custo) => {
      custosDocJanela[String(custo.sale_id)] =
        (custosDocJanela[String(custo.sale_id)] || 0) +
        Number(custo.valor || 0)
    })
  }

  const dadosGrafico = mesesGrafico.map(({ chave, rotulo }) => {
    const vendasDoMes = vendasJanela?.filter((v) => String(v.data_venda).slice(0, 7) === chave) ?? []
    const faturamento = vendasDoMes.reduce((s, v) => s + Number(v.valor_total_venda || 0), 0)
    const documentacao = vendasDoMes.reduce(
      (s, v) =>
        s +
        (v.documentacao_concluida
          ? Number(v.transferencia_cliente || 0) -
            (custosDocJanela[String(v.id)] || 0)
          : 0),
      0
    )
    const custo = vendasDoMes.reduce((s, v) => s + (custoPorMoto[String(v.motorcycle_id)] || 0), 0)
    const despesas =
      despesasJanela
        ?.filter((d) => String(d.data).slice(0, 7) === chave)
        .reduce((s, d) => s + Number(d.valor || 0), 0) ?? 0

    return { mes: rotulo, faturamento, despesas, lucro: faturamento + documentacao - custo - despesas }
  })

  const { data: vendasRecentesData } = await supabase
    .from('sales')
    .select('id, motorcycle_id, valor_total_venda, data_venda, vendedor')
    .eq('status', 'ativa')
    .order('data_venda', { ascending: false })
    .limit(5)

  const vendasRecentes = (vendasRecentesData || []) as VendaRecente[]
  const idsRecentes = Array.from(new Set(vendasRecentes.map((v) => v.motorcycle_id).filter(Boolean))) as string[]

  let motosRecentes: MotoResumo[] = []
  if (idsRecentes.length) {
    const { data } = await supabase
      .from('motorcycles')
      .select('id, marca, modelo, versao, ano_modelo, quilometragem, preco_anunciado')
      .in('id', idsRecentes)
    motosRecentes = (data || []) as MotoResumo[]
  }

  const mapaMotos = new Map(motosRecentes.map((m) => [String(m.id), m]))

  const contagemPorModelo = new Map<string, number>()
  vendasRecentes.forEach((v) => {
    const moto = mapaMotos.get(String(v.motorcycle_id))
    const chave = moto ? [moto.marca, moto.modelo].filter(Boolean).join(' ') : 'Outras motos'
    contagemPorModelo.set(chave, (contagemPorModelo.get(chave) || 0) + 1)
  })

  const ranking = Array.from(contagemPorModelo.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const maiorRanking = Math.max(...ranking.map(([, quantidade]) => quantidade), 1)

  const { data: motoDestaqueData } = await supabase
    .from('motorcycles')
    .select('id, marca, modelo, versao, ano_modelo, quilometragem, preco_anunciado')
    .eq('status', 'disponivel')
    .or('tipo_entrada.is.null,tipo_entrada.neq.outra_loja')
    .not('quilometragem', 'is', null)
    .order('quilometragem', { ascending: true })
    .limit(1)

  const motoDestaque = (motoDestaqueData?.[0] || null) as MotoResumo | null

  /*
   * A moto encalhada: a que entrou há mais tempo e continua
   * disponível. É a que mais custa dinheiro parada, então é a
   * que merece o foco da venda.
   */
  const { data: motoParadaData } = await supabase
    .from('motorcycles')
    .select('id, codigo, marca, modelo, versao, ano_modelo, quilometragem, preco_anunciado, data_entrada')
    .eq('status', 'disponivel')
    .or('tipo_entrada.is.null,tipo_entrada.neq.outra_loja')
    .not('data_entrada', 'is', null)
    .order('data_entrada', { ascending: true })
    .limit(1)

  const motoParada = (motoParadaData?.[0] || null) as MotoParada | null

  const diasParada = motoParada?.data_entrada
    ? Math.max(
        0,
        Math.floor(
          (new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime() -
            new Date(`${String(motoParada.data_entrada).slice(0, 10)}T00:00:00`).getTime()) /
            86400000
        )
      )
    : 0

  const nomeMes = hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const periodoLabel = `${inicioMes.split('-').reverse().join('/')} - ${fimMes.split('-').reverse().join('/')}`

  const Card = ({
    titulo,
    valor,
    icone: Icone,
    destaque,
  }: {
    titulo: string
    valor: string
    icone: LucideIcon
    destaque?: 'green' | 'red' | 'gold'
  }) => {
    const cor = destaque === 'red' ? styles.metricValueNegative : styles.metricValue

    return (
      <div className={styles.metricCard}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.08em] text-black/45">{titulo}</p>
            <p className={`mt-3 text-2xl font-black tracking-tight ${cor}`}>{valor}</p>
          </div>
          <div className={styles.icon3d}>
            <Icone size={23} strokeWidth={2.2} />
          </div>
        </div>
        <div className="mt-5 flex items-center gap-2 text-xs font-bold text-black/45">
          <span className="h-1.5 w-1.5 rounded-full bg-[#c99712]" />
          Atualizado em tempo real
        </div>
      </div>
    )
  }

  return (
    <div className={`${styles.dashboard} mx-auto w-full max-w-[1720px] space-y-4 pb-6`}>
      <section className={`${styles.hero} px-6 py-4 md:px-8`}>
        <div className="relative z-10 flex h-full flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#a97800]">Blackout Motos · Painel de gestão</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-black md:text-3xl">Olá, Cristian 👋</h1>
            <p className="mt-1 text-sm font-semibold text-black/50">Aqui está o resumo geral da sua loja.</p>
          </div>

          <div className={`${styles.dataPill} flex w-fit items-center gap-3 rounded-2xl px-4 py-2`}>
            <CalendarDays size={18} className="text-[#a97800]" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-black/40">Período atual</p>
              <p className="text-sm font-black text-black">{periodoLabel}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card titulo="Motos disponíveis" valor={String(motosDisponiveis ?? 0)} icone={Bike} />
        {/* Clicar abre a lista na ordem em que as vendas foram cadastradas. */}
        <Link href="/vendas/historico?ordem=registro" className="block">
          <Card titulo="Vendas no mês" valor={String(motosVendidasMes)} icone={ShoppingCart} />
        </Link>
        <Card titulo="Faturamento" valor={formatarMoeda(faturamentoMes)} icone={DollarSign} />
        <Card
          titulo="Lucro líquido"
          valor={formatarMoeda(lucroLiquidoMes)}
          icone={TrendingUp}
          destaque={lucroLiquidoMes >= 0 ? 'green' : 'red'}
        />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.65fr_1fr]">
        <div className={styles.panel}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-black">Faturamento mensal</h2>
              <p className="text-xs font-bold text-black/45">Faturamento, despesas e lucro dos últimos 6 meses</p>
            </div>
            <span className={`${styles.dataPill} rounded-xl px-3 py-2 text-xs font-black text-black/65`}>Últimos 6 meses</span>
          </div>
          <GraficoValores dados={dadosGrafico} />
        </div>

        <div className={`${styles.panel} flex flex-col`}>
          <div className="mb-5">
            <h2 className="text-lg font-black text-black">Resumo financeiro</h2>
            <p className="text-xs font-bold capitalize text-black/45">{nomeMes}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <div className={styles.miniCard}>
              <div className="flex items-center gap-3">
                <div className={styles.icon3d}><DollarSign size={20} /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-black/40">Receita bruta</p>
                  <p className="mt-1 text-lg font-black text-black">{formatarMoeda(faturamentoMes)}</p>
                </div>
              </div>
            </div>

            <div className={styles.miniCard}>
              <div className="flex items-center gap-3">
                <div className={styles.icon3d}><Receipt size={20} /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-black/40">Despesas totais</p>
                  <p className="mt-1 text-lg font-black text-red-500">{formatarMoeda(totalDespesasMes)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className={`${styles.miniCard} ${styles.goldPanel} mt-3 flex-1`}>
            <div className="flex h-full items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-black/45">Lucro líquido</p>
                <p className="mt-2 text-3xl font-black tracking-tight text-black">{formatarMoeda(lucroLiquidoMes)}</p>
                <div className="mt-3 flex items-center gap-2 text-xs font-black text-emerald-700">
                  <TrendingUp size={15} /> Resultado do mês
                </div>
              </div>
              <div className={`${styles.icon3d} !h-16 !w-16 !rounded-[20px]`}>
                <Wallet size={30} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <div className={styles.miniCard}>
          <PlusCircle size={20} className="text-[#a97800]" />
          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-black/40">Motos compradas</p>
          <p className="mt-1 text-xl font-black text-black">{motosCompradasMes ?? 0}</p>
        </div>
        <div className={styles.miniCard}>
          <Warehouse size={20} className="text-[#a97800]" />
          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-black/40">Valor em estoque</p>
          <p className="mt-1 text-xl font-black text-black">{formatarMoeda(valorInvestidoEstoque)}</p>
        </div>
        <div className={styles.miniCard}>
          <TrendingUp size={20} className="text-emerald-600" />
          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-black/40">Lucro bruto</p>
          <p className="mt-1 text-xl font-black text-black">{formatarMoeda(lucroBrutoMes)}</p>
        </div>
        <div className={styles.miniCard}>
          <ArrowUpCircle size={20} className="text-emerald-600" />
          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-black/40">Entradas no caixa</p>
          <p className="mt-1 text-xl font-black text-black">{formatarMoeda(entradasMes)}</p>
        </div>
        <div className={styles.miniCard}>
          <ArrowDownCircle size={20} className="text-red-500" />
          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-black/40">Saídas do caixa</p>
          <p className="mt-1 text-xl font-black text-black">{formatarMoeda(saidasMes)}</p>
        </div>
        <div className={`${styles.miniCard} ${styles.goldPanel}`}>
          <Wallet size={20} className="text-[#a97800]" />
          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-black/40">Saldo do caixa</p>
          <p className={`mt-1 text-xl font-black ${saldoCaixa >= 0 ? 'text-[#a97800]' : 'text-red-500'}`}>
            {formatarMoeda(saldoCaixa)}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5">
        <details className={styles.panel}>
          <summary className={styles.resumoPainel}>
            <div>
              <h2 className="text-lg font-black text-black">Últimas vendas</h2>
              <p className="text-xs font-bold text-black/45">Movimentações mais recentes da loja</p>
            </div>

            <ChevronDown size={18} className={styles.setaPainel} />
          </summary>

          <div className={styles.tableWrap}>
            <table className={`${styles.table} w-full min-w-[680px] text-left text-sm`}>
              <thead>
                <tr className="border-b border-black/10 text-[10px] font-black uppercase tracking-wider text-black/40">
                  <th className="px-3 py-3">Data</th>
                  <th className="px-3 py-3">Moto</th>
                  <th className="px-3 py-3">Vendedor</th>
                  <th className="px-3 py-3 text-right">Valor</th>
                  <th className="px-3 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {vendasRecentes.length ? (
                  vendasRecentes.map((venda) => {
                    const moto = mapaMotos.get(String(venda.motorcycle_id))
                    return (
                      <tr key={venda.id} className="border-b border-black/5 last:border-0">
                        <td className="px-3 py-4 text-xs font-bold text-black/55">{dataBR(venda.data_venda)}</td>
                        <td className="px-3 py-4 font-black text-black">{nomeMoto(moto)}</td>
                        <td className="px-3 py-4 text-xs font-bold text-black/55">{nomeCurtoVendedor(venda.vendedor) || 'Não informado'}</td>
                        <td className="px-3 py-4 text-right font-black text-black">{formatarMoeda(venda.valor_total_venda)}</td>
                        <td className="px-3 py-4 text-right">
                          <span className={`${styles.statusSuccess} rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black`}>Concluída</span>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-3 py-10 text-center text-sm font-bold text-black/40">Nenhuma venda encontrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            <Link href="/vendas/historico" className={`${styles.darkButton} flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black`}>
              Ver todas <ArrowRight size={15} />
            </Link>
          </div>
        </details>

        <details className={styles.panel}>
          <summary className={styles.resumoPainel}>
            <div>
              <h2 className="text-lg font-black text-black">Top motos nas vendas recentes</h2>
              <p className="text-xs font-bold text-black/45">Ranking baseado nas 5 vendas mais recentes</p>
            </div>

            <ChevronDown size={18} className={styles.setaPainel} />
          </summary>

          <div className="space-y-4">
            {ranking.length ? (
              ranking.map(([modelo, quantidade], index) => (
                <div key={modelo} className="grid grid-cols-[28px_1fr_auto] items-center gap-3">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-black text-[11px] font-black text-white">{index + 1}</div>
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-black">{modelo}</p>
                      <p className="text-xs font-black text-black/50">{quantidade} venda{quantidade === 1 ? '' : 's'}</p>
                    </div>
                    <div className={styles.rankBar}>
                      <div className={styles.rankFill} style={{ width: `${(quantidade / maiorRanking) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-black text-[#a97800]">{quantidade}</span>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm font-bold text-black/40">Ainda não há vendas para montar o ranking.</p>
            )}
          </div>
        </details>
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className={`${styles.panel} flex flex-col`}>
          <div className="mb-4">
            <h2 className="text-lg font-black text-black">Motos em destaque</h2>
            <p className="text-xs font-bold text-black/45">Moto disponível com a menor quilometragem</p>
          </div>

          {motoDestaque ? (
            <div className={`${styles.goldPanel} flex-1 rounded-[22px] border p-4`}>
              <div className="flex h-full flex-col justify-between gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="rounded-full border border-[#c99712]/25 bg-white/70 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#8a6400]">Disponível</span>
                    <h3 className="mt-3 text-xl font-black text-black">{nomeMoto(motoDestaque)}</h3>
                    <p className="mt-1 text-sm font-bold text-black/50">
                      {motoDestaque.ano_modelo || 'Ano não informado'} · {kmBR(motoDestaque.quilometragem)} km
                    </p>
                  </div>
                  <div className={`${styles.icon3d} !h-16 !w-16 !rounded-[20px]`}><Bike size={30} /></div>
                </div>

                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-black/40">Preço anunciado</p>
                    <p className="mt-1 text-2xl font-black text-[#a97800]">{formatarMoeda(motoDestaque.preco_anunciado)}</p>
                  </div>
                  <Link href={`/motos/${motoDestaque.id}`} className={`${styles.goldButton} flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black`}>
                    Ver detalhes <ArrowRight size={17} />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid flex-1 place-items-center rounded-[22px] border border-dashed border-black/15 bg-black/[.015] p-6 text-center">
              <div>
                <Bike className="mx-auto text-black/25" size={38} />
                <p className="mt-3 text-sm font-black text-black/45">Nenhuma moto disponível.</p>
              </div>
            </div>
          )}
        </div>

        <div className={`${styles.panel} ${styles.goldPanel}`}>
          <div className="flex h-full flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className={`text-xs font-black uppercase tracking-[0.18em] ${styles.paradaEtiqueta}`}>Parada há mais tempo</p>

              {motoParada ? (
                <>
                  <h2 className="mt-2 text-xl font-black text-black">{nomeMoto(motoParada)}</h2>

                  <p className="mt-1 text-sm font-bold text-black/50">
                    {motoParada.codigo ? `${motoParada.codigo} · ` : ''}
                    {motoParada.ano_modelo || 'Ano não informado'} · {kmBR(motoParada.quilometragem)} km · entrou em {dataBR(motoParada.data_entrada)}
                  </p>

                  <p className={`mt-2 text-2xl font-black tracking-tight ${styles.paradaDias}`}>
                    {diasParada} {diasParada === 1 ? 'dia' : 'dias'} no estoque
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Link href={`/motos/${motoParada.id}`} className={`${styles.darkButton} flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black`}>
                      Ver moto <ArrowRight size={16} />
                    </Link>

                    <span className={`${styles.paradaPreco} text-lg font-black`}>
                      {motoParada.preco_anunciado ? formatarMoeda(motoParada.preco_anunciado) : 'Preço não informado'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="mt-2 text-2xl font-black text-black">Nenhuma moto parada</h2>
                  <p className="mt-2 max-w-xl text-sm font-bold text-black/50">
                    Não há moto disponível com data de entrada registrada.
                  </p>
                </>
              )}
            </div>

            <div className={`${styles.icon3d} !h-16 !w-16 shrink-0 !rounded-[20px]`}>
              <Timer size={30} />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
