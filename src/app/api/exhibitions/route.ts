// src/app/api/exhibitions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getTenantId(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  const { data: tenant } = await supabase.from('tenants').select('id').eq('owner_id', user.id).single()
  return tenant?.id || null
}

export async function GET(req: NextRequest) {
  const tenantId = await getTenantId(req)
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch exhibitions
  const { data: exhibitions, error } = await supabase
    .from('exhibitions')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('start_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Aggregate total_sales from sales table for each exhibition
  const { data: salesTotals } = await supabase
    .from('sales')
    .select('exhibition_id, final_amount')
    .eq('tenant_id', tenantId)
    .not('exhibition_id', 'is', null)

  // Build a map: exhibition_id -> total
  const totalsMap: Record<string, number> = {}
  for (const s of salesTotals || []) {
    if (s.exhibition_id) {
      totalsMap[s.exhibition_id] = (totalsMap[s.exhibition_id] || 0) + Number(s.final_amount || 0)
    }
  }

  // Attach computed total_sales to each exhibition
  const enriched = (exhibitions || []).map(ex => ({
    ...ex,
    total_sales: totalsMap[ex.id] || 0,
  }))

  return NextResponse.json({ exhibitions: enriched })
}

export async function POST(req: NextRequest) {
  const tenantId = await getTenantId(req)
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, id, ...fields } = body

  // Remove total_sales if sent — it's computed, not stored
  delete fields.total_sales

  if (action === 'create') {
    const { data, error } = await supabase
      .from('exhibitions')
      .insert({ tenant_id: tenantId, ...fields })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ exhibition: data })
  }

  if (action === 'update') {
    const { data, error } = await supabase
      .from('exhibitions')
      .update(fields)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ exhibition: data })
  }

  if (action === 'delete') {
    const { error } = await supabase
      .from('exhibitions')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
