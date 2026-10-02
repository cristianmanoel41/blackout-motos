import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowDownCircle,
  ArrowRight,
  ArrowUpCircle,
  Bike,
  CalendarDays,
  ChevronDown,
  ShoppingCart,
  Timer,
  Warehouse,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { nomeCurtoVendedor } from '@/lib/dados/vendedores'
import { formatarMoeda } from '@/lib/formatadores/moeda'
import AcessosDoSite from './AcessosDoSite'
import Aniversariantes from './Aniversariantes'
import Dobravel from '@/components/Dobravel'
import styles from './dashboard.module.css'

type MotoParada = MotoResumo & {
  codigo?: string | null
  data_entrada?: string | null
}

type MotoResumo = {
  id: string
  marca?: string | null
  modelo?: string | null
  versao?: string | null
  ano_modelo?: string | number | null
  quilometragem?: string | number | null
  preco_anunciado?: string | number | null
}

type VendaRecente = {
  id: string
  motorcycle_id?: string | null
  valor_total_venda?: string | number | null
  data_venda?: string | null
  vendedor?: string | null
}

function nomeMoto(moto?: MotoResumo) {
  if (!moto) return 'Moto não localizada'
  return [moto.marca, moto.modelo, moto.versao].filter(Boolean).join(' ') || 'Moto sem nome'
}

