import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TrendingUp, Package, AlertTriangle, Users } from 'lucide-react'
import Link from 'next/link'

async function getDashboardData(tenantId: string) {
  const supabase = await createClient()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [productsRes, salesRes, customersRes, exhibitionsRes] = await Promise.all([
    supabase.from('products').select('id, name, stock_quantity, low_stock_alert').eq('tenant_id', tenantId).eq('is_active', true),
    supabase.from('sales').select('final_amount, created_at').eq('tenant_id', tenantId).gte('created_at', monthStart),
    supabase.from('customers').select('credit_balance').eq('tenant_id', tenantId),
    supabase.from('exhibitions').select('id').eq('tenant_id', tenantId).eq('status', 'upcoming'),
  ])

  const allProducts = productsRes.data || []
  const monthlyRevenue = salesRes.data?.reduce((s, sale) => s + Number(sale.final_amount), 0) || 0
  const creditOutstanding = customersRes.data?.reduce((s, c) => s + Number(c.credit_balance), 0) || 0

  // Fix (f): Filter low stock IN JS — Supabase .filter('stock_quantity','lte','low_stock_alert')
  // compares to the STRING 'low_stock_alert', not the column value.
  // Correct approach: fetch all, filter client-side.
  const lowStockItems = allProducts
    .filter(p => Number(p.stock_quantity) <= Number(p.low_stock_alert))
    .slice(0, 8)

  const { data: recentSales } = await supabase
    .from('sales')
    .select('id, invoice_number, customer_name, final_amount, payment_method, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(5)

  return {
    stats: {
      monthly_revenue: monthlyRevenue,
      monthly_sales: salesRes.data?.length || 0,
      total_products: allProducts.length,
      low_stock: lowStockItems.length,    // Now matches the list below
      total_customers: customersRes.data?.length || 0,
      total_credit_outstanding: creditOutstanding,
      upcoming_exhibitions: exhibitionsRes.data?.length || 0,
    },
    recentSales: recentSales || [],
    lowStockItems,   // Correct items matching the count
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tenant } = await supabase.from('tenants').select('id, owner_name, plan').eq('owner_id', user.id).single()
  if (!tenant) redirect('/login')

  const { stats, recentSales, lowStockItems } = await getDashboardData(tenant.id)

  const statCards = [
    { label: 'Monthly Revenue', value: `₹${stats.monthly_revenue.toLocaleString('en-IN')}`, sub: `${stats.monthly_sales} sales this month`, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Total Products', value: stats.total_products.toString(), sub: 'Active in inventory', icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Low Stock Alerts', value: stats.low_stock.toString(), sub: stats.low_stock > 0 ? 'Items need restocking' : 'All items well stocked', icon: AlertTriangle, color: stats.low_stock > 0 ? 'text-red-400' : 'text-green-400', bg: stats.low_stock > 0 ? 'bg-red-500/10' : 'bg-green-500/10' },
    { label: 'Customers', value: stats.total_customers.toString(), sub: `₹${stats.total_credit_outstanding.toLocaleString('en-IN')} credit due`, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ]

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{greeting}, {tenant.owner_name.split(' ')[0]}! 👋</h1>
        <p className="text-slate-400 text-sm mt-1">Here's what's happening with your business today.</p>
      </div>

      {/* Stats — 2x2 on mobile, 4-col on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map(card => (
          <div key={card.label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">{card.label}</span>
              <div className={`w-8 h-8 ${card.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
            <div className={`text-2xl font-bold ${card.color} mb-0.5`}>{card.value}</div>
            <div className="text-slate-500 text-xs">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Recent sales + Low stock */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <h3 className="text-white font-semibold text-sm">Recent Sales</h3>
            <Link href="/dashboard/sales" className="text-blue-400 text-xs hover:text-blue-300">View all →</Link>
          </div>
          <div className="divide-y divide-slate-800">
            {recentSales.length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-500 text-sm">No sales yet</div>
            ) : recentSales.map(sale => (
              <div key={sale.id} className="px-5 py-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-white text-sm font-medium truncate">{sale.customer_name}</div>
                  <div className="text-slate-500 text-xs">{sale.invoice_number} · {new Date(sale.created_at).toLocaleDateString('en-IN')}</div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <div className="text-white text-sm font-semibold">₹{Number(sale.final_amount).toLocaleString('en-IN')}</div>
                  <span className="text-xs text-slate-400 uppercase">{sale.payment_method}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <h3 className="text-white font-semibold text-sm">
              ⚠️ Low Stock
              {lowStockItems.length > 0 && (
                <span className="ml-2 text-xs bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20">
                  {lowStockItems.length} items
                </span>
              )}
            </h3>
            <Link href="/dashboard/inventory" className="text-blue-400 text-xs hover:text-blue-300">Manage →</Link>
          </div>
          <div className="divide-y divide-slate-800">
            {lowStockItems.length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-500 text-sm">✓ All items well stocked</div>
            ) : lowStockItems.map(item => (
              <div key={item.id} className="px-5 py-3 flex items-center justify-between">
                <div className="text-white text-sm truncate flex-1">{item.name}</div>
                <div className="flex-shrink-0 ml-3 text-right">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                    item.stock_quantity === 0
                      ? 'bg-red-500/15 text-red-400 border-red-500/20'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                  }`}>
                    {item.stock_quantity === 0 ? 'Out of stock' : `${item.stock_quantity} left`}
                  </span>
                  <div className="text-slate-600 text-xs mt-0.5">alert at {item.low_stock_alert}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
