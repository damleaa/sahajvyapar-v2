import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })
  const { data: tenant } = await supabase.from('tenants').select('id, plan').eq('owner_id', user.id).single()
  if (!tenant) return NextResponse.json([])
  if (tenant.plan === 'starter') return NextResponse.json({ locked: true })

  const { data } = await supabase.from('suppliers').select('*').eq('tenant_id', tenant.id).eq('is_active', true).order('name')
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: tenant } = await supabase.from('tenants').select('id, plan').eq('owner_id', user.id).single()
  if (!tenant) return NextResponse.json({ error: 'No tenant' }, { status: 403 })
  if (tenant.plan === 'starter') return NextResponse.json({ error: 'Upgrade to Growth to manage suppliers' }, { status: 403 })

  const body = await req.json()
  const { action, ...data } = body

  if (action === 'save') {
    const payload = {
      tenant_id: tenant.id, name: data.name, phone: data.phone || null,
      email: data.email || null, gstin: data.gstin || null, address: data.address || null,
      city: data.city || null, state: data.state || null, payment_terms: data.payment_terms || null, notes: data.notes || null,
    }
    if (data.id) {
      await supabase.from('suppliers').update(payload).eq('id', data.id).eq('tenant_id', tenant.id)
    } else {
      await supabase.from('suppliers').insert(payload)
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
