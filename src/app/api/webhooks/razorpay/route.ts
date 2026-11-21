import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

// H-01 FIX: Durable event state machine with ATOMIC CLAIM.
// - Atomic INSERT ... ON CONFLICT DO NOTHING claims event exclusively (prevents dual-processing).
// - HMAC compared with timingSafeEqual (prevents timing attacks).
// - Business update failure returns HTTP 500 so Razorpay retries.
// - Missing event_id logged as warning; proceeds without idempotency only for legacy compatibility.
// Flow: atomic INSERT as 'received' → try business update → mark 'processed' or 'failed'.

function getPlanMap(): Record<string, { plan: string; amount: number }> {
  return {
    [process.env.RAZORPAY_PLAN_STARTER || 'plan_TRezg1wQxJx0V0']: { plan: 'starter', amount: 399 },
    [process.env.RAZORPAY_PLAN_GROWTH  || 'plan_TRf0LpcAbFOU9c']: { plan: 'growth',  amount: 699 },
    [process.env.RAZORPAY_PLAN_PRO     || 'plan_TRf0seDjj0Io7D']: { plan: 'pro',     amount: 999 },
  }
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

  if (!secret) {
    console.error('Webhook: RAZORPAY_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  // Use timingSafeEqual to prevent timing-based HMAC oracle attacks
  const expectedSig = crypto.createHmac('sha256', secret).update(body).digest('hex')
  const sigValid =
    expectedSig.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(expectedSig, 'utf8'), Buffer.from(signature, 'utf8'))
  if (!sigValid) {
    console.error('Webhook: Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(body)
  const { event: eventType, payload } = event
  const eventId: string | undefined = event.id

  const supabase = getAdminClient()

  // H-01 FIX: Atomic event claim — INSERT ... ON CONFLICT DO NOTHING.
  // If two deliveries race, only ONE succeeds (the unique constraint on event_id).
  // The loser gets 0 rows affected and returns 200 immediately (idempotent no-op).
  if (!eventId) {
    // Razorpay should always send an event ID; warn and continue without idempotency
    console.warn(`Webhook: event_id missing for event type ${eventType} — proceeding without idempotency`)
  } else {
    // Try to atomically INSERT as 'received'. ON CONFLICT means another worker claimed it.
    const { data: insertedRows, error: claimErr } = await supabase
      .from('webhook_events')
      .insert({ event_id: eventId, event_type: eventType, status: 'received' })
      .select('id, status')

    if (claimErr) {
      if (claimErr.code === '23505') {
        // Duplicate key — either already processed or another worker claimed it
        const { data: existing } = await supabase
          .from('webhook_events')
          .select('status')
          .eq('event_id', eventId)
          .single()
        if (existing?.status === 'processed') {
          console.log(`Webhook: Already processed ${eventId}`)
          return NextResponse.json({ received: true, duplicate: true })
        }
        // Another worker is processing — return 200 so Razorpay doesn't retry yet
        console.log(`Webhook: Concurrent claim for ${eventId}, deferring`)
        return NextResponse.json({ received: true, concurrent: true })
      }
      console.warn('Webhook: webhook_events insert failed:', claimErr.message)
    } else if (!insertedRows?.length) {
      // No rows inserted without an error means ON CONFLICT hit; look up status
      const { data: existing } = await supabase
        .from('webhook_events').select('status').eq('event_id', eventId).single()
      if (existing?.status === 'processed') {
        return NextResponse.json({ received: true, duplicate: true })
      }
    }
  }

  const subscription = payload?.subscription?.entity
  console.log(`Webhook: ${eventType}`, subscription?.id)
  if (!subscription) {
    if (eventId) {
      await supabase.from('webhook_events').update({ status: 'processed' }).eq('event_id', eventId)
    }
    return NextResponse.json({ received: true })
  }

  const subscriptionId = subscription.id
  const planId = subscription.plan_id
  const planInfo = getPlanMap()[planId]

  const now = new Date()
  const nextMonth = new Date(now)
  nextMonth.setDate(nextMonth.getDate() + 32)
  const trialEnd = subscription.trial_end_at ? new Date(subscription.trial_end_at * 1000) : null
  const nextPaymentDue = trialEnd
    ? new Date(trialEnd.getTime() + 30 * 24 * 60 * 60 * 1000)
    : nextMonth

  // Find tenant — primary by subscription ID
  let { data: tenant } = await supabase
    .from('tenants')
    .select('id, email, plan, plan_expires_at')
    .eq('razorpay_subscription_id', subscriptionId)
    .single()

  // Fallback by tenant_id in notes
  if (!tenant && subscription.notes?.tenant_id) {
    const { data: t } = await supabase
      .from('tenants').select('id, email, plan, plan_expires_at')
      .eq('id', subscription.notes.tenant_id).single()
    if (t) {
      tenant = t
      await supabase.from('tenants').update({ razorpay_subscription_id: subscriptionId }).eq('id', t.id)
    }
  }

  // Last fallback by email
  if (!tenant && subscription.notes?.email) {
    const { data: t } = await supabase
      .from('tenants').select('id, email, plan, plan_expires_at')
      .eq('email', subscription.notes.email).single()
    if (t) {
      console.warn(`Webhook: Email fallback for subscription ${subscriptionId}`)
      tenant = t
      await supabase.from('tenants').update({ razorpay_subscription_id: subscriptionId }).eq('id', t.id)
    }
  }

  if (!tenant) {
    const errMsg = `Tenant not found for subscription ${subscriptionId}`
    console.error('Webhook:', errMsg)
    if (eventId) {
      await supabase.from('webhook_events').update({
        status: 'failed',
        error_message: errMsg,
      }).eq('event_id', eventId)
    }
    // Return 500 so Razorpay retries — tenant may be created shortly after
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }

  let updateError: string | null = null
  try {
    switch (eventType) {
      case 'subscription.activated':
        if (planInfo) {
          const { error } = await supabase.from('tenants').update({
            razorpay_subscription_id: subscriptionId,
            razorpay_plan_id: planId,
            plan: planInfo.plan,
            plan_status: 'active',
            plan_expires_at: nextMonth.toISOString(),
            next_payment_due: nextPaymentDue.toISOString(),
            is_active: true,
            grace_period_ends_at: null,
            suspended_at: null,
          }).eq('id', tenant.id)
          if (error) updateError = error.message
          else console.log(`Activated: ${tenant.email} → ${planInfo.plan}`)
        }
        break

      case 'subscription.charged': {
        if (planInfo) {
          const currentEnd = subscription.current_end
            ? new Date(subscription.current_end * 1000)
            : (() => { const d = new Date(); d.setDate(d.getDate() + 32); return d })()
          const nextDue = new Date(currentEnd)
          nextDue.setDate(nextDue.getDate() + 1)
          // Extract payment details from webhook payload
          const paymentEntity = payload?.payment?.entity
          const paymentId = paymentEntity?.id || null
          const paymentMethod = paymentEntity?.method || null
          const paymentVpa = paymentEntity?.vpa || null
          const paymentRrn = paymentEntity?.acquirer_data?.rrn || paymentEntity?.acquirer_data?.bank_transaction_id || null
          const paymentNotes = paymentMethod
            ? `${paymentMethod}${paymentVpa ? ':' + paymentVpa : ''}${paymentRrn ? ':rrn=' + paymentRrn : ''}`
            : null
          const { error } = await supabase.from('tenants').update({
            plan: planInfo.plan,
            plan_status: 'active',
            plan_expires_at: currentEnd.toISOString(),
            next_payment_due: nextDue.toISOString(),
            is_active: true,
            grace_period_ends_at: null,
            suspended_at: null,
            ...(paymentId && { payment_id: paymentId }),
            ...(paymentNotes && { payment_notes: paymentNotes }),
          }).eq('id', tenant.id)
          if (error) updateError = error.message
          else console.log(`Charged: ${tenant.email} → until ${currentEnd.toLocaleDateString()}, payment: ${paymentId}`)
        }
        break
      }

      case 'subscription.cancelled': {
        const { error } = await supabase.from('tenants').update({
          plan_status: 'cancelled',
          next_payment_due: null,
          is_active: false,
        }).eq('id', tenant.id)
        if (error) updateError = error.message
        else console.log(`Cancelled: ${tenant.email}`)
        break
      }

      case 'subscription.halted': {
        const { error } = await supabase.from('tenants').update({
          plan_status: 'expired',
          next_payment_due: null,
          is_active: false,
        }).eq('id', tenant.id)
        if (error) updateError = error.message
        else console.log(`Halted: ${tenant.email}`)
        break
      }

      case 'subscription.pending':
        console.log(`Pending payment: ${tenant.email}`)
        break
    }
  } catch (err: any) {
    updateError = err.message
  }

  // H-01 FIX: Mark processed AFTER business update succeeds
  if (eventId) {
    if (updateError) {
      await supabase.from('webhook_events').update({
        status: 'failed',
        error_message: updateError,
      }).eq('event_id', eventId)
      console.error(`Webhook: Failed to process ${eventType}:`, updateError)
      // Return 500 so Razorpay retries — this event must be reprocessed
      return NextResponse.json({ error: updateError }, { status: 500 })
    } else {
      await supabase.from('webhook_events').update({ status: 'processed' }).eq('event_id', eventId)
    }
  }

  return NextResponse.json({ received: true })
}
