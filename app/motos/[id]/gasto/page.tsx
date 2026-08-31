'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CampoPagamentoFeito from '@/components/CampoPagamentoFeito'

const categorias = [
  'Mecânica',
  'Revisão',
  'Óleo',
  'Pneus',
  'Pintura',
  'Lavagem',
  'Documentação',
  'Transferência',
  'Despachante',
  'Peças',
  'Combustível',
  'Transporte',
  'Outros',
]

export default function RegistrarGastoPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  /*
   * Peça encomendada, pintura, kit completo: o serviço é
   * registrado hoje e pago quando fica pronto. Enquanto isso o
   * lançamento espera baixa no caixa.
   */
  const [pago, setPago] = useState(true)

  /*
   * Data em que a contabilidade da loja comecou. Gasto pago
   * antes dela ja saiu do bolso antes do controle existir:
   * fica no historico da moto, para o custo dela ficar certo,
   * mas nao tira dinheiro do caixa de hoje.
   */
  const [dataInicioCaixa, setDataInicioCaixa] = useState("")

  const [previsao, setPrevisao] = useState(
    new Date().toISOString().slice(0, 10)
  )

  const [form, setForm] = useState({
    data: new Date().toISOString().slice(0, 10),
    categoria: 'Mecânica',
    descricao: '',
    valor: '',
    forma_pagamento: 'Dinheiro',
    observacoes: '',
  })

  useEffect(() => {
    async function carregarInicioDoControle() {
      const { data, error } = await supabase
        .from('cash_control_settings')
        .select('data_inicio')
        .eq('id', 'principal')
        .maybeSingle()

      if (error) {
        console.error(
          'Não foi possível carregar a data de início do caixa:',
          error
        )
        return
      }

      setDataInicioCaixa(data?.data_inicio || '')
    }

    carregarInicioDoControle()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const antesDoControle = Boolean(
    pago &&
      dataInicioCaixa &&
      form.data &&
      form.data < dataInicioCaixa
  )

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    setErro('')

    if (!form.valor || Number(form.valor) <= 0) {
      setErro('Informe um valor válido.')
      return
    }

    setSalvando(true)

    const { data: gasto, error } = await supabase
      .from('motorcycle_expenses')
      .insert({
        motorcycle_id: params.id,
        data: form.data,
        categoria: form.categoria,
        descricao: form.descricao || null,
        valor: Number(form.valor),
        forma_pagamento: form.forma_pagamento,
        observacoes: form.observacoes || null,
      })
      .select()
      .single()

    if (error || !gasto) {
      console.error(error)

      setErro(
        error?.message ||
          'Erro ao registrar gasto.'
      )

      setSalvando(false)
      return
    }

    if (antesDoControle) {
      setSalvando(false)

      router.push(`/motos/${params.id}`)
      router.refresh()
      return
    }

    const { error: caixaError } = await supabase
      .from('cash_transactions')
      .insert({
        data: pago ? form.data : previsao,
        tipo: 'saida',
        origem: 'gasto_moto',
        origem_id: gasto.id,
        valor: Number(form.valor),
        descricao: `${form.categoria} - ${
          form.descricao || 'Gasto de moto'
        }`,
        confirmado: pago,
        data_confirmacao: pago ? form.data : null,
      })

    if (caixaError) {
      console.error(caixaError)

      setErro(
        `O gasto foi registrado, mas houve erro ao lançar no caixa: ${caixaError.message}`
      )

      setSalvando(false)
      return
    }

    setSalvando(false)

    router.push(`/motos/${params.id}`)
    router.refresh()
  }

  const inputClass =
    'w-full rounded-lg bg-grafite-claro border border-grafite-claro text-texto px-4 py-3 outline-none focus:border-dourado transition'

  const labelClass =
    'block text-sm font-medium text-texto mb-1'

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold text-dourado">
        Registrar Gasto
      </h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-grafite-claro bg-grafite p-5"
      >
        <div className="grid grid-cols-2 gap-4">

          <div>
            <label className={labelClass}>
              Data
            </label>

            <input
              type="date"
              name="data"
              value={form.data}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Categoria
            </label>

            <select
              name="categoria"
              value={form.categoria}
              onChange={handleChange}
              className={inputClass}
            >
              {categorias.map((categoria) => (
                <option
                  key={categoria}
                  value={categoria}
                >
                  {categoria}
                </option>
              ))}
            </select>
          </div>

        </div>

        <div>
          <label className={labelClass}>
            Descrição
          </label>

          <input
            name="descricao"
            value={form.descricao}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">

          <div>
            <label className={labelClass}>
              Valor (R$) *
            </label>

            <input
              type="number"
              step="0.01"
              min="0"
              name="valor"
              value={form.valor}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Forma de pagamento
            </label>

            <select
              name="forma_pagamento"
              value={form.forma_pagamento}
              onChange={handleChange}
              className={inputClass}
            >
              <option>Dinheiro</option>
              <option>Pix</option>
              <option>Cartão</option>
              <option>Transferência</option>
            </select>
          </div>

        </div>

        <div>
          <label className={labelClass}>
            Observações
          </label>

          <textarea
            name="observacoes"
            value={form.observacoes}
            onChange={handleChange}
            className={inputClass}
            rows={2}
          />
        </div>

        {antesDoControle && (
          <div className="rounded-lg border border-yellow-800/60 bg-yellow-950/20 px-4 py-3 text-sm text-yellow-300">
            Este gasto é anterior ao início do controle do caixa
            ({dataInicioCaixa.split("-").reverse().join("/")}).
            Ele entra no custo da moto, mas não sai do caixa —
            esse dinheiro já tinha saído antes.
          </div>
        )}

        <CampoPagamentoFeito
          titulo="Este gasto já foi pago?"
          pago={pago}
          aoMudarPago={setPago}
          dataPrevista={previsao}
          aoMudarDataPrevista={setPrevisao}
          ajudaPendente="Fica pendente no caixa até você dar baixa, no dia em que pagar de verdade."
        />

        {erro && (
          <div className="rounded-lg border border-red-700 bg-red-950 px-4 py-3 text-sm text-red-300">
            {erro}
          </div>
        )}

        <button
          type="submit"
          disabled={salvando}
          className="rounded-lg bg-dourado px-8 py-3 font-semibold text-preto transition hover:bg-dourado-claro disabled:opacity-60"
        >
          {salvando
            ? 'Salvando...'
            : 'Registrar Gasto'}
        </button>
      </form>
    </div>
  )
}