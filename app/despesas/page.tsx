import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatarMoeda } from '@/lib/formatadores/moeda'
import { formatarData } from '@/lib/formatadores/data'
import { Plus } from 'lucide-react'

export default async function DespesasPage() {
  const supabase = await createClient()
  const { data: despesas } = await supabase
    .from('store_expenses')
    .select('*')
    .order('data', { ascending: false })

  const total = despesas?.reduce((soma, d) => soma + Number(d.valor), 0) ?? 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-dourado">Despesas da Loja</h1>
        <Link href="/despesas/nova" className="flex items-center gap-2 bg-dourado hover:bg-dourado-claro text-preto font-semibold rounded-lg px-4 py-2 transition">
          <Plus size={18} /> Nova Despesa
        </Link>
      </div>

      <div className="bg-grafite border border-grafite-claro rounded-xl p-5 mb-6">
        <p className="text-xs text-texto-suave">Total de despesas registradas</p>
        <p className="text-2xl font-bold text-dourado">{formatarMoeda(total)}</p>
      </div>

      {(!despesas || despesas.length === 0) && (
        <div className="bg-grafite border border-grafite-claro rounded-xl p-8 text-center text-texto-suave">
          Nenhuma despesa cadastrada ainda.
        </div>
      )}

      <div className="space-y-2">
        {despesas?.map((d) => (
          <div key={d.id} className="bg-grafite border border-grafite-claro rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-texto font-medium">{d.categoria}</p>
              <p className="text-texto-suave text-sm">{d.descricao || '—'} · {formatarData(d.data)}</p>
            </div>
            <div className="text-right">
              <p className="text-dourado font-semibold">{formatarMoeda(d.valor)}</p>
              <p className={`text-xs ${d.pago ? 'text-green-400' : 'text-yellow-400'}`}>
                {d.pago ? 'Pago' : 'Em aberto'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}