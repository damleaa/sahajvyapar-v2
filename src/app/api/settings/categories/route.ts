import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })
  const { data: tenant } = await supabase.from('tenants').select('id').eq('owner_id', user.id).single()
  if (!tenant) return NextResponse.json([])
  const { data } = await supabase.from('categories').select('*').eq('tenant_id', tenant.id).order('name')
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: tenant } = await supabase.from('tenants').select('id, plan').eq('owner_id', user.id).single()
  if (!tenant) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const { action, name, id } = await req.json()

  if (action === 'save') {
    if (tenant.plan === 'starter') {
      const { count } = await supabase.from('categories').select('id', { count: 'exact' }).eq('tenant_id', tenant.id)
      if ((count || 0) >= 5) return NextResponse.json({ error: 'Starter plan: max 5 categories. Upgrade to Growth.' }, { status: 403 })
    }
    await supabase.from('categories').insert({ tenant_id: tenant.id, name })
    return NextResponse.json({ success: true })
  }

  if (action === 'delete') {
    await supabase.from('categories').delete().eq('id', id).eq('tenant_id', tenant.id)
    return NextResponse.json({ success: true })
  }

  // Global categories for autosuggest
  if (action === 'global') {
    const { data } = await supabase.from('global_categories').select('*').eq('is_active', true).order('name')
    return NextResponse.json(data || [])
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
