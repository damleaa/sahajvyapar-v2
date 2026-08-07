import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const PLAN_MAP: Record<string, { plan: string; amount: number }> = {
  'plan_TMlnM2FDQdMa6h': { plan: 'starter', amount: 399 },
  'plan_TMloXZIHDd9U86': { plan: 'growth', amount: 699 },
  'plan_TMlp7WcudeUjQ1': { plan: 'pro', amount: 999 },
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
  const body = await req.text()
  const signature = req.headers.get('x-razorpay-signature') || ''
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || ''

  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')

  if (expectedSignature !== signature) {
    console.error('Invalid webhook signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(body)
  const { event: eventType, payload } = event
  const subscription = payload?.subscription?.entity

  if (!subscription) {
    return NextResponse.json({ received: true })
  }

  const supabase = await getAdminClient()
  const subscriptionId = subscription.id
  const planId = subscription.plan_id
  const planInfo = PLAN_MAP[planId]

  console.log(`Webhook: ${eventType} for subscription ${subscriptionId}`)

  // Find tenant by subscription ID
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, email, business_name')
    .eq('razorpay_subscription_id', subscriptionId)
    .single()

  if (!tenant) {
    // Try to find by customer email (first payment)
    const customerEmail = payload?.subscription?.entity?.notes?.email
    if (customerEmail) {
      const { data: tenantByEmail } = await supabase
        .from('tenants')
        .select('id, email')
        .eq('email', customerEmail)
        .single()

      if (tenantByEmail && planInfo) {
        await supabase.from('tenants').update({
          razorpay_subscription_id: subscriptionId,
          plan: planInfo.plan,
          plan_status: 'active',
          plan_expires_at: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString(),
        }).eq('id', tenantByEmail.id)
      }
    }
    return NextResponse.json({ received: true })
  }

  const now = new Date()
  const nextMonth = new Date(now)
  nextMonth.setDate(nextMonth.getDate() + 32) // 32 days buffer

  switch (eventType) {
    case 'subscription.activated':
    case 'subscription.charged':
      if (planInfo) {
        await supabase.from('tenants').update({
          plan: planInfo.plan,
          plan_status: 'active',
          plan_expires_at: nextMonth.toISOString(),
          razorpay_subscription_id: subscriptionId,
        }).eq('id', tenant.id)

        // Log payment (ignore if table doesn't exist)
        try {
          await supabase.from('subscription_logs').insert({
            tenant_id: tenant.id,
            event_type: eventType,
            razorpay_subscription_id: subscriptionId,
            razorpay_plan_id: planId,
            amount: planInfo.amount,
            status: 'success',
          })
        } catch (_) {}
      }
      break

    case 'subscription.cancelled':
      await supabase.from('tenants').update({
        plan_status: 'cancelled',
      }).eq('id', tenant.id)
      break

    case 'subscription.halted':
      await supabase.from('tenants').update({
        plan_status: 'expired',
      }).eq('id', tenant.id)
      break

    case 'subscription.pending':
      // Payment pending - don't change status yet
      break
  }

  return NextResponse.json({ received: true })
}
