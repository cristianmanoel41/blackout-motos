'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function VenderMotoPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])

  const [form, setForm] = useState({
    customer_id: '',
    data_venda: new Date().toISOString().slice(0, 10),
    valor_total_venda: '',
    valor_entrada: '0',
    valor_financiado: '0',
    valor_recebido_a_vista: '0',
    valor_documentacao: '0',
    documentacao_entra_no_lucro: false,
    forma_pagamento: 'À vista',
    financeira: '',
    numero_parcelas: '',
    observacoes: '',
  })

  useEffect(() => {
    supabase.from('customers').select('id, nome').order('nome').then(({ data }) => {
      setClientes(data || [])
    })
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (!form.customer_id) { setErro('Selecione um cliente.'); return }
    if (!form.valor_total_venda || Number(form.valor_total_venda) <= 0) {
      setErro('Informe o valor total da venda.'); return
    }

    setSalvando(true)

    const { data: userData } = await supabase.auth.getUser()

    const { data: venda, error } = await supabase.from('sales').insert({
      motorcycle_id: params.id,
      customer_id: form.customer_id,
      data_venda: form.data_venda,
      valor_total_venda: Number(form.valor_total_venda),
      valor_entrada: Number(form.valor_entrada) || 0,
      valor_financiado: Number(form.valor_financiado) || 0,
      valor_recebido_a_vista: Number(form.valor_recebido_a_vista) || 0,
      valor_documentacao: Number(form.valor_documentacao) || 0,
      documentacao_entra_no_lucro: form.documentacao_entra_no_lucro,
      forma_pagamento: form.forma_pagamento,
      financeira: form.financeira || null,
      numero_parcelas: form.numero_parcelas ? Number(form.numero_parcelas) : null,
      vendedor_id: userData.user?.id ?? null,
      observacoes: form.observacoes || null,
    }).select().single()

    if (error || !venda) {
      setErro('Erro ao registrar venda. Verifique se a moto já não foi vendida.')
      setSalvando(false)
      return
    }

    await supabase.from('motorcycles').update({ status: 'vendida' }).eq('id', params.id as string)

    const totalRecebidoAgora =
      (Number(form.valor_recebido_a_vista) || 0) +
      (Number(form.valor_entrada) || 0) +
      (Number(form.valor_documentacao) || 0)

    if (totalRecebidoAgora > 0) {
      await supabase.from('cash_transactions').insert({
        data: form.data_venda,
        tipo: 'entrada',
        origem: 'venda',
        origem_id: venda.id,
        valor: totalRecebidoAgora,
        descricao: `Venda referente à moto`,
      })
    }

    setSalvando(false)
    router.push(`/motos/${params.id}`)
    router.refresh()
  }

  const inputClass = 'w-full rounded-lg bg-grafite-claro border border-grafite-claro text-texto px-4 py-3 outline-none focus:border-dourado transition'
  const labelClass = 'block text-sm font-medium text-texto mb-1'

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-dourado mb-6">Vender Moto</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-grafite border border-grafite-claro rounded-xl p-5">
        <div>
          <label className={labelClass}>Cliente *</label>
          <select name="customer_id" value={form.customer_id} onChange={handleChange} className={inputClass}>
            <option value="">Selecione...</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <p className="text-xs text-texto-suave mt-1">
            Cliente não cadastrado?{' '}
            <a href="/clientes/novo" target="_blank" className="text-dourado underline">Cadastre aqui</a>{' '}
            e depois atualize esta página.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Data da venda</label><input type="date" name="data_venda" value={form.data_venda} onChange={handleChange} className={inputClass} /></div>
          <div><label className={labelClass}>Valor total da venda (R$) *</label><input type="number" step="0.01" name="valor_total_venda" value={form.valor_total_venda} onChange={handleChange} className={inputClass} /></div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div><label className={labelClass}>Entrada (R$)</label><input type="number" step="0.01" name="valor_entrada" value={form.valor_entrada} onChange={handleChange} className={inputClass} /></div>
          <div><label className={labelClass}>Recebido à vista (R$)</label><input type="number" step="0.01" name="valor_recebido_a_vista" value={form.valor_recebido_a_vista} onChange={handleChange} className={inputClass} /></div>
          <div><label className={labelClass}>Valor financiado (R$)</label><input type="number" step="0.01" name="valor_financiado" value={form.valor_financiado} onChange={handleChange} className={inputClass} /></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Documentação cobrada (R$)</label><input type="number" step="0.01" name="valor_documentacao" value={form.valor_documentacao} onChange={handleChange} className={inputClass} /></div>
          <div className="flex items-end pb-3">
            <label className="flex items-center gap-2 text-sm text-texto">
              <input type="checkbox" name="documentacao_entra_no_lucro" checked={form.documentacao_entra_no_lucro} onChange={handleChange} />
              Documentação conta como lucro
            </label>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Forma de pagamento</label>
            <select name="forma_pagamento" value={form.forma_pagamento} onChange={handleChange} className={inputClass}>
              <option>À vista</option><option>Financiado</option><option>Pix</option><option>Cartão</option><option>Misto</option>
            </select>
          </div>
          <div><label className={labelClass}>Financeira</label><input name="financeira" value={form.financeira} onChange={handleChange} className={inputClass} /></div>
          <div><label className={labelClass}>Nº parcelas</label><input type="number" name="numero_parcelas" value={form.numero_parcelas} onChange={handleChange} className={inputClass} /></div>
        </div>

        <div><label className={labelClass}>Observações</label><textarea name="observacoes" value={form.observacoes} onChange={handleChange} className={inputClass} rows={2} /></div>

        {erro && <div className="bg-red-950 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3">{erro}</div>}

        <button type="submit" disabled={salvando} className="bg-dourado hover:bg-dourado-claro text-preto font-semibold rounded-lg px-8 py-3 transition disabled:opacity-60">
          {salvando ? 'Salvando...' : 'Confirmar Venda'}
        </button>
      </form>
    </div>
  )
}