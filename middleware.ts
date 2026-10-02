import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/*
 * O endereco do site da loja.
 *
 * O mesmo projeto atende por dois enderecos: o dominio da loja
 * e o endereco que a Vercel da ao projeto
 * (blackout-motos-amber.vercel.app). Ate 30/09/2026 os dois
 * serviam tudo, e o do Google via a mesma moto em dois
 * enderecos diferentes - conteudo repetido, que o buscador
 * pune, e um link feio circulando como se fosse o da loja.
 *
 * Agora o site atende so pelo dominio. O endereco da Vercel
 * continua de pe, mas so para o sistema interno: e o link que
 * a loja usa para entrar no painel.
 */
const CANONICO = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ||
    'https://blackoutmotos.com.br'
)

/*
 * Se NEXT_PUBLIC_SITE_URL apontar para o proprio endereco da
 * Vercel, a regra abaixo mandaria a pagina para ela mesma, sem
 * parar. Neste caso nao se separa nada: melhor o site aparecer
 * em dois enderecos do que nao aparecer em nenhum.
 */
/* Definido mais abaixo, junto com o endereco do sistema. */

/*
 * As telas que sao do site, e nao do sistema.
 *
 * So paginas. Os enderecos de dado (/api/..., /catalogo.xml)
 * ficam de fora de proposito: quem busca eles e o Meta, a OLX
 * e o TikTok, sempre pelo dominio, e mandar um redirecionamento
 * no meio de uma chamada dessas so cria chance de erro.
 */
const PAGINAS_DO_SITE = [
  '/',
  '/estoque',
  '/financiamento',
  '/sobre',
  '/contato',
  '/privacidade',
  '/termos',
  '/robots.txt',
  '/sitemap.xml',
]

function ehPaginaDoSite(caminho: string) {
  return (
    PAGINAS_DO_SITE.includes(caminho) ||
    caminho.startsWith('/estoque/')
  )
}

/*
 * O endereco do sistema interno.
 *
 * E o que a Vercel da ao projeto. Sai de variavel de ambiente
 * para o dia em que esse endereco mudar - troca-se la, sem
 * commit, igual ao do site.
 */
const SISTEMA = new URL(
  process.env.NEXT_PUBLIC_SISTEMA_URL ||
    'https://blackout-motos-amber.vercel.app'
)

/*
 * So separa se os dois enderecos existirem e forem diferentes.
 *
 * Duas configuracoes erradas derrubariam o site, e nenhuma das
 * duas daria erro visivel - a pagina so pararia de abrir:
 *
 *   - site apontando para o proprio endereco da Vercel: a
 *     pagina seria mandada para ela mesma, sem parar;
 *   - sistema apontando para o dominio da loja: a capa do site
 *     viraria o painel, e o cliente cairia no login.
 *
 * Nos dois casos e melhor nao separar nada: o site aparecer em
 * dois enderecos incomoda o Google, mas nao fecha a loja.
 */
const SEPARAR_POR_DOMINIO =
  !CANONICO.hostname.endsWith('.vercel.app') &&
  CANONICO.hostname !== SISTEMA.hostname

/*
 * As telas que sao do sistema, e nao do site.
 *
 * Lista escrita a mao, e nao "tudo que nao e site", de
 * proposito. O dominio precisa continuar atendendo coisas que
 * nao sao pagina nem vitrine e que quebrariam se fossem
 * mandadas embora:
 *
 *   - /api/tiktok/retorno e /api/olx/callback, que sao os
 *     enderecos de volta cadastrados naqueles servicos, no
 *     dominio;
 *   - /api/meta/catalogo e /catalogo.xml, que o Meta busca;
 *   - /api/interesse e /api/visita, que as paginas do site
 *     chamam de dentro do dominio;
 *   - /vitrine/, que e link que a loja manda para cliente;
 *   - /documentos/ e /recibos/, que sao abertos para imprimir.
 *
 * Mandar qualquer um desses para outro endereco quebraria algo
 * que hoje funciona, e sem aviso.
 */
