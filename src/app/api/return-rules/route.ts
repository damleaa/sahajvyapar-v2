// src/app/api/return-rules/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ rules: [] }, { status: 401 })

  const { data: tenant } = await supabase.from('tenants').select('id').eq('owner_id', user.id).single()
  if (!tenant) return NextResponse.json({ rules: [] })

  const { data, error } = await supabase
    .from('return_deduction_rules')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rules: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenant } = await supabase.from('tenants').select('id').eq('owner_id', user.id).single()
  if (!tenant) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const body = await req.json()
  const { action, id, ...fields } = body

  if (action === 'create') {
    const { data, error } = await supabase
      .from('return_deduction_rules')
      .insert({ tenant_id: tenant.id, ...fields })
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ rule: data })
  }

  if (action === 'update') {
    const { data, error } = await supabase
      .from('return_deduction_rules')
      .update(fields)
      .eq('id', id).eq('tenant_id', tenant.id)
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ rule: data })
  }

  if (action === 'delete') {
    const { error } = await supabase
      .from('return_deduction_rules')
      .delete()
      .eq('id', id).eq('tenant_id', tenant.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
