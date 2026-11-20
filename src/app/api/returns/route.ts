import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// F-08: Returns route with server-side validation.
// - Validates returned quantities do not exceed originally sold quantities
// - Validates refund amount does not exceed total sale amount
// - F-return-fy: return_number uses auto-calculated FY (April–March), not hardcoded '2025-26'

function getCurrentFY(): string {
  const now = new Date()
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  return `${year}-${String(year + 1).slice(2)}`
}

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
    const {
      items, sale_id, reason,
      deduction_rule_id, deduction_type, deduction_amount, deduction_note, refund_amount,
    } = data
    const validItems = items.filter((i: any) => Number(i.returned_qty) > 0)
    if (!validItems.length) return NextResponse.json({ error: 'No items to return' }, { status: 400 })

    // PRODUCTION FIX: Every return item MUST reference a sale_item_id.
    // Product identity and price come from the original sale line — never from client.
    for (const item of validItems) {
      if (!item.sale_item_id) {
        return NextResponse.json(
          { error: 'Each return item must include sale_item_id to reference the original sale line' },
          { status: 400 }
        )
      }
    }

    // F-08: Fetch the original sale with its items and final_amount
    const { data: sale } = await supabase
      .from('sales')
      .select('id, customer_id, customer_name, payment_status, final_amount, tenant_id')
      .eq('id', sale_id)
      .eq('tenant_id', tenant.id)
      .single()

    if (!sale) {
      return NextResponse.json({ error: 'Sale not found or access denied' }, { status: 404 })
    }

    // Fetch authoritative sale_items — product identity and price from DB, not client
    const { data: saleItems } = await supabase
      .from('sale_items')
      .select('id, product_id, product_name, quantity, unit_price')
      .eq('sale_id', sale_id)

    const saleItemMap: Record<string, { quantity: number; product_id: string; product_name: string; unit_price: number }> = {}
    for (const si of (saleItems || [])) {
      saleItemMap[si.id] = { quantity: si.quantity, product_id: si.product_id, product_name: si.product_name, unit_price: si.unit_price }
    }

    for (const item of validItems) {
      const returnedQty = Number(item.returned_qty)
      const originalLine = saleItemMap[item.sale_item_id]
      if (!originalLine) {
        return NextResponse.json({ error: `Sale item ${item.sale_item_id} not found in original sale` }, { status: 400 })
      }

      // Cumulative check: how many of this line have already been returned (non-cancelled)?
      const { data: priorReturns } = await supabase
        .from('return_items')
        .select('returned_qty, returns!inner(sale_id, status)')
        .eq('sale_item_id', item.sale_item_id)
      const alreadyReturned = (priorReturns || [])
        .filter((r: any) => r.returns?.status !== 'cancelled')
        .reduce((s: number, r: any) => s + Number(r.returned_qty), 0)
      const availableQty = originalLine.quantity - alreadyReturned
      if (returnedQty > availableQty) {
        return NextResponse.json({
          error: `Cannot return ${returnedQty} of "${originalLine.product_name}" — only ${availableQty} available for return (${originalLine.quantity} sold, ${alreadyReturned} already returned)`
        }, { status: 400 })
      }
    }

    // Build server-authoritative items using original sale line prices (never client price)
    const authorizedItems = validItems.map((item: any) => {
      const originalLine = saleItemMap[item.sale_item_id]
      return {
        sale_item_id: item.sale_item_id,
        product_id: originalLine.product_id,
        product_name: originalLine.product_name,
        returned_qty: Number(item.returned_qty),
        unit_price: originalLine.unit_price,
      }
    })

    // Cumulative refund cap: total_refunded_so_far + this_refund <= final_amount
    const { data: priorRefunds } = await supabase
      .from('returns')
      .select('refund_amount')
      .eq('sale_id', sale_id)
      .neq('status', 'cancelled')
    const totalAlreadyRefunded = (priorRefunds || []).reduce((s: number, r: any) => s + Number(r.refund_amount || 0), 0)
    const maxRefundable = Number(sale.final_amount) - totalAlreadyRefunded

    const total = authorizedItems.reduce((s: number, i: any) => s + i.returned_qty * i.unit_price, 0)
    const deductAmt = Number(deduction_amount) || 0
    const computedRefund = Math.max(0, total - deductAmt)
    const finalRefund = refund_amount !== undefined
      ? Math.min(Math.max(0, Number(refund_amount)), maxRefundable)
      : Math.min(computedRefund, maxRefundable)

    if (maxRefundable <= 0) {
      return NextResponse.json({ error: 'All amounts for this sale have already been refunded' }, { status: 400 })
    }

    // F-return-fy: Auto-calculated FY — no hardcoded '2025-26'
    const { count } = await supabase.from('returns').select('id', { count: 'exact' }).eq('tenant_id', tenant.id)
    const returnNumber = `CN/${getCurrentFY()}/${String((count || 0) + 1).padStart(3, '0')}`

    const { data: ret, error } = await supabase.from('returns').insert({
      tenant_id: tenant.id, sale_id, customer_id: sale?.customer_id || null,
      customer_name: sale?.customer_name || 'Walk-in',
      return_number: returnNumber, reason: reason || null,
      total_amount: total,  // sum of server-authorised line totals
      deduction_rule_id: deduction_rule_id || null,
      deduction_type: deduction_type || null,
      deduction_amount: deductAmt,
      deduction_note: deduction_note || null,
      refund_amount: finalRefund,
      refund_status: 'pending', status: 'initiated',
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Insert return items using server-authorised product+price values
    for (const item of authorizedItems) {
      await supabase.from('return_items').insert({
        return_id: ret.id,
        sale_item_id: item.sale_item_id,
        product_id: item.product_id,
        product_name: item.product_name,
        returned_qty: item.returned_qty,
        unit_price: item.unit_price,  // server-side price — not client
      })
      // Stock is restored immediately on return initiation for physical goods handling.
      // The refund amount may still be pending but inventory returns at initiation.
      await supabase.rpc('atomic_stock_increment', {
        p_product_id: item.product_id,
        p_tenant_id: tenant.id,
        p_delta: item.returned_qty,
      }).then(async ({ error: rpcErr }) => {
        if (rpcErr) {
          // Fallback: direct update (still safe for restoring stock)
          const { data: prod } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single()
          await supabase.from('products').update({ stock_quantity: (prod?.stock_quantity || 0) + item.returned_qty }).eq('id', item.product_id)
        }
      })
      await supabase.from('stock_movements').insert({
        tenant_id: tenant.id,
        product_id: item.product_id,
        movement_type: 'in',
        quantity: item.returned_qty,
        note: `Return: ${returnNumber}`,
        reference_id: ret.id,
        reference_type: 'return',
      })
    }

    // Adjust credit balance if credit sale
    if (sale?.payment_status === 'pending' && sale?.customer_id) {
      const { data: cust } = await supabase.from('customers').select('credit_balance').eq('id', sale.customer_id).single()
      const newBalance = Math.max(0, (cust?.credit_balance || 0) - finalRefund)
      await supabase.from('customers').update({ credit_balance: newBalance }).eq('id', sale.customer_id)
    }

    return NextResponse.json({ success: true, return_number: returnNumber })
  }

  if (action === 'record_refund') {
    const { return_id, refund_amount: rfAmt, refund_mode, refund_note } = data

    // F-08: Verify this return belongs to this tenant before updating
    const { data: ret } = await supabase
      .from('returns')
      .select('id, total_amount, tenant_id')
      .eq('id', return_id)
      .eq('tenant_id', tenant.id)
      .single()

    if (!ret) return NextResponse.json({ error: 'Return not found' }, { status: 404 })

    const refundAmountNum = Number(rfAmt)
    if (refundAmountNum > Number(ret.total_amount)) {
      return NextResponse.json({
        error: `Refund Rs.${refundAmountNum} exceeds return total Rs.${ret.total_amount}`
      }, { status: 400 })
    }

    await supabase.from('returns').update({
      refund_status: 'refunded', refund_amount: refundAmountNum,
      refund_mode, refund_note: refund_note || null, refund_date: new Date().toISOString().split('T')[0], status: 'completed',
    }).eq('id', return_id).eq('tenant_id', tenant.id)

    if (refund_mode === 'adjusted_in_ledger' && data.customer_id) {
      const { data: cust } = await supabase.from('customers').select('credit_balance').eq('id', data.customer_id).single()
      await supabase.from('customers').update({ credit_balance: (cust?.credit_balance || 0) + refundAmountNum }).eq('id', data.customer_id)
    }

    return NextResponse.json({ success: true })
  }

  // Get sale items for return form
  if (action === 'sale_items') {
    // F-08: Verify the sale belongs to this tenant
    const { data: sale } = await supabase
      .from('sales')
      .select('id')
      .eq('id', data.sale_id)
      .eq('tenant_id', tenant.id)
      .single()

    if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 })

    const { data: items } = await supabase.from('sale_items').select('*').eq('sale_id', data.sale_id)
    return NextResponse.json(items || [])
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
