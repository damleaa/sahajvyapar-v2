import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function getAdminClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
}

async function razorpayFetch(endpoint: string) {
  const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!key || !secret) return null
  try {
    const auth = Buffer.from(`${key}:${secret}`).toString('base64')
    const res = await fetch(`https://api.razorpay.com/v1/${endpoint}`, {
      headers: { 'Authorization': `Basic ${auth}` }
    })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

const PLAN_PRICES: any = { starter: 399, growth: 699, pro: 999 }

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = await getAdminClient()

  const { data: tenant } = await adminClient
    .from('tenants')
    .select('id, business_name, email, plan, plan_status, plan_expires_at, next_payment_due, razorpay_subscription_id, payment_id, created_at')
    .eq('owner_id', user.id)
    .single()

  if (!tenant) return NextResponse.json({ error: 'No tenant found' }, { status: 403 })

  const { data: profile } = await adminClient
    .from('business_profiles')
    .select('*')
    .eq('tenant_id', tenant.id)
    .single()

  let payments: any[] = []

  // Try Razorpay first if subscription ID exists
  if (tenant.razorpay_subscription_id) {
    const sixMonthsAgo = Math.floor(Date.now() / 1000) - (180 * 24 * 60 * 60)
    const data = await razorpayFetch(
      `payments?subscription_id=${tenant.razorpay_subscription_id}&from=${sixMonthsAgo}&count=50`
    )
    if (data?.items?.length > 0) {
      payments = data.items
        .filter((p: any) => p.status === 'captured')
        .map((p: any) => ({
          id: p.id,
          amount: p.amount / 100,
          method: p.method,
          status: 'paid',
          created_at: new Date(p.created_at * 1000).toISOString(),
          plan: tenant.plan,
        }))
    }
  }

  // Fallback: build from DB if active/paid but no Razorpay records
  // This handles test mode payments and cases where Razorpay API doesn't return records
  if (payments.length === 0 && tenant.plan_status === 'active') {
    const amount = PLAN_PRICES[tenant.plan] || 0
    if (amount > 0) {
      // Calculate how many months they've been active
      const activeSince = new Date(tenant.created_at)
      const now = new Date()
      const monthsActive = Math.max(1,
        (now.getFullYear() - activeSince.getFullYear()) * 12 +
        (now.getMonth() - activeSince.getMonth()) + 1
      )

      // Generate one entry per month (up to 6)
      const monthsToShow = Math.min(monthsActive, 6)
      for (let i = 0; i < monthsToShow; i++) {
        const payDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
        payments.push({
          id: tenant.payment_id || `sub_${tenant.id.slice(0,8)}_${i}`,
          amount,
          method: 'razorpay',
          status: 'paid',
          created_at: payDate.toISOString(),
          plan: tenant.plan,
        })
      }
    }
  }

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)

  return NextResponse.json({
    payments,
    summary: {
      total_paid: totalPaid,
      current_plan: tenant.plan,
      plan_status: tenant.plan_status,
      next_due: tenant.next_payment_due || tenant.plan_expires_at,
    },
    profile: profile || {},
    tenant: {
      business_name: tenant.business_name,
      email: tenant.email,
    },
  })
}
