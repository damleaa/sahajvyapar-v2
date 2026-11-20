import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({}, { status: 401 })
  const { data: tenant } = await supabase.from('tenants').select('id').eq('owner_id', user.id).single()
  if (!tenant) return NextResponse.json({})
  const { data } = await supabase.from('business_profiles').select('*').eq('tenant_id', tenant.id).single()
  return NextResponse.json(data || {})
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: tenant } = await supabase.from('tenants').select('id').eq('owner_id', user.id).single()
  if (!tenant) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const body = await req.json()

  const { error } = await supabase.from('business_profiles').upsert({
    tenant_id: tenant.id,
    gstin: body.gstin || null,
    pan: body.pan || null,
    address: body.address || null,
    city: body.city || null,
    state: body.state || null,
    pincode: body.pincode || null,
    bank_name: body.bank_name || null,
    account_no: body.account_no || null,
    ifsc: body.ifsc || null,
    invoice_prefix: body.invoice_prefix || 'INV',
    financial_year: body.financial_year || '2025-26',
    logo_base64: body.logo_base64 || null,
  }, { onConflict: 'tenant_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
