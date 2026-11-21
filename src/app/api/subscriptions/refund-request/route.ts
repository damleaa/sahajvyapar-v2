import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireTenantAccess } from '@/lib/tenant-guard'

async function fetchLatestRazorpayPayment(subscriptionId: string) {
  const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!key || !secret) return null
  try {
    const auth = Buffer.from(`${key}:${secret}`).toString('base64')
    const res = await fetch(`https://api.razorpay.com/v1/payments?subscription_id=${subscriptionId}&count=10`, {
      headers: { 'Authorization': `Basic ${auth}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    // payments are newest-first; find the last captured one
    const payments: any[] = data.items || []
    const captured = payments.find((p: any) => p.status === 'captured')
    if (!captured) return null
    return {
      paymentId: captured.id,
      amount: captured.amount / 100,
      method: captured.method,
      bankRrn: captured.acquirer_data?.rrn || captured.acquirer_data?.bank_transaction_id || '—',
      vpa: captured.vpa || null,
      cardNetwork: captured.card?.network || null,
      createdAt: new Date(captured.created_at * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    }
  } catch {
    return null
  }
}

async function sendRefundRequestEmail(tenant: any, reason: string) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return

  const planAmount: Record<string, number> = { starter: 399, growth: 699, pro: 999 }
  const amount = planAmount[tenant.plan] || 0
  const paidOn = tenant.plan_expires_at
    ? new Date(new Date(tenant.plan_expires_at).getTime() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')
    : 'Unknown'

  // Try to get richer payment details from Razorpay
  const payment = tenant.razorpay_subscription_id
    ? await fetchLatestRazorpayPayment(tenant.razorpay_subscription_id)
    : null

  const methodLabel = payment
    ? payment.method === 'upi'
      ? `UPI${payment.vpa ? ` (${payment.vpa})` : ''}`
      : payment.method === 'card'
      ? `Card${payment.cardNetwork ? ` (${payment.cardNetwork})` : ''}`
      : payment.method
    : '—'

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'SahajVyapar <noreply@sahajvyapar.in>',
      to: ['support@sahajvyapar.in', 'investment.aadamle@gmail.com'],
      reply_to: tenant.email,
      subject: `Refund Request — ${tenant.business_name} (${tenant.plan} plan, Rs.${amount})`,
      html: `
        <h2>Refund Request Received</h2>
        <table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px;">
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;background:#f9f9f9;" colspan="2">Customer Details</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Business</td><td style="padding:8px;border:1px solid #ddd;">${tenant.business_name}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Owner</td><td style="padding:8px;border:1px solid #ddd;">${tenant.owner_name}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Email</td><td style="padding:8px;border:1px solid #ddd;">${tenant.email}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Plan</td><td style="padding:8px;border:1px solid #ddd;">${tenant.plan} — Rs.${amount}/month</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;background:#f9f9f9;" colspan="2">Payment Details</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Razorpay Subscription ID</td><td style="padding:8px;border:1px solid #ddd;font-family:monospace;">${tenant.razorpay_subscription_id || '—'}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Razorpay Payment ID</td><td style="padding:8px;border:1px solid #ddd;font-family:monospace;">${payment?.paymentId || '—'}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Payment Amount</td><td style="padding:8px;border:1px solid #ddd;">Rs.${payment?.amount ?? amount}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Payment Method</td><td style="padding:8px;border:1px solid #ddd;">${methodLabel}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Bank RRN</td><td style="padding:8px;border:1px solid #ddd;font-family:monospace;">${payment?.bankRrn ?? '—'}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Payment Date</td><td style="padding:8px;border:1px solid #ddd;">${payment?.createdAt ?? paidOn}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;background:#f9f9f9;" colspan="2">Refund Request</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Reason</td><td style="padding:8px;border:1px solid #ddd;">${reason || 'Not provided'}</td></tr>
        </table>
        <p style="margin-top:16px;color:#555;font-size:13px;">
          To process: open Razorpay Dashboard → Transactions → search Payment ID <strong>${payment?.paymentId || tenant.razorpay_subscription_id}</strong> → click "Issue refund" → enter Rs.${amount}.
        </p>
        <p style="color:#999;font-size:12px;">This request was submitted from within the SahajVyapar app.</p>
      `,
    }),
  })
}

export async function POST(req: NextRequest) {
  const guard = await requireTenantAccess()
  if (!guard.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reason } = await req.json()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, business_name, owner_name, email, plan, plan_status, plan_expires_at, razorpay_subscription_id')
    .eq('id', guard.tenant.id)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  // Only allow refund request if active paid plan (not trial)
  if (tenant.plan_status !== 'active') {
    return NextResponse.json({ error: 'No active paid plan to refund.' }, { status: 400 })
  }

  // Check within 7-day window from payment (plan_expires_at - 30 days = approx payment date)
  const expiresAt = tenant.plan_expires_at ? new Date(tenant.plan_expires_at) : null
  if (expiresAt) {
    const paymentDate = new Date(expiresAt.getTime() - 30 * 24 * 60 * 60 * 1000)
    const daysSincePayment = Math.floor((Date.now() - paymentDate.getTime()) / 864e5)
    if (daysSincePayment > 7) {
      return NextResponse.json({
        error: 'Refund window has passed. Refunds are only available within 7 days of payment.'
      }, { status: 400 })
    }
  }

  try {
    await sendRefundRequestEmail(tenant, reason)
    return NextResponse.json({ ok: true, message: 'Refund request submitted. We will respond within 2 business days.' })
  } catch (e: any) {
    console.error('Refund request email failed:', e.message)
    return NextResponse.json({ error: 'Failed to submit request. Please email support@sahajvyapar.in directly.' }, { status: 500 })
  }
}
