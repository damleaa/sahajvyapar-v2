'use client'

import { useEffect, useState, useCallback } from 'react'
import { Modal } from '@/components/ui'
import NumInput from '@/components/NumInput'
import Link from 'next/link'

interface Exhibition {
  id: string
  name: string
  location: string
  start_date: string
  end_date: string
  stall_cost: number
  other_expenses: number
  status: string
  notes: string
  created_at: string
  // computed from sales table:
  total_sales: number
}

const STATUS_OPTIONS = ['upcoming', 'active', 'completed', 'cancelled']

const EMPTY_FORM = {
  name: '',
  location: '',
  start_date: '',
  end_date: '',
  stall_cost: 0,
  other_expenses: 0,
  status: 'upcoming',
  notes: '',
}

export default function ExhibitionsPage() {
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/exhibitions')
    const data = await res.json()
    setExhibitions(data.exhibitions || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  function openNew() {
    setEditId(null)
    setForm({ ...EMPTY_FORM })
    setShowModal(true)
  }

  function openEdit(ex: Exhibition) {
    setEditId(ex.id)
    setForm({
      name: ex.name,
      location: ex.location || '',
      start_date: ex.start_date ? ex.start_date.slice(0, 10) : '',
      end_date: ex.end_date ? ex.end_date.slice(0, 10) : '',
      stall_cost: ex.stall_cost || 0,
      other_expenses: ex.other_expenses || 0,
      status: ex.status || 'upcoming',
      notes: ex.notes || '',
    })
    setShowModal(true)
  }

  async function save() {
    if (!form.name.trim()) return alert('Exhibition name is required')
    setSaving(true)
    const body = editId
      ? { action: 'update', id: editId, ...form }
      : { action: 'create', ...form }
    const res = await fetch('/api/exhibitions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setSaving(false)
    if (data.error) return alert(data.error)
    setShowModal(false)
    fetchAll()
  }

  async function archiveExhibition(id: string, name: string) {
    if (!confirm(`Archive "${name}"? It will be hidden but all data is preserved.`)) return
    await fetch('/api/exhibitions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'archive', id }),
    })
    fetchAll()
  }

  /* ── P&L for one exhibition ───────────────────────────────── */
  function PnL({ ex }: { ex: Exhibition }) {
    const totalCosts = (ex.stall_cost || 0) + (ex.other_expenses || 0)
    const salesTotal = ex.total_sales || 0
    const profit = salesTotal - totalCosts
    const margin = salesTotal > 0 ? (profit / salesTotal) * 100 : 0

    return (
      <div className="mt-3 bg-slate-900 rounded-lg p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-slate-400 text-xs mb-1">Total Sales</p>
          <p className="text-white font-semibold">₹{salesTotal.toFixed(2)}</p>
          <p className="text-slate-500 text-xs mt-0.5">auto from sales module</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs mb-1">Total Costs</p>
          <p className="text-white font-semibold">₹{totalCosts.toFixed(2)}</p>
          <p className="text-slate-500 text-xs mt-0.5">stall + other expenses</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs mb-1">Profit / Loss</p>
          <p className={`font-semibold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {profit >= 0 ? '+' : ''}₹{profit.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-slate-400 text-xs mb-1">Margin</p>
          <p className={`font-semibold ${margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {margin.toFixed(1)}%
          </p>
        </div>
      </div>
    )
  }

  /* ── status badge ─────────────────────────────────────────── */
  function statusBadge(status: string) {
    const map: Record<string, string> = {
      upcoming: 'bg-blue-900 text-blue-300',
      active: 'bg-green-900 text-green-300',
      completed: 'bg-slate-700 text-slate-300',
      cancelled: 'bg-red-900 text-red-300',
    }
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[status] || 'bg-slate-700 text-slate-300'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Exhibitions</h1>
          <p className="text-slate-400 text-sm mt-1">Track exhibition costs & P&L — sales auto-aggregate from the Sales module</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/exhibitions/reports" className="btn-secondary text-sm">
            Reports →
          </Link>
          <button onClick={openNew} className="btn-primary">+ New Exhibition</button>
        </div>
      </div>

      {/* list */}
      {loading ? (
        <div className="text-slate-400">Loading...</div>
      ) : exhibitions.length === 0 ? (
        <div className="card text-center py-12 text-slate-400">No exhibitions yet.</div>
      ) : (
        <div className="space-y-4">
          {exhibitions.map(ex => {
            const totalCosts = (ex.stall_cost || 0) + (ex.other_expenses || 0)
            const salesTotal = ex.total_sales || 0
            const profit = salesTotal - totalCosts

            return (
              <div key={ex.id} className="card">
                {/* top row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-white font-semibold text-lg">{ex.name}</h2>
                      {statusBadge(ex.status)}
                      <span className={`text-sm font-medium ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {profit >= 0 ? '↑' : '↓'} ₹{Math.abs(profit).toFixed(0)}
                      </span>
                    </div>
                    {ex.location && <p className="text-slate-400 text-sm mt-0.5">📍 {ex.location}</p>}
                    {(ex.start_date || ex.end_date) && (
                      <p className="text-slate-500 text-xs mt-0.5">
                        {ex.start_date ? new Date(ex.start_date).toLocaleDateString('en-IN') : ''}{' '}
                        {ex.end_date ? `→ ${new Date(ex.end_date).toLocaleDateString('en-IN')}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setExpandedId(expandedId === ex.id ? null : ex.id)}
                      className="text-xs text-blue-400 hover:text-blue-300">
                      {expandedId === ex.id ? 'Hide P&L' : 'View P&L'}
                    </button>
                    <button onClick={() => openEdit(ex)} className="text-xs text-slate-400 hover:text-white">Edit</button>
                    <button onClick={() => archiveExhibition(ex.id, ex.name)} className="text-xs text-slate-500 hover:text-slate-300">Archive</button>
                  </div>
                </div>

                {/* summary chips */}
                <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-400">
                  <span>Stall: <span className="text-white">₹{(ex.stall_cost || 0).toFixed(0)}</span></span>
                  <span>Other: <span className="text-white">₹{(ex.other_expenses || 0).toFixed(0)}</span></span>
                  <span>Sales: <span className="text-purple-300">₹{salesTotal.toFixed(0)}</span></span>
                </div>

                {/* expanded P&L */}
                {expandedId === ex.id && <PnL ex={ex} />}
              </div>
            )
          })}
        </div>
      )}

      {/* ── MODAL ─────────────────────────────────────────────── */}
      <Modal open={showModal} onClose={() => setShowModal(false)}
        title={editId ? 'Edit Exhibition' : 'New Exhibition'} allowBackdropClose={false}>
        <div className="space-y-4">
          <div>
            <label className="label-base">Exhibition Name *</label>
            <input className="input-base" placeholder="e.g. Diwali Mela 2026"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>

          <div>
            <label className="label-base">Location</label>
            <input className="input-base" placeholder="City / Venue"
              value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-base">Start Date</label>
              <input type="date" className="input-base" value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <label className="label-base">End Date</label>
              <input type="date" className="input-base" value={form.end_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-base">Stall Cost (₹)</label>
              <NumInput value={form.stall_cost} onChange={v => setForm(f => ({ ...f, stall_cost: v }))} placeholder="0" />
            </div>
            <div>
              <label className="label-base">Other Expenses (₹)</label>
              <NumInput value={form.other_expenses} onChange={v => setForm(f => ({ ...f, other_expenses: v }))} placeholder="0" />
            </div>
          </div>

          {/* NOTE: total_sales is no longer manual — it's auto-calculated from the sales table */}
          <div className="bg-slate-800 rounded-lg px-3 py-2 text-xs text-purple-400">
            💡 Total Sales will be automatically calculated from all sales tagged to this exhibition in the Sales module. No manual entry needed.
          </div>

          <div>
            <label className="label-base">Status</label>
            <select className="input-base" value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>

          <div>
            <label className="label-base">Notes</label>
            <textarea className="input-base" rows={2} placeholder="Any notes..."
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
              {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
