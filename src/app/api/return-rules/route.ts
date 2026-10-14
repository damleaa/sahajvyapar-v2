// src/app/api/return-rules/route.ts
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

  const { data, error } = await supabase
    .from('return_deduction_rules')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rules: data || [] })
}

export async function POST(req: NextRequest) {
  const tenantId = await getTenantId(req)
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, id, ...fields } = body

  if (action === 'create') {
    const { data, error } = await supabase
      .from('return_deduction_rules')
      .insert({ tenant_id: tenantId, ...fields })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ rule: data })
  }

  if (action === 'update') {
    const { data, error } = await supabase
      .from('return_deduction_rules')
      .update(fields)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ rule: data })
  }

  if (action === 'delete') {
    const { error } = await supabase
      .from('return_deduction_rules')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
