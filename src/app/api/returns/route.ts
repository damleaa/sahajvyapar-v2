import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })
  const { data: tenant } = await supabase.from('tenants').select('id, plan').eq('owner_id', user.id).single()
  if (!tenant) return NextResponse.json([])
  if (tenant.plan === 'starter') return NextResponse.json({ locked: true })

  const { data } = await supabase
    .from('returns')
    .select('*, sales(invoice_number), return_items(*)')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })

  return NextResponse.json((data || []).map((r: any) => ({
    ...r, sale_invoice: r.sales?.invoice_number, sales: undefined,
  })))
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: tenant } = await supabase.from('tenants').select('id, plan').eq('owner_id', user.id).single()
  if (!tenant) return NextResponse.json({ error: 'No tenant' }, { status: 403 })
  if (tenant.plan === 'starter') return NextResponse.json({ error: 'Upgrade to Growth for returns' }, { status: 403 })

  const body = await req.json()
  const { action, ...data } = body

  if (action === 'create') {
    const { items, sale_id, reason } = data
    const validItems = items.filter((i: any) => Number(i.returned_qty) > 0)
    if (!validItems.length) return NextResponse.json({ error: 'No items to return' }, { status: 400 })

    const { data: sale } = await supabase.from('sales').select('customer_id, customer_name, payment_status').eq('id', sale_id).single()
    const total = validItems.reduce((s: number, i: any) => s + Number(i.returned_qty) * Number(i.unit_price), 0)

    const { count } = await supabase.from('returns').select('id', { count: 'exact' }).eq('tenant_id', tenant.id)
    const returnNumber = `CN/2025-26/${String((count || 0) + 1).padStart(3, '0')}`

    const { data: ret, error } = await supabase.from('returns').insert({
      tenant_id: tenant.id, sale_id, customer_id: sale?.customer_id || null,
      customer_name: sale?.customer_name || 'Walk-in',
      return_number: returnNumber, reason: reason || null,
      total_amount: total, refund_status: 'pending', status: 'initiated',
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    for (const item of validItems) {
      await supabase.from('return_items').insert({
        return_id: ret.id, sale_item_id: item.sale_item_id || null,
        product_id: item.product_id, product_name: item.product_name,
        returned_qty: Number(item.returned_qty), unit_price: Number(item.unit_price),
      })
      // Add back to stock
      const { data: product } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single()
      await supabase.from('products').update({ stock_quantity: (product?.stock_quantity || 0) + Number(item.returned_qty) }).eq('id', item.product_id)
      await supabase.from('stock_movements').insert({
        tenant_id: tenant.id, product_id: item.product_id, movement_type: 'in',
        quantity: Number(item.returned_qty), note: `Return: ${returnNumber}`, reference_id: ret.id, reference_type: 'return',
      })
    }

    // Adjust credit balance if credit sale
    if (sale?.payment_status === 'pending' && sale?.customer_id) {
      const { data: cust } = await supabase.from('customers').select('credit_balance').eq('id', sale.customer_id).single()
      const newBalance = Math.max(0, (cust?.credit_balance || 0) - total)
      await supabase.from('customers').update({ credit_balance: newBalance }).eq('id', sale.customer_id)
    }

    return NextResponse.json({ success: true, return_number: returnNumber })
  }

  if (action === 'record_refund') {
    const { return_id, refund_amount, refund_mode, refund_note } = data
    await supabase.from('returns').update({
      refund_status: 'refunded', refund_amount: Number(refund_amount),
      refund_mode, refund_note: refund_note || null, refund_date: new Date().toISOString().split('T')[0], status: 'completed',
    }).eq('id', return_id).eq('tenant_id', tenant.id)

    if (refund_mode === 'adjusted_in_ledger' && data.customer_id) {
      const { data: cust } = await supabase.from('customers').select('credit_balance').eq('id', data.customer_id).single()
      await supabase.from('customers').update({ credit_balance: (cust?.credit_balance || 0) + Number(refund_amount) }).eq('id', data.customer_id)
    }

    return NextResponse.json({ success: true })
  }

  // Get sale items for return form
  if (action === 'sale_items') {
    const { data: items } = await supabase.from('sale_items').select('*').eq('sale_id', data.sale_id)
    return NextResponse.json(items || [])
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
