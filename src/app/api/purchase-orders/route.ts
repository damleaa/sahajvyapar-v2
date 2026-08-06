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
    .from('purchase_orders')
    .select('*, suppliers(name), po_items(*)')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })

  return NextResponse.json((data || []).map((po: any) => ({
    ...po, supplier_name: po.suppliers?.name, suppliers: undefined,
  })))
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: tenant } = await supabase.from('tenants').select('id, plan').eq('owner_id', user.id).single()
  if (!tenant) return NextResponse.json({ error: 'No tenant' }, { status: 403 })
  if (tenant.plan === 'starter') return NextResponse.json({ error: 'Upgrade to Growth' }, { status: 403 })

  const body = await req.json()
  const { action, ...data } = body

  if (action === 'create') {
    const { items, ...poData } = data
    const total = items.reduce((s: number, i: any) => s + i.ordered_qty * i.unit_price, 0)

    const { count } = await supabase.from('purchase_orders').select('id', { count: 'exact' }).eq('tenant_id', tenant.id)
    const poNumber = `PO-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(3, '0')}`

    const { data: po, error } = await supabase.from('purchase_orders').insert({
      tenant_id: tenant.id, supplier_id: poData.supplier_id, po_number: poNumber,
      status: 'draft', expected_date: poData.expected_date || null,
      total_amount: total, supplier_ref_number: poData.supplier_ref_number || null, notes: poData.notes || null,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    for (const item of items) {
      const { data: product } = await supabase.from('products').select('name').eq('id', item.product_id).single()
      await supabase.from('po_items').insert({
        po_id: po.id, product_id: item.product_id,
        product_name: product?.name || item.product_name,
        ordered_qty: item.ordered_qty, received_qty: 0, unit_price: item.unit_price,
      })
    }

    return NextResponse.json({ success: true, po_number: poNumber })
  }

  if (action === 'receive') {
    const { po_id, items, supplier_ref_number } = data

    for (const item of items) {
      if (!item.receiving_now || item.receiving_now <= 0) continue
      await supabase.from('po_items').update({ received_qty: item.received_qty + item.receiving_now }).eq('id', item.id)

      const { data: product } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single()
      await supabase.from('products').update({ stock_quantity: (product?.stock_quantity || 0) + item.receiving_now }).eq('id', item.product_id)
      await supabase.from('stock_movements').insert({
        tenant_id: tenant.id, product_id: item.product_id, movement_type: 'in',
        quantity: item.receiving_now, note: `PO received`, reference_id: po_id, reference_type: 'purchase_order',
      })
    }

    // Get updated items to check if fully received
    const { data: updatedItems } = await supabase.from('po_items').select('ordered_qty, received_qty').eq('po_id', po_id)
    const allReceived = updatedItems?.every((i: any) => i.received_qty >= i.ordered_qty)
    const anyReceived = updatedItems?.some((i: any) => i.received_qty > 0)
    const status = allReceived ? 'received' : anyReceived ? 'partial' : 'sent'

    await supabase.from('purchase_orders').update({
      status,
      supplier_ref_number: supplier_ref_number || undefined,
    }).eq('id', po_id)

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
