import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatarMoeda } from '@/lib/formatadores/moeda'
import { formatarData } from '@/lib/formatadores/data'
import { Plus } from 'lucide-react'

const statusStyle: Record<string, string> = {
  disponivel: 'bg-green-900 text-green-300 border-green-700',
  reservada: 'bg-yellow-900 text-yellow-300 border-yellow-700',
  vendida: 'bg-blue-900 text-blue-300 border-blue-700',
  manutencao: 'bg-orange-900 text-orange-300 border-orange-700',
  arquivada: 'bg-gray-800 text-gray-400 border-gray-700',
}

const statusLabel: Record<string, string> = {
  disponivel: 'Disponível',
  reservada: 'Reservada',
  vendida: 'Vendida',
  manutencao: 'Manutenção',
  arquivada: 'Arquivada',
}

export default async function EstoquePage() {
  const supabase = await createClient()

  const { data: motos } = await supabase
    .from('motorcycles')
    .select('*')
    .order('criado_em', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-dourado">Estoque</h1>
        <Link
          href="/motos/nova"
          className="flex items-center gap-2 bg-dourado hover:bg-dourado-claro text-preto font-semibold rounded-lg px-4 py-2 transition"
        >
          <Plus size={18} />
          Cadastrar Moto
        </Link>
      </div>

      {(!motos || motos.length === 0) && (
        <div className="bg-grafite border border-grafite-claro rounded-xl p-8 text-center text-texto-suave">
          Nenhuma moto cadastrada ainda. Clique em "Cadastrar Moto" para começar.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {motos?.map((moto) => (
          <Link
            key={moto.id}
            href={`/motos/${moto.id}`}
            className="bg-grafite border border-grafite-claro rounded-xl p-5 hover:border-dourado transition block"
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs text-texto-suave font-mono">{moto.codigo}</span>
              <span
                className={`text-xs px-2 py-1 rounded-full border ${statusStyle[moto.status]}`}
              >
                {statusLabel[moto.status]}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-texto">
              {moto.marca} {moto.modelo}
            </h3>
            <p className="text-texto-suave text-sm mb-3">
              {moto.versao ? `${moto.versao} · ` : ''}
              {moto.ano_modelo ?? ''} {moto.cor ? `· ${moto.cor}` : ''}
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-texto-suave">
                Entrada: {formatarData(moto.data_entrada)}
              </span>
              <span className="text-dourado font-semibold">
                {formatarMoeda(moto.preco_anunciado ?? moto.valor_compra)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}