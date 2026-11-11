'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, Search } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import BuscaRapida from '@/components/v4/BuscaRapida'
import { BarraDeBaixo, BotaoNovo } from '@/components/v4/AcoesRapidas'
import { ITENS_DO_MENU, itemAtivo } from '@/components/v4/menu'
import styles from './AppShell.module.css'

/*
 * A TELA DE LOGIN
 *
 * Mora em componente proprio por causa do useEffect abaixo: o
 * React nao aceita hook dentro de um if, e o login e um dos
 * caminhos do AppShell.
 */
function TelaDeLogin({ children }: { children: React.ReactNode }) {
  const moldura = useRef<HTMLDivElement>(null)

  /*
   * A cena sai quando a pessoa da zoom.
   *
   * Ampliar multiplica a memoria do desenho pelo QUADRADO da
   * escala: tres vezes de zoom pede nove vezes mais pixels para
   * desenhar a mesma estrada. Foi memoria que matou a aba do
   * iPhone em 02/10/2026 - "um problema ocorreu repetidamente" -
   * e o zoom reabre exatamente a mesma porta, mesmo depois de a
   * cena ter emagrecido.
   *
   * A troca nao custa nada: quem ampliou a tela esta lendo o
   * formulario, nao olhando a estrada.
   *
   * visualViewport e o que enxerga o zoom de pinca - innerWidth
   * nao muda com ele. Onde nao existir, a cena fica como esta:
   * navegador velho o bastante para nao ter visualViewport
   * tambem nao tem pinca.
   */
  useEffect(() => {
    const janela = window.visualViewport
    const alvo = moldura.current
    if (!janela || !alvo) return

    const conferir = () => {
      alvo.classList.toggle(styles.telaAmpliada, janela.scale > 1.15)
    }

    conferir()
    janela.addEventListener('resize', conferir)
    janela.addEventListener('scroll', conferir)

    return () => {
      janela.removeEventListener('resize', conferir)
      janela.removeEventListener('scroll', conferir)
    }
  }, [])

  return (
    <div
      ref={moldura}
      className={`${styles.legibilidade} ${styles.loginComLogo}`}
    >
      <div className={styles.fundoLogin} aria-hidden="true" />

      {/*
        O mundo: tudo que treme junto com a moto. O capacete
        fica de fora de proposito - ele esta preso a cabeca de
        quem olha, entao e a unica coisa parada na cena.
      */}
      <div className={styles.mundoLogin} aria-hidden="true">
        {/* O bamboleio lento da moto em linha reta. */}
        <div className={styles.guinadaLogin}>
          {/* O tremor do motor, por dentro do bamboleio. */}
          <div className={styles.tremorLogin}>
            {/* A pista nitida, deitada em perspectiva. */}
            <div className={styles.estradaLogin} />

            {/* A mesma pista borrada, so no que passa perto.
                O recorte existe por desempenho: ver o comentario
                em .recorteDoBorrao. */}
            <div className={styles.recorteDoBorrao}>
              <div className={styles.estradaPerto} />
            </div>
          </div>
        </div>
      </div>

      {/* O brilho do plastico do visor. */}
      <div className={styles.reflexoVisor} aria-hidden="true" />

      {/* A moldura da abertura do capacete. */}
      <div className={styles.capaceteLogin} aria-hidden="true" />

      {/* O grao do sensor, por cima de toda a paisagem. */}
      <div className={styles.granulado} aria-hidden="true" />

      <div className={styles.logoLogin} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          data-logo-login-atual="true"
          src="/logo-blackout-marca.png"
          alt=""
        />
      </div>

      <div className={styles.conteudoLogin}>{children}</div>
    </div>
  )
}

/* O menu recolhido, só com os ícones. Também por aparelho. */
const CHAVE_MENU = 'blackout-menu-recolhido'

