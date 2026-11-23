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
  const isResetPassword = path === '/reset-password'

  // API routes, superadmin, and reset-password — no auth check here
  if (isApiRoute || isSuperAdmin || isResetPassword) return supabaseResponse

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
      const expiresAt = tenant.plan_expires_at ? new Date(tenant.plan_expires_at) : null
      const gracePeriodEnds = tenant.grace_period_ends_at ? new Date(tenant.grace_period_ends_at) : null

      // Hard block: account explicitly suspended / cancelled
      if (!tenant.is_active) {
        if (!isExpiredPage) {
          const url = request.nextUrl.clone()
          url.pathname = '/account-expired'
          return NextResponse.redirect(url)
        }
      }

      // Trial expired → redirect to account-expired (upgrade page)
      if (tenant.plan_status === 'trial' && expiresAt && now > expiresAt) {
        if (!isExpiredPage) {
          const url = request.nextUrl.clone()
          url.pathname = '/account-expired'
          return NextResponse.redirect(url)
        }
      }

      // Paid plan expired + grace period elapsed → block
      if (
        tenant.plan_status === 'expired' ||
        (tenant.plan_status === 'active' && expiresAt && now > expiresAt)
      ) {
        const derivedGrace = gracePeriodEnds ?? (expiresAt ? new Date(expiresAt.getTime() + 3 * 24 * 60 * 60 * 1000) : null)
        if (!derivedGrace || now > derivedGrace) {
          if (!isExpiredPage) {
            const url = request.nextUrl.clone()
            url.pathname = '/account-expired'
            return NextResponse.redirect(url)
          }
        }
      }

      // Cancelled → always block
      if (tenant.plan_status === 'cancelled') {
        if (!isExpiredPage) {
          const url = request.nextUrl.clone()
          url.pathname = '/account-expired'
          return NextResponse.redirect(url)
        }
      }
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
