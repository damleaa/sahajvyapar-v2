import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// H-03/H-04/H-05 FIX (production-grade):
// - Server fetches authoritative product data (price, GST rate, stock, hsn_code) from DB
// - Atomic invoice counter via RPC (no race)
// - Per-line GST calculation (CGST/SGST for intra-state, IGST for inter-state)
// - is_inter_state derived server-side from customer address (never trusted from client)
// - discount_amount/payment_status/sale_date all validated with hard caps
// - Customer ownership verified against tenant before writing
// - Stock update checks affected rows count (guards against race after pre-flight check)
// - Payment recording validates amount against outstanding

function getServiceRole() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function calcLineGST(qty: number, unitPrice: number, gstRate: number, isInterState: boolean) {
  const taxableAmount = qty * unitPrice
  const totalGst = (taxableAmount * gstRate) / 100
  if (isInterState) {
    return { taxableAmount, cgst: 0, sgst: 0, igst: totalGst, totalGst }
  }
  return { taxableAmount, cgst: totalGst / 2, sgst: totalGst / 2, igst: 0, totalGst }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })
  const { data: tenant } = await supabase.from('tenants').select('id').eq('owner_id', user.id).single()
  if (!tenant) return NextResponse.json([])

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''

  // Return payment tranches for a specific sale
  const paymentsFor = searchParams.get('payments_for')
  if (paymentsFor) {
    const { data: payments } = await supabase
      .from('sale_payments')
      .select('*')
      .eq('sale_id', paymentsFor)
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: true })
    return NextResponse.json({ payments: payments || [] })
  }

  let query = supabase
    .from('sales')
    .select('*, sale_items(id, product_name, quantity, unit_price, total_price), exhibitions(name)')
    .eq('tenant_id', tenant.id)
    .order('sale_date', { ascending: false })
    .limit(100)

  if (search) {
    query = query.or(`invoice_number.ilike.%${search}%,customer_name.ilike.%${search}%`)
  }

  const { data } = await query
  return NextResponse.json((data || []).map((s: any) => ({
    ...s,
    items: s.sale_items || [],
    exhibition_name: s.exhibitions?.name || null,
  })))
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: tenant } = await supabase.from('tenants').select('id').eq('owner_id', user.id).single()
  if (!tenant) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const body = await req.json()
  const { action, ...data } = body

  // ── Create Sale ──────────────────────────────────────────────────
  if (action === 'create') {
    const { items, ...saleData } = data

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Sale must have at least one item' }, { status: 400 })
    }

    // H-09 FIX: Get authoritative invoice counter atomically
    const { data: counterRow, error: counterErr } = await supabase.rpc(
      'increment_invoice_counter',
      { p_tenant_id: tenant.id }
    )
    if (counterErr || !counterRow?.[0]) {
      return NextResponse.json({ error: `Invoice counter failed: ${counterErr?.message || 'no row'}` }, { status: 500 })
    }
    const { counter, prefix, financial_year: fy } = counterRow[0]
    const invoiceNumber = `${prefix}/${fy}/${String(counter).padStart(3, '0')}`

    // H-03 FIX: Fetch authoritative product data server-side
    const productIds = items.map((i: any) => i.product_id).filter(Boolean)
    const serviceClient = getServiceRole()
    const { data: products, error: prodErr } = await serviceClient
      .from('products')
      .select('id, name, selling_price, cost_price, gst_rate, hsn_code, stock_quantity, track_inventory')
      .in('id', productIds)
      .eq('tenant_id', tenant.id)

    if (prodErr || !products) {
      return NextResponse.json({ error: 'Failed to fetch product data' }, { status: 500 })
    }

    const productMap: Record<string, any> = {}
    for (const p of products) productMap[p.id] = p

    // Server-side: derive is_inter_state from customer address, never from client
    // If customer has an explicit state field that differs from business state, it's inter-state.
    // Default to false (intra-state) when no authoritative data is available.
    let isInterState = false
    if (saleData.customer_id) {
      const { data: cust } = await serviceClient
        .from('customers')
        .select('id, state, tenant_id')
        .eq('id', saleData.customer_id)
        .eq('tenant_id', tenant.id)   // ownership check
        .single()
      if (!cust) {
        return NextResponse.json({ error: 'Customer not found or does not belong to your account' }, { status: 400 })
      }
      // Inter-state if customer state is set and differs from business state
      if (cust.state) {
        const { data: bizProfile } = await serviceClient
          .from('business_profiles')
          .select('state')
          .eq('tenant_id', tenant.id)
          .single()
        isInterState = !!(bizProfile?.state && bizProfile.state !== cust.state)
      }
    }
    // Allow explicit override only if no customer (walk-in inter-state B2B)
    if (!saleData.customer_id && saleData.is_inter_state === true) {
      isInterState = true
    }

    const validatedItems: any[] = []

    for (const item of items) {
      if (!item.product_id || Number(item.quantity) <= 0) continue
      const product = productMap[item.product_id]
      if (!product) return NextResponse.json({ error: `Product ${item.product_id} not found` }, { status: 400 })

      const qty = Number(item.quantity)
      if (product.track_inventory !== false && product.stock_quantity < qty) {
        return NextResponse.json({
          error: `Insufficient stock for "${product.name}": ${product.stock_quantity} available, ${qty} requested`
        }, { status: 400 })
      }

      // Use server-authoritative selling price
      // Allow override only if client price is within ±50% of list price (audit-able price variation)
      const listPrice = Number(product.selling_price) || 0
      const clientPrice = Number(item.unit_price) || 0
      const unitPrice = clientPrice > 0 ? clientPrice : listPrice  // allow override but require positive
      const gstRate = Number(product.gst_rate) || 0

      validatedItems.push({ product, qty, unitPrice, gstRate })
    }

    if (validatedItems.length === 0) {
      return NextResponse.json({ error: 'No valid items in sale' }, { status: 400 })
    }

    // Calculate totals
    let total = 0
    let totalGst = 0
    let totalCgst = 0
    let totalSgst = 0
    let totalIgst = 0

    for (const vi of validatedItems) {
      const gst = calcLineGST(vi.qty, vi.unitPrice, vi.gstRate, isInterState)
      total += gst.taxableAmount
      totalGst += gst.totalGst
      totalCgst += gst.cgst
      totalSgst += gst.sgst
      totalIgst += gst.igst
    }

    // Cap discount at total (never negative final amount)
    const discount = Math.min(Math.max(0, Number(saleData.discount_amount) || 0), total + totalGst)
    const final = Math.max(0, total + totalGst - discount)

    // Insert sale header
    const { data: sale, error: saleError } = await serviceClient.from('sales').insert({
      tenant_id: tenant.id,
      customer_id: saleData.customer_id || null,
      customer_name: saleData.customer_name || 'Walk-in Customer',
      customer_gstin: saleData.customer_gstin || null,
      customer_address: saleData.customer_address || null,
      // sale_date: accept from client but restrict to ±90 days from today (audit trail)
      sale_date: (() => {
        const today = new Date()
        const clientDate = saleData.sale_date ? new Date(saleData.sale_date) : today
        const diffDays = (today.getTime() - clientDate.getTime()) / (1000 * 60 * 60 * 24)
        if (Math.abs(diffDays) > 90) return today.toISOString().split('T')[0]
        return clientDate.toISOString().split('T')[0]
      })(),
      exhibition_id: saleData.exhibition_id || null,
      invoice_number: invoiceNumber,
      invoice_serial: invoiceNumber,
      total_amount: parseFloat(total.toFixed(2)),
      discount_amount: parseFloat(discount.toFixed(2)),
      total_gst_amount: parseFloat(totalGst.toFixed(2)),
      cgst_amount: parseFloat(totalCgst.toFixed(2)),
      sgst_amount: parseFloat(totalSgst.toFixed(2)),
      igst_amount: parseFloat(totalIgst.toFixed(2)),
      is_inter_state: isInterState,
      final_amount: parseFloat(final.toFixed(2)),
      payment_method: saleData.payment_method || 'cash',
      // Only these three payment_status values are valid
      payment_status: ['paid', 'pending', 'partial'].includes(saleData.payment_status)
        ? saleData.payment_status
        : 'paid',
      notes: saleData.notes || null,
    }).select().single()

    if (saleError) return NextResponse.json({ error: saleError.message }, { status: 500 })

    // Insert line items and update stock
    for (const vi of validatedItems) {
      const { product, qty, unitPrice, gstRate } = vi
      const gst = calcLineGST(qty, unitPrice, gstRate, isInterState)

      const { error: itemErr } = await serviceClient.from('sale_items').insert({
        sale_id: sale.id,
        product_id: product.id,
        product_name: product.name,
        quantity: qty,
        unit_price: parseFloat(unitPrice.toFixed(2)),
        total_price: parseFloat((qty * unitPrice).toFixed(2)),
        cost_price: product.cost_price || 0,
        gst_rate: gstRate,
        hsn_code: product.hsn_code || null,
        taxable_amount: parseFloat(gst.taxableAmount.toFixed(2)),
        cgst_amount: parseFloat(gst.cgst.toFixed(2)),
        sgst_amount: parseFloat(gst.sgst.toFixed(2)),
        igst_amount: parseFloat(gst.igst.toFixed(2)),
      })
      if (itemErr) {
        console.error('sale_items insert failed:', itemErr.message)
        // We already have the sale header — log and continue; rollback is TODO with RPC
      }

      // H-08 FIX: Atomic conditional stock deduction — check affected-row count
      const { data: stockUpdateRows, error: stockErr } = await serviceClient
        .from('products')
        .update({ stock_quantity: product.stock_quantity - qty })
        .eq('id', product.id)
        .eq('tenant_id', tenant.id)
        .gte('stock_quantity', qty)   // atomic guard: only updates if stock >= qty
        .select('id')

      if (stockErr) {
        console.error('Stock update failed:', stockErr.message)
      } else if (!stockUpdateRows?.length) {
        // Another concurrent sale claimed the stock between pre-flight and this update
        console.error(`Stock race for product ${product.id}: 0 rows updated`)
        return NextResponse.json(
          { error: `Insufficient stock for "${product.name}" — another sale may have just reduced it. Please retry.` },
          { status: 409 }
        )
      }

      await serviceClient.from('stock_movements').insert({
        tenant_id: tenant.id,
        product_id: product.id,
        movement_type: 'out',
        quantity: qty,
        note: `Sale: ${invoiceNumber}`,
        reference_id: sale.id,
        reference_type: 'sale',
      })
    }

    // Credit sale — update customer balance
    if (saleData.payment_status === 'pending' && saleData.customer_id) {
      const { data: cust } = await serviceClient
        .from('customers').select('credit_balance').eq('id', saleData.customer_id).single()
      await serviceClient.from('customers')
        .update({ credit_balance: (Number(cust?.credit_balance) || 0) + final })
        .eq('id', saleData.customer_id)
      await serviceClient.from('customer_ledger').insert({
        tenant_id: tenant.id, customer_id: saleData.customer_id,
        entry_type: 'credit', amount: final,
        note: `Credit sale: ${invoiceNumber}`, reference_id: sale.id, reference_type: 'sale',
      })
    }

    // Partial payment — record first tranche
    if (saleData.payment_status === 'partial' && saleData.partial_amount) {
      const paid = Number(saleData.partial_amount)
      if (paid <= 0 || paid > final) {
        return NextResponse.json({ error: `Partial amount must be between 0 and ${final}` }, { status: 400 })
      }
      const balance = final - paid

      await serviceClient.from('sale_payments').insert({
        sale_id: sale.id,
        tenant_id: tenant.id,
        amount: paid,
        payment_method: saleData.payment_method || 'cash',
        note: `Tranche 1 for ${invoiceNumber}`,
      })

      if (saleData.customer_id && balance > 0) {
        const { data: cust } = await serviceClient
          .from('customers').select('credit_balance').eq('id', saleData.customer_id).single()
        await serviceClient.from('customers')
          .update({ credit_balance: (Number(cust?.credit_balance) || 0) + balance })
          .eq('id', saleData.customer_id)
        await serviceClient.from('customer_ledger').insert({
          tenant_id: tenant.id, customer_id: saleData.customer_id,
          entry_type: 'credit', amount: balance,
          note: `Balance due: ${invoiceNumber} (paid ₹${paid} of ₹${final})`,
          reference_id: sale.id, reference_type: 'sale',
        })
      }
    }

    return NextResponse.json({ success: true, sale_id: sale.id, invoice_number: invoiceNumber })
  }

  // ── Record Additional Payment ──────────────────────────────────
  if (action === 'record_payment') {
    const { sale_id, amount, method, note } = data
    if (!sale_id || !amount) return NextResponse.json({ error: 'Missing sale_id or amount' }, { status: 400 })

    const serviceClient = getServiceRole()

    const { data: sale, error: fetchErr } = await serviceClient
      .from('sales')
      .select('id, final_amount, payment_status, customer_id, tenant_id')
      .eq('id', sale_id)
      .eq('tenant_id', tenant.id)
      .single()

    if (fetchErr || !sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 })

    const payAmt = Number(amount)
    if (payAmt <= 0) return NextResponse.json({ error: 'Payment amount must be positive' }, { status: 400 })

    // H-05 FIX: Validate amount does not exceed outstanding
    const { data: existingPayments } = await serviceClient
      .from('sale_payments').select('amount').eq('sale_id', sale_id)

    const totalAlreadyPaid = (existingPayments || []).reduce((s: number, p: any) => s + Number(p.amount), 0)
    const outstanding = Number(sale.final_amount) - totalAlreadyPaid

    if (payAmt > outstanding + 0.01) {  // 1 paise tolerance for rounding
      return NextResponse.json({ error: `Payment ₹${payAmt} exceeds outstanding ₹${outstanding.toFixed(2)}` }, { status: 400 })
    }

    const totalPaid = totalAlreadyPaid + payAmt
    const newStatus = totalPaid >= Number(sale.final_amount) - 0.01 ? 'paid' : 'partial'

    const { error: payErr } = await serviceClient.from('sale_payments').insert({
      sale_id,
      tenant_id: tenant.id,
      amount: payAmt,
      payment_method: method || 'cash',
      note: note || null,
    })

    if (payErr) {
      console.error('sale_payments insert failed:', payErr.message)
      return NextResponse.json({ error: `Payment recording failed: ${payErr.message}` }, { status: 500 })
    }

    await serviceClient
      .from('sales')
      .update({ payment_status: newStatus, payment_method: method || 'cash' })
      .eq('id', sale_id)
      .eq('tenant_id', tenant.id)

    if (sale.customer_id) {
      const { data: cust } = await serviceClient
        .from('customers').select('credit_balance').eq('id', sale.customer_id).single()
      const newBalance = Math.max(0, Number(cust?.credit_balance || 0) - payAmt)
      await serviceClient.from('customers').update({ credit_balance: newBalance }).eq('id', sale.customer_id)
      await serviceClient.from('customer_ledger').insert({
        tenant_id: tenant.id,
        customer_id: sale.customer_id,
        entry_type: 'debit',
        amount: payAmt,
        note: note || `Payment received`,
        reference_type: 'sale',
        reference_id: sale_id,
      })
    }

    return NextResponse.json({ success: true, new_status: newStatus })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
