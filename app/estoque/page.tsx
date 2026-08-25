import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatarMoeda } from '@/lib/formatadores/moeda'
import { formatarData } from '@/lib/formatadores/data'
import { Plus, Eye, ShoppingCart } from 'lucide-react'

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
    .select(`
      *,
      motorcycle_expenses (
        valor
      )
    `)
    .order('criado_em', { ascending: false })

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-dourado">
          Estoque
        </h1>

        <Link
          href="/motos/nova"
          className="flex items-center justify-center gap-2 rounded-lg bg-dourado px-4 py-2 font-semibold text-preto transition hover:bg-dourado-claro"
        >
          <Plus size={18} />
          Cadastrar Moto
        </Link>
      </div>

      {(!motos || motos.length === 0) && (
        <div className="rounded-xl border border-grafite-claro bg-grafite p-8 text-center text-texto-suave">
          Nenhuma moto cadastrada ainda. Clique em
          "Cadastrar Moto" para começar.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {motos?.map((moto) => {
          const totalGastos =
            moto.motorcycle_expenses?.reduce(
              (soma: number, gasto: any) =>
                soma + Number(gasto.valor || 0),
              0
            ) ?? 0

          const custoTotal =
            Number(moto.valor_compra || 0) + totalGastos

          const podeVender =
            moto.status === 'disponivel' ||
            moto.status === 'reservada'

          return (
            <div
              key={moto.id}
              className="rounded-xl border border-grafite-claro bg-grafite p-5 transition hover:border-dourado"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <span className="font-mono text-xs text-texto-suave">
                  {moto.codigo}
                </span>

                <span
                  className={`rounded-full border px-2 py-1 text-xs ${
                    statusStyle[moto.status] ||
                    'border-gray-700 bg-gray-800 text-gray-400'
                  }`}
                >
                  {statusLabel[moto.status] || moto.status}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-texto">
                {moto.marca} {moto.modelo}
              </h3>

              <p className="mb-4 text-sm text-texto-suave">
                {moto.versao ? `${moto.versao} · ` : ''}
                {moto.ano_modelo ?? ''}
                {moto.cor ? ` · ${moto.cor}` : ''}
              </p>

              <div className="mb-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-texto-suave">
                    Valor de compra
                  </p>

                  <p className="text-sm font-semibold text-texto">
                    {formatarMoeda(moto.valor_compra || 0)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-texto-suave">
                    Gastos da moto
                  </p>

                  <p className="text-sm font-semibold text-red-400">
                    {formatarMoeda(totalGastos)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-texto-suave">
                    Custo total
                  </p>

                  <p className="text-sm font-bold text-dourado">
                    {formatarMoeda(custoTotal)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-texto-suave">
                    Preço anunciado
                  </p>

                  <p className="text-sm font-semibold text-green-400">
                    {formatarMoeda(
                      moto.preco_anunciado ?? moto.valor_compra
                    )}
                  </p>
                </div>
              </div>

              <div className="mb-4 border-t border-grafite-claro pt-3">
                <span className="text-xs text-texto-suave">
                  Entrada: {formatarData(moto.data_entrada)}
                </span>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  href={`/motos/${moto.id}`}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-grafite-claro px-3 py-2 text-sm font-semibold text-texto transition hover:border-dourado hover:text-dourado"
                >
                  <Eye size={16} />
                  Ver / Editar
                </Link>

                {podeVender && (
                  <Link
                    href={`/vendas?moto=${moto.id}`}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-dourado px-3 py-2 text-sm font-bold text-preto transition hover:bg-dourado-claro"
                  >
                    <ShoppingCart size={16} />
                    Vender Moto
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}