const PAGINAS_DO_SISTEMA = [
  '/dashboard',
  '/admin',
  '/vendas',
  '/caixa',
  '/relatorios',
  '/clientes',
  '/despesas',
  '/gastos',
  '/capacetes',
  '/motos',
  '/historico',
  '/anotacoes',
  '/configuracoes',
  '/olx',
  '/interessados',
  '/diagnostico',
  '/login',
]

/*
 * Os enderecos de volta dos servicos de fora.
 *
 * O TikTok tem cadastrado, no painel dele, o endereco do
 * DOMINIO para devolver a loja depois do login - e trocar isso
 * la exige nova aprovacao. Como a sessao passa a existir so no
 * endereco da Vercel, a volta cairia numa tela de login vazia e
 * o token se perderia no caminho.
 *
 * Entao a volta e encaminhada, com o codigo que veio junto. O
 * endereco cadastrado continua valendo, e quem termina o
 * trabalho e o lado que tem a sessao.
 *
 * O da OLX ja aponta para a Vercel (OLX_REDIRECT_URI); fica na
 * lista para o dia em que alguem apontar para o dominio.
 */
const VOLTAS_DE_FORA = [
  '/api/tiktok/retorno',
  '/api/olx/callback',
]

function ehDoSistema(caminho: string) {
  if (VOLTAS_DE_FORA.includes(caminho)) return true

  return PAGINAS_DO_SISTEMA.some(
    (pagina) =>
      caminho === pagina || caminho.startsWith(`${pagina}/`)
  )
}

