import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Plus } from 'lucide-react'

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: clientes } = await supabase.from('customers').select('*').order('nome')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-dourado">Clientes</h1>
        <Link href="/clientes/novo" className="flex items-center gap-2 bg-dourado hover:bg-dourado-claro text-preto font-semibold rounded-lg px-4 py-2 transition">
          <Plus size={18} /> Novo Cliente
        </Link>
      </div>

      {(!clientes || clientes.length === 0) && (
        <div className="bg-grafite border border-grafite-claro rounded-xl p-8 text-center text-texto-suave">
          Nenhum cliente cadastrado ainda.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clientes?.map((c) => (
          <div key={c.id} className="bg-grafite border border-grafite-claro rounded-xl p-5">
            <h3 className="text-lg font-semibold text-texto">{c.nome}</h3>
            <p className="text-texto-suave text-sm">{c.cpf}</p>
            <p className="text-texto-suave text-sm">{c.telefone}</p>
          </div>
        ))}
      </div>
    </div>
  )
}