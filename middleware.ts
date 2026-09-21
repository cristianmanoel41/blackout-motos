import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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
    /* Buscador le estes dois sem login. */
    '/robots.txt',
    '/sitemap.xml',
  ]

  const rotaEhPublica =
    SITE.includes(caminho) ||
    caminho.startsWith('/estoque/') ||
    /* Versao nova, so no localhost. */
    caminho.startsWith('/novo') ||
    caminho.startsWith('/diagnostico') ||
    caminho.startsWith('/vitrine') ||
    caminho.startsWith('/documentos/') ||
    caminho.startsWith('/recibos/')
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