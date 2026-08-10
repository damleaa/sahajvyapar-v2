import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const PLAN_MAP: Record<string, { plan: string; amount: number }> = {
  'plan_TMlnM2FDQdMa6h': { plan: 'starter', amount: 399 },
  'plan_TMloXZIHDd9U86': { plan: 'growth', amount: 699 },
  'plan_TMlp7WcudeUjQ1': { plan: 'pro', amount: 999 },
}

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

  // Verify signature
  const expectedSig = crypto.createHmac('sha256', secret).update(body).digest('hex')
  if (expectedSig !== signature) {
    console.error('Webhook: Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(body)
  const { event: eventType, payload } = event
  const subscription = payload?.subscription?.entity

  console.log(`Webhook: ${eventType}`, subscription?.id)
  if (!subscription) return NextResponse.json({ received: true })

  const supabase = getAdminClient()
  const subscriptionId = subscription.id
  const planId = subscription.plan_id
  const planInfo = PLAN_MAP[planId]

  // Calculate dates
  const now = new Date()
  const nextMonth = new Date(now)
  nextMonth.setDate(nextMonth.getDate() + 32)

  // Try to find trial end date from subscription
  const trialEnd = subscription.trial_end_at
    ? new Date(subscription.trial_end_at * 1000)
    : null

  // next_payment_due = trial end + 30 days OR just next month
  const nextPaymentDue = trialEnd
    ? new Date(trialEnd.getTime() + 30 * 24 * 60 * 60 * 1000)
    : nextMonth

  // Find tenant
  let { data: tenant } = await supabase
    .from('tenants')
    .select('id, email, plan, plan_expires_at')
    .eq('razorpay_subscription_id', subscriptionId)
    .single()

  // Fallback: find by email in notes
  if (!tenant) {
    const email = subscription.notes?.email
    if (email) {
      const { data: t } = await supabase.from('tenants').select('id, email').eq('email', email).single()
      if (t) {
        tenant = t as any
        await supabase.from('tenants').update({ razorpay_subscription_id: subscriptionId }).eq('id', t.id)
      }
    }
  }

  if (!tenant) {
    console.error('Webhook: Tenant not found for subscription', subscriptionId)
    return NextResponse.json({ received: true })
  }

  switch (eventType) {
    case 'subscription.activated':
      // On activation during trial — plan stays trial until trial ends
      // but subscription is registered
      if (planInfo) {
        await supabase.from('tenants').update({
          razorpay_subscription_id: subscriptionId,
          razorpay_plan_id: planId,
          plan: planInfo.plan,
          // Keep existing expiry if still in trial, else set to next month
          plan_status: 'active',
          plan_expires_at: nextMonth.toISOString(),
          next_payment_due: nextPaymentDue.toISOString(),
          is_active: true,
          grace_period_ends_at: null,
          suspended_at: null,
        }).eq('id', tenant.id)
        console.log(`Activated: ${tenant.email} → ${planInfo.plan}`)
      }
      break

    case 'subscription.charged':
      // Recurring payment received — extend by 32 days from now
      if (planInfo) {
        const newExpiry = new Date()
        newExpiry.setDate(newExpiry.getDate() + 32)
        const nextDue = new Date(newExpiry)
        nextDue.setDate(nextDue.getDate() + 30)

        await supabase.from('tenants').update({
          plan: planInfo.plan,
          plan_status: 'active',
          plan_expires_at: newExpiry.toISOString(),
          next_payment_due: nextDue.toISOString(),
          is_active: true,
          grace_period_ends_at: null,
          suspended_at: null,
        }).eq('id', tenant.id)
        console.log(`Charged: ${tenant.email} → extended to ${newExpiry.toLocaleDateString()}`)
      }
      break

    case 'subscription.cancelled':
      await supabase.from('tenants').update({
        plan_status: 'cancelled',
        next_payment_due: null,
      }).eq('id', tenant.id)
      console.log(`Cancelled: ${tenant.email}`)
      break

    case 'subscription.halted':
      await supabase.from('tenants').update({
        plan_status: 'expired',
        next_payment_due: null,
      }).eq('id', tenant.id)
      console.log(`Halted: ${tenant.email}`)
      break

    case 'subscription.pending':
      console.log(`Pending payment: ${tenant.email}`)
      break
  }

  return NextResponse.json({ received: true })
}
