import { valorPorExtenso } from '@/lib/formatadores/extenso'
import { formatarMoeda } from '@/lib/formatadores/moeda'

/*
 * Monta os dados do recibo de venda de capacete.
 *
 * Usado pela tela de impressão (/recibos/capacete/[id]) e
 * pelo arquivo Word (/api/recibos/capacete/[id]), para os
 * dois nunca saírem diferentes.
 *
 * A data e a hora são as do MOMENTO DA GERAÇÃO, no fuso
 * America/Sao_Paulo - não as do registro da venda.
 */

export type DadosRecibo = {
  cliente_nome: string
  cliente_cpf: string
  cliente_telefone: string
  produto: string
  marca: string
  modelo: string
  cor: string
  tamanho: string
  quantidade: string
  valor_unitario: string
  valor_total: string
  valor_extenso: string
  forma_pagamento: string
  vendedor: string
  data_extenso: string
  hora_documento: string
}

export function dataAtualExtenso() {
  const partes = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).formatToParts(new Date())

  const dia =
    partes.find((parte) => parte.type === 'day')?.value || ''

  const mes =
    partes.find((parte) => parte.type === 'month')?.value || ''

  const ano =
    partes.find((parte) => parte.type === 'year')?.value || ''

  return `${dia} de ${mes.toUpperCase()} de ${ano}`
}

export function horaAtual() {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date())
}

export function nomeArquivoSeguro(texto: string) {
  return (
    texto
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'cliente'
  )
}

/*
 * Junta os valores distintos de um campo dos itens.
 * Venda de um item só (o caso normal) devolve o valor exato;
 * com mais de um item, devolve "Pro Tork / Texx".
 */
function juntarCampo(itens: any[], campo: string) {
  const valores = Array.from(
    new Set(
      itens
        .map((item) => String(item?.[campo] ?? '').trim())
        .filter(Boolean)
    )
  )

  return valores.join(' / ')
}

function descricaoProdutos(itens: any[]) {
  if (itens.length === 1) {
    return String(itens[0].produto || 'Capacete')
  }

  return itens
    .map((item) => {
      const detalhes = [
        item.marca,
        item.modelo,
        item.cor,
        item.tamanho,
      ]
        .map((parte) => String(parte ?? '').trim())
        .filter(Boolean)
        .join(' ')

      return `${item.quantidade}x ${
        item.produto || 'Capacete'
      }${detalhes ? ` ${detalhes}` : ''}`
    })
    .join('; ')
}

export async function montarDadosRecibo(
  supabase: any,
  id: string
): Promise<{
  dados?: DadosRecibo
  erro?: string
  status?: number
}> {
  if (!id) {
    return { erro: 'Venda não informada.', status: 400 }
  }

  const { data: venda, error: vendaError } = await supabase
    .from('helmet_sales')
    .select('*')
    .eq('id', id)
    .single()

  if (vendaError || !venda) {
    return {
      erro:
        vendaError?.message ||
        'Venda de capacete não encontrada.',
      status: 404,
    }
  }

  const { data: itens, error: itensError } = await supabase
    .from('helmet_sale_items')
    .select('*')
    .eq('helmet_sale_id', id)
    .order('criado_em', { ascending: true })

  if (itensError) {
    return { erro: itensError.message, status: 500 }
  }

  const listaItens = itens || []

  if (listaItens.length === 0) {
    return {
      erro: 'Esta venda não possui capacetes vinculados.',
      status: 400,
    }
  }

  let clienteNome = venda.cliente_nome || ''
  let clienteCpf = venda.cliente_cpf || ''
  let clienteTelefone = venda.cliente_telefone || ''

  if (venda.customer_id) {
    const { data: cliente } = await supabase
      .from('customers')
      .select('nome, cpf, telefone')
      .eq('id', venda.customer_id)
      .single()

    if (cliente) {
      clienteNome = clienteNome || cliente.nome || ''
      clienteCpf = clienteCpf || cliente.cpf || ''
      clienteTelefone =
        clienteTelefone || cliente.telefone || ''
    }
  }

  if (!clienteNome) {
    return {
      erro:
        'A venda não tem cliente informado. Edite a venda antes de gerar o recibo.',
      status: 400,
    }
  }

  const quantidadeTotal = listaItens.reduce(
    (soma: number, item: any) =>
      soma + (Number(item.quantidade) || 0),
    0
  )

  const totalItens = listaItens.reduce(
    (soma: number, item: any) =>
      soma +
      (Number(item.quantidade) || 0) *
        (Number(item.valor_unitario) || 0),
    0
  )

  const valorTotal = Number(venda.valor_total) || totalItens

  const valorUnitario =
    listaItens.length === 1
      ? Number(listaItens[0].valor_unitario) || 0
      : quantidadeTotal > 0
        ? valorTotal / quantidadeTotal
        : 0

  const formaPagamento = [
    venda.forma_pagamento || 'não informada',
    venda.forma_pagamento === 'Cartão' &&
    Number(venda.parcelas) > 1
      ? `em ${Number(venda.parcelas)}x`
      : '',
  ]
    .filter(Boolean)
    .join(' ')

  return {
    dados: {
      cliente_nome: clienteNome,
      cliente_cpf: clienteCpf || 'não informado',
      cliente_telefone: clienteTelefone || 'não informado',

      produto: descricaoProdutos(listaItens),
      marca:
        juntarCampo(listaItens, 'marca') || 'não informada',
      modelo:
        juntarCampo(listaItens, 'modelo') || 'não informado',
      cor: juntarCampo(listaItens, 'cor') || 'não informada',
      tamanho:
        juntarCampo(listaItens, 'tamanho') ||
        'não informado',
      quantidade: String(quantidadeTotal),

      valor_unitario: formatarMoeda(valorUnitario),
      valor_total: formatarMoeda(valorTotal),
      valor_extenso: valorPorExtenso(valorTotal),

      forma_pagamento: formaPagamento,
      vendedor: venda.vendedor || 'não informado',

      data_extenso: dataAtualExtenso(),
      hora_documento: horaAtual(),
    },
  }
}
