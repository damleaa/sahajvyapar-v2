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
    .select('id, business_name, email, plan, plan_status, plan_expires_at, created_at, is_active, payment_id, notes')
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
    const { data: tenant } = await supabase.from('tenants').select('plan_expires_at').eq('id', tenant_id).single()
    const currentExpiry = new Date(tenant?.plan_expires_at || Date.now())
    const base = currentExpiry > new Date() ? currentExpiry : new Date()
    base.setDate(base.getDate() + Number(days || 30))
    await supabase.from('tenants').update({ plan_expires_at: base.toISOString(), plan_status: 'active' }).eq('id', tenant_id)
    return NextResponse.json({ success: true, new_expiry: base.toISOString() })
  }

  if (action === 'suspend') {
    await supabase.from('tenants').update({ plan_status: 'cancelled', is_active: false }).eq('id', tenant_id)
    return NextResponse.json({ success: true })
  }

  if (action === 'activate') {
    await supabase.from('tenants').update({ plan_status: 'active', is_active: true }).eq('id', tenant_id)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
