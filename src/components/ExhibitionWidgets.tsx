'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ExhibitionSummary {
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

export default function ExhibitionWidgets() {
  const [exhibitions, setExhibitions] = useState<ExhibitionSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/exhibitions')
      .then(r => r.json())
      .then(d => {
        setExhibitions(d.exhibitions || [])
        setLoading(false)
      })
  }, [])

  if (loading) return null

  const active = exhibitions.filter(e => e.status === 'active')
  const upcoming = exhibitions.filter(e => e.status === 'upcoming')
  const completed = exhibitions.filter(e => e.status === 'completed')

  // Best performer by revenue
  const best = [...completed, ...active].sort((a, b) => b.total_sales - a.total_sales)[0]

  // Aggregate stats
  const totalRevenue = exhibitions.reduce((s, e) => s + e.total_sales, 0)
  const totalCost = exhibitions.reduce((s, e) => s + (e.stall_cost || 0) + (e.other_expenses || 0), 0)
  const totalProfit = totalRevenue - totalCost

  if (exhibitions.length === 0) return null

  function fmt(n: number) {
    return '₹' + Math.abs(n).toLocaleString('en-IN')
  }

  function dateRange(ex: ExhibitionSummary) {
    const s = ex.start_date ? new Date(ex.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''
    const e = ex.end_date ? new Date(ex.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
    return s && e ? `${s} – ${e}` : s || e
  }

  function daysLeft(ex: ExhibitionSummary) {
    if (!ex.end_date) return null
    const diff = Math.ceil((new Date(ex.end_date).getTime() - Date.now()) / 86400000)
    if (diff < 0) return null
    if (diff === 0) return 'Ends today'
    return `${diff}d left`
  }

  function plColor(profit: number) {
    if (profit > 0) return 'text-green-400'
    if (profit < 0) return 'text-red-400'
    return 'text-slate-400'
  }

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">Exhibitions</h2>
        <Link href="/dashboard/exhibitions" className="text-xs text-blue-400 hover:text-blue-300">
          View all →
        </Link>
      </div>

      {/* Summary stat row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card py-3 px-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Revenue</p>
          <p className="text-lg font-bold text-white">{fmt(totalRevenue)}</p>
          <p className="text-xs text-slate-500 mt-0.5">{exhibitions.length} exhibition{exhibitions.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="card py-3 px-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Cost</p>
          <p className="text-lg font-bold text-white">{fmt(totalCost)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Stall + expenses</p>
        </div>
        <div className="card py-3 px-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Net P&L</p>
          <p className={`text-lg font-bold ${plColor(totalProfit)}`}>
            {totalProfit >= 0 ? '' : '-'}{fmt(totalProfit)}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{totalProfit >= 0 ? 'Profit' : 'Loss'} overall</p>
        </div>
      </div>

      {/* Active exhibitions */}
      {active.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">🟢 Active Now</p>
          {active.map(ex => {
            const cost = (ex.stall_cost || 0) + (ex.other_expenses || 0)
            const profit = ex.total_sales - cost
            const roi = cost > 0 ? ((profit / cost) * 100).toFixed(0) : null
            const dl = daysLeft(ex)
            return (
              <div key={ex.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium text-sm truncate">{ex.name}</p>
                      {dl && (
                        <span className="shrink-0 text-xs bg-amber-900 text-amber-300 px-1.5 py-0.5 rounded">{dl}</span>
                      )}
                    </div>
                    <p className="text-slate-500 text-xs mt-0.5">{ex.location} · {dateRange(ex)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-white font-semibold text-sm">{fmt(ex.total_sales)}</p>
                    <p className={`text-xs ${plColor(profit)}`}>
                      {profit >= 0 ? '+' : '-'}{fmt(profit)} {roi ? `(${roi}% ROI)` : ''}
                    </p>
                  </div>
                </div>
                {/* Progress bar: sales vs cost breakeven */}
                {cost > 0 && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${profit >= 0 ? 'bg-green-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.min(100, (ex.total_sales / cost) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {cost > 0 ? `${Math.round((ex.total_sales / cost) * 100)}% of cost recovered` : ''}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">🔵 Upcoming</p>
          {upcoming.slice(0, 2).map(ex => {
            const cost = (ex.stall_cost || 0) + (ex.other_expenses || 0)
            const daysToStart = ex.start_date
              ? Math.ceil((new Date(ex.start_date).getTime() - Date.now()) / 86400000)
              : null
            return (
              <div key={ex.id} className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium text-sm">{ex.name}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{ex.location} · {dateRange(ex)}</p>
                  </div>
                  <div className="text-right">
                    {daysToStart !== null && daysToStart > 0 && (
                      <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded">
                        in {daysToStart}d
                      </span>
                    )}
                    {cost > 0 && <p className="text-xs text-slate-500 mt-1">Budget: {fmt(cost)}</p>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Best performer */}
      {best && completed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">🏆 Best Performer</p>
          <div className="card border border-amber-800/40">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium text-sm">{best.name}</p>
                <p className="text-slate-500 text-xs mt-0.5">{best.location} · {dateRange(best)}</p>
              </div>
              <div className="text-right">
                <p className="text-amber-400 font-semibold">{fmt(best.total_sales)}</p>
                <p className={`text-xs ${plColor(best.total_sales - (best.stall_cost || 0) - (best.other_expenses || 0))}`}>
                  {(() => {
                    const p = best.total_sales - (best.stall_cost || 0) - (best.other_expenses || 0)
                    return `${p >= 0 ? '+' : '-'}${fmt(p)} P&L`
                  })()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
