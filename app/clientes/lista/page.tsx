'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NovoClientePage() {
  const router = useRouter()
  const supabase = createClient()
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const [form, setForm] = useState({
    nome: '', cpf: '', rg: '', data_nascimento: '',
    telefone: '', whatsapp: '', email: '',
    cep: '', endereco: '', numero: '', bairro: '', cidade: '', estado: '',
    observacoes: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!form.nome) {
      setErro('O nome é obrigatório.')
      return
    }
    setSalvando(true)
    const { error } = await supabase.from('customers').insert({
      ...form,
      cpf: form.cpf || null,
      data_nascimento: form.data_nascimento || null,
    })
    setSalvando(false)
    if (error) {
      setErro(error.code === '23505' ? 'Já existe um cliente com esse CPF.' : 'Erro ao salvar cliente.')
      return
    }
    router.push('/clientes')
    router.refresh()
  }

  const inputClass = 'w-full rounded-lg bg-grafite-claro border border-grafite-claro text-texto px-4 py-3 outline-none focus:border-dourado transition'
  const labelClass = 'block text-sm font-medium text-texto mb-1'

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-dourado mb-6">Novo Cliente</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-grafite border border-grafite-claro rounded-xl p-5">
        <div>
          <label className={labelClass}>Nome *</label>
          <input name="nome" value={form.nome} onChange={handleChange} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>CPF</label><input name="cpf" value={form.cpf} onChange={handleChange} className={inputClass} /></div>
          <div><label className={labelClass}>RG</label><input name="rg" value={form.rg} onChange={handleChange} className={inputClass} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Telefone</label><input name="telefone" value={form.telefone} onChange={handleChange} className={inputClass} /></div>
          <div><label className={labelClass}>WhatsApp</label><input name="whatsapp" value={form.whatsapp} onChange={handleChange} className={inputClass} /></div>
        </div>
        <div><label className={labelClass}>E-mail</label><input name="email" value={form.email} onChange={handleChange} className={inputClass} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Cidade</label><input name="cidade" value={form.cidade} onChange={handleChange} className={inputClass} /></div>
          <div><label className={labelClass}>Estado</label><input name="estado" value={form.estado} onChange={handleChange} className={inputClass} /></div>
        </div>
        <div><label className={labelClass}>Endereço</label><input name="endereco" value={form.endereco} onChange={handleChange} className={inputClass} /></div>
        <div><label className={labelClass}>Observações</label><textarea name="observacoes" value={form.observacoes} onChange={handleChange} className={inputClass} rows={3} /></div>

        {erro && <div className="bg-red-950 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3">{erro}</div>}

        <button type="submit" disabled={salvando} className="bg-dourado hover:bg-dourado-claro text-preto font-semibold rounded-lg px-8 py-3 transition disabled:opacity-60">
          {salvando ? 'Salvando...' : 'Cadastrar Cliente'}
        </button>
      </form>
    </div>
  )
}