import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function toCSV(data: any[]): string {
  if (!data?.length) return ''
  const keys = Object.keys(data[0])
  const header = keys.join(',')
  const rows = data.map(row =>
    keys.map(k => {
      const val = row[k]
      if (val === null || val === undefined) return ''
      const str = String(val).replace(/"/g, '""')
      return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str
    }).join(',')
  )
  return [header, ...rows].join('\n')
}

export async function POST(req: NextRequest) {
  // Basic auth check via header
  const authKey = req.headers.get('x-admin-key')
  if (authKey !== process.env.NEXT_PUBLIC_SUPERADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { tenant_id, tables } = await req.json()
  if (!tenant_id) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 })

  const supabase = getAdminClient()

  // Verify tenant exists
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, business_name, email, plan, created_at')
    .eq('id', tenant_id)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const exportTables = tables || ['products', 'sales', 'sale_items', 'customers', 'suppliers', 'purchase_orders', 'returns', 'expenses', 'exhibitions']
  const exported: Record<string, any> = {
    _meta: {
      tenant_id: tenant.id,
      business_name: tenant.business_name,
      email: tenant.email,
      plan: tenant.plan,
      registered: tenant.created_at,
      exported_at: new Date().toISOString(),
      exported_by: 'SahajVyapar Admin',
    }
  }

  for (const table of exportTables) {
    const { data, error } = await supabase.from(table).select('*').eq('tenant_id', tenant_id)
    if (!error) exported[table] = data || []
  }

  return NextResponse.json({
    success: true,
    tenant: tenant,
    data: exported,
    csv: {
      products: toCSV(exported.products || []),
      sales: toCSV(exported.sales || []),
      customers: toCSV(exported.customers || []),
      expenses: toCSV(exported.expenses || []),
    }
  })
}
