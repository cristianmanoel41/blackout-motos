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
   * Duas telas abrem sem login, cada uma com o seu dono:
   * /vitrine e o link que vai para outra loja, e so responde
   * com token valido; /loja e o site aberto ao cliente final.
   *
   * Nas duas, o que aparece e decidido por funcao no banco,
   * que devolve so moto disponivel e so as colunas de
   * vitrine - valor de compra, fornecedor e placa nao saem
   * de la.
   */
  const rotaEhPublica =
    request.nextUrl.pathname.startsWith('/vitrine') ||
    request.nextUrl.pathname.startsWith('/loja')

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