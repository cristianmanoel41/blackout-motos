'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NovaMotoPage() {
  const router = useRouter()
  const supabase = createClient()

  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [salvando, setSalvando] = useState(false)

  const [form, setForm] = useState({
    tipo_entrada: 'compra_nova',
    data_entrada: new Date().toISOString().slice(0, 10),
    marca: '',
    modelo: '',
    versao: '',
    ano_fabricacao: '',
    ano_modelo: '',
    cor: '',
    placa: '',
    renavam: '',
    chassi: '',
    quilometragem: '',
    valor_compra: '',
    preco_anunciado: '',
    fornecedor_nome: '',
    fornecedor_telefone: '',
    observacoes: '',
  })

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setSucesso('')

    if (!form.marca || !form.modelo || !form.valor_compra) {
      setErro('Preencha ao menos Marca, Modelo e Valor de Compra.')
      return
    }

    setSalvando(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.from('motorcycles').insert({
      tipo_entrada: form.tipo_entrada,
      data_entrada: form.data_entrada,
      marca: form.marca,
      modelo: form.modelo,
      versao: form.versao || null,
      ano_fabricacao: form.ano_fabricacao ? Number(form.ano_fabricacao) : null,
      ano_modelo: form.ano_modelo ? Number(form.ano_modelo) : null,
      cor: form.cor || null,
      placa: form.placa ? form.placa.toUpperCase() : null,
      renavam: form.renavam || null,
      chassi: form.chassi || null,
      quilometragem: form.quilometragem ? Number(form.quilometragem) : null,
      valor_compra: Number(form.valor_compra),
      preco_anunciado: form.preco_anunciado ? Number(form.preco_anunciado) : null,
      fornecedor_nome: form.fornecedor_nome || null,
      fornecedor_telefone: form.fornecedor_telefone || null,
      observacoes: form.observacoes || null,
      criado_por: user?.id ?? null,
    })

    setSalvando(false)

    if (error) {
  console.error("ERRO AO CADASTRAR MOTO:", error);
  alert(`Erro ao cadastrar moto: ${error.message}`);
  setSalvando(false);
  return;
}

    setSucesso('Moto cadastrada com sucesso!')
    setTimeout(() => {
      router.push('/estoque')
      router.refresh()
    }, 1000)
  }

  const inputClass =
    'w-full rounded-lg bg-grafite-claro border border-grafite-claro text-texto px-4 py-3 outline-none focus:border-dourado transition'
  const labelClass = 'block text-sm font-medium text-texto mb-1'

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-dourado mb-6">Cadastrar Moto</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Tipo de entrada */}
        <div className="bg-grafite border border-grafite-claro rounded-xl p-5">
          <h2 className="text-dourado font-semibold mb-4">Tipo de Entrada</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Como essa moto entrou na loja?</label>
              <select
                name="tipo_entrada"
                value={form.tipo_entrada}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="compra_nova">Compra nova (gera saída no caixa)</option>
                <option value="estoque_inicial">
                  Estoque inicial (já era da loja, não gera saída no caixa)
                </option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Data de entrada</label>
              <input
                type="date"
                name="data_entrada"
                value={form.data_entrada}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Dados da moto */}
        <div className="bg-grafite border border-grafite-claro rounded-xl p-5">
          <h2 className="text-dourado font-semibold mb-4">Dados da Moto</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Marca *</label>
              <input name="marca" value={form.marca} onChange={handleChange} className={inputClass} placeholder="Honda, Yamaha..." />
            </div>
            <div>
              <label className={labelClass}>Modelo *</label>
              <input name="modelo" value={form.modelo} onChange={handleChange} className={inputClass} placeholder="CG 160, Fazer 250..." />
            </div>
            <div>
              <label className={labelClass}>Versão</label>
              <input name="versao" value={form.versao} onChange={handleChange} className={inputClass} placeholder="Titan, ABS..." />
            </div>
            <div>
              <label className={labelClass}>Cor</label>
              <input name="cor" value={form.cor} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Ano de fabricação</label>
              <input type="number" name="ano_fabricacao" value={form.ano_fabricacao} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Ano do modelo</label>
              <input type="number" name="ano_modelo" value={form.ano_modelo} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Quilometragem</label>
              <input type="number" name="quilometragem" value={form.quilometragem} onChange={handleChange} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Documentação */}
        <div className="bg-grafite border border-grafite-claro rounded-xl p-5">
          <h2 className="text-dourado font-semibold mb-4">Documentação</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Placa</label>
              <input name="placa" value={form.placa} onChange={handleChange} className={inputClass} placeholder="ABC1D23" />
            </div>
            <div>
              <label className={labelClass}>Renavam</label>
              <input name="renavam" value={form.renavam} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Chassi</label>
              <input name="chassi" value={form.chassi} onChange={handleChange} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Valores */}
        <div className="bg-grafite border border-grafite-claro rounded-xl p-5">
          <h2 className="text-dourado font-semibold mb-4">Valores</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Valor de compra (R$) *</label>
              <input type="number" step="0.01" name="valor_compra" value={form.valor_compra} onChange={handleChange} className={inputClass} placeholder="15000.00" />
            </div>
            <div>
              <label className={labelClass}>Preço anunciado (R$)</label>
              <input type="number" step="0.01" name="preco_anunciado" value={form.preco_anunciado} onChange={handleChange} className={inputClass} placeholder="18500.00" />
            </div>
          </div>
        </div>

        {/* Fornecedor */}
        <div className="bg-grafite border border-grafite-claro rounded-xl p-5">
          <h2 className="text-dourado font-semibold mb-4">Fornecedor / Vendedor</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nome</label>
              <input name="fornecedor_nome" value={form.fornecedor_nome} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Telefone</label>
              <input name="fornecedor_telefone" value={form.fornecedor_telefone} onChange={handleChange} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Observações */}
        <div className="bg-grafite border border-grafite-claro rounded-xl p-5">
          <h2 className="text-dourado font-semibold mb-4">Observações</h2>
          <textarea
            name="observacoes"
            value={form.observacoes}
            onChange={handleChange}
            className={inputClass}
            rows={3}
          />
        </div>

        {erro && (
          <div className="bg-red-950 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3">
            {erro}
          </div>
        )}
        {sucesso && (
          <div className="bg-green-950 border border-green-700 text-green-300 text-sm rounded-lg px-4 py-3">
            {sucesso}
          </div>
        )}

        <button
          type="submit"
          disabled={salvando}
          className="w-full md:w-auto bg-dourado hover:bg-dourado-claro text-preto font-semibold rounded-lg px-8 py-3 transition disabled:opacity-60"
        >
          {salvando ? 'Salvando...' : 'Cadastrar Moto'}
        </button>
      </form>
    </div>
  )
}