export async function middleware(request: NextRequest) {
  const caminhoPedido = request.nextUrl.pathname

  /* Sem a porta: no localhost o cabecalho traz "host:3000". */
  const host = (request.headers.get('host') || '')
    .split(':')[0]
    .toLowerCase()

  /*
   * Chegou pelo endereco do sistema.
   *
   * E o que estiver em NEXT_PUBLIC_SISTEMA_URL - hoje o da
   * Vercel, amanha um sistema.blackoutmotos.com.br, se a loja
   * quiser. Qualquer .vercel.app tambem entra aqui, incluindo
   * os de pre-visualizacao: o site se confere no localhost, e o
   * sistema continua abrindo normal por eles.
   *
   * A raiz vai para o painel - quem abre esse link quer o
   * sistema, nao a vitrine. O resto das paginas do site vai
   * para o dominio, de forma permanente, para o buscador
   * entender que aquele endereco nao e mais o do site.
   */
  const ehHostDoSistema =
    host === SISTEMA.hostname || host.endsWith('.vercel.app')

  if (SEPARAR_POR_DOMINIO && ehHostDoSistema) {
    if (caminhoPedido === '/') {
      const paraOPainel = request.nextUrl.clone()
      paraOPainel.pathname = '/dashboard'
      return NextResponse.redirect(paraOPainel)
    }

    if (ehPaginaDoSite(caminhoPedido)) {
      return NextResponse.redirect(
        new URL(
          `${caminhoPedido}${request.nextUrl.search}`,
          CANONICO
        ),
        308
      )
    }
  }

  /*
   * Chegou pelo dominio da loja, pedindo tela do sistema.
   *
   * Vai para o endereco da Vercel. O dominio e do cliente; o
   * sistema tem o endereco dele.
   *
   * Aqui o redirecionamento e temporario, ao contrario do de
   * cima. Tela de sistema nao interessa a buscador nenhum - o
   * robots.txt ja as bloqueia -, entao nao ha o que ensinar ao
   * Google, e temporario deixa desfazer sem depender de o
   * navegador de cada um esquecer o caminho.
   *
   * O localhost nao entra nisto: la o host nao e o dominio, e
   * tudo continua abrindo no mesmo lugar para trabalhar.
   */
  const ehDominioDaLoja =
    host === CANONICO.hostname ||
    host === `www.${CANONICO.hostname}`

  if (
    SEPARAR_POR_DOMINIO &&
    ehDominioDaLoja &&
    ehDoSistema(caminhoPedido)
  ) {
    return NextResponse.redirect(
      new URL(
        `${caminhoPedido}${request.nextUrl.search}`,
        SISTEMA
      ),
      307
    )
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const rotaEhLogin = request.nextUrl.pathname.startsWith('/login')

  /*
   * O que abre sem login.
   *
   * O site da loja (/, /estoque, /financiamento, /sobre,
   * /contato) e a vitrine por link. Documento e recibo
   * tambem, porque sao abertos para imprimir.
   *
   * O que aparece nessas telas e decidido por funcao no
   * banco, que devolve so moto disponivel e so as colunas
   * de vitrine - valor de compra, fornecedor e placa nao
   * saem de la.
   *
   * O sistema continua atras do login: /admin/estoque,
   * /dashboard, /vendas, /caixa e o resto.
   */
  const caminho = request.nextUrl.pathname

  const SITE = [
    '/',
    '/estoque',
    '/financiamento',
    '/sobre',
    '/contato',
    /* Privacidade e termos: o TikTok e o Google leem estas
       paginas de fora, sem login. */
    '/privacidade',
    '/termos',
    /* Buscador le estes dois sem login. */
    '/robots.txt',
    '/sitemap.xml',
  ]

  const rotaEhPublica =
    SITE.includes(caminho) ||
    caminho.startsWith('/estoque/') ||
    /* O cadastro da lista de interesse vem de visitante. */
    caminho.startsWith('/api/interesse') ||
    /* A contagem de visitas tambem: quem e medido nao tem
       login, e mandar isso para /login perderia a visita. */
    caminho.startsWith('/api/visita') ||
    /* O Meta busca o catalogo sozinho, sem login. */
    caminho.startsWith('/api/meta/catalogo') ||
    caminho === '/catalogo.xml' ||
    caminho === '/catalogo-minimo.csv' ||
    /* Endereco antigo da capa: entra e e mandado para "/". */
    caminho.startsWith('/novo') ||
    /* Endereco antigo da versao 2: entra e e mandado para "/". */
    caminho.startsWith('/v2') ||
    caminho.startsWith('/diagnostico') ||
    caminho.startsWith('/vitrine') ||
    caminho.startsWith('/documentos/') ||
    caminho.startsWith('/recibos/')
  /*
   * O login vence em 24 horas.
   *
   * Sem isto a sessao se renova sozinha para sempre: o
   * aparelho troca o cracha por um novo a cada hora, e quem
   * entrou uma vez fica dentro para sempre. Num celular
   * perdido, ou no computador da loja que todo mundo usa,
   * isso e uma porta que nunca fecha.
   *
   * O relogio corre desde a hora em que a pessoa digitou a
   * senha: last_sign_in_at so muda quando se entra de novo,
   * nao quando o cracha e trocado. Entao sao 24 horas
   * corridas - usar o sistema o dia inteiro nao estica o
   * prazo.
   *
   * So vale para as telas do sistema: quem esta logado e
   * abre o site da loja nao leva tranco para o login.
   */
  const VALIDADE_DO_LOGIN = 24 * 60 * 60 * 1000

  if (user?.last_sign_in_at && !rotaEhPublica && !rotaEhLogin) {
    const entrouEm = new Date(user.last_sign_in_at).getTime()

    if (
      Number.isFinite(entrouEm) &&
      Date.now() - entrouEm > VALIDADE_DO_LOGIN
    ) {
      /* Derruba tambem do lado do Supabase, senao o cracha
         velho ainda serve para pedir um novo por fora. */
      await supabase.auth.signOut()

      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.search = '?expirou=1'

      const resposta = NextResponse.redirect(url)

      /* O redirecionamento leva resposta propria, entao os
         cookies precisam ser apagados nela. */
      request.cookies
        .getAll()
        .filter((c) => c.name.startsWith('sb-'))
        .forEach((c) => resposta.cookies.delete(c.name))

      return resposta
    }
  }

  if (!user && !rotaEhLogin && !rotaEhPublica) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && rotaEhLogin) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}