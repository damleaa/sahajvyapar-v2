'use client'
import { useState, useEffect } from 'react'
import { Plus, Store, TrendingUp, TrendingDown } from 'lucide-react'
import { Modal, useToast, EmptyState, Badge, LockedFeature } from '@/components/ui'

export default function ExhibitionsPage() {
  const [exhibitions, setExhibitions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>({ status: 'upcoming', stall_cost: 0, other_expenses: 0 })
  const { toast, ToastContainer } = useToast()

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const data = await fetch('/api/exhibitions').then(r => r.json())
    if (data?.locked) { setLocked(true); setLoading(false); return }
    setExhibitions(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  const save = async () => {
    if (!form.name) { toast('Exhibition name is required', 'error'); return }
    const r = await fetch('/api/exhibitions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save', ...form }) }).then(r => r.json())
    if (r.error) { toast(r.error, 'error'); return }
    toast('Exhibition saved!')
    setModal(false)
    load()
  }

  const statusColor: any = { upcoming: 'blue', active: 'green', completed: 'slate' }

  if (locked) return <LockedFeature feature="Exhibitions & P&L" plan="Pro" />

  return (
    <div className="max-w-6xl mx-auto">
      <ToastContainer />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Exhibitions</h1>
        <button onClick={() => { setForm({ status: 'upcoming', stall_cost: 0, other_expenses: 0 }); setModal(true) }} className="btn-primary"><Plus className="w-4 h-4" /> Add Exhibition</button>
      </div>

      {exhibitions.length === 0 && !loading ? (
        <EmptyState icon={<Store className="w-6 h-6" />} title="No exhibitions yet" description="Track your exhibition P&L — stall cost, expenses, and sales" action={<button onClick={() => setModal(true)} className="btn-primary">Add Exhibition</button>} />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {exhibitions.map(ex => {
            const costs = Number(ex.stall_cost) + Number(ex.other_expenses)
            const profit = Number(ex.total_sales) - costs
            const roi = costs > 0 ? (profit / costs * 100) : 0
            return (
              <div key={ex.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-white">{ex.name}</div>
                    <div className="text-slate-400 text-sm">{ex.venue && `${ex.venue}, `}{ex.city}</div>
                  </div>
                  <Badge color={statusColor[ex.status]}>{ex.status}</Badge>
                </div>
                <div className="text-xs text-slate-500 mb-4">
                  {ex.start_date && new Date(ex.start_date).toLocaleDateString('en-IN')}
                  {ex.end_date && ` — ${new Date(ex.end_date).toLocaleDateString('en-IN')}`}
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-400 mb-1">Revenue</div>
                    <div className="font-bold text-green-400 text-sm">₹{Number(ex.total_sales).toLocaleString('en-IN')}</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-400 mb-1">Costs</div>
                    <div className="font-bold text-red-400 text-sm">₹{costs.toLocaleString('en-IN')}</div>
                  </div>
                  <div className={`rounded-lg p-3 text-center ${profit >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    <div className="text-xs text-slate-400 mb-1">P&L</div>
                    <div className={`font-bold text-sm flex items-center justify-center gap-1 ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {profit >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      ₹{Math.abs(profit).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Stall: ₹{Number(ex.stall_cost).toLocaleString('en-IN')} · Other: ₹{Number(ex.other_expenses).toLocaleString('en-IN')}</span>
                  <span className={roi >= 0 ? 'text-green-400' : 'text-red-400'}>ROI: {roi.toFixed(1)}%</span>
                </div>
                <button onClick={() => { setForm({ ...ex, stall_cost: ex.stall_cost || 0, other_expenses: ex.other_expenses || 0 }); setModal(true) }} className="mt-3 text-xs text-blue-400 hover:text-blue-300">Edit</button>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={form.id ? 'Edit Exhibition' : 'Add Exhibition'} size="md">
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="block text-sm font-medium text-slate-300 mb-1.5">Exhibition Name *</label><input value={form.name || ''} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} className="input-base" placeholder="e.g. Pune Craft Festival 2025" /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Venue</label><input value={form.venue || ''} onChange={e => setForm((f: any) => ({ ...f, venue: e.target.value }))} className="input-base" /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">City</label><input value={form.city || ''} onChange={e => setForm((f: any) => ({ ...f, city: e.target.value }))} className="input-base" /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Start Date</label><input type="date" value={form.start_date || ''} onChange={e => setForm((f: any) => ({ ...f, start_date: e.target.value }))} className="input-base" /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">End Date</label><input type="date" value={form.end_date || ''} onChange={e => setForm((f: any) => ({ ...f, end_date: e.target.value }))} className="input-base" /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Stall Cost (₹)</label><input type="number" value={form.stall_cost || 0} onChange={e => setForm((f: any) => ({ ...f, stall_cost: e.target.value }))} className="input-base" min={0} /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Other Expenses (₹)</label><input type="number" value={form.other_expenses || 0} onChange={e => setForm((f: any) => ({ ...f, other_expenses: e.target.value }))} className="input-base" min={0} /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Total Sales (₹)</label><input type="number" value={form.total_sales || 0} onChange={e => setForm((f: any) => ({ ...f, total_sales: e.target.value }))} className="input-base" min={0} /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Status</label><select value={form.status || 'upcoming'} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))} className="input-base"><option value="upcoming">Upcoming</option><option value="active">Active</option><option value="completed">Completed</option></select></div>
          <div className="col-span-2"><label className="block text-sm font-medium text-slate-300 mb-1.5">Notes</label><textarea value={form.notes || ''} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} className="input-base" rows={2} /></div>
        </div>
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={save} className="btn-primary">{form.id ? 'Update' : 'Add'} Exhibition</button>
        </div>
      </Modal>
    </div>
  )
}
