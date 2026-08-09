import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const PLAN_MAP: Record<string, { plan: string; amount: number }> = {
  'plan_TMlnM2FDQdMa6h': { plan: 'starter', amount: 399 },
  'plan_TMloXZIHDd9U86': { plan: 'growth', amount: 699 },
  'plan_TMlp7WcudeUjQ1': { plan: 'pro', amount: 999 },
}

// Use direct Supabase client with service role — no cookies needed for webhooks
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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
    console.error('Webhook: Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(body)
  const { event: eventType, payload } = event
  const subscription = payload?.subscription?.entity

  console.log(`Webhook received: ${eventType}`)

  if (!subscription) {
    return NextResponse.json({ received: true })
  }

  const supabase = getAdminClient()
  const subscriptionId = subscription.id
  const planId = subscription.plan_id
  const planInfo = PLAN_MAP[planId]

  console.log(`Processing subscription: ${subscriptionId}, plan: ${planId}, event: ${eventType}`)

  // Find tenant by subscription ID
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, email, business_name, plan')
    .eq('razorpay_subscription_id', subscriptionId)
    .single()

  if (!tenant) {
    // Try by email from notes
    const email = subscription.notes?.email
    console.log(`Tenant not found by subscription ID, trying email: ${email}`)
    if (email) {
      const { data: tenantByEmail } = await supabase
        .from('tenants')
        .select('id, email')
        .eq('email', email)
        .single()

      if (tenantByEmail && planInfo) {
        const nextMonth = new Date()
        nextMonth.setDate(nextMonth.getDate() + 32)
        await supabase.from('tenants').update({
          razorpay_subscription_id: subscriptionId,
          plan: planInfo.plan,
          plan_status: 'active',
          plan_expires_at: nextMonth.toISOString(),
          is_active: true,
        }).eq('id', tenantByEmail.id)
        console.log(`Activated tenant by email: ${email}`)
      }
    }
    return NextResponse.json({ received: true })
  }

  const nextMonth = new Date()
  nextMonth.setDate(nextMonth.getDate() + 32)

  switch (eventType) {
    case 'subscription.activated':
    case 'subscription.charged':
      if (planInfo) {
        await supabase.from('tenants').update({
          plan: planInfo.plan,
          plan_status: 'active',
          plan_expires_at: nextMonth.toISOString(),
          is_active: true,
          grace_period_ends_at: null,
          suspended_at: null,
          suspension_reason: null,
        }).eq('id', tenant.id)
        console.log(`Activated: ${tenant.email} on ${planInfo.plan}`)
      }
      break

    case 'subscription.cancelled':
      await supabase.from('tenants').update({
        plan_status: 'cancelled',
      }).eq('id', tenant.id)
      console.log(`Cancelled: ${tenant.email}`)
      break

    case 'subscription.halted':
      await supabase.from('tenants').update({
        plan_status: 'expired',
      }).eq('id', tenant.id)
      console.log(`Halted: ${tenant.email}`)
      break

    case 'subscription.pending':
      console.log(`Pending: ${tenant.email}`)
      break

    default:
      console.log(`Unhandled event: ${eventType}`)
  }

  return NextResponse.json({ received: true })
}
