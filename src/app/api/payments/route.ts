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

  // Fetch real payments from Razorpay only
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

  // No fabricated fallback rows — show empty with correct status messaging
  const totalPaid = payments.reduce((sum: number, p: any) => sum + p.amount, 0)

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
