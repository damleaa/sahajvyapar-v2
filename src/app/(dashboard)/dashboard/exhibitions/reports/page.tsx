'use client'

import { useEffect, useState } from 'react'

interface Exhibition {
  id: string
  name: string
  location: string
  start_date: string
  end_date: string
  stall_cost: number
  other_expenses: number
  status: string
  total_sales: number
}

interface Sale {
  id: string
  invoice_number: string
  sale_date: string
  customer_name: string
  exhibition_id: string
  final_amount: number
  payment_method: string
  items: { product_name: string; quantity: number; unit_price: number }[]
}

export default function ExhibitionReportsPage() {
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [selectedId, setSelectedId] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetch('/api/exhibitions'), fetch('/api/sales')])
      .then(([er, sr]) => Promise.all([er.json(), sr.json()]))
      .then(([ed, sd]) => {
        const exList: Exhibition[] = ed.exhibitions || []
        setExhibitions(exList)
        setSales(Array.isArray(sd) ? sd : [])
        // Default to first active/completed exhibition if any
        const first = exList.find(e => e.status === 'active' || e.status === 'completed')
        if (first) setSelectedId(first.id)
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="p-6 text-slate-400">Loading...</div>

  const exMap = Object.fromEntries(exhibitions.map(e => [e.id, e]))

  // Sales for selected exhibition (or all)
  const filteredSales = selectedId === 'all'
    ? sales.filter(s => s.exhibition_id)
    : sales.filter(s => s.exhibition_id === selectedId)

  // Aggregate per-exhibition for "all" view
  const allExSales = exhibitions.map(ex => {
    const exSales = sales.filter(s => s.exhibition_id === ex.id)
    const revenue = exSales.reduce((s, sale) => s + Number(sale.final_amount || 0), 0)
    const cost = (ex.stall_cost || 0) + (ex.other_expenses || 0)
    return { ...ex, revenue, cost, profit: revenue - cost, salesCount: exSales.length }
  }).filter(e => e.status !== 'upcoming')

  // Stats for selected exhibition
  const selEx = selectedId !== 'all' ? exMap[selectedId] : null
  const revenue = filteredSales.reduce((s, sale) => s + Number(sale.final_amount || 0), 0)
  const cost = selEx ? (selEx.stall_cost || 0) + (selEx.other_expenses || 0) : 0
  const profit = revenue - cost
  const roi = cost > 0 ? ((profit / cost) * 100).toFixed(1) : null

  // Payment method breakdown
  const paymentBreakdown = filteredSales.reduce((acc, s) => {
    const m = s.payment_method || 'other'
    acc[m] = (acc[m] || 0) + Number(s.final_amount || 0)
    return acc
  }, {} as Record<string, number>)

  // Top products across filtered sales
  const productMap: Record<string, { qty: number; revenue: number }> = {}
  for (const sale of filteredSales) {
    for (const item of (sale.items || [])) {
      if (!productMap[item.product_name]) productMap[item.product_name] = { qty: 0, revenue: 0 }
      productMap[item.product_name].qty += item.quantity
      productMap[item.product_name].revenue += item.quantity * item.unit_price
    }
  }
  const topProducts = Object.entries(productMap)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5)

  function fmt(n: number) {
    return '₹' + Math.abs(n).toLocaleString('en-IN')
  }

  function plColor(n: number) {
    return n >= 0 ? 'text-green-400' : 'text-red-400'
  }

  function statusBadge(s: string) {
    const map: Record<string, string> = {
      active: 'bg-green-900 text-green-300',
      completed: 'bg-slate-700 text-slate-300',
      upcoming: 'bg-blue-900 text-blue-300',
    }
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[s] || ''}`}>{s}</span>
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Exhibition Reports</h1>
          <p className="text-slate-400 text-sm mt-0.5">P&L, sales breakdown and product performance</p>
        </div>
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          className="input-base w-auto text-sm"
        >
          <option value="all">All Exhibitions (Summary)</option>
          {exhibitions.filter(e => e.status !== 'upcoming').map(e => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>

      {/* ── ALL EXHIBITIONS SUMMARY VIEW ── */}
      {selectedId === 'all' && (
        <>
          {/* Aggregate stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Revenue', value: fmt(allExSales.reduce((s, e) => s + e.revenue, 0)), sub: `${allExSales.length} exhibitions` },
              { label: 'Total Cost', value: fmt(allExSales.reduce((s, e) => s + e.cost, 0)), sub: 'Stall + expenses' },
              { label: 'Net Profit', value: (() => { const p = allExSales.reduce((s,e) => s + e.profit, 0); return (p >= 0 ? '' : '-') + fmt(p) })(), sub: 'Overall', color: plColor(allExSales.reduce((s,e) => s + e.profit, 0)) },
              { label: 'Total Sales', value: String(allExSales.reduce((s, e) => s + e.salesCount, 0)), sub: 'transactions' },
            ].map(stat => (
              <div key={stat.label} className="card py-3 px-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{stat.label}</p>
                <p className={`text-xl font-bold ${stat.color || 'text-white'}`}>{stat.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* Per-exhibition table */}
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Exhibition', 'Status', 'Sales', 'Revenue', 'Cost', 'Profit / Loss', 'ROI'].map(h => (
                    <th key={h} className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {allExSales.sort((a, b) => b.revenue - a.revenue).map(ex => {
                  const roi = ex.cost > 0 ? ((ex.profit / ex.cost) * 100).toFixed(0) + '%' : '—'
                  return (
                    <tr key={ex.id} className="hover:bg-slate-800/30 cursor-pointer transition-colors"
                      onClick={() => setSelectedId(ex.id)}>
                      <td className="px-4 py-3.5">
                        <p className="text-white font-medium">{ex.name}</p>
                        <p className="text-slate-500 text-xs">{ex.location}</p>
                      </td>
                      <td className="px-4 py-3.5">{statusBadge(ex.status)}</td>
                      <td className="px-4 py-3.5 text-slate-300">{ex.salesCount}</td>
                      <td className="px-4 py-3.5 text-white font-medium">{fmt(ex.revenue)}</td>
                      <td className="px-4 py-3.5 text-slate-400">{ex.cost > 0 ? fmt(ex.cost) : '—'}</td>
                      <td className={`px-4 py-3.5 font-semibold ${plColor(ex.profit)}`}>
                        {ex.cost > 0 ? (ex.profit >= 0 ? '+' : '-') + fmt(ex.profit) : '—'}
                      </td>
                      <td className={`px-4 py-3.5 font-medium ${ex.cost > 0 ? plColor(ex.profit) : 'text-slate-600'}`}>{roi}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── SINGLE EXHIBITION DETAIL VIEW ── */}
      {selectedId !== 'all' && selEx && (
        <>
          {/* Exhibition info */}
          <div className="card px-4 py-3 flex flex-wrap items-center gap-4 justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">{selEx.name}</span>
                {statusBadge(selEx.status)}
              </div>
              <p className="text-slate-500 text-xs mt-0.5">
                {selEx.location}
                {selEx.start_date && ` · ${new Date(selEx.start_date).toLocaleDateString('en-IN')} – ${new Date(selEx.end_date).toLocaleDateString('en-IN')}`}
              </p>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-slate-400">Stall: <span className="text-white">{fmt(selEx.stall_cost || 0)}</span></span>
              <span className="text-slate-400">Other: <span className="text-white">{fmt(selEx.other_expenses || 0)}</span></span>
            </div>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Revenue', value: fmt(revenue), color: 'text-white' },
              { label: 'Total Cost', value: fmt(cost), color: 'text-white' },
              { label: profit >= 0 ? 'Profit' : 'Loss', value: (profit >= 0 ? '' : '-') + fmt(profit), color: plColor(profit) },
              { label: 'ROI', value: roi ? (Number(roi) >= 0 ? '+' : '') + roi + '%' : '—', color: roi ? plColor(Number(roi)) : 'text-slate-500' },
            ].map(stat => (
              <div key={stat.label} className="card py-3 px-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{stat.label}</p>
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Payment breakdown */}
            <div className="card">
              <p className="text-sm font-semibold text-white mb-3">Payment Methods</p>
              {Object.keys(paymentBreakdown).length === 0
                ? <p className="text-slate-500 text-sm">No sales yet</p>
                : <div className="space-y-2">
                    {Object.entries(paymentBreakdown).sort((a, b) => b[1] - a[1]).map(([method, amt]) => {
                      const pct = revenue > 0 ? Math.round((amt / revenue) * 100) : 0
                      return (
                        <div key={method}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-300 capitalize">{method.replace('_', ' ')}</span>
                            <span className="text-white">{fmt(amt)} <span className="text-slate-500 text-xs">({pct}%)</span></span>
                          </div>
                          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
              }
            </div>

            {/* Top products */}
            <div className="card">
              <p className="text-sm font-semibold text-white mb-3">Top Products</p>
              {topProducts.length === 0
                ? <p className="text-slate-500 text-sm">No sales yet</p>
                : <div className="space-y-2">
                    {topProducts.map(([name, data]) => {
                      const pct = revenue > 0 ? Math.round((data.revenue / revenue) * 100) : 0
                      return (
                        <div key={name}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-300 truncate max-w-[60%]">{name}</span>
                            <span className="text-white shrink-0">{fmt(data.revenue)} <span className="text-slate-500 text-xs">×{data.qty}</span></span>
                          </div>
                          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
              }
            </div>
          </div>

          {/* Sales list for this exhibition */}
          <div className="card overflow-x-auto">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Sales at this Exhibition</p>
              <span className="text-xs text-slate-500">{filteredSales.length} transaction{filteredSales.length !== 1 ? 's' : ''}</span>
            </div>
            {filteredSales.length === 0
              ? <p className="px-4 pb-4 text-slate-500 text-sm">No sales linked to this exhibition yet.</p>
              : <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      {['Invoice #', 'Date', 'Customer', 'Items', 'Payment', 'Amount'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider last:text-right">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredSales.map(sale => (
                      <tr key={sale.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-blue-400">{sale.invoice_number || '—'}</td>
                        <td className="px-4 py-3 text-slate-300">{new Date(sale.sale_date).toLocaleDateString('en-IN')}</td>
                        <td className="px-4 py-3 text-slate-300">{sale.customer_name || <span className="text-slate-500 italic">Walk-in</span>}</td>
                        <td className="px-4 py-3 text-slate-400">{(sale.items || []).length} item{(sale.items || []).length !== 1 ? 's' : ''}</td>
                        <td className="px-4 py-3 text-slate-400 capitalize">{sale.payment_method?.replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-right text-white font-semibold">{fmt(sale.final_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-700 bg-slate-800/40">
                      <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-slate-300">Total</td>
                      <td className="px-4 py-3 text-right text-white font-bold">{fmt(revenue)}</td>
                    </tr>
                  </tfoot>
                </table>
            }
          </div>
        </>
      )}
    </div>
  )
}
