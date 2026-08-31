import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }: { name: string; value: string; options?: Record<string, unknown> }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: Record<string, unknown> }) =>
            supabaseResponse.cookies.set(name, value, options as any)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Si no hay sesión, solo se protegen las rutas internas (dashboard y portal),
  // pero nunca las pantallas de login (evitar bucles de redirección).
  if (!user) {
    const isLoginPage = pathname === '/login' || pathname === '/portal/login'
    const isProtected =
      (pathname.startsWith('/dashboard') || pathname.startsWith('/portal')) && !isLoginPage
    if (isProtected) {
      const target = pathname.startsWith('/portal') ? '/portal/login' : '/login'
      const url = request.nextUrl.clone()
      url.pathname = target
      url.searchParams.set('redirectedFrom', pathname)
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Con sesión: averiguar el rol del usuario desde profiles.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, client_id, must_change_password')
    .eq('id', user.id)
    .maybeSingle()

  const role = profile?.role

  // Un usuario autenticado sin perfil válido no accede a zonas internas.
  if (!role) {
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/portal')) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Un cliente no debe tocar el panel de administración ni la pantalla de login.
  if (role === 'client') {
    if (pathname.startsWith('/dashboard') || pathname === '/login') {
      const url = request.nextUrl.clone()
      url.pathname = '/portal'
      return NextResponse.redirect(url)
    }
    // Cliente ya autenticado no necesita ver la pantalla de login del portal.
    if (pathname === '/portal/login') {
      const url = request.nextUrl.clone()
      url.pathname = '/portal'
      return NextResponse.redirect(url)
    }
    // Con contraseña temporal debe cambiarla antes de usar el resto del portal.
    if (profile?.must_change_password) {
      const isAllowed = pathname === '/portal/cambiar-password' || pathname === '/auth/logout'
      if (!isAllowed) {
        const url = request.nextUrl.clone()
        url.pathname = '/portal/cambiar-password'
        return NextResponse.redirect(url)
      }
    }
    return supabaseResponse
  }

  // Roles de agencia (admin/manager/member) no deben entrar al portal de cliente
  // ni a la pantalla de login.
  if (pathname.startsWith('/portal') || pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
