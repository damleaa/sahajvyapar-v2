import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: tenant } = await supabase.from('tenants').select('id, plan').eq('owner_id', user.id).single()
  if (!tenant) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const range = searchParams.get('range') || 'this_month'
  const paymentMethod = searchParams.get('payment_method') || 'all'
  const categoryId = searchParams.get('category_id') || 'all'

  // Calculate date range
  const now = new Date()
  let startDate: Date
  let endDate = new Date()

  switch (range) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case 'this_week':
      startDate = new Date(now)
      startDate.setDate(now.getDate() - now.getDay())
      break
    case 'last_month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      endDate = new Date(now.getFullYear(), now.getMonth(), 0)
      break
    case 'last_3_months':
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1)
      break
    case 'last_6_months':
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1)
      break
    case 'this_year':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    case 'custom':
      startDate = new Date(searchParams.get('start') || now.toISOString())
      endDate = new Date(searchParams.get('end') || now.toISOString())
      break
    default: // this_month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  }

  const startISO = startDate.toISOString()
  const endISO = endDate.toISOString()

  // Base sales query
  let salesQuery = supabase
    .from('sales')
    .select('id, final_amount, total_amount, discount_amount, payment_method, payment_status, customer_name, created_at, exhibition_id')
    .eq('tenant_id', tenant.id)
    .gte('created_at', startISO)
    .lte('created_at', endISO)

  if (paymentMethod !== 'all') salesQuery = salesQuery.eq('payment_method', paymentMethod)

  const { data: sales } = await salesQuery
  const salesData = sales || []

  // Sale items for product analysis
  const saleIds = salesData.map(s => s.id)
  let itemsData: any[] = []
  if (saleIds.length > 0) {
    let itemsQuery = supabase
      .from('sale_items')
      .select('sale_id, product_id, product_name, quantity, unit_price, total_price, cost_price, hsn_code, gst_rate, products(category_id)')
      .in('sale_id', saleIds)
    if (categoryId !== 'all') {
      itemsQuery = itemsQuery.eq('products.category_id', categoryId)
    }
    const { data: items } = await itemsQuery
    itemsData = items || []
  }

  // Expenses
  const { data: expensesData } = await supabase
    .from('expenses')
    .select('amount, category, expense_date, exhibition_id')
    .eq('tenant_id', tenant.id)
    .gte('expense_date', startDate.toISOString().split('T')[0])
    .lte('expense_date', endDate.toISOString().split('T')[0])

  const expenses = expensesData || []

  // ── Core metrics ──────────────────────────────────────────
  const totalRevenue = salesData.reduce((s, x) => s + Number(x.final_amount), 0)
  const totalExpenses = expenses.reduce((s, x) => s + Number(x.amount), 0)
  const totalCOGS = itemsData.reduce((s, x) => s + (Number(x.cost_price || 0) * Number(x.quantity)), 0)
  const grossProfit = totalRevenue - totalCOGS
  const netProfit = grossProfit - totalExpenses
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue * 100) : 0
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue * 100) : 0
  const avgOrderValue = salesData.length > 0 ? totalRevenue / salesData.length : 0

  // ── Monthly / Daily trend ─────────────────────────────────
  const trendMap: Record<string, { revenue: number; count: number; profit: number }> = {}
  salesData.forEach(s => {
    const key = range === 'today' || range === 'this_week'
      ? new Date(s.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
      : new Date(s.created_at).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
    if (!trendMap[key]) trendMap[key] = { revenue: 0, count: 0, profit: 0 }
    trendMap[key].revenue += Number(s.final_amount)
    trendMap[key].count += 1
  })
  const trend = Object.entries(trendMap).map(([label, d]) => ({ label, ...d }))

  // ── Daily sales for line chart (last 30 days) ─────────────
  const dailyMap: Record<string, number> = {}
  const last30 = new Date(now)
  last30.setDate(now.getDate() - 30)
  salesData
    .filter(s => new Date(s.created_at) >= last30)
    .forEach(s => {
      const key = new Date(s.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
      dailyMap[key] = (dailyMap[key] || 0) + Number(s.final_amount)
    })
  const dailyTrend = Object.entries(dailyMap).map(([date, revenue]) => ({ date, revenue }))

  // ── Payment method breakdown ──────────────────────────────
  const methodMap: Record<string, { revenue: number; count: number }> = {}
  salesData.forEach(s => {
    const m = s.payment_method
    if (!methodMap[m]) methodMap[m] = { revenue: 0, count: 0 }
    methodMap[m].revenue += Number(s.final_amount)
    methodMap[m].count += 1
  })
  const byPaymentMethod = Object.entries(methodMap).map(([method, d]) => ({ method: method.toUpperCase(), ...d }))

  // ── Payment status breakdown ──────────────────────────────
  const statusMap: Record<string, number> = {}
  salesData.forEach(s => { statusMap[s.payment_status] = (statusMap[s.payment_status] || 0) + 1 })
  const byPaymentStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }))

  // ── Product profitability ─────────────────────────────────
  const productMap: Record<string, any> = {}
  itemsData.forEach(i => {
    const key = i.product_name || 'Unknown'
    if (!productMap[key]) productMap[key] = { name: key, revenue: 0, cogs: 0, qty: 0 }
    productMap[key].revenue += Number(i.total_price)
    productMap[key].cogs += Number(i.cost_price || 0) * Number(i.quantity)
    productMap[key].qty += Number(i.quantity)
  })
  const productPerformance = Object.values(productMap)
    .map((p: any) => ({
      ...p,
      profit: p.revenue - p.cogs,
      margin: p.revenue > 0 ? ((p.revenue - p.cogs) / p.revenue * 100) : 0,
    }))
    .sort((a: any, b: any) => b.profit - a.profit)
    .slice(0, 10)

  // ── Category breakdown ────────────────────────────────────
  const catMap: Record<string, number> = {}
  itemsData.forEach(i => {
    const cat = (i.products as any)?.category_id || 'Uncategorized'
    catMap[cat] = (catMap[cat] || 0) + Number(i.total_price)
  })

  // ── Expense breakdown ─────────────────────────────────────
  const expCatMap: Record<string, number> = {}
  expenses.forEach(e => {
    const cat = e.category || 'Other'
    expCatMap[cat] = (expCatMap[cat] || 0) + Number(e.amount)
  })
  const expenseBreakdown = Object.entries(expCatMap).map(([category, amount]) => ({ category, amount }))

  // ── Customer outstanding ──────────────────────────────────
  let customerOutstanding: any[] = []
  if (tenant.plan !== 'starter') {
    const { data: customers } = await supabase
      .from('customers')
      .select('name, credit_balance')
      .eq('tenant_id', tenant.id)
      .gt('credit_balance', 0)
      .order('credit_balance', { ascending: false })
      .limit(10)
    customerOutstanding = customers || []
  }

  // ── Stock health (Pro) ────────────────────────────────────
  let stockHealth: any = null
  if (tenant.plan === 'pro') {
    const { data: products } = await supabase
      .from('products')
      .select('id, name, stock_quantity, cost_price, selling_price, low_stock_alert')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)

    if (products) {
      const d60 = new Date(Date.now() - 60 * 864e5).toISOString()
      const { data: recentItems } = await supabase
        .from('sale_items')
        .select('product_id, quantity, sales!inner(created_at, tenant_id)')
        .eq('sales.tenant_id', tenant.id)
        .gte('sales.created_at', d60)

      const sold60: Record<string, number> = {}
      ;(recentItems || []).forEach((i: any) => {
        sold60[i.product_id] = (sold60[i.product_id] || 0) + Number(i.quantity)
      })

      const categorized = products.map(p => {
        const monthly = (sold60[p.id] || 0) / 2
        const cover = monthly > 0 ? p.stock_quantity / monthly : p.stock_quantity > 0 ? 99 : 0
        const status = sold60[p.id] === 0 && p.stock_quantity > 0 ? 'Dead'
          : cover > 6 ? 'Slow Moving'
          : p.stock_quantity <= p.low_stock_alert ? 'Low Stock'
          : 'Healthy'
        return { ...p, monthly_sold: monthly, cover_months: cover, status, inventory_value: p.stock_quantity * p.cost_price }
      })

      const counts = { Healthy: 0, 'Low Stock': 0, 'Slow Moving': 0, Dead: 0 }
      const values = { Healthy: 0, 'Low Stock': 0, 'Slow Moving': 0, Dead: 0 }
      categorized.forEach(p => {
        counts[p.status as keyof typeof counts]++
        values[p.status as keyof typeof values] += p.inventory_value
      })

      stockHealth = {
        summary: Object.entries(counts).map(([status, count]) => ({ status, count, value: values[status as keyof typeof values] })),
        items: categorized.sort((a, b) => b.inventory_value - a.inventory_value).slice(0, 20),
        totalValue: categorized.reduce((s, p) => s + p.inventory_value, 0),
        deadValue: categorized.filter(p => p.status === 'Dead').reduce((s, p) => s + p.inventory_value, 0),
        slowValue: categorized.filter(p => p.status === 'Slow Moving').reduce((s, p) => s + p.inventory_value, 0),
      }
    }
  }

  // ── Exhibition P&L (Pro) ──────────────────────────────────
  let exhibitionPL: any[] = []
  if (tenant.plan === 'pro') {
    const { data: exhibitions } = await supabase
      .from('exhibitions')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('start_date', { ascending: false })

    if (exhibitions) {
      exhibitionPL = exhibitions.map(ex => {
        const costs = ['stall_cost', 'other_expenses', 'transport_cost', 'staff_cost', 'food_cost', 'marketing_cost']
          .reduce((s, k) => s + Number((ex as any)[k] || 0), 0)
        const profit = Number(ex.total_sales) - costs
        return {
          name: ex.name,
          revenue: Number(ex.total_sales),
          costs,
          profit,
          roi: costs > 0 ? (profit / costs * 100) : 0,
          status: ex.status,
        }
      })
    }
  }

  return NextResponse.json({
    plan: tenant.plan,
    range,
    period: { start: startISO, end: endISO },
    summary: {
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      total_cogs: totalCOGS,
      gross_profit: grossProfit,
      net_profit: netProfit,
      gross_margin: grossMargin,
      net_margin: netMargin,
      sales_count: salesData.length,
      avg_order_value: avgOrderValue,
    },
    trend,
    dailyTrend,
    byPaymentMethod,
    byPaymentStatus,
    productPerformance,
    expenseBreakdown,
    customerOutstanding,
    stockHealth,
    exhibitionPL,
  })
}
