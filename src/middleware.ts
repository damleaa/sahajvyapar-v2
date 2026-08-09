import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  const isDashboard = path.startsWith('/dashboard')
  const isAuthPage = path.startsWith('/login') || path.startsWith('/register')
  const isSuperAdmin = path.startsWith('/superadmin')
  const isExpiredPage = path === '/account-expired'
  const isApiRoute = path.startsWith('/api')

  // API routes and superadmin — no auth check here
  if (isApiRoute || isSuperAdmin) return supabaseResponse

  // Not logged in → redirect to login
  if (!user && isDashboard) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Logged in → check account status
  if (user && isDashboard) {
    const adminClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll() { return request.cookies.getAll() }, setAll() {} } }
    )

    const { data: tenant } = await adminClient
      .from('tenants')
      .select('plan_status, plan_expires_at, grace_period_ends_at, is_active')
      .eq('owner_id', user.id)
      .single()

    if (tenant) {
      const now = new Date()
      const expiresAt = new Date(tenant.plan_expires_at)
      const gracePeriodEnds = tenant.grace_period_ends_at ? new Date(tenant.grace_period_ends_at) : null

      // Account fully suspended → block login
      if (!tenant.is_active) {
        if (!isExpiredPage) {
          const url = request.nextUrl.clone()
          url.pathname = '/account-expired'
          return NextResponse.redirect(url)
        }
      }

      // After grace period but not yet suspended → block
      if (gracePeriodEnds && now > gracePeriodEnds && tenant.plan_status === 'expired') {
        if (!isExpiredPage) {
          const url = request.nextUrl.clone()
          url.pathname = '/account-expired'
          return NextResponse.redirect(url)
        }
      }

      // During grace period (3 days) → allow but dashboard shows banner
      // This is handled in the dashboard layout
    }
  }

  // Logged in trying to access auth pages → redirect to dashboard
  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