function useMenuRecolhido() {
  const [recolhido, setRecolhido] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(CHAVE_MENU) === 'sim') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRecolhido(true)
      }
    } catch {
      /* Sem armazenamento: menu aberto. */
    }
  }, [])

  function mudar(novo: boolean) {
    setRecolhido(novo)

    try {
      localStorage.setItem(CHAVE_MENU, novo ? 'sim' : 'nao')
    } catch {
      /* Vale so ate fechar a aba. */
    }
  }

  return [recolhido, mudar] as const
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [recolhido, mudarMenu] = useMenuRecolhido()
  const [menuAberto, setMenuAberto] = useState(false)
  const [buscaAberta, setBuscaAberta] = useState(false)

  /* Ctrl+K (ou Cmd+K no Mac) abre a busca de qualquer tela. */
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setBuscaAberta((a) => !a)
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [])

  /*
   * Telas que nao sao do sistema: o site da loja, a vitrine
   * por link e os documentos para imprimir.
   *
   * Nelas nao entra menu, nem o <main> do painel - e dentro
   * dele que o tema pinta card de preto e inverte texto
   * branco, o que fora do painel sai errado.
   */
  const SITE = [
    '/',
    '/estoque',
    '/encontre-sua-moto',
    '/financiamento',
    '/sobre',
    '/compramos-sua-moto',
    '/contato',
    '/privacidade',
    '/termos',
  ]

  const foraDoPainel =
    SITE.includes(pathname) ||
    pathname.startsWith('/estoque/') ||
    pathname.startsWith('/financiamento/') ||
    pathname.startsWith('/novo') ||
    /* A versao 2, em provas. */
    pathname.startsWith('/v2') ||
    pathname.startsWith('/diagnostico') ||
    pathname.startsWith('/vitrine/') ||
    /* O contrato assinado que o cliente abre pelo WhatsApp. */
    pathname.startsWith('/contrato/') ||
    /* A folha do relatorio e documento branco: dentro da
       moldura escura o texto dela sairia claro no papel. */
    pathname.startsWith('/relatorios/imprimir') ||
    pathname.startsWith('/documentos/') ||
    pathname.startsWith('/recibos/')
  if (foraDoPainel) return <>{children}</>

  if (pathname === '/login') {
    return <TelaDeLogin>{children}</TelaDeLogin>
  }

  return (
    <div data-v4 className="relative min-h-screen bg-[#0a0a0c]">
      <Sidebar
        recolhido={recolhido}
        aoRecolher={mudarMenu}
        aberto={menuAberto}
        aoFechar={() => setMenuAberto(false)}
      />

      <BuscaRapida aberta={buscaAberta} aoFechar={() => setBuscaAberta(false)} />
      <BarraDeBaixo aoBuscar={() => setBuscaAberta(true)} />

      <main
        className={`relative z-10 min-h-screen w-full ${
          recolhido
            ? 'md:ml-[76px] md:w-[calc(100%-76px)]'
            : 'md:ml-64 md:w-[calc(100%-16rem)]'
        }`}
      >
        {/*
          * A barra do topo: o nome da tela, a busca e, no
          * celular, o botão do menu. Fica presa no alto e com
          * fundo translúcido, para a tela rolar por baixo.
          */}
        <header data-v4-topo className="sticky top-0 z-30 flex h-14 items-center gap-3 px-4 md:px-6">
          <button
            type="button"
            onClick={() => setMenuAberto(true)}
            className="-ml-1 rounded-lg p-2 text-white/70 hover:bg-white/5 md:hidden"
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>

          <p className="truncate text-sm font-semibold text-white/90">
            {ITENS_DO_MENU.find((i) => itemAtivo(pathname, i.href))?.label ||
              (pathname.startsWith('/motos/') ? 'Ficha da moto' : 'Blackout Motos')}
          </p>

          <button
            type="button"
            onClick={() => setBuscaAberta(true)}
            data-v4-botao-busca
            className="ml-auto flex h-9 items-center gap-2 rounded-lg px-3 text-[13px] text-white/45 md:w-72"
          >
            <Search size={15} />
            <span className="hidden md:inline">Buscar moto, placa, cliente...</span>
            <kbd className="ml-auto hidden rounded border border-white/10 px-1.5 text-[10.5px] md:inline">Ctrl K</kbd>
          </button>
          <BotaoNovo />
        </header>

        {/*
          * pb-28: o botao de voltar e fixo no canto de baixo
          * e cobriria a ultima linha de qualquer tela
          * comprida. A folga vale para o painel inteiro, nao
          * so para a tela onde o problema apareceu.
          */}
        <div className="w-full p-4 pb-28 md:p-6 md:pb-28">
          {children}
        </div>
      </main>
    </div>
  )
}
