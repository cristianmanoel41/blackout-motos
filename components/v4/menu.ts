import {
  BellRing,
  FileBarChart,
  History,
  LayoutDashboard,
  Megaphone,
  NotebookPen,
  PlusCircle,
  Receipt,
  Settings,
  ShoppingCart,
  Users,
  Wallet,
  Warehouse,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

/*
 * O MENU DO SISTEMA, EM GRUPOS
 *
 * Eram catorze itens numa lista só, todos com o mesmo peso. Em
 * grupos o olho acha o que procura pelo assunto - "é dinheiro,
 * está em Financeiro" - em vez de ler a lista inteira.
 *
 * A mesma lista alimenta a busca rápida (Ctrl+K).
 */

export type ItemDoMenu = {
  label: string
  href: string
  icon: LucideIcon
  /* Palavras a mais para a busca achar o item. */
  busca?: string
}

export const GRUPOS_DO_MENU: { titulo: string; itens: ItemDoMenu[] }[] = [
  {
    titulo: 'Loja',
    itens: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, busca: 'painel inicio' },
      { label: 'Estoque', href: '/admin/estoque', icon: Warehouse, busca: 'motos patio' },
      { label: 'Comprar moto', href: '/motos/nova', icon: PlusCircle, busca: 'cadastrar nova compra' },
      { label: 'Vendas', href: '/vendas', icon: ShoppingCart, busca: 'vender' },
      { label: 'Clientes', href: '/clientes', icon: Users, busca: 'cpf pessoas' },
    ],
  },
  {
    titulo: 'Financeiro',
    itens: [
      { label: 'Caixa', href: '/caixa', icon: Wallet, busca: 'extrato pendentes dinheiro' },
      { label: 'Gastos das motos', href: '/gastos', icon: Wrench, busca: 'oficina peças' },
      { label: 'Despesas da loja', href: '/despesas', icon: Receipt, busca: 'contas aluguel' },
      { label: 'Relatórios', href: '/relatorios', icon: FileBarChart, busca: 'lucro mensal' },
    ],
  },
  {
    titulo: 'Divulgação',
    itens: [
      { label: 'Anúncios na OLX', href: '/olx', icon: Megaphone, busca: 'anuncio' },
      { label: 'Lista de interesse', href: '/interessados', icon: BellRing, busca: 'interessados avise' },
    ],
  },
  {
    titulo: 'Dia a dia',
    itens: [
      { label: 'Anotações do dia', href: '/anotacoes', icon: NotebookPen, busca: 'notas' },
      { label: 'Histórico', href: '/historico', icon: History, busca: 'log registro' },
      { label: 'Configurações', href: '/configuracoes', icon: Settings, busca: 'ajustes usuario' },
    ],
  },
]

export const ITENS_DO_MENU = GRUPOS_DO_MENU.flatMap((g) => g.itens)

export function itemAtivo(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
