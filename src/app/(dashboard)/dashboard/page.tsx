import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TrendingUp, Package, AlertTriangle, Users, CreditCard, Store } from 'lucide-react'

async function getDashboardData(tenantId: string) {
  const supabase = await createClient()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [products, sales, customers, exhibitions] = await Promise.all([
    supabase.from('products').select('id, stock_quantity, low_stock_alert').eq('tenant_id', tenantId).eq('is_active', true),
    supabase.from('sales').select('final_amount, created_at').eq('tenant_id', tenantId).gte('created_at', monthStart),
    supabase.from('customers').select('credit_balance').eq('tenant_id', tenantId),
    supabase.from('exhibitions').select('id').eq('tenant_id', tenantId).eq('status', 'upcoming'),
  ])

  const monthlyRevenue = sales.data?.reduce((s, sale) => s + Number(sale.final_amount), 0) || 0
  const lowStock = products.data?.filter(p => p.stock_quantity <= p.low_stock_alert).length || 0
  const creditOutstanding = customers.data?.reduce((s, c) => s + Number(c.credit_balance), 0) || 0

  // Recent sales
  const { data: recentSales } = await supabase
    .from('sales')
    .select('id, invoice_number, customer_name, final_amount, payment_method, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(5)

  // Low stock items
  const { data: lowStockItems } = await supabase
    .from('products')
    .select('id, name, stock_quantity, low_stock_alert')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .filter('stock_quantity', 'lte', 'low_stock_alert')
    .limit(5)

  return {
    stats: {
      monthly_revenue: monthlyRevenue,
      monthly_sales: sales.data?.length || 0,
      total_products: products.data?.length || 0,
      low_stock: lowStock,
      total_customers: customers.data?.length || 0,
      total_credit_outstanding: creditOutstanding,
      upcoming_exhibitions: exhibitions.data?.length || 0,
    },
    recentSales: recentSales || [],
    lowStockItems: lowStockItems || [],
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
    { label: 'Monthly Revenue', value: `₹${stats.monthly_revenue.toLocaleString('en-IN')}`, sub: `${stats.monthly_sales} sales`, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Total Products', value: stats.total_products.toString(), sub: 'Active in inventory', icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Low Stock Alerts', value: stats.low_stock.toString(), sub: 'Need restocking', icon: AlertTriangle, color: stats.low_stock > 0 ? 'text-red-400' : 'text-green-400', bg: stats.low_stock > 0 ? 'bg-red-500/10' : 'bg-green-500/10' },
    { label: 'Customers', value: stats.total_customers.toString(), sub: `₹${stats.total_credit_outstanding.toLocaleString('en-IN')} credit due`, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ]

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{greeting}, {tenant.owner_name.split(' ')[0]}! 👋</h1>
        <p className="text-slate-400 text-sm mt-1">Here's what's happening with your business today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {statCards.map(card => (
          <div key={card.label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">{card.label}</span>
              <div className={`w-8 h-8 ${card.bg} rounded-lg flex items-center justify-center`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
            <div className={`text-2xl font-bold ${card.color} mb-0.5`}>{card.value}</div>
            <div className="text-slate-500 text-xs">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Recent sales + Low stock */}
      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <h3 className="text-white font-semibold text-sm">Recent Sales</h3>
            <a href="/dashboard/sales" className="text-blue-400 text-xs hover:text-blue-300">View all →</a>
          </div>
          <div className="divide-y divide-slate-800">
            {recentSales.length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-500 text-sm">No sales yet</div>
            ) : recentSales.map(sale => (
              <div key={sale.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="text-white text-sm font-medium">{sale.customer_name}</div>
                  <div className="text-slate-500 text-xs">{sale.invoice_number} · {new Date(sale.created_at).toLocaleDateString('en-IN')}</div>
                </div>
                <div className="text-right">
                  <div className="text-white text-sm font-semibold">₹{Number(sale.final_amount).toLocaleString('en-IN')}</div>
                  <span className="badge badge-blue text-xs uppercase">{sale.payment_method}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <h3 className="text-white font-semibold text-sm">⚠️ Low Stock</h3>
            <a href="/dashboard/inventory" className="text-blue-400 text-xs hover:text-blue-300">Manage →</a>
          </div>
          <div className="divide-y divide-slate-800">
            {lowStockItems.length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-500 text-sm">✓ All items well stocked</div>
            ) : lowStockItems.map(item => (
              <div key={item.id} className="px-5 py-3 flex items-center justify-between">
                <div className="text-white text-sm">{item.name}</div>
                <span className="badge badge-red">{item.stock_quantity} left</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
