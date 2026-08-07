'use client'
import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui'

export default function AdminPage() {
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const { toast, ToastContainer } = useToast()

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const data = await fetch('/api/admin/subscription').then(r => r.json())
    setTenants(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  const openEdit = (t: any) => {
    setSelected(t)
    setForm({
      plan: t.plan,
      plan_status: t.plan_status,
      expires_at: t.plan_expires_at ? new Date(t.plan_expires_at).toISOString().split('T')[0] : '',
      payment_id: t.payment_id || '',
      notes: t.notes || '',
    })
  }

  const save = async () => {
    setSaving(true)
    const r = await fetch('/api/admin/subscription', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_subscription', tenant_id: selected.id, ...form }),
    }).then(r => r.json())
    setSaving(false)
    if (r.error) { toast(r.error, 'error'); return }
    toast('Subscription updated!')
    setSelected(null)
    load()
  }

  const extend = async (tenantId: string, days: number) => {
    const r = await fetch('/api/admin/subscription', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'extend', tenant_id: tenantId, days }),
    }).then(r => r.json())
    if (r.error) { toast(r.error, 'error'); return }
    toast(`Extended by ${days} days! New expiry: ${new Date(r.new_expiry).toLocaleDateString('en-IN')}`)
    load()
  }

  const statusColor: any = { trial: 'badge-yellow', active: 'badge-green', expired: 'badge-red', cancelled: 'badge-red' }
  const planColor: any = { starter: 'badge-slate', growth: 'badge-blue', pro: 'badge-purple' }

  return (
    <div className="max-w-6xl mx-auto">
      <ToastContainer />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Subscription Management</h1>
        <p className="text-slate-400 text-sm mt-0.5">{tenants.length} tenants · Admin only</p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              {['Business', 'Email', 'Plan', 'Status', 'Expires', 'Payment Ref', 'Actions'].map(h => (
                <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan={7} className="py-12 text-center text-slate-500">Loading...</td></tr>
            ) : tenants.map(t => {
              const expires = new Date(t.plan_expires_at)
              const daysLeft = Math.ceil((expires.getTime() - Date.now()) / 864e5)
              return (
                <tr key={t.id} className="hover:bg-slate-800/30">
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-white text-sm">{t.business_name}</div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 text-sm">{t.email}</td>
                  <td className="px-5 py-3.5"><span className={`badge ${planColor[t.plan]}`}>{t.plan}</span></td>
                  <td className="px-5 py-3.5"><span className={`badge ${statusColor[t.plan_status] || 'badge-slate'}`}>{t.plan_status}</span></td>
                  <td className="px-5 py-3.5">
                    <div className={`text-sm ${daysLeft <= 3 ? 'text-red-400' : daysLeft <= 7 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {expires.toLocaleDateString('en-IN')}
                    </div>
                    <div className="text-xs text-slate-500">{daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}</div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 text-xs font-mono">{t.payment_id || '—'}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1.5 flex-wrap">
                      <button onClick={() => openEdit(t)} className="text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2 py-1 rounded">Edit</button>
                      <button onClick={() => extend(t.id, 30)} className="text-xs text-green-400 hover:text-green-300 bg-green-500/10 px-2 py-1 rounded">+30d</button>
                      <button onClick={() => extend(t.id, 365)} className="text-xs text-purple-400 hover:text-purple-300 bg-purple-500/10 px-2 py-1 rounded">+1yr</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-white font-semibold">Edit Subscription — {selected.business_name}</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Plan</label>
                <select value={form.plan} onChange={e => setForm((f: any) => ({ ...f, plan: e.target.value }))} className="input-base">
                  <option value="starter">Starter</option>
                  <option value="growth">Growth</option>
                  <option value="pro">Pro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Status</label>
                <select value={form.plan_status} onChange={e => setForm((f: any) => ({ ...f, plan_status: e.target.value }))} className="input-base">
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Expiry Date</label>
                <input type="date" value={form.expires_at} onChange={e => setForm((f: any) => ({ ...f, expires_at: e.target.value }))} className="input-base" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Payment Reference / ID</label>
                <input value={form.payment_id} onChange={e => setForm((f: any) => ({ ...f, payment_id: e.target.value }))} className="input-base" placeholder="e.g. Razorpay order ID, UPI ref" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Internal Notes</label>
                <textarea value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} className="input-base" rows={2} placeholder="e.g. Paid via bank transfer on 1 Aug" />
              </div>
            </div>
            <div className="px-6 pb-6 flex justify-end gap-3">
              <button onClick={() => setSelected(null)} className="btn-secondary">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Update Subscription'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
