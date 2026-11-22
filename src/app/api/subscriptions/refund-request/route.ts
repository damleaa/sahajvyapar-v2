import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireTenantAccess } from '@/lib/tenant-guard'

async function sendRefundRequestEmail(tenant: any, reason: string) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return

  const planAmount: Record<string, number> = { starter: 399, growth: 699, pro: 999 }
  const amount = planAmount[tenant.plan] || 0
  const paidOn = tenant.plan_expires_at
    ? new Date(new Date(tenant.plan_expires_at).getTime() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')
    : 'Unknown'

  // Parse payment details stored by webhook (format: "method:vpa:rrn=xxx")
  const paymentId = tenant.payment_id && tenant.payment_id.startsWith('pay_') ? tenant.payment_id : '—'
  const notes = tenant.payment_notes || ''
  const notesParts = notes.split(':')
  const methodRaw = notesParts[0] || ''
  const vpa = notesParts[1] || null
  const rrnPart = notesParts.find((p: string) => p.startsWith('rrn='))
  const bankRrn = rrnPart ? rrnPart.replace('rrn=', '') : '—'
  const methodLabel = methodRaw === 'upi'
    ? `UPI${vpa ? ` (${vpa})` : ''}`
    : methodRaw === 'card' ? 'Card'
    : methodRaw || '—'

  const adminEmailHtml = `
    <h2>Refund Request Received</h2>
    <table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px;">
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;background:#f9f9f9;" colspan="2">Customer Details</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Business</td><td style="padding:8px;border:1px solid #ddd;">${tenant.business_name}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Owner</td><td style="padding:8px;border:1px solid #ddd;">${tenant.owner_name}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Email</td><td style="padding:8px;border:1px solid #ddd;">${tenant.email}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Plan</td><td style="padding:8px;border:1px solid #ddd;">${tenant.plan} — Rs.${amount}/month</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;background:#f9f9f9;" colspan="2">Payment Details</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Razorpay Subscription ID</td><td style="padding:8px;border:1px solid #ddd;font-family:monospace;">${tenant.razorpay_subscription_id || '—'}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Razorpay Payment ID</td><td style="padding:8px;border:1px solid #ddd;font-family:monospace;">${paymentId}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Payment Amount</td><td style="padding:8px;border:1px solid #ddd;">Rs.${amount}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Payment Method</td><td style="padding:8px;border:1px solid #ddd;">${methodLabel}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Bank RRN</td><td style="padding:8px;border:1px solid #ddd;font-family:monospace;">${bankRrn}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Approx. Payment Date</td><td style="padding:8px;border:1px solid #ddd;">${paidOn}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;background:#f9f9f9;" colspan="2">Refund Request</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Reason</td><td style="padding:8px;border:1px solid #ddd;">${reason || 'Not provided'}</td></tr>
    </table>
    <p style="margin-top:16px;color:#555;font-size:13px;">
      To process: open Razorpay Dashboard → Transactions → search Payment ID <strong>${paymentId !== '—' ? paymentId : tenant.razorpay_subscription_id}</strong> → click "Issue refund" → enter Rs.${amount}.
    </p>
    <p style="color:#999;font-size:12px;">This request was submitted from within the SahajVyapar app.</p>
  `

  const customerEmailHtml = `
    <div style="font-family:sans-serif;font-size:14px;max-width:600px;">
      <h2 style="color:#2d7a4f;">Refund Request Received</h2>
      <p>Dear ${tenant.owner_name},</p>
      <p>We have received your refund request for the <strong>${tenant.plan} plan (Rs.${amount})</strong>. Here is what to expect:</p>
      <table style="border-collapse:collapse;width:100%;font-size:14px;margin:16px 0;">
        <tr>
          <td style="padding:10px 12px;border:1px solid #ddd;font-weight:bold;width:40%;">Refund Amount</td>
          <td style="padding:10px 12px;border:1px solid #ddd;">Rs.${amount}</td>
        </tr>
        <tr style="background:#f9f9f9;">
          <td style="padding:10px 12px;border:1px solid #ddd;font-weight:bold;">Request Received</td>
          <td style="padding:10px 12px;border:1px solid #ddd;">${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;border:1px solid #ddd;font-weight:bold;">Your Reason</td>
          <td style="padding:10px 12px;border:1px solid #ddd;">${reason || 'Not provided'}</td>
        </tr>
      </table>
      <h3 style="color:#555;">Refund Timeline</h3>
      <table style="border-collapse:collapse;width:100%;font-size:14px;">
        <tr>
          <td style="padding:10px 12px;border:1px solid #ddd;font-weight:bold;background:#fff8e1;">Step 1 — Review (1-2 business days)</td>
          <td style="padding:10px 12px;border:1px solid #ddd;">Our team reviews your request and initiates the refund in Razorpay.</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;border:1px solid #ddd;font-weight:bold;background:#fff8e1;">Step 2 — Processing (3-5 working days)</td>
          <td style="padding:10px 12px;border:1px solid #ddd;">Razorpay processes the refund to your payment source.</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;border:1px solid #ddd;font-weight:bold;background:#e8f5e9;">Step 3 — Credited (5-7 working days)</td>
          <td style="padding:10px 12px;border:1px solid #ddd;">Rs.${amount} is credited to your bank account / UPI / card.</td>
        </tr>
      </table>
      <p style="margin-top:20px;color:#555;">If you have any questions, reply to this email or write to <a href="mailto:support@sahajvyapar.in">support@sahajvyapar.in</a>.</p>
      <p style="color:#999;font-size:12px;margin-top:24px;">— SahajVyapar Support Team</p>
    </div>
  `

  // Admin notification
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'SahajVyapar <noreply@sahajvyapar.in>',
      to: ['support@sahajvyapar.in', 'investment.aadamle@gmail.com', 'sahajvyapar@gmail.com'],
      reply_to: tenant.email,
      subject: `Refund Request — ${tenant.business_name} (${tenant.plan} plan, Rs.${amount})`,
      html: adminEmailHtml,
    }),
  })

  // Customer confirmation
  if (tenant.email) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'SahajVyapar Support <noreply@sahajvyapar.in>',
        to: [tenant.email],
        subject: `Your Refund Request — Rs.${amount} (${tenant.plan} plan)`,
        html: customerEmailHtml,
      }),
    }).catch(e => console.error('Customer refund confirmation email failed:', e.message))
  }
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
    .select('id, business_name, owner_name, email, plan, plan_status, plan_expires_at, razorpay_subscription_id, payment_id, payment_notes')
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
