import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const saleId = searchParams.get('sale_id')
  if (!saleId) return NextResponse.json({ error: 'sale_id required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cookieStore = await cookies()
  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const { data: tenant } = await adminClient.from('tenants').select('id').eq('owner_id', user.id).single()
  if (!tenant) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  // Get sale + items
  const { data: sale } = await adminClient
    .from('sales')
    .select('*, sale_items(*)')
    .eq('id', saleId)
    .eq('tenant_id', tenant.id)
    .single()

  if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 })

  // Get business profile
  const { data: profile } = await adminClient
    .from('business_profiles')
    .select('*')
    .eq('tenant_id', tenant.id)
    .single()

  // Get tenant info
  const { data: tenantInfo } = await adminClient
    .from('tenants')
    .select('business_name, owner_name, email')
    .eq('id', tenant.id)
    .single()

  return NextResponse.json({ sale, profile, tenant: tenantInfo })
}
