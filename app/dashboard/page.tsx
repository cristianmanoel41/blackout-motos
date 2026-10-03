import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Bike,
  CalendarDays,
  ShoppingCart,
  Warehouse,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import AcessosDoSite from './AcessosDoSite'
import Aniversariantes from './Aniversariantes'
import DestaquesDoSite from './DestaquesDoSite'
import styles from './dashboard.module.css'


type MotoResumo = {
  id: string
  marca?: string | null
  modelo?: string | null
  versao?: string | null
  ano_modelo?: string | number | null
  quilometragem?: string | number | null
  preco_anunciado?: string | number | null
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

      {/*
        * As tres motos da capa do site.
        *
        * Fica perto dos acessos de proposito: as duas coisas
        * respondem a mesma pergunta - o que o cliente esta
        * vendo, e o que a loja decidiu mostrar.
        */}
      <DestaquesDoSite />

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

    </div>
  )
}
