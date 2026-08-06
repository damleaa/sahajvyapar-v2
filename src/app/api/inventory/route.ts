import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getTenant(supabase: any, userId: string) {
  const { data } = await supabase.from('tenants').select('id, plan').eq('owner_id', userId).single()
  return data
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenant = await getTenant(supabase, user.id)
  if (!tenant) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name)')
    .eq('tenant_id', tenant.id)
    .eq('is_active', true)
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const products = data?.map((p: any) => ({
    ...p,
    category_name: p.categories?.name || null,
    categories: undefined,
  }))

  return NextResponse.json(products)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenant = await getTenant(supabase, user.id)
  if (!tenant) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const body = await req.json()
  const { action, ...data } = body

  // Save product
  if (action === 'save') {
    const payload = {
      tenant_id: tenant.id,
      name: data.name,
      sku: data.sku || null,
      category_id: data.category_id || null,
      unit: data.unit || 'piece',
      cost_price: Number(data.cost_price) || 0,
      selling_price: Number(data.selling_price) || 0,
      stock_quantity: Number(data.stock_quantity) || 0,
      low_stock_alert: Number(data.low_stock_alert) || 5,
      hsn_code: data.hsn_code || null,
      gst_rate: Number(data.gst_rate) || 0,
      description: data.description || null,
    }

    if (data.id) {
      const { error } = await supabase.from('products').update(payload).eq('id', data.id).eq('tenant_id', tenant.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      // Check plan limits
      if (tenant.plan === 'starter') {
        const { count } = await supabase.from('products').select('id', { count: 'exact' }).eq('tenant_id', tenant.id).eq('is_active', true)
        if ((count || 0) >= 100) return NextResponse.json({ error: 'Starter plan limit: 100 products. Upgrade to Growth for 500.' }, { status: 403 })
      }
      if (tenant.plan === 'growth') {
        const { count } = await supabase.from('products').select('id', { count: 'exact' }).eq('tenant_id', tenant.id).eq('is_active', true)
        if ((count || 0) >= 500) return NextResponse.json({ error: 'Growth plan limit: 500 products. Upgrade to Pro for unlimited.' }, { status: 403 })
      }
      const { error } = await supabase.from('products').insert(payload)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  // Adjust stock
  if (action === 'adjust_stock') {
    const { product_id, movement_type, quantity, note } = data
    const qty = Math.abs(Number(quantity))

    const delta = movement_type === 'in' ? qty : -qty
    const { error: updateError } = await supabase.rpc
      ? await supabase.from('products').select('stock_quantity').eq('id', product_id).single().then(async ({ data: p }: any) => {
          const newQty = Math.max(0, (p?.stock_quantity || 0) + delta)
          return supabase.from('products').update({ stock_quantity: newQty }).eq('id', product_id).eq('tenant_id', tenant.id)
        })
      : { error: null }

    await supabase.from('stock_movements').insert({
      tenant_id: tenant.id,
      product_id,
      movement_type,
      quantity: qty,
      note: note || null,
    })

    return NextResponse.json({ success: true })
  }

  // Delete product
  if (action === 'delete') {
    const { error } = await supabase.from('products').update({ is_active: false }).eq('id', data.id).eq('tenant_id', tenant.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
