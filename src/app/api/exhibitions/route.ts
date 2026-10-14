// src/app/api/exhibitions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ exhibitions: [] }, { status: 401 })

  const { data: tenant } = await supabase.from('tenants').select('id').eq('owner_id', user.id).single()
  if (!tenant) return NextResponse.json({ exhibitions: [] })

  const { data: exhibitions, error } = await supabase
    .from('exhibitions')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('start_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Aggregate total_sales from sales table
  const { data: salesTotals } = await supabase
    .from('sales')
    .select('exhibition_id, final_amount')
    .eq('tenant_id', tenant.id)
    .not('exhibition_id', 'is', null)

  const totalsMap: Record<string, number> = {}
  for (const s of salesTotals || []) {
    if (s.exhibition_id) {
      totalsMap[s.exhibition_id] = (totalsMap[s.exhibition_id] || 0) + Number(s.final_amount || 0)
    }
  }

  const enriched = (exhibitions || []).map(ex => ({
    ...ex,
    total_sales: totalsMap[ex.id] || 0,
  }))

  return NextResponse.json({ exhibitions: enriched })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenant } = await supabase.from('tenants').select('id').eq('owner_id', user.id).single()
  if (!tenant) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const body = await req.json()
  const { action, id, ...fields } = body
  delete fields.total_sales  // computed, never stored

  if (action === 'create') {
    const { data, error } = await supabase
      .from('exhibitions')
      .insert({ tenant_id: tenant.id, ...fields })
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ exhibition: data })
  }

  if (action === 'update') {
    const { data, error } = await supabase
      .from('exhibitions')
      .update(fields)
      .eq('id', id).eq('tenant_id', tenant.id)
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ exhibition: data })
  }

  if (action === 'delete') {
    const { error } = await supabase
      .from('exhibitions')
      .delete()
      .eq('id', id).eq('tenant_id', tenant.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
