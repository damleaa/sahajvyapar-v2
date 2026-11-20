// GET /api/export?type=sales — download your own business data as CSV.
// Promised in Terms of Service §Your Data: available anytime, including after a plan ends
// (only a deleted account is excluded). Every query is scoped to the caller's tenant.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { EXPORTS } from '@/lib/export-types'

const PAGE = 1000 // Supabase returns at most 1000 rows per request
const MAX_ROWS = 100_000

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  let s = typeof v === 'object' ? JSON.stringify(v) : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}` // stop spreadsheet formula injection
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return 'no_data\n'
  const cols = Object.keys(rows[0]).filter(c => c !== 'tenant_id' && c !== 'logo_base64')
  return '﻿' + [cols.join(','), ...rows.map(r => cols.map(c => csvCell(r[c])).join(','))].join('\n') + '\n'
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') || ''
  const spec = EXPORTS[type]
  if (!spec) return NextResponse.json({ error: 'Unknown export type', types: Object.keys(EXPORTS) }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please log in' }, { status: 401 })

  const db = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: tenant } = await db.from('tenants').select('id, deleted_at').eq('owner_id', user.id).maybeSingle()
  if (!tenant || tenant.deleted_at) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  const rows: Record<string, unknown>[] = []

  if (type === 'sale_items') {
    // sale_items has no tenant_id: go through this tenant's sales
    for (let from = 0; rows.length < MAX_ROWS; from += PAGE) {
      const { data: sales, error } = await db.from('sales').select('id').eq('tenant_id', tenant.id)
        .order('created_at').range(from, from + PAGE - 1)
      if (error) return NextResponse.json({ error: 'Export failed' }, { status: 500 })
      if (!sales?.length) break
      const { data: items, error: iErr } = await db.from('sale_items').select('*').in('sale_id', sales.map(s => s.id))
      if (iErr) return NextResponse.json({ error: 'Export failed' }, { status: 500 })
      rows.push(...(items || []))
      if (sales.length < PAGE) break
    }
  } else {
    for (let from = 0; rows.length < MAX_ROWS; from += PAGE) {
      const { data, error } = await db.from(spec.table).select('*').eq('tenant_id', tenant.id)
        .order(spec.order).range(from, from + PAGE - 1)
      if (error) return NextResponse.json({ error: 'Export failed' }, { status: 500 })
      if (!data?.length) break
      rows.push(...data)
      if (data.length < PAGE) break
    }
  }

  const date = new Date().toISOString().slice(0, 10)
  return new NextResponse(toCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="sahajvyapar-${type}-${date}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
