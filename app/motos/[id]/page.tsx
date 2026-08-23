import { createClient } from '@/lib/supabase/server'
import { formatarMoeda } from '@/lib/formatadores/moeda'
import { formatarData } from '@/lib/formatadores/data'
import { notFound } from 'next/navigation'

const statusLabel: Record<string, string> = {
  disponivel: 'Disponível',
  reservada: 'Reservada',
  vendida: 'Vendida',
  manutencao: 'Manutenção',
  arquivada: 'Arquivada',
}

export default async function DetalheMotoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: moto } = await supabase.from('motorcycles').select('*').eq('id', id).single()

  if (!moto) {
    notFound()
  }

  const { data: gastos } = await supabase.from('motorcycle_expenses').select('valor').eq('motorcycle_id', id)
  const totalGastos = gastos?.reduce((soma, g) => soma + Number(g.valor), 0) ?? 0
  const custoTotal = Number(moto.valor_compra) + totalGastos

  const campo = (label: string, valor: React.ReactNode) => (
    <div>
      <p className="text-xs text-texto-suave">{label}</p>
      <p className="text-texto font-medium">{valor || '—'}</p>
    </div>
  )

  const linkGasto = '/motos/' + moto.id + '/gasto'
  const linkVender = '/motos/' + moto.id + '/vender'

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-xs text-texto-suave font-mono">{moto.codigo}</span>
          <h1 className="text-2xl font-bold text-dourado">{moto.marca} {moto.modelo}</h1>
        </div>
        <span className="text-sm px-3 py-1 rounded-full border border-dourado text-dourado">{statusLabel[moto.status]}</span>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <a href={linkGasto} className="bg-grafite-claro text-texto px-4 py-2 rounded-lg text-sm hover:bg-grafite transition">Registrar Gasto</a>
        {moto.status !== 'vendida' && (
          <a href={linkVender} className="bg-dourado text-preto font-semibold px-4 py-2 rounded-lg text-sm hover:bg-dourado-claro transition">Vender Moto</a>
        )}
      </div>

      <div className="bg-grafite border border-grafite-claro rounded-xl p-5 mb-4">
        <h2 className="text-dourado font-semibold mb-4">Dados da Moto</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {campo('Versão', moto.versao)}
          {campo('Cor', moto.cor)}
          {campo('Ano fabricação', moto.ano_fabricacao)}
          {campo('Ano modelo', moto.ano_modelo)}
          {campo('Quilometragem', moto.quilometragem ? moto.quilometragem + ' km' : null)}
          {campo('Data de entrada', formatarData(moto.data_entrada))}
          {campo('Placa', moto.placa)}
          {campo('Renavam', moto.renavam)}
          {campo('Chassi', moto.chassi)}
        </div>
      </div>

      <div className="bg-grafite border border-grafite-claro rounded-xl p-5 mb-4">
        <h2 className="text-dourado font-semibold mb-4">Financeiro</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {campo('Valor de compra', formatarMoeda(moto.valor_compra))}
          {campo('Gastos registrados', formatarMoeda(totalGastos))}
          {campo('Custo total', formatarMoeda(custoTotal))}
          {campo('Preço anunciado', formatarMoeda(moto.preco_anunciado))}
        </div>
      </div>

      <div className="bg-grafite border border-grafite-claro rounded-xl p-5 mb-4">
        <h2 className="text-dourado font-semibold mb-4">Fornecedor</h2>
        <div className="grid grid-cols-2 gap-4">
          {campo('Nome', moto.fornecedor_nome)}
          {campo('Telefone', moto.fornecedor_telefone)}
        </div>
      </div>

      {moto.observacoes && (
        <div className="bg-grafite border border-grafite-claro rounded-xl p-5">
          <h2 className="text-dourado font-semibold mb-2">Observações</h2>
          <p className="text-texto-suave text-sm">{moto.observacoes}</p>
        </div>
      )}
    </div>
  )
}