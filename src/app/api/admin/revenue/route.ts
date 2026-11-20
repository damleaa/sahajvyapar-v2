// src/app/api/admin/revenue/route.ts
// F-01: Uses verifyAdminSession() — no x-admin-key header accepted.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminSession } from '@/lib/admin-auth'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function razorpayFetch(endpoint: string) {
  const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!key || !secret) return null
  const auth = Buffer.from(`${key}:${secret}`).toString('base64')
  const res = await fetch(`https://api.razorpay.com/v1/${endpoint}`, {
    headers: { 'Authorization': `Basic ${auth}` }
  })
  if (!res.ok) return null
  return res.json()
}

export async function GET(req: NextRequest) {
  // C-01 FIX: Must await — verifyAdminSession returns Promise<boolean>, never a bare boolean
  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getAdminClient()
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, business_name, email, plan, plan_status, payment_id, razorpay_subscription_id, plan_expires_at, next_payment_due, created_at')
    .order('created_at', { ascending: false })

  const PLAN_PRICES: any = { starter: 399, growth: 699, pro: 999 }
  const GST_RATE = 0.18

  const activeTenants = (tenants || []).filter((t: any) => t.plan_status === 'active')
  const mrr = activeTenants.reduce((sum: number, t: any) => sum + (PLAN_PRICES[t.plan] || 0), 0)
  const arr = mrr * 12
  const mrrExGST = Math.round(mrr / (1 + GST_RATE) * 100) / 100
  const mrrGST = Math.round((mrr - mrrExGST) * 100) / 100

  const byPlan = { starter: 0, growth: 0, pro: 0 }
  activeTenants.forEach((t: any) => { if (t.plan in byPlan) byPlan[t.plan as keyof typeof byPlan]++ })

  const sixMonthsAgo = Math.floor(Date.now() / 1000) - (180 * 24 * 60 * 60)
  let razorpayPayments: any[] = []
  let razorpayRefunds: any[] = []

  try {
    const payments = await razorpayFetch(`payments?from=${sixMonthsAgo}&count=100`)
    razorpayPayments = payments?.items || []
    const refunds = await razorpayFetch(`refunds?from=${sixMonthsAgo}&count=100`)
    razorpayRefunds = refunds?.items || []
  } catch (e) {
    console.error('Razorpay fetch error:', e)
  }

  const totalCollected = razorpayPayments
    .filter((p: any) => p.status === 'captured')
    .reduce((sum: number, p: any) => sum + (p.amount / 100), 0)

  const totalRefunds = razorpayRefunds
    .reduce((sum: number, r: any) => sum + (r.amount / 100), 0)

  // NOTE: Razorpay fee is estimated at ~2% + GST — actual fees vary by payment method.
  // Download the Razorpay settlement report from the dashboard for exact figures.
  const razorpayFees = Math.round(totalCollected * 0.02 * 100) / 100
  const netRevenue = totalCollected - totalRefunds - razorpayFees

  const monthlyData: Record<string, { collected: number; refunds: number; count: number }> = {}
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyData[key] = { collected: 0, refunds: 0, count: 0 }
  }

  razorpayPayments
    .filter((p: any) => p.status === 'captured')
    .forEach((p: any) => {
      const d = new Date(p.created_at * 1000)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (monthlyData[key]) { monthlyData[key].collected += p.amount / 100; monthlyData[key].count++ }
    })

  razorpayRefunds.forEach((r: any) => {
    const d = new Date(r.created_at * 1000)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (monthlyData[key]) monthlyData[key].refunds += r.amount / 100
  })

  return NextResponse.json({
    summary: { mrr, arr, mrr_ex_gst: mrrExGST, mrr_gst: mrrGST, total_collected: totalCollected, total_refunds: totalRefunds, razorpay_fees: razorpayFees, net_revenue: netRevenue, active_subscribers: activeTenants.length, total_tenants: tenants?.length || 0 },
    by_plan: byPlan,
    monthly: monthlyData,
    recent_payments: razorpayPayments.slice(0, 20).map((p: any) => ({ id: p.id, amount: p.amount / 100, status: p.status, method: p.method, email: p.email, created_at: new Date(p.created_at * 1000).toISOString() })),
    recent_refunds: razorpayRefunds.slice(0, 10).map((r: any) => ({ id: r.id, payment_id: r.payment_id, amount: r.amount / 100, status: r.status, created_at: new Date(r.created_at * 1000).toISOString() })),
    tenants_with_payments: (tenants || []).filter((t: any) => t.payment_id),
  })
}
