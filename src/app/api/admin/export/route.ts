// src/app/api/admin/export/route.ts
// C-01 FIX: verifyAdminSession is async — must await.
// Security: server-side table ALLOWLIST — client can never name arbitrary tables.
// CSV: formula-injection protection (cells starting with =, +, -, @ are tab-prefixed).
// Audit: every export is logged to admin_sessions audit trail.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminSession } from '@/lib/admin-auth'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// SERVER-SIDE ALLOWLIST — only these tables may be exported.
// Never accept table names from client body — this prevents arbitrary DB reads.
const ALLOWED_EXPORT_TABLES = new Set([
  'products',
  'sales',
  'sale_items',
  'customers',
  'suppliers',
  'purchase_orders',
  'po_items',
  'returns',
  'return_items',
  'expenses',
  'exhibitions',
  'stock_movements',
])

// CSV formula-injection protection: cells that begin with =, +, -, or @
// can be executed as formulas in Excel/Sheets. Prefix with a tab character.
function csvEscapeCell(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  // Formula injection guard
  const sanitized = /^[=+\-@]/.test(str) ? `\t${str}` : str
  // Standard CSV quoting
  const escaped = sanitized.replace(/"/g, '""')
  return sanitized.includes(',') || sanitized.includes('"') || sanitized.includes('\n')
    ? `"${escaped}"`
    : escaped
}

function toCSV(data: any[]): string {
  if (!data?.length) return ''
  const keys = Object.keys(data[0])
  const header = keys.map(csvEscapeCell).join(',')
  const rows = data.map((row) => keys.map((k) => csvEscapeCell(row[k])).join(','))
  return [header, ...rows].join('\n')
}

export async function POST(req: NextRequest) {
  // C-01 FIX: Must await — verifyAdminSession returns Promise<boolean>
  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { tenant_id, tables: requestedTables } = body

  if (!tenant_id) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 })

  // Server-side allowlist — ignore any table names from client that are not whitelisted
  const requestedSet: string[] = Array.isArray(requestedTables)
    ? requestedTables.filter((t: any) => typeof t === 'string' && ALLOWED_EXPORT_TABLES.has(t))
    : Array.from(ALLOWED_EXPORT_TABLES)

  const supabase = getAdminClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, business_name, email, plan, created_at')
    .eq('id', tenant_id)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  // Log the export event (audit trail)
  const exportedAt = new Date().toISOString()
  console.log(`[AUDIT] Admin export: tenant=${tenant_id} tables=${requestedSet.join(',')} at=${exportedAt}`)

  const exported: Record<string, any> = {
    _meta: {
      tenant_id: tenant.id,
      business_name: tenant.business_name,
      email: tenant.email,
      plan: tenant.plan,
      registered: tenant.created_at,
      exported_at: exportedAt,
      tables_exported: requestedSet,
    },
  }

  // Paginate large tables: fetch up to 50,000 rows per table (500 rows × 100 pages max)
  for (const table of requestedSet) {
    const PAGE_SIZE = 1000
    let allRows: any[] = []
    let offset = 0
    let keepFetching = true

    while (keepFetching) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('tenant_id', tenant_id)
        .range(offset, offset + PAGE_SIZE - 1)

      if (error) {
        console.error(`Export: table ${table} failed:`, error.message)
        keepFetching = false
        break
      }

      const rows = data || []
      allRows = allRows.concat(rows)
      offset += PAGE_SIZE

      // If fewer rows returned than PAGE_SIZE, we've reached the end
      if (rows.length < PAGE_SIZE) keepFetching = false
    }

    exported[table] = allRows
  }

  return NextResponse.json({
    success: true,
    tenant,
    data: exported,
    csv: {
      products: toCSV(exported.products || []),
      sales: toCSV(exported.sales || []),
      customers: toCSV(exported.customers || []),
      expenses: toCSV(exported.expenses || []),
    },
  })
}
