import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })
  const { data: tenant } = await supabase.from('tenants').select('id, plan').eq('owner_id', user.id).single()
  if (!tenant) return NextResponse.json([])
  if (tenant.plan === 'starter' || tenant.plan === 'growth') return NextResponse.json({ locked: true })
  const { data } = await supabase.from('exhibitions').select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: false })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: tenant } = await supabase.from('tenants').select('id, plan').eq('owner_id', user.id).single()
  if (!tenant) return NextResponse.json({ error: 'No tenant' }, { status: 403 })
  if (tenant.plan !== 'pro') return NextResponse.json({ error: 'Pro plan required for Exhibitions' }, { status: 403 })

  const body = await req.json()
  const { action, ...data } = body

  if (action === 'save') {
    const payload = {
      tenant_id: tenant.id,
      name: data.name,
      venue: data.venue || null,
      city: data.city || null,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      stall_cost: Number(data.stall_cost) || 0,
      other_expenses: Number(data.other_expenses) || 0,
      total_sales: Number(data.total_sales) || 0,
      status: data.status || 'upcoming',
      notes: data.notes || null,
    }
    if (data.id) {
      const { error } = await supabase.from('exhibitions').update(payload).eq('id', data.id).eq('tenant_id', tenant.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      const { error } = await supabase.from('exhibitions').insert(payload)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
