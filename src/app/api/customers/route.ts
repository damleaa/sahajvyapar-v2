import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })
  const { data: tenant } = await supabase.from('tenants').select('id, plan').eq('owner_id', user.id).single()
  if (!tenant) return NextResponse.json([])
  if (tenant.plan === 'starter') return NextResponse.json({ locked: true })

  const { data } = await supabase
    .from('customers')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('name')
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: tenant } = await supabase.from('tenants').select('id, plan').eq('owner_id', user.id).single()
  if (!tenant) return NextResponse.json({ error: 'No tenant' }, { status: 403 })
  if (tenant.plan === 'starter') return NextResponse.json({ error: 'Upgrade to Growth to manage customers' }, { status: 403 })

  const body = await req.json()
  const { action, ...data } = body

  if (action === 'save') {
    const payload = { tenant_id: tenant.id, name: data.name, phone: data.phone || null, email: data.email || null, address: data.address || null, notes: data.notes || null }
    if (data.id) {
      await supabase.from('customers').update(payload).eq('id', data.id).eq('tenant_id', tenant.id)
    } else {
      await supabase.from('customers').insert(payload)
    }
    return NextResponse.json({ success: true })
  }

  if (action === 'ledger') {
    const { data: entries } = await supabase.from('customer_ledger').select('*').eq('customer_id', data.customer_id).order('created_at', { ascending: false })
    return NextResponse.json(entries || [])
  }

  if (action === 'record_payment') {
    const { customer_id, amount } = data
    const { data: cust } = await supabase.from('customers').select('credit_balance').eq('id', customer_id).single()
    const newBalance = Math.max(0, (cust?.credit_balance || 0) - Number(amount))
    await supabase.from('customers').update({ credit_balance: newBalance }).eq('id', customer_id)
    await supabase.from('customer_ledger').insert({
      tenant_id: tenant.id, customer_id, entry_type: 'payment',
      amount: Number(amount), note: data.note || 'Payment received',
    })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
