import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function getAdminClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
}

export async function GET() {
  const supabase = await getAdminClient()
  const { data } = await supabase
    .from('tenants')
    .select('id, business_name, email, plan, plan_status, plan_expires_at, created_at, is_active, payment_id, notes, razorpay_subscription_id, deleted_at, deletion_reason')
    .order('created_at', { ascending: false })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const supabase = await getAdminClient()
  const body = await req.json()
  const { action, tenant_id, plan, plan_status, days, expires_at, payment_id, notes } = body

  if (action === 'update_subscription') {
    const updateData: any = {}
    if (plan) updateData.plan = plan
    if (plan_status) updateData.plan_status = plan_status
    if (expires_at) updateData.plan_expires_at = new Date(expires_at).toISOString()
    else if (days) {
      const newExpiry = new Date()
      newExpiry.setDate(newExpiry.getDate() + Number(days))
      updateData.plan_expires_at = newExpiry.toISOString()
    }
    if (payment_id) updateData.payment_id = payment_id
    if (notes) updateData.notes = notes
    const { error } = await supabase.from('tenants').update(updateData).eq('id', tenant_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'extend') {
    const { payment_id: ext_payment_id, notes: ext_notes } = body

    // ENFORCE: payment reference OR complimentary reason required
    if (!ext_payment_id || !ext_payment_id.trim()) {
      return NextResponse.json({
        error: 'Payment reference or complimentary code is required. Free extensions are not allowed.'
      }, { status: 400 })
    }

    if (!ext_notes || !ext_notes.trim()) {
      return NextResponse.json({
        error: 'Notes are required. Document the reason for this extension.'
      }, { status: 400 })
    }

    const { data: tenant } = await supabase.from('tenants').select('plan_expires_at').eq('id', tenant_id).single()
    const currentExpiry = new Date(tenant?.plan_expires_at || Date.now())
    const base = currentExpiry > new Date() ? currentExpiry : new Date()
    base.setDate(base.getDate() + Number(days || 30))

    await supabase.from('tenants').update({
      plan_expires_at: base.toISOString(),
      plan_status: 'active',
      is_active: true,
      payment_id: ext_payment_id,
      notes: ext_notes,
      grace_period_ends_at: null,
      suspended_at: null,
      suspension_reason: null,
      deleted_at: null,
      deletion_reason: null,
    }).eq('id', tenant_id)

    return NextResponse.json({ success: true, new_expiry: base.toISOString() })
  }

  // Soft delete with mandatory reason
  if (action === 'soft_delete') {
    const { reason } = body
    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: 'Deletion reason is mandatory.' }, { status: 400 })
    }

    await supabase.from('tenants').update({
      is_active: false,
      plan_status: 'cancelled',
      deleted_at: new Date().toISOString(),
      deletion_reason: reason.trim(),
      suspension_reason: `Deleted by admin: ${reason.trim()}`,
    }).eq('id', tenant_id)

    return NextResponse.json({ success: true })
  }

  // Restore soft-deleted account
  if (action === 'restore') {
    const { reason } = body
    await supabase.from('tenants').update({
      is_active: true,
      deleted_at: null,
      deletion_reason: null,
      suspended_at: null,
      suspension_reason: null,
      notes: `Restored by admin: ${reason || 'No reason provided'}`,
    }).eq('id', tenant_id)
    return NextResponse.json({ success: true })
  }

  if (action === 'suspend') {
    await supabase.from('tenants').update({ plan_status: 'cancelled', is_active: false }).eq('id', tenant_id)
    return NextResponse.json({ success: true })
  }

  if (action === 'activate') {
    await supabase.from('tenants').update({ plan_status: 'active', is_active: true }).eq('id', tenant_id)
    return NextResponse.json({ success: true })
  }

  // Admin-triggered password reset email
  if (action === 'reset_password') {
    const { email } = body
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    // Use Supabase Admin API to send reset email
    const { error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: 'https://sahajvyapar.in/reset-password',
      }
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, message: `Password reset email sent to ${email}` })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