function dataBR(data?: string | null) {
  if (!data) return '—'
  const partes = data.slice(0, 10).split('-')
  if (partes.length !== 3) return data
  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

function kmBR(valor?: string | number | null) {
  const numero = Number(valor || 0)
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(numero)
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10)
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10)

  const { count: motosDisponiveis } = await supabase
    .from('motorcycles')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'disponivel')

  const { count: motosCompradasMes } = await supabase
    .from('motorcycles')
    .select('*', { count: 'exact', head: true })
    .eq('tipo_entrada', 'compra_nova')
    .gte('data_entrada', inicioMes)
    .lte('data_entrada', fimMes)

  /*
   * Moto recebida na troca de uma venda.
   *
   * Entra no patio como qualquer outra, mas nao e compra: nao
   * houve dinheiro saindo para busca-la. Fica separada para o
   * numero de compradas nao prometer o que nao foi - e porque
   * "entraram 5, sairam 3" so fecha se a troca estiver na
   * conta.
   */
  const { count: motosTrocaMes } = await supabase
    .from('motorcycles')
    .select('*', { count: 'exact', head: true })
    .eq('tipo_entrada', 'troca')
    .gte('data_entrada', inicioMes)
    .lte('data_entrada', fimMes)

  const { data: vendasMes } = await supabase
    .from('sales')
    .select('id, motorcycle_id, valor_total_venda, transferencia_cliente, documentacao_concluida')
    .eq('status', 'ativa')
    .gte('data_venda', inicioMes)
    .lte('data_venda', fimMes)

  const idsDeOutraLoja = new Set<string>()

  {
    const ids = vendasMes?.map((v) => v.motorcycle_id).filter(Boolean) ?? []

    if (ids.length > 0) {
      const { data: motosParceiras } = await supabase
        .from('motorcycles')
        .select('id')
        .eq('tipo_entrada', 'outra_loja')
        .in('id', ids)

      motosParceiras?.forEach((moto) =>
        idsDeOutraLoja.add(String(moto.id))
      )
    }
  }

  const vendasProprias =
    vendasMes?.filter(
      (v) => !idsDeOutraLoja.has(String(v.motorcycle_id))
    ) ?? []

  const motosVendidasMes = vendasProprias.length
  const { data: vendasRecentesData } = await supabase
    .from('sales')
    .select('id, motorcycle_id, valor_total_venda, data_venda, vendedor')
    .eq('status', 'ativa')
    .order('data_venda', { ascending: false })
    .limit(5)

  const vendasRecentes = (vendasRecentesData || []) as VendaRecente[]
  const idsRecentes = Array.from(new Set(vendasRecentes.map((v) => v.motorcycle_id).filter(Boolean))) as string[]

  let motosRecentes: MotoResumo[] = []
  if (idsRecentes.length) {
    const { data } = await supabase
      .from('motorcycles')
      .select('id, marca, modelo, versao, ano_modelo, quilometragem, preco_anunciado')
      .in('id', idsRecentes)
    motosRecentes = (data || []) as MotoResumo[]
  }

  const mapaMotos = new Map(motosRecentes.map((m) => [String(m.id), m]))

  const contagemPorModelo = new Map<string, number>()
  vendasRecentes.forEach((v) => {
    const moto = mapaMotos.get(String(v.motorcycle_id))
    const chave = moto ? [moto.marca, moto.modelo].filter(Boolean).join(' ') : 'Outras motos'
    contagemPorModelo.set(chave, (contagemPorModelo.get(chave) || 0) + 1)
  })

  const ranking = Array.from(contagemPorModelo.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const maiorRanking = Math.max(...ranking.map(([, quantidade]) => quantidade), 1)

  const { data: motoDestaqueData } = await supabase
    .from('motorcycles')
    .select('id, marca, modelo, versao, ano_modelo, quilometragem, preco_anunciado')
    .eq('status', 'disponivel')
    .or('tipo_entrada.is.null,tipo_entrada.neq.outra_loja')
    .not('quilometragem', 'is', null)
    .order('quilometragem', { ascending: true })
    .limit(1)

  const motoDestaque = (motoDestaqueData?.[0] || null) as MotoResumo | null

  /*
   * A moto encalhada: a que entrou há mais tempo e continua
   * disponível. É a que mais custa dinheiro parada, então é a
   * que merece o foco da venda.
   */
  const { data: motoParadaData } = await supabase
    .from('motorcycles')
    .select('id, codigo, marca, modelo, versao, ano_modelo, quilometragem, preco_anunciado, data_entrada')
    .eq('status', 'disponivel')
    .or('tipo_entrada.is.null,tipo_entrada.neq.outra_loja')
    .not('data_entrada', 'is', null)
    .order('data_entrada', { ascending: true })
    .limit(1)

  const motoParada = (motoParadaData?.[0] || null) as MotoParada | null

  const diasParada = motoParada?.data_entrada
    ? Math.max(
        0,
        Math.floor(
          (new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime() -
            new Date(`${String(motoParada.data_entrada).slice(0, 10)}T00:00:00`).getTime()) /
            86400000
        )
      )
    : 0

  const periodoLabel = `${inicioMes.split('-').reverse().join('/')} - ${fimMes.split('-').reverse().join('/')}`

  /*
   * O patio encheu ou esvaziou no mes.
   *
   * Tudo que entrou menos tudo que saiu. A troca entra na
   * conta porque ela ocupa vaga no patio igual a moto
   * comprada - deixar de fora faria o saldo nao bater com o
   * que a loja ve no estoque.
   */
  const entradasDoMes = (motosCompradasMes ?? 0) + (motosTrocaMes ?? 0)

  const saldoDoMes = entradasDoMes - motosVendidasMes

  const Card = ({
    titulo,
    valor,
    icone: Icone,
    destaque,
  }: {
    titulo: string
    valor: string
    icone: LucideIcon
    destaque?: 'green' | 'red' | 'gold'
  }) => {
    const cor = destaque === 'red' ? styles.metricValueNegative : styles.metricValue

    return (
      <div className={styles.metricCard}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.08em] text-black/45">{titulo}</p>
            <p className={`mt-3 text-2xl font-black tracking-tight ${cor}`}>{valor}</p>
          </div>
          <div className={styles.icon3d}>
            <Icone size={23} strokeWidth={2.2} />
          </div>
        </div>
        <div className="mt-5 flex items-center gap-2 text-xs font-bold text-black/45">
          <span className="h-1.5 w-1.5 rounded-full bg-[#c99712]" />
          Atualizado em tempo real
        </div>
      </div>
    )
  }

  return (
    <div className={`${styles.dashboard} mx-auto w-full max-w-[1720px] space-y-4 pb-6`}>
      <section className={`${styles.hero} px-6 py-4 md:px-8`}>
        <div className="relative z-10 flex h-full flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#a97800]">Blackout Motos · Painel de gestão</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-black md:text-3xl">Olá, Cristian 👋</h1>
            <p className="mt-1 text-sm font-semibold text-black/50">Aqui está o resumo geral da sua loja.</p>
          </div>

          <div className={`${styles.dataPill} flex w-fit items-center gap-3 rounded-2xl px-4 py-2`}>
            <CalendarDays size={18} className="text-[#a97800]" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-black/40">Período atual</p>
              <p className="text-sm font-black text-black">{periodoLabel}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card titulo="Motos disponíveis" valor={String(motosDisponiveis ?? 0)} icone={Bike} />
        {/* Clicar abre a lista na ordem em que as vendas foram cadastradas. */}
        <Link href="/vendas/historico?ordem=registro" className="block">
          <Card titulo="Vendas no mês" valor={String(motosVendidasMes)} icone={ShoppingCart} />
        </Link>
      </section>

      {/*
        * Os aniversarios vem antes dos numeros do mes.
        *
        * E a unica coisa do painel que vence hoje: faturamento
        * e estoque continuam la amanha, mensagem de
        * aniversario nao.
        */}
      <Aniversariantes />

      {/*
        * Quantas entraram e quantas sairam no mes.
        *
        * Os dois numeros ja existiam no painel, mas em
        * fileiras diferentes - para compara-los era preciso
        * procurar um e guardar na cabeca ate achar o outro.
        * Juntos, eles respondem de uma olhada a pergunta que a
        * loja faz: o patio esta enchendo ou esvaziando?
        *
        * O saldo vem escrito por extenso em vez de so o sinal:
        * "+2" obriga a lembrar o que e positivo aqui.
        */}
      <div className={styles.panel}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-black">Motos no mês</h2>
            <p className="text-xs font-bold text-black/45">
              O que entrou e o que saiu do pátio
            </p>
          </div>

          <span
            className={`${styles.dataPill} flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black text-black/65`}
          >
            <CalendarDays size={14} className="text-[#a97800]" />
            {periodoLabel}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className={styles.miniCard}>
            <div className="flex items-center gap-3">
              <div className={styles.icon3d}>
                <ArrowDownCircle size={20} />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-black/40">
                  Compradas
                </p>
                <p className="mt-0.5 text-2xl font-black leading-none text-black">
                  {motosCompradasMes ?? 0}
                </p>
                <p className="mt-1 text-[11px] font-bold text-black/45">
                  {(motosTrocaMes ?? 0) > 0
                    ? `+ ${motosTrocaMes} na troca`
                    : 'nenhuma veio de troca'}
                </p>
              </div>
            </div>
          </div>

          <div className={styles.miniCard}>
            <div className="flex items-center gap-3">
              <div className={styles.icon3d}>
                <ArrowUpCircle size={20} />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-black/40">
                  Vendidas
                </p>
                <p className="mt-0.5 text-2xl font-black leading-none text-black">
                  {motosVendidasMes}
                </p>
                <p className="mt-1 text-[11px] font-bold text-black/45">
                  sem contar moto de outra loja
                </p>
              </div>
            </div>
          </div>

          <div className={styles.miniCard}>
            <div className="flex items-center gap-3">
              <div className={styles.icon3d}>
                <Warehouse size={20} />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-black/40">
                  O pátio
                </p>
                {/*
                  * A cor vem de classe, nunca de estilo: o
                  * AppShell pinta todo span de preto com
                  * !important, e preto some no card escuro.
                  */}
                <p
                  className={`mt-0.5 text-2xl font-black leading-none ${
                    saldoDoMes > 0
                      ? 'text-emerald-400'
                      : saldoDoMes < 0
                        ? 'text-red-400'
                        : 'text-black'
                  }`}
                >
                  {saldoDoMes > 0 ? `+${saldoDoMes}` : saldoDoMes}
                </p>
                {/*
                  * A conta escrita, e nao so o resultado.
                  *
                  * "Saldo -1" fez o Cristian perguntar o que
                  * era - numero com sinal obriga a lembrar o
                  * que e positivo aqui. "1 saiu, nenhuma
                  * entrou" nao precisa de explicacao.
                  */}
                <p className="mt-1 text-[11px] font-bold text-black/45">
                  {entradasDoMes === 0
                    ? 'nenhuma entrou'
                    : `${entradasDoMes} ${entradasDoMes === 1 ? 'entrou' : 'entraram'}`}
                  {', '}
                  {motosVendidasMes === 0
                    ? 'nenhuma saiu'
                    : `${motosVendidasMes} ${motosVendidasMes === 1 ? 'saiu' : 'saíram'}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AcessosDoSite />

      {/*
        * O painel de anuncios do Meta saiu daqui em 01/10/2026.
        *
        * Sem o token da conta de anuncios ele so sabe dizer o
        * que falta configurar, e um aviso permanente de algo
        * que a loja nao vai mexer agora e ruido no painel.
        *
        * O componente continua inteiro em ./AnunciosMeta.tsx,
        * com a leitura em lib/dados/anuncios-meta.ts. Para
        * trazer de volta: importar e por <AnunciosMeta /> aqui.
        */}

      <section className="grid grid-cols-1 gap-5">
        <details className={styles.panel}>
          <summary className={styles.resumoPainel}>
            <div>
              <h2 className="text-lg font-black text-black">Últimas vendas</h2>
              <p className="text-xs font-bold text-black/45">Movimentações mais recentes da loja</p>
            </div>

            <ChevronDown size={18} className={styles.setaPainel} />
          </summary>

          <div className={styles.tableWrap}>
            <table className={`${styles.table} w-full min-w-[680px] text-left text-sm`}>
              <thead>
                <tr className="border-b border-black/10 text-[10px] font-black uppercase tracking-wider text-black/40">
                  <th className="px-3 py-3">Data</th>
                  <th className="px-3 py-3">Moto</th>
                  <th className="px-3 py-3">Vendedor</th>
                  <th className="px-3 py-3 text-right">Valor</th>
                  <th className="px-3 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {vendasRecentes.length ? (
                  vendasRecentes.map((venda) => {
                    const moto = mapaMotos.get(String(venda.motorcycle_id))
                    return (
                      <tr key={venda.id} className="border-b border-black/5 last:border-0">
                        <td className="px-3 py-4 text-xs font-bold text-black/55">{dataBR(venda.data_venda)}</td>
                        <td className="px-3 py-4 font-black text-black">{nomeMoto(moto)}</td>
                        <td className="px-3 py-4 text-xs font-bold text-black/55">{nomeCurtoVendedor(venda.vendedor) || 'Não informado'}</td>
                        <td className="px-3 py-4 text-right font-black text-black">{formatarMoeda(venda.valor_total_venda)}</td>
                        <td className="px-3 py-4 text-right">
                          <span className={`${styles.statusSuccess} rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black`}>Concluída</span>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-3 py-10 text-center text-sm font-bold text-black/40">Nenhuma venda encontrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            <Link href="/vendas/historico" className={`${styles.darkButton} flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black`}>
              Ver todas <ArrowRight size={15} />
            </Link>
          </div>
        </details>

        <details className={styles.panel}>
          <summary className={styles.resumoPainel}>
            <div>
              <h2 className="text-lg font-black text-black">Top motos nas vendas recentes</h2>
              <p className="text-xs font-bold text-black/45">Ranking baseado nas 5 vendas mais recentes</p>
            </div>

            <ChevronDown size={18} className={styles.setaPainel} />
          </summary>

          <div className="space-y-4">
            {ranking.length ? (
              ranking.map(([modelo, quantidade], index) => (
                <div key={modelo} className="grid grid-cols-[28px_1fr_auto] items-center gap-3">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-black text-[11px] font-black text-white">{index + 1}</div>
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-black">{modelo}</p>
                      <p className="text-xs font-black text-black/50">{quantidade} venda{quantidade === 1 ? '' : 's'}</p>
                    </div>
                    <div className={styles.rankBar}>
                      <div className={styles.rankFill} style={{ width: `${(quantidade / maiorRanking) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-black text-[#a97800]">{quantidade}</span>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm font-bold text-black/40">Ainda não há vendas para montar o ranking.</p>
            )}
          </div>
        </details>
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className={`${styles.panel} flex flex-col`}>
          <Dobravel
            nome="moto-destaque"
            titulo="Motos em destaque"
            subtitulo="Moto disponível com a menor quilometragem"
            grande
          >

          {motoDestaque ? (
            <div className={`${styles.goldPanel} flex-1 rounded-[22px] border p-4`}>
              <div className="flex h-full flex-col justify-between gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="rounded-full border border-[#c99712]/25 bg-white/70 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#8a6400]">Disponível</span>
                    <h3 className="mt-3 text-xl font-black text-black">{nomeMoto(motoDestaque)}</h3>
                    <p className="mt-1 text-sm font-bold text-black/50">
                      {motoDestaque.ano_modelo || 'Ano não informado'} · {kmBR(motoDestaque.quilometragem)} km
                    </p>
                  </div>
                  <div className={`${styles.icon3d} !h-16 !w-16 !rounded-[20px]`}><Bike size={30} /></div>
                </div>

                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-black/40">Preço anunciado</p>
                    <p className="mt-1 text-2xl font-black text-[#a97800]">{formatarMoeda(motoDestaque.preco_anunciado)}</p>
                  </div>
                  <Link href={`/motos/${motoDestaque.id}`} className={`${styles.goldButton} flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black`}>
                    Ver detalhes <ArrowRight size={17} />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid flex-1 place-items-center rounded-[22px] border border-dashed border-black/15 bg-black/[.015] p-6 text-center">
              <div>
                <Bike className="mx-auto text-black/25" size={38} />
                <p className="mt-3 text-sm font-black text-black/45">Nenhuma moto disponível.</p>
              </div>
            </div>
          )}
          </Dobravel>
        </div>

        <div className={`${styles.panel} ${styles.goldPanel}`}>
          <Dobravel
            nome="moto-parada"
            titulo="Parada há mais tempo"
            subtitulo="A moto que está há mais dias no pátio"
            grande
          >
          <div className="flex h-full flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>

              {motoParada ? (
                <>
                  <h2 className="mt-2 text-xl font-black text-black">{nomeMoto(motoParada)}</h2>

                  <p className="mt-1 text-sm font-bold text-black/50">
                    {motoParada.codigo ? `${motoParada.codigo} · ` : ''}
                    {motoParada.ano_modelo || 'Ano não informado'} · {kmBR(motoParada.quilometragem)} km · entrou em {dataBR(motoParada.data_entrada)}
                  </p>

                  <p className={`mt-2 text-2xl font-black tracking-tight ${styles.paradaDias}`}>
                    {diasParada} {diasParada === 1 ? 'dia' : 'dias'} no estoque
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Link href={`/motos/${motoParada.id}`} className={`${styles.darkButton} flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black`}>
                      Ver moto <ArrowRight size={16} />
                    </Link>

                    <span className={`${styles.paradaPreco} text-lg font-black`}>
                      {motoParada.preco_anunciado ? formatarMoeda(motoParada.preco_anunciado) : 'Preço não informado'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="mt-2 text-2xl font-black text-black">Nenhuma moto parada</h2>
                  <p className="mt-2 max-w-xl text-sm font-bold text-black/50">
                    Não há moto disponível com data de entrada registrada.
                  </p>
                </>
              )}
            </div>

            <div className={`${styles.icon3d} !h-16 !w-16 shrink-0 !rounded-[20px]`}>
              <Timer size={30} />
            </div>
          </div>
          </Dobravel>
        </div>
      </section>
    </div>
  )
}
