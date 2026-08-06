'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { TrendingUp, TrendingDown, IndianRupee } from 'lucide-react'
import { LockedFeature } from '@/components/ui'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']
const PLAN_COLOR: any = { starter: 'text-amber-400', growth: 'text-blue-400', pro: 'text-purple-400' }

const RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_3_months', label: '3 Months' },
  { value: 'last_6_months', label: '6 Months' },
  { value: 'this_year', label: 'This Year' },
]

const TABS = [
  { id: 'overview', label: 'Overview', plans: ['starter', 'growth', 'pro'] },
  { id: 'sales', label: 'Sales Analysis', plans: ['starter', 'growth', 'pro'] },
  { id: 'products', label: 'Products', plans: ['growth', 'pro'] },
  { id: 'customers', label: 'Customers', plans: ['growth', 'pro'] },
  { id: 'stock', label: 'Stock Health', plans: ['pro'] },
  { id: 'exhibitions', label: 'Exhibitions', plans: ['pro'] },
]

const money = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`

const StatCard = ({ label, value, sub, color = 'text-white', icon: Icon, bg }: any) => (
  <div className="card p-5">
    <div className="flex items-center justify-between mb-3">
      <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">{label}</span>
      {Icon && <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}><Icon className={`w-4 h-4 ${color}`} /></div>}
    </div>
    <div className={`text-2xl font-bold ${color} mb-0.5`}>{value}</div>
    {sub && <div className="text-slate-500 text-xs">{sub}</div>}
  </div>
)

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 shadow-xl">
      <div className="text-slate-400 text-xs mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: {money(Number(p.value))}
        </div>
      ))}
    </div>
  )
}

export default function ReportsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('this_month')
  const [tab, setTab] = useState('overview')
  const [paymentMethod, setPaymentMethod] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ range, payment_method: paymentMethod })
      const res = await fetch(`/api/reports?${params}`)
      const r = await res.json()
      if (r.error) {
        console.error('Reports API error:', r.error)
      }
      setData(r)
    } catch (err) {
      console.error('Reports fetch failed:', err)
    }
    setLoading(false)
  }, [range, paymentMethod])

  useEffect(() => { load() }, [load])

  const plan = data?.plan || 'starter'
  const s = data?.summary || {}

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Business Reports</h1>
          <p className={`text-sm mt-0.5 capitalize ${PLAN_COLOR[plan]}`}>{plan} plan</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="input-base text-sm py-2 w-36">
            <option value="all">All Methods</option>
            {['cash', 'upi', 'card', 'credit', 'bank'].map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
          </select>
          <div className="flex bg-slate-800 rounded-xl p-1 gap-0.5 flex-wrap">
            {RANGES.map(r => (
              <button key={r.value} onClick={() => setRange(r.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${range === r.value ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-slate-800">
        {TABS.map(t => {
          const available = t.plans.includes(plan)
          return (
            <button key={t.id}
              onClick={() => available && setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap ${
                !available ? 'text-slate-600 border-transparent cursor-not-allowed' :
                tab === t.id ? 'text-white border-blue-500' : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}>
              {!available && '🔒 '}{t.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">Loading reports...</div>
      ) : (
        <>
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <StatCard label="Revenue" value={money(s.total_revenue)} sub={`${s.sales_count} sales`} color="text-green-400" icon={TrendingUp} bg="bg-green-500/10" />
                <StatCard label="Avg Order Value" value={money(s.avg_order_value)} sub="per sale" color="text-blue-400" icon={IndianRupee} bg="bg-blue-500/10" />
                {plan !== 'starter' ? (
                  <>
                    <StatCard label="Gross Profit" value={money(s.gross_profit)} sub={`${s.gross_margin?.toFixed(1)}% margin`} color={s.gross_profit >= 0 ? 'text-green-400' : 'text-red-400'} icon={TrendingUp} bg="bg-green-500/10" />
                    <StatCard label="Net Profit" value={money(s.net_profit)} sub={`After ${money(s.total_expenses)} expenses`} color={s.net_profit >= 0 ? 'text-green-400' : 'text-red-400'} icon={s.net_profit >= 0 ? TrendingUp : TrendingDown} bg={s.net_profit >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'} />
                  </>
                ) : (
                  <>
                    <div className="card p-5 flex items-center justify-center text-center"><div><div className="text-slate-500 text-xs mb-1">Profit Analysis</div><div className="text-slate-400 text-sm">Growth+</div></div></div>
                    <div className="card p-5 flex items-center justify-center text-center"><div><div className="text-slate-500 text-xs mb-1">Net Profit</div><div className="text-slate-400 text-sm">Growth+</div></div></div>
                  </>
                )}
              </div>

              <div className="card p-6">
                <h3 className="text-white font-semibold mb-5">Revenue Trend</h3>
                {data?.trend?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.trend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-40 flex items-center justify-center text-slate-500 text-sm">No sales in this period</div>}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="card p-6">
                  <h3 className="text-white font-semibold mb-5">Sales by Payment Method</h3>
                  {data?.byPaymentMethod?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={data.byPaymentMethod} dataKey="revenue" nameKey="method" cx="50%" cy="50%" outerRadius={80} label={(props: any) => `${props.method} ${((props.percent||0)*100).toFixed(0)}%`} labelLine={false}>
                          {data.byPaymentMethod.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: any) => money(Number(v))} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div className="h-40 flex items-center justify-center text-slate-500 text-sm">No data</div>}
                </div>

                <div className="card p-6">
                  <h3 className="text-white font-semibold mb-5">Revenue vs Expenses vs Profit</h3>
                  {plan !== 'starter' ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={[{ name: 'This Period', Revenue: s.total_revenue, Expenses: s.total_expenses, Profit: s.net_profit }]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="Revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Profit" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-40 flex flex-col items-center justify-center text-center">
                      <div className="text-3xl mb-2">🔒</div>
                      <div className="text-slate-400 text-sm">Available on Growth plan</div>
                      <a href="/dashboard/upgrade" className="text-blue-400 text-xs mt-2">Upgrade →</a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'sales' && (
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-white font-semibold mb-5">Daily Sales Trend (Last 30 Days)</h3>
                {data?.dailyTrend?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={data.dailyTrend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <div className="h-40 flex items-center justify-center text-slate-500 text-sm">No sales data</div>}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="card p-6">
                  <h3 className="text-white font-semibold mb-4">Payment Method Breakdown</h3>
                  <div className="space-y-3">
                    {(data?.byPaymentMethod || []).map((m: any, i: number) => (
                      <div key={m.method} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <div className="flex-1 text-sm text-slate-300">{m.method}</div>
                        <div className="text-sm font-semibold text-white">{money(m.revenue)}</div>
                        <div className="text-xs text-slate-500">{m.count} sales</div>
                      </div>
                    ))}
                    {!data?.byPaymentMethod?.length && <p className="text-slate-500 text-sm">No data</p>}
                  </div>
                </div>

                <div className="card p-6">
                  <h3 className="text-white font-semibold mb-4">Payment Status</h3>
                  {data?.byPaymentStatus?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={data.byPaymentStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={70} label={(props: any) => `${props.status}: ${props.count}`}>
                          {data.byPaymentStatus.map((_: any, i: number) => <Cell key={i} fill={['#22c55e','#ef4444','#f59e0b'][i]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div className="h-40 flex items-center justify-center text-slate-500 text-sm">No data</div>}
                </div>
              </div>
            </div>
          )}

          {tab === 'products' && (
            plan === 'starter' ? <LockedFeature feature="Product Performance Reports" plan="Growth" /> : (
              <div className="space-y-6">
                <div className="card p-6">
                  <h3 className="text-white font-semibold mb-5">Top 10 Products by Profit</h3>
                  {data?.productPerformance?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={data.productPerformance} margin={{ top: 5, right: 20, left: 10, bottom: 70 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="profit" name="Profit" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="h-40 flex items-center justify-center text-slate-500 text-sm">No product sales in this period</div>}
                </div>

                <div className="card overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-800"><h3 className="text-white font-semibold">Product Profitability Detail</h3></div>
                  <table className="w-full">
                    <thead><tr className="border-b border-slate-800">{['Product','Qty','Revenue','COGS','Profit','Margin'].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-slate-800">
                      {!data?.productPerformance?.length ? (
                        <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-500 text-sm">No data in this period</td></tr>
                      ) : data.productPerformance.map((p: any) => (
                        <tr key={p.name} className="hover:bg-slate-800/30">
                          <td className="px-5 py-3 text-white text-sm font-medium">{p.name}</td>
                          <td className="px-5 py-3 text-slate-400 text-sm">{p.qty}</td>
                          <td className="px-5 py-3 text-white text-sm">{money(p.revenue)}</td>
                          <td className="px-5 py-3 text-slate-400 text-sm">{money(p.cogs)}</td>
                          <td className={`px-5 py-3 text-sm font-bold ${p.profit >= 0 ? 'text-green-400':'text-red-400'}`}>{money(p.profit)}</td>
                          <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.margin>=30?'bg-green-500/15 text-green-400':p.margin>=10?'bg-amber-500/15 text-amber-400':'bg-red-500/15 text-red-400'}`}>{p.margin.toFixed(1)}%</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {tab === 'customers' && (
            plan === 'starter' ? <LockedFeature feature="Customer Reports" plan="Growth" /> : (
              <div className="space-y-6">
                <div className="card p-6">
                  <h3 className="text-white font-semibold mb-5">Customer Outstanding (Credit Due)</h3>
                  {data?.customerOutstanding?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={data.customerOutstanding} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                        <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} width={120} />
                        <Tooltip formatter={(v: any) => money(Number(v))} />
                        <Bar dataKey="credit_balance" name="Outstanding" fill="#ef4444" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-40 flex flex-col items-center justify-center text-center">
                      <div className="text-3xl mb-2">✅</div>
                      <div className="text-green-400 font-medium">No outstanding dues!</div>
                    </div>
                  )}
                </div>
                <div className="card overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="text-white font-semibold">Outstanding Detail</h3>
                    <div className="text-red-400 font-bold text-sm">Total: {money(data?.customerOutstanding?.reduce((s: number, c: any) => s + Number(c.credit_balance), 0) || 0)}</div>
                  </div>
                  <table className="w-full">
                    <thead><tr className="border-b border-slate-800">{['Customer','Credit Balance',''].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-slate-800">
                      {!data?.customerOutstanding?.length ? (
                        <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-500 text-sm">No outstanding dues</td></tr>
                      ) : data.customerOutstanding.map((c: any) => (
                        <tr key={c.name} className="hover:bg-slate-800/30">
                          <td className="px-5 py-3 text-white text-sm font-medium">{c.name}</td>
                          <td className="px-5 py-3 text-red-400 font-bold text-sm">{money(c.credit_balance)}</td>
                          <td className="px-5 py-3"><a href="/dashboard/customers" className="text-xs text-blue-400 hover:text-blue-300">Record Payment →</a></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {tab === 'stock' && (
            plan !== 'pro' ? <LockedFeature feature="Stock Intelligence" plan="Pro" /> : (
              <div className="space-y-6">
                <div className="grid grid-cols-4 gap-4">
                  {[{s:'Healthy',c:'text-green-400',b:'border-green-500/20'},{s:'Low Stock',c:'text-amber-400',b:'border-amber-500/20'},{s:'Slow Moving',c:'text-orange-400',b:'border-orange-500/20'},{s:'Dead',c:'text-red-400',b:'border-red-500/20'}].map(({s: status, c, b}) => {
                    const d = data?.stockHealth?.summary?.find((x: any) => x.status === status) || { count: 0, value: 0 }
                    return <div key={status} className={`card p-5 border-2 ${b}`}><div className="text-slate-400 text-xs font-medium uppercase mb-2">{status}</div><div className={`text-2xl font-bold ${c} mb-0.5`}>{d.count} items</div><div className="text-slate-500 text-xs">{money(d.value)}</div></div>
                  })}
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="card p-6">
                    <h3 className="text-white font-semibold mb-5">Stock Status Distribution</h3>
                    {data?.stockHealth?.summary ? (
                      <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                          <Pie data={data.stockHealth.summary} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={90} innerRadius={50}>
                            {data.stockHealth.summary.map((_: any, i: number) => <Cell key={i} fill={['#22c55e','#f59e0b','#f97316','#ef4444'][i]} />)}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <div className="h-40 flex items-center justify-center text-slate-500 text-sm">No stock data</div>}
                  </div>
                  <div className="card p-6">
                    <h3 className="text-white font-semibold mb-4">Cash Blocked in Stock</h3>
                    <div className="space-y-3">
                      {[['Total Inventory','text-white',data?.stockHealth?.totalValue],['Slow Moving','text-orange-400',data?.stockHealth?.slowValue],['Dead Stock','text-red-400',data?.stockHealth?.deadValue],['Cash Blocked Total','text-red-400',(data?.stockHealth?.slowValue||0)+(data?.stockHealth?.deadValue||0)]].map(([l,c,v]: any) => (
                        <div key={l} className="flex justify-between items-center py-2.5 border-b border-slate-800">
                          <span className="text-slate-400 text-sm">{l}</span>
                          <span className={`font-bold text-sm ${c}`}>{money(v||0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="card overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-800"><h3 className="text-white font-semibold">All Products — Stock Intelligence</h3></div>
                  <table className="w-full">
                    <thead><tr className="border-b border-slate-800">{['Product','Stock','Monthly Sales','Cover','Value','Status'].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-slate-800">
                      {(data?.stockHealth?.items || []).map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-800/30">
                          <td className="px-5 py-3 text-white text-sm font-medium">{p.name}</td>
                          <td className="px-5 py-3 text-slate-300 text-sm">{p.stock_quantity}</td>
                          <td className="px-5 py-3 text-slate-300 text-sm">{p.monthly_sold.toFixed(1)}</td>
                          <td className="px-5 py-3 text-slate-300 text-sm">{p.cover_months >= 99 ? '∞' : `${p.cover_months.toFixed(1)}m`}</td>
                          <td className="px-5 py-3 text-slate-300 text-sm">{money(p.inventory_value)}</td>
                          <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.status==='Healthy'?'bg-green-500/15 text-green-400':p.status==='Low Stock'?'bg-amber-500/15 text-amber-400':p.status==='Slow Moving'?'bg-orange-500/15 text-orange-400':'bg-red-500/15 text-red-400'}`}>{p.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {tab === 'exhibitions' && (
            plan !== 'pro' ? <LockedFeature feature="Exhibition P&L Reports" plan="Pro" /> : (
              <div className="space-y-6">
                {!data?.exhibitionPL?.length ? (
                  <div className="card p-12 text-center"><div className="text-3xl mb-3">🎪</div><div className="text-white font-medium mb-1">No exhibitions yet</div><a href="/dashboard/exhibitions" className="btn-primary px-6 mt-4 inline-block">Add Exhibition →</a></div>
                ) : (
                  <>
                    <div className="card p-6">
                      <h3 className="text-white font-semibold mb-5">Exhibition Revenue vs Costs vs Profit</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.exhibitionPL} margin={{ top: 5, right: 20, left: 10, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} angle={-25} textAnchor="end" interval={0} />
                          <YAxis tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Bar dataKey="revenue" name="Revenue" fill="#22c55e" radius={[4,4,0,0]} />
                          <Bar dataKey="costs" name="Costs" fill="#ef4444" radius={[4,4,0,0]} />
                          <Bar dataKey="profit" name="Profit" fill="#3b82f6" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="card overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-800"><h3 className="text-white font-semibold">Exhibition P&L Comparison</h3></div>
                      <table className="w-full">
                        <thead><tr className="border-b border-slate-800">{['Exhibition','Revenue','Costs','Profit/Loss','ROI','Status'].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr></thead>
                        <tbody className="divide-y divide-slate-800">
                          {data.exhibitionPL.map((ex: any) => (
                            <tr key={ex.name} className="hover:bg-slate-800/30">
                              <td className="px-5 py-3 text-white text-sm font-medium">{ex.name}</td>
                              <td className="px-5 py-3 text-green-400 text-sm font-semibold">{money(ex.revenue)}</td>
                              <td className="px-5 py-3 text-red-400 text-sm">{money(ex.costs)}</td>
                              <td className={`px-5 py-3 text-sm font-bold ${ex.profit>=0?'text-green-400':'text-red-400'}`}>{ex.profit>=0?'+':''}{money(ex.profit)}</td>
                              <td className={`px-5 py-3 text-sm font-semibold ${ex.roi>=0?'text-blue-400':'text-red-400'}`}>{ex.roi.toFixed(1)}%</td>
                              <td className="px-5 py-3"><span className={`badge ${ex.status==='completed'?'badge-slate':ex.status==='active'?'badge-green':'badge-blue'}`}>{ex.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )
          )}
        </>
      )}
    </div>
  )
}
