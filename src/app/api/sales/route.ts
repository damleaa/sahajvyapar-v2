import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })
  const { data: tenant } = await supabase.from('tenants').select('id').eq('owner_id', user.id).single()
  if (!tenant) return NextResponse.json([])

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''

  let query = supabase
    .from('sales')
    .select('*, sale_items(id, product_name, quantity, unit_price, total_price)')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (search) {
    query = query.or(`invoice_number.ilike.%${search}%,customer_name.ilike.%${search}%`)
  }

  const { data } = await query
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

  // ── Create Sale ───────────────────────────────────────────────
  if (action === 'create') {
    const { items, ...saleData } = data

    const { data: profile } = await supabase
      .from('business_profiles')
      .select('invoice_prefix, invoice_counter, financial_year')
      .eq('tenant_id', tenant.id)
      .single()

    const prefix = profile?.invoice_prefix || 'INV'
    const fy = profile?.financial_year || '2025-26'
    const counter = (profile?.invoice_counter || 0) + 1
    const invoiceNumber = `${prefix}/${fy}/${String(counter).padStart(3, '0')}`

    const total = items.reduce((s: number, i: any) => s + Number(i.quantity) * Number(i.unit_price), 0)
    const discount = Number(saleData.discount_amount) || 0
    const final = total - discount

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

    for (const item of items) {
      if (!item.product_id || Number(item.quantity) <= 0) continue

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

      const newQty = Math.max(0, (product?.stock_quantity || 0) - Number(item.quantity))
      await supabase.from('products').update({ stock_quantity: newQty }).eq('id', item.product_id)
      await supabase.from('stock_movements').insert({
        tenant_id: tenant.id,
        product_id: item.product_id,
        movement_type: 'out',
        quantity: Number(item.quantity),
        note: `Sale: ${invoiceNumber}`,
        reference_id: sale.id,
        reference_type: 'sale',
      })
    }

    await supabase.from('business_profiles').update({ invoice_counter: counter }).eq('tenant_id', tenant.id)

    // Credit sale — update customer balance and ledger
    if (saleData.payment_status === 'pending' && saleData.customer_id) {
      const { data: cust } = await supabase
        .from('customers')
        .select('credit_balance')
        .eq('id', saleData.customer_id)
        .single()

      await supabase.from('customers')
        .update({ credit_balance: (Number(cust?.credit_balance) || 0) + final })
        .eq('id', saleData.customer_id)

      await supabase.from('customer_ledger').insert({
        tenant_id: tenant.id,
        customer_id: saleData.customer_id,
        entry_type: 'credit',
        amount: final,
        note: `Credit sale: ${invoiceNumber}`,
        reference_id: sale.id,
        reference_type: 'sale',
      })
    }

    // Partial payment — record initial payment and set balance
    if (saleData.payment_status === 'partial' && saleData.partial_amount && saleData.customer_id) {
      const paid = Number(saleData.partial_amount)
      const balance = Math.max(0, final - paid)

      await supabase.from('sale_payments').insert({
        sale_id: sale.id,
        tenant_id: tenant.id,
        amount: paid,
        payment_method: saleData.payment_method || 'cash',
        note: `Initial partial payment for ${invoiceNumber}`,
      }).then(() => {}) // ignore if table not yet created

      if (saleData.customer_id && balance > 0) {
        const { data: cust } = await supabase
          .from('customers')
          .select('credit_balance')
          .eq('id', saleData.customer_id)
          .single()

        await supabase.from('customers')
          .update({ credit_balance: (Number(cust?.credit_balance) || 0) + balance })
          .eq('id', saleData.customer_id)

        await supabase.from('customer_ledger').insert({
          tenant_id: tenant.id,
          customer_id: saleData.customer_id,
          entry_type: 'credit',
          amount: balance,
          note: `Balance due: ${invoiceNumber} (paid ₹${paid} of ₹${final})`,
          reference_id: sale.id,
          reference_type: 'sale',
        })
      }
    }

    return NextResponse.json({ success: true, sale_id: sale.id, invoice_number: invoiceNumber })
  }

  // ── Record Additional Payment on existing sale ────────────────
  if (action === 'record_payment') {
    const { sale_id, amount, method, note } = data
    if (!sale_id || !amount) return NextResponse.json({ error: 'Missing sale_id or amount' }, { status: 400 })

    const { data: sale, error: fetchErr } = await supabase
      .from('sales')
      .select('id, final_amount, payment_status, customer_id, tenant_id')
      .eq('id', sale_id)
      .eq('tenant_id', tenant.id)
      .single()

    if (fetchErr || !sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 })

    // Total paid so far + this payment
    const { data: existingPayments } = await supabase
      .from('sale_payments')
      .select('amount')
      .eq('sale_id', sale_id)

    const totalPaid = (existingPayments || []).reduce((s: number, p: any) => s + Number(p.amount), 0) + Number(amount)
    const saleTotal = Number(sale.final_amount)
    const newStatus = totalPaid >= saleTotal ? 'paid' : 'partial'

    // Insert payment record (graceful fallback if table missing)
    const { error: payErr } = await supabase.from('sale_payments').insert({
      sale_id,
      tenant_id: tenant.id,
      amount: Number(amount),
      payment_method: method || 'cash',
      note: note || null,
    })

    if (payErr) {
      console.warn('sale_payments insert failed:', payErr.message)
    }

    // Update sale status
    await supabase
      .from('sales')
      .update({ payment_status: newStatus, payment_method: method || 'cash' })
      .eq('id', sale_id)
      .eq('tenant_id', tenant.id)

    // Reduce customer credit balance
    if (sale.customer_id) {
      const { data: cust } = await supabase
        .from('customers')
        .select('credit_balance')
        .eq('id', sale.customer_id)
        .single()

      const newBalance = Math.max(0, Number(cust?.credit_balance || 0) - Number(amount))
      await supabase.from('customers').update({ credit_balance: newBalance }).eq('id', sale.customer_id)

      await supabase.from('customer_ledger').insert({
        tenant_id: tenant.id,
        customer_id: sale.customer_id,
        entry_type: 'debit',
        amount: Number(amount),
        note: note || `Payment received`,
        reference_type: 'sale',
        reference_id: sale_id,
      })
    }

    return NextResponse.json({ success: true, new_status: newStatus })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
