import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

async function sendNewUserAlert(businessName: string, ownerName: string, email: string, phone: string) {
  const resendKey = process.env.RESEND_API_KEY
  const alertEmail = process.env.ADMIN_ALERT_EMAIL || 'investment.aadamle@gmail.com'
  if (!resendKey) return // silently skip if not configured

  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' })

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'SahajVyapar <noreply@sahajvyapar.in>',
      to: alertEmail,
      subject: `🎉 New signup: ${businessName}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:24px;border-radius:12px">
          <h2 style="color:#60a5fa;margin-top:0">New User Registered 🎉</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:6px 0;color:#94a3b8;width:120px">Business</td><td style="padding:6px 0;color:#fff;font-weight:600">${businessName}</td></tr>
            <tr><td style="padding:6px 0;color:#94a3b8">Owner</td><td style="padding:6px 0;color:#fff">${ownerName || '—'}</td></tr>
            <tr><td style="padding:6px 0;color:#94a3b8">Email</td><td style="padding:6px 0;color:#60a5fa">${email}</td></tr>
            <tr><td style="padding:6px 0;color:#94a3b8">Phone</td><td style="padding:6px 0;color:#fff">${phone || '—'}</td></tr>
            <tr><td style="padding:6px 0;color:#94a3b8">Time</td><td style="padding:6px 0;color:#94a3b8">${now} IST</td></tr>
          </table>
          <p style="margin-top:20px;font-size:12px;color:#475569">Trial period: 7 days · Plan: Starter</p>
        </div>
      `,
    }),
  }).catch(err => console.error('Alert email failed:', err))
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { user_id, business_name, owner_name, email, phone, plan } = body

    if (!user_id || !business_name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Create tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        owner_id: user_id,
        business_name,
        owner_name,
        email,
        phone: phone || null,
        plan: plan || 'starter',
        plan_status: 'trial',
        plan_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single()

    if (tenantError) {
      console.error('Tenant creation error:', tenantError)
      return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 })
    }

    // Create default categories
    const defaultCategories = ['General', 'Products', 'Accessories']
    await supabase.from('categories').insert(
      defaultCategories.map(name => ({ tenant_id: tenant.id, name }))
    )

    // Create empty business profile
    await supabase.from('business_profiles').insert({
      tenant_id: tenant.id,
      invoice_prefix: 'INV',
      financial_year: '2025-26',
      state: 'Maharashtra',
    })

    // Fire alert email (non-blocking)
    sendNewUserAlert(business_name, owner_name, email, phone)

    return NextResponse.json({ success: true, tenant_id: tenant.id })
  } catch (err) {
    console.error('Register API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
