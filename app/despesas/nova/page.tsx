'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const categorias = ['Aluguel', 'Água', 'Energia', 'Internet', 'Funcionários', 'Comissão', 'Contador', 'Impostos', 'Anúncios', 'Combustível', 'Materiais', 'Manutenção', 'Alimentação', 'Outros']

export default function NovaDespesaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const [form, setForm] = useState({
    data: new Date().toISOString().slice(0, 10),
    categoria: 'Aluguel',
    descricao: '',
    valor: '',
    forma_pagamento: 'Dinheiro',
    pago: true,
    data_pagamento: new Date().toISOString().slice(0, 10),
    observacoes: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!form.valor || Number(form.valor) <= 0) {
      setErro('Informe um valor válido.')
      return
    }
    setSalvando(true)

    const { data: despesa, error } = await supabase.from('store_expenses').insert({
      data: form.data,
      categoria: form.categoria,
      descricao: form.descricao || null,
      valor: Number(form.valor),
      forma_pagamento: form.forma_pagamento,
      pago: form.pago,
      data_pagamento: form.pago ? form.data_pagamento : null,
      observacoes: form.observacoes || null,
    }).select().single()

    if (error || !despesa) {
      setErro('Erro ao registrar despesa.')
      setSalvando(false)
      return
    }

    if (form.pago) {
      await supabase.from('cash_transactions').insert({
        data: form.data_pagamento,
        tipo: 'saida',
        origem: 'despesa_loja',
        origem_id: despesa.id,
        valor: Number(form.valor),
        descricao: `${form.categoria} - ${form.descricao || 'Despesa da loja'}`,
      })
    }

    setSalvando(false)
    router.push('/despesas')
    router.refresh()
  }

  const inputClass = 'w-full rounded-lg bg-grafite-claro border border-grafite-claro text-texto px-4 py-3 outline-none focus:border-dourado transition'
  const labelClass = 'block text-sm font-medium text-texto mb-1'

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-dourado mb-6">Nova Despesa</h1>
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
              <option>Dinheiro</option>
              <option>Pix</option>
              <option>Cartão</option>
              <option>Transferência</option>
              <option>Boleto</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" name="pago" checked={form.pago} onChange={handleChange} />
          <label className="text-sm text-texto">Já foi pago</label>
        </div>

        {form.pago && (
          <div>
            <label className={labelClass}>Data do pagamento</label>
            <input type="date" name="data_pagamento" value={form.data_pagamento} onChange={handleChange} className={inputClass} />
          </div>
        )}

        <div>
          <label className={labelClass}>Observações</label>
          <textarea name="observacoes" value={form.observacoes} onChange={handleChange} className={inputClass} rows={2} />
        </div>

        {erro && <div className="bg-red-950 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3">{erro}</div>}

        <button type="submit" disabled={salvando} className="bg-dourado hover:bg-dourado-claro text-preto font-semibold rounded-lg px-8 py-3 transition disabled:opacity-60">
          {salvando ? 'Salvando...' : 'Registrar Despesa'}
        </button>
      </form>
    </div>
  )
}