import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })
  const { data: tenant } = await supabase.from('tenants').select('id').eq('owner_id', user.id).single()
  if (!tenant) return NextResponse.json([])

  const { data } = await supabase
    .from('sales')
    .select('*, sale_items(id, product_name, quantity, unit_price, total_price)')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })
    .limit(100)

  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: tenant } = await supabase.from('tenants').select('id').eq('owner_id', user.id).single()
  if (!tenant) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const body = await req.json()
  const { action, ...data } = body

  if (action === 'create') {
    const { items, ...saleData } = data

    // Get business profile for invoice numbering
    const { data: profile } = await supabase
      .from('business_profiles')
      .select('invoice_prefix, invoice_counter, financial_year')
      .eq('tenant_id', tenant.id)
      .single()

    const prefix = profile?.invoice_prefix || 'INV'
    const fy = profile?.financial_year || '2025-26'
    const counter = (profile?.invoice_counter || 0) + 1
    const invoiceNumber = `${prefix}/${fy}/${String(counter).padStart(3, '0')}`

    // Calculate totals
    const total = items.reduce((s: number, i: any) => s + Number(i.quantity) * Number(i.unit_price), 0)
    const discount = Number(saleData.discount_amount) || 0
    const final = total - discount

    // Create sale
    const { data: sale, error: saleError } = await supabase.from('sales').insert({
      tenant_id: tenant.id,
      customer_id: saleData.customer_id || null,
      customer_name: saleData.customer_name || 'Walk-in Customer',
      invoice_number: invoiceNumber,
      invoice_serial: invoiceNumber,
      total_amount: total,
      discount_amount: discount,
      final_amount: final,
      payment_method: saleData.payment_method || 'cash',
      payment_status: saleData.payment_status || 'paid',
      notes: saleData.notes || null,
    }).select().single()

    if (saleError) return NextResponse.json({ error: saleError.message }, { status: 500 })

    // Insert sale items + update stock
    for (const item of items) {
      if (!item.product_id || Number(item.quantity) <= 0) continue

      // Get product cost for COGS tracking
      const { data: product } = await supabase.from('products')
        .select('cost_price, stock_quantity, name')
        .eq('id', item.product_id)
        .single()

      await supabase.from('sale_items').insert({
        sale_id: sale.id,
        product_id: item.product_id,
        product_name: product?.name || item.product_name,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        total_price: Number(item.quantity) * Number(item.unit_price),
        cost_price: product?.cost_price || 0,
        gst_rate: Number(item.gst_rate) || 0,
        hsn_code: item.hsn_code || null,
      })

      // Deduct stock
      const newQty = Math.max(0, (product?.stock_quantity || 0) - Number(item.quantity))
      await supabase.from('products').update({ stock_quantity: newQty }).eq('id', item.product_id)
      await supabase.from('stock_movements').insert({
        tenant_id: tenant.id, product_id: item.product_id,
        movement_type: 'out', quantity: Number(item.quantity),
        note: `Sale: ${invoiceNumber}`, reference_id: sale.id, reference_type: 'sale',
      })
    }

    // Update invoice counter
    await supabase.from('business_profiles').update({ invoice_counter: counter }).eq('tenant_id', tenant.id)

    // If credit sale, update customer ledger
    if (saleData.payment_status === 'pending' && saleData.customer_id) {
      const { data: cust } = await supabase.from('customers').select('credit_balance').eq('id', saleData.customer_id).single()
      await supabase.from('customers').update({ credit_balance: (cust?.credit_balance || 0) + final }).eq('id', saleData.customer_id)

      await supabase.from('customer_ledger').insert({
        tenant_id: tenant.id, customer_id: saleData.customer_id,
        entry_type: 'credit', amount: final,
        note: `Credit sale: ${invoiceNumber}`, reference_id: sale.id, reference_type: 'sale',
      })
    }

    return NextResponse.json({ success: true, sale_id: sale.id, invoice_number: invoiceNumber })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
