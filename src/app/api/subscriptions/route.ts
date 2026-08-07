import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Razorpay from 'razorpay'

const PLAN_IDS: Record<string, string> = {
  starter: 'plan_TMlnM2FDQdMa6h',
  growth: 'plan_TMloXZIHDd9U86',
  pro: 'plan_TMlp7WcudeUjQ1',
}

const PLAN_PRICES: Record<string, number> = {
  starter: 399,
  growth: 699,
  pro: 999,
}

function getRazorpay() {
  return new Razorpay({
    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  })
}

async function getAdminClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
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

  if (!tenant) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const body = await req.json()
  const { action, plan } = body

  if (action === 'create_subscription') {
    const planId = PLAN_IDS[plan]
    if (!planId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

    try {
      const razorpay = getRazorpay()

      // Cancel existing subscription if any
      if (tenant.razorpay_subscription_id) {
        try {
          await razorpay.subscriptions.cancel(tenant.razorpay_subscription_id, false)
        } catch (e) {
          // Ignore if already cancelled
        }
      }

      // Create new subscription
      const subscription = await razorpay.subscriptions.create({
        plan_id: planId,
        customer_notify: 1,
        quantity: 1,
        total_count: 120, // 10 years max
        notes: {
          tenant_id: tenant.id,
          business_name: tenant.business_name,
          email: tenant.email,
          plan,
        },
      } as any)

      // Store subscription ID
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
      console.error('Razorpay subscription error:', err)
      return NextResponse.json({ error: err.message || 'Failed to create subscription' }, { status: 500 })
    }
  }

  if (action === 'cancel_subscription') {
    if (!tenant.razorpay_subscription_id) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 400 })
    }

    try {
      const razorpay = getRazorpay()
      await razorpay.subscriptions.cancel(tenant.razorpay_subscription_id, false) // cancel at end of period
      await adminClient.from('tenants').update({ plan_status: 'cancelled' }).eq('id', tenant.id)
      return NextResponse.json({ success: true, message: 'Subscription cancelled. You can use the app until your current period ends.' })
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
