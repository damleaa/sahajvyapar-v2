import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const PLAN_IDS: Record<string, string> = {
  starter: process.env.RAZORPAY_PLAN_STARTER || 'plan_TMlnM2FDQdMa6h',
  growth: process.env.RAZORPAY_PLAN_GROWTH || 'plan_TMloXZIHDd9U86',
  pro: process.env.RAZORPAY_PLAN_PRO || 'plan_TMlp7WcudeUjQ1',
}

const PLAN_PRICES: Record<string, number> = { starter: 399, growth: 699, pro: 999 }

async function getAdminClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
}

async function razorpayRequest(endpoint: string, method = 'GET', body?: any) {
  const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!
  const secret = process.env.RAZORPAY_KEY_SECRET!
  const auth = Buffer.from(`${key}:${secret}`).toString('base64')
  
  const res = await fetch(`https://api.razorpay.com/v1/${endpoint}`, {
    method,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.description || data.error || 'Razorpay API error')
  return data
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = await getAdminClient()
  const { data: tenant } = await adminClient
    .from('tenants')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!tenant) return NextResponse.json({ error: 'No tenant found' }, { status: 403 })

  const body = await req.json()
  const { action, plan } = body

  if (action === 'create_subscription') {
    const planId = PLAN_IDS[plan]
    if (!planId) return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 })

    try {
      // Cancel existing subscription if any
      if (tenant.razorpay_subscription_id) {
        try {
          await razorpayRequest(`subscriptions/${tenant.razorpay_subscription_id}/cancel`, 'POST', { cancel_at_cycle_end: 0 })
        } catch (e) {
          // Ignore — already cancelled or doesn't exist
        }
      }

      // Create new subscription via Razorpay REST API
      const subscription = await razorpayRequest('subscriptions', 'POST', {
        plan_id: planId,
        customer_notify: 1,
        quantity: 1,
        total_count: 120,
        notes: {
          tenant_id: tenant.id,
          business_name: tenant.business_name,
          email: tenant.email,
          plan,
        },
      })

      // Store subscription ID in tenant
      await adminClient.from('tenants').update({
        razorpay_subscription_id: subscription.id,
        plan: plan,
      }).eq('id', tenant.id)

      return NextResponse.json({
        subscription_id: subscription.id,
        plan_id: planId,
        amount: PLAN_PRICES[plan],
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        tenant: {
          name: tenant.owner_name,
          email: tenant.email,
          business_name: tenant.business_name,
        },
      })
    } catch (err: any) {
      console.error('Razorpay subscription error:', err.message)
      return NextResponse.json({ error: err.message || 'Failed to create subscription' }, { status: 500 })
    }
  }

  if (action === 'cancel_subscription') {
    if (!tenant.razorpay_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 })
    }
    try {
      await razorpayRequest(`subscriptions/${tenant.razorpay_subscription_id}/cancel`, 'POST', { cancel_at_cycle_end: 1 })
      await adminClient.from('tenants').update({ plan_status: 'cancelled' }).eq('id', tenant.id)
      return NextResponse.json({ success: true, message: 'Subscription cancelled. Access continues until your current period ends.' })
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
  }

  if (action === 'get_status') {
    return NextResponse.json({
      plan: tenant.plan,
      plan_status: tenant.plan_status,
      plan_expires_at: tenant.plan_expires_at,
      razorpay_subscription_id: tenant.razorpay_subscription_id,
      business_name: tenant.business_name,
      owner_name: tenant.owner_name,
      email: tenant.email,
    })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
