// src/app/api/admin/subscription/route.ts
// F-01: Uses verifyAdminSession() — no x-admin-key header accepted.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminSession } from '@/lib/admin-auth'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  if (!await verifyAdminSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = getAdminClient()
  const { data } = await supabase
    .from('tenants')
    .select(`
      id, business_name, email, owner_name, plan, plan_status,
      plan_expires_at, next_payment_due, created_at, is_active,
      payment_id, notes, razorpay_subscription_id, razorpay_plan_id,
      deleted_at, deletion_reason, suspended_at, grace_period_ends_at,
      beta_accepted_at, beta_accepted_version
    `)
    .order('created_at', { ascending: false })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  if (!await verifyAdminSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getAdminClient()
  const body = await req.json()
  const { action, tenant_id, email } = body

  if (action === 'update_subscription') {
    const { plan, plan_status, expires_at, days, payment_id, notes } = body
    const updateData: any = {}
    if (plan) updateData.plan = plan
    if (plan_status) updateData.plan_status = plan_status
    if (plan_status === 'active') updateData.is_active = true
    if (expires_at) {
      updateData.plan_expires_at = new Date(expires_at).toISOString()
    } else if (days) {
      const d = new Date()
      d.setDate(d.getDate() + Number(days))
      updateData.plan_expires_at = d.toISOString()
    }
    if (payment_id) updateData.payment_id = payment_id
    if (notes) updateData.notes = notes
    const { error } = await supabase.from('tenants').update(updateData).eq('id', tenant_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'extend') {
    const { days, payment_id, notes } = body
    if (!payment_id) return NextResponse.json({ error: 'Payment reference required' }, { status: 400 })
    const { data: tenant } = await supabase.from('tenants').select('plan_expires_at').eq('id', tenant_id).single()
    const base = new Date(tenant?.plan_expires_at || Date.now())
    if (base < new Date()) base.setTime(Date.now())
    base.setDate(base.getDate() + Number(days || 30))
    await supabase.from('tenants').update({
      plan_expires_at: base.toISOString(),
      plan_status: 'active',
      is_active: true,
      payment_id,
      notes,
      grace_period_ends_at: null,
      suspended_at: null,
    }).eq('id', tenant_id)
    return NextResponse.json({ success: true, new_expiry: base.toISOString() })
  }

  if (action === 'soft_delete') {
    const { reason } = body
    if (!reason) return NextResponse.json({ error: 'Reason required' }, { status: 400 })
    await supabase.from('tenants').update({
      deleted_at: new Date().toISOString(),
      deletion_reason: reason,
      is_active: false,
    }).eq('id', tenant_id)
    return NextResponse.json({ success: true })
  }

  if (action === 'restore') {
    await supabase.from('tenants').update({
      deleted_at: null,
      deletion_reason: null,
      is_active: true,
      plan_status: 'trial',
    }).eq('id', tenant_id)
    return NextResponse.json({ success: true })
  }

  if (action === 'reset_password') {
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    // Fetch tenant details for the notification email
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('business_name, owner_name, plan')
      .eq('id', tenant_id)
      .single()

    const { error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: 'https://sahajvyapar.in/reset-password' }
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Notify admins that a reset link was sent
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' })
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'SahajVyapar <noreply@sahajvyapar.in>',
          to: ['support@sahajvyapar.in', 'investment.aadamle@gmail.com'],
          subject: `Password Reset Sent — ${tenantData?.business_name || email}`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;padding:24px;background:#0f172a;color:#e2e8f0;border-radius:12px;">
              <h2 style="color:#60a5fa;margin-top:0;">Password Reset Link Sent</h2>
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:6px 0;color:#94a3b8;width:120px;">Business</td><td style="color:#fff;font-weight:600;">${tenantData?.business_name || '—'}</td></tr>
                <tr><td style="padding:6px 0;color:#94a3b8;">Owner</td><td style="color:#fff;">${tenantData?.owner_name || '—'}</td></tr>
                <tr><td style="padding:6px 0;color:#94a3b8;">Email</td><td style="color:#60a5fa;">${email}</td></tr>
                <tr><td style="padding:6px 0;color:#94a3b8;">Plan</td><td style="color:#fff;">${tenantData?.plan || '—'}</td></tr>
                <tr><td style="padding:6px 0;color:#94a3b8;">Sent at</td><td style="color:#94a3b8;">${now} IST</td></tr>
              </table>
              <p style="color:#475569;font-size:12px;margin-top:16px;">Reset link redirects to https://sahajvyapar.in/reset-password</p>
            </div>
          `,
        }),
      }).catch(e => console.error('Admin reset notification failed:', e.message))
    }

    return NextResponse.json({ success: true, message: `Password reset email sent to ${email}` })
  }

  if (action === 'set_password') {
    const { new_password } = body
    if (!tenant_id) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 })
    // M-03 FIX: Require explicit new_password — no default fallback
    if (!new_password || new_password.length < 8) {
      return NextResponse.json({ error: 'new_password required (min 8 chars)' }, { status: 400 })
    }
    const { data: tenant } = await supabase.from('tenants').select('owner_id, email').eq('id', tenant_id).single()
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    const password = new_password
    const { error } = await supabase.auth.admin.updateUserById(tenant.owner_id, { password })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, message: `Password set for ${tenant.email}` })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
