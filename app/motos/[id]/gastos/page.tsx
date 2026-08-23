'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const categorias = ['Mecânica', 'Revisão', 'Óleo', 'Pneus', 'Pintura', 'Lavagem', 'Documentação', 'Transferência', 'Despachante', 'Peças', 'Combustível', 'Transporte', 'Outros']

export default function RegistrarGastoPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const [form, setForm] = useState({
    data: new Date().toISOString().slice(0, 10),
    categoria: 'Mecânica',
    descricao: '',
    valor: '',
    forma_pagamento: 'Dinheiro',
    observacoes: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!form.valor || Number(form.valor) <= 0) {
      setErro('Informe um valor válido.')
      return
    }
    setSalvando(true)

    const { data: gasto, error } = await supabase.from('motorcycle_expenses').insert({
      motorcycle_id: params.id,
      data: form.data,
      categoria: form.categoria,
      descricao: form.descricao || null,
      valor: Number(form.valor),
      forma_pagamento: form.forma_pagamento,
      observacoes: form.observacoes || null,
    }).select().single()

    if (error || !gasto) {
      setErro('Erro ao registrar gasto.')
      setSalvando(false)
      return
    }

    await supabase.from('cash_transactions').insert({
      data: form.data,
      tipo: 'saida',
      origem: 'gasto_moto',
      origem_id: gasto.id,
      valor: Number(form.valor),
      descricao: `${form.categoria} - ${form.descricao || 'Gasto de moto'}`,
    })

    setSalvando(false)
    router.push(`/motos/${params.id}`)
    router.refresh()
  }

  const inputClass = 'w-full rounded-lg bg-grafite-claro border border-grafite-claro text-texto px-4 py-3 outline-none focus:border-dourado transition'
  const labelClass = 'block text-sm font-medium text-texto mb-1'

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-dourado mb-6">Registrar Gasto</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-grafite border border-grafite-claro rounded-xl p-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Data</label>
            <input type="date" name="data" value={form.data} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Categoria</label>
            <select name="categoria" value={form.categoria} onChange={handleChange} className={inputClass}>
              {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Descrição</label>
          <input name="descricao" value={form.descricao} onChange={handleChange} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Valor (R$) *</label>
            <input type="number" step="0.01" name="valor" value={form.valor} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Forma de pagamento</label>
            <select name="forma_pagamento" value={form.forma_pagamento} onChange={handleChange} className={inputClass}>
              <option>Dinheiro</option><option>Pix</option><option>Cartão</option><option>Transferência</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Observações</label>
          <textarea name="observacoes" value={form.observacoes} onChange={handleChange} className={inputClass} rows={2} />
        </div>

        {erro && <div className="bg-red-950 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3">{erro}</div>}

        <button type="submit" disabled={salvando} className="bg-dourado hover:bg-dourado-claro text-preto font-semibold rounded-lg px-8 py-3 transition disabled:opacity-60">
          {salvando ? 'Salvando...' : 'Registrar Gasto'}
        </button>
      </form>
    </div>
  )
}