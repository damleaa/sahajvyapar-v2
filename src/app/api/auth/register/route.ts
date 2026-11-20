import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminSupabaseClient } from '@supabase/supabase-js'

// C-03 FIX: Plan is ALWAYS hardcoded to 'starter' server-side.
// Client-submitted plan value is completely ignored.
// M-06 FIX: HTML-escape all user-controlled values in alert email.

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function validateLength(val: string | undefined, max: number): boolean {
  return !val || val.length <= max
}

async function sendNewUserAlert(businessName: string, ownerName: string, email: string, phone: string) {
  const resendKey = process.env.RESEND_API_KEY
  const alertEmail = process.env.ADMIN_ALERT_EMAIL
  if (!resendKey || !alertEmail) return

  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' })

  const sBusiness = escapeHtml(businessName)
  const sOwner = escapeHtml(ownerName || '—')
  const sEmail = escapeHtml(email)
  const sPhone = escapeHtml(phone || '—')

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'SahajVyapar <noreply@sahajvyapar.in>',
      to: alertEmail,
      subject: `New signup: ${sBusiness}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:24px;border-radius:12px">
          <h2 style="color:#60a5fa;margin-top:0">New User Registered</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:6px 0;color:#94a3b8;width:120px">Business</td><td style="padding:6px 0;color:#fff;font-weight:600">${sBusiness}</td></tr>
            <tr><td style="padding:6px 0;color:#94a3b8">Owner</td><td style="padding:6px 0;color:#fff">${sOwner}</td></tr>
            <tr><td style="padding:6px 0;color:#94a3b8">Email</td><td style="padding:6px 0;color:#60a5fa">${sEmail}</td></tr>
            <tr><td style="padding:6px 0;color:#94a3b8">Phone</td><td style="padding:6px 0;color:#fff">${sPhone}</td></tr>
            <tr><td style="padding:6px 0;color:#94a3b8">Time</td><td style="padding:6px 0;color:#94a3b8">${now} IST</td></tr>
          </table>
          <p style="margin-top:20px;font-size:12px;color:#475569">Trial period: 7 days · Plan: Starter</p>
        </div>
      `,
    }),
  }).catch(err => console.error('Alert email failed:', err))
}

function getServiceClient() {
  return createAdminSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // Destructure — but DO NOT use `plan` from body (C-03)
    const { business_name, owner_name, email, phone } = body

    // Input validation
    if (!business_name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (!validateLength(business_name, 200) || !validateLength(owner_name, 200) ||
        !validateLength(email, 254) || !validateLength(phone, 20)) {
      return NextResponse.json({ error: 'Input too long' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Step 1: Get verified user identity from server-side cookie session
    // cookieClient runs as the authenticated user — auth.uid() will return their UID
    const cookieClient = await createClient()
    const { data: { user: cookieUser } } = await cookieClient.auth.getUser()

    // Step 2: Also accept a valid JWT Bearer token (mobile/API clients)
    let verifiedUserId: string | null = cookieUser?.id || null

    if (!verifiedUserId) {
      const authHeader = req.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '')
        const serviceClient = getServiceClient()
        const { data: { user: jwtUser } } = await serviceClient.auth.getUser(token)
        if (jwtUser?.id) verifiedUserId = jwtUser.id
      }
    }

    if (!verifiedUserId) {
      return NextResponse.json({ error: 'Could not verify identity. Please sign in again.' }, { status: 401 })
    }

    // Check for existing tenant via service-role (bypass RLS for read)
    const serviceClient = getServiceClient()
    const { data: existing } = await serviceClient
      .from('tenants')
      .select('id')
      .eq('owner_id', verifiedUserId)
      .single()

    if (existing) {
      return NextResponse.json({ success: true, tenant_id: existing.id })
    }

    // PRODUCTION FIX: Call initialize_tenant() RPC via the AUTHENTICATED cookie client,
    // NOT the service-role client. The RPC is SECURITY DEFINER, so it runs as the
    // DB owner, but auth.uid() inside it reflects the JWT of the CALLING client.
    // Service-role client has no JWT → auth.uid() returns NULL → RPC throws "Not authenticated".
    // Cookie client carries the user's session JWT → auth.uid() works correctly.
    //
    // RPC signature: initialize_tenant(p_business_name TEXT, p_owner_name TEXT, p_email TEXT, p_phone TEXT)
    const { data: rpcResult, error: rpcError } = await cookieClient.rpc('initialize_tenant', {
      p_business_name: business_name.trim(),
      p_owner_name:    (owner_name || '').trim(),
      p_email:         email.toLowerCase().trim(),
      p_phone:         (phone || '').trim() || null,
    })

    if (!rpcError && rpcResult) {
      const tenantId = (rpcResult as any)?.tenant_id
      if (tenantId) {
        // Fire alert email (non-blocking)
        sendNewUserAlert(business_name, owner_name || '', email, phone || '')
        return NextResponse.json({ success: true, tenant_id: tenantId })
      }
    }

    // Fallback: RPC not yet deployed or failed for unexpected reason.
    // Use service-role for inserts (tenants table INSERT RLS requires service-role).
    // This path is non-atomic but each insert is idempotent-safe given the duplicate check above.
    if (rpcError) {
      console.warn('initialize_tenant RPC failed, using non-atomic fallback:', rpcError.message)
    }

    // Auto-calculate financial year (Indian FY: Apr–Mar)
    const now = new Date()
    const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
    const financialYear = `${fyStartYear}-${String(fyStartYear + 1).slice(2)}`

    const { data: tenant, error: tenantError } = await serviceClient
      .from('tenants')
      .insert({
        owner_id:        verifiedUserId,
        business_name:   business_name.trim(),
        owner_name:      owner_name?.trim() || null,
        email:           email.toLowerCase().trim(),
        phone:           phone?.trim() || null,
        plan:            'starter',      // HARDCODED — never client-controlled
        plan_status:     'trial',
        plan_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        is_active:       true,
      })
      .select()
      .single()

    if (tenantError) {
      console.error('Tenant creation error:', tenantError)
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
    }

    // Default categories
    const defaultCategories = ['General', 'Products', 'Accessories']
    await serviceClient.from('categories').insert(
      defaultCategories.map(name => ({ tenant_id: tenant.id, name }))
    )

    // Business profile
    await serviceClient.from('business_profiles').insert({
      tenant_id:        tenant.id,
      invoice_prefix:   'INV',
      financial_year:   financialYear,
      invoice_counter:  0,
      state:            'Maharashtra',
    })

    sendNewUserAlert(business_name, owner_name || '', email, phone || '')
    return NextResponse.json({ success: true, tenant_id: tenant.id })

  } catch (err) {
    console.error('Register API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
