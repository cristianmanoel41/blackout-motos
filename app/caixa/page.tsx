import { createClient } from '@/lib/supabase/server'
import { formatarMoeda } from '@/lib/formatadores/moeda'
import { formatarData } from '@/lib/formatadores/data'
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react'

const origemLabel: Record<string, string> = {
  venda: 'Venda',
  compra_moto: 'Compra de Moto',
  gasto_moto: 'Gasto de Moto',
  despesa_loja: 'Despesa da Loja',
  outro: 'Outro',
}

export default async function CaixaPage() {
  const supabase = await createClient()

  const { data: transacoes } = await supabase
    .from('cash_transactions')
    .select('*')
    .order('data', { ascending: false })

  const entradas = transacoes?.filter((t) => t.tipo === 'entrada').reduce((s, t) => s + Number(t.valor), 0) ?? 0
  const saidas = transacoes?.filter((t) => t.tipo === 'saida').reduce((s, t) => s + Number(t.valor), 0) ?? 0
  const saldo = entradas - saidas

  return (
    <div>
      <h1 className="text-2xl font-bold text-dourado mb-6">Caixa</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-grafite border border-grafite-claro rounded-xl p-5">
          <p className="text-xs text-texto-suave">Entradas</p>
          <p className="text-2xl font-bold text-green-400">{formatarMoeda(entradas)}</p>
        </div>
        <div className="bg-grafite border border-grafite-claro rounded-xl p-5">
          <p className="text-xs text-texto-suave">Saídas</p>
          <p className="text-2xl font-bold text-red-400">{formatarMoeda(saidas)}</p>
        </div>
        <div className="bg-grafite border border-grafite-claro rounded-xl p-5">
          <p className="text-xs text-texto-suave">Saldo</p>
          <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-dourado' : 'text-red-400'}`}>
            {formatarMoeda(saldo)}
          </p>
        </div>
      </div>

      <div className="bg-grafite border border-grafite-claro rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-grafite-claro">
          <h2 className="text-dourado font-semibold">Extrato</h2>
        </div>

        {(!transacoes || transacoes.length === 0) && (
          <div className="p-8 text-center text-texto-suave">Nenhuma movimentação registrada ainda.</div>
        )}

        <div className="divide-y divide-grafite-claro">
          {transacoes?.map((t) => (
            <div key={t.id} className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {t.tipo === 'entrada' ? (
                  <ArrowUpCircle className="text-green-400" size={20} />
                ) : (
                  <ArrowDownCircle className="text-red-400" size={20} />
                )}
                <div>
                  <p className="text-texto text-sm">{t.descricao || origemLabel[t.origem]}</p>
                  <p className="text-texto-suave text-xs">{origemLabel[t.origem]} · {formatarData(t.data)}</p>
                </div>
              </div>
              <p className={`font-semibold ${t.tipo === 'entrada' ? 'text-green-400' : 'text-red-400'}`}>
                {t.tipo === 'entrada' ? '+' : '-'} {formatarMoeda(t.valor)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}