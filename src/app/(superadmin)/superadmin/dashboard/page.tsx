'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const PLAN_COLOR: any = { starter: '#f59e0b', growth: '#3b82f6', pro: '#a78bfa' }
const STATUS_COLOR: any = { trial: '#f59e0b', active: '#22c55e', expired: '#ef4444', cancelled: '#94a3b8' }

export default function SuperAdminDashboard() {
  const router = useRouter()
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'tenants' | 'analytics'>('tenants')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = sessionStorage.getItem('sv_admin_auth')
      if (!auth) { router.push('/superadmin'); return }
    }
    load()
  }, [])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

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
    if (r.error) { showToast('Error: ' + r.error); return }
    showToast('Subscription updated!')
    setSelected(null)
    load()
  }

  const extend = async (tenantId: string, days: number) => {
    const r = await fetch('/api/admin/subscription', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'extend', tenant_id: tenantId, days }),
    }).then(r => r.json())
    if (r.error) { showToast('Error: ' + r.error); return }
    showToast(`Extended ${days} days! New expiry: ${new Date(r.new_expiry).toLocaleDateString('en-IN')}`)
    load()
  }

  const filtered = tenants.filter(t =>
    t.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  )

  // Analytics
  const analytics = {
    total: tenants.length,
    active: tenants.filter(t => t.plan_status === 'active').length,
    trial: tenants.filter(t => t.plan_status === 'trial').length,
    expired: tenants.filter(t => t.plan_status === 'expired' || t.plan_status === 'cancelled').length,
    mrr: tenants.filter(t => t.plan_status === 'active').reduce((s, t) => s + ({ starter: 399, growth: 699, pro: 999 }[t.plan as string] || 0), 0),
    byPlan: {
      starter: tenants.filter(t => t.plan === 'starter').length,
      growth: tenants.filter(t => t.plan === 'growth').length,
      pro: tenants.filter(t => t.plan === 'pro').length,
    },
    expiringSoon: tenants.filter(t => {
      const d = Math.ceil((new Date(t.plan_expires_at).getTime() - Date.now()) / 864e5)
      return d > 0 && d <= 7
    }).length,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a' }}>
      <style>{`
        .input-base { width: 100%; padding: 10px 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; font-size: 14px; color: white; outline: none; font-family: inherit; }
        .input-base:focus { border-color: #2563eb; }
        .btn-p { padding: 9px 18px; background: #2563eb; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .btn-p:hover { background: #3b82f6; }
        .btn-s { padding: 9px 18px; background: rgba(255,255,255,0.06); color: #f1f5f9; border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .badge { font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; display: inline-block; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; padding: 12px 16px; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid rgba(255,255,255,0.08); }
        td { padding: 12px 16px; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.05); vertical-align: middle; }
        tr:hover td { background: rgba(255,255,255,0.02); }
      `}</style>

      {/* Toast */}
      {toast && <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#22c55e', color: 'white', padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, zIndex: 1000 }}>{toast}</div>}

      {/* Header */}
      <div style={{ background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, background: '#7c3aed', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 16 }}>⚡</div>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>SahajVyapar Superadmin</span>
        </div>
        <button onClick={() => { sessionStorage.removeItem('sv_admin_auth'); router.push('/superadmin') }} style={{ color: '#94a3b8', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}>Logout</button>
      </div>

      <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>

        {/* Analytics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Total', value: analytics.total, color: 'white' },
            { label: 'Active', value: analytics.active, color: '#22c55e' },
            { label: 'Trial', value: analytics.trial, color: '#f59e0b' },
            { label: 'Expired', value: analytics.expired, color: '#ef4444' },
            { label: 'Expiring 7d', value: analytics.expiringSoon, color: '#f97316' },
            { label: 'MRR', value: `₹${analytics.mrr.toLocaleString('en-IN')}`, color: '#3b82f6' },
          ].map(c => (
            <div key={c.label} style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Plan Distribution */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 28 }}>
          {['starter', 'growth', 'pro'].map(plan => (
            <div key={plan} style={{ background: '#1e293b', border: `1px solid ${PLAN_COLOR[plan]}30`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{plan}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: PLAN_COLOR[plan] }}>{analytics.byPlan[plan as keyof typeof analytics.byPlan]}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>₹{({ starter: 399, growth: 699, pro: 999 }[plan] || 0) * tenants.filter(t => t.plan === plan && t.plan_status === 'active').length}/mo MRR</div>
            </div>
          ))}
        </div>

        {/* Tenants Table */}
        <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <h2 style={{ color: 'white', fontWeight: 600, fontSize: 15 }}>All Tenants</h2>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search business or email..." style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 13, color: 'white', outline: 'none', width: 260 }} />
          </div>
          <table>
            <thead>
              <tr>
                {['Business', 'Email', 'Plan', 'Status', 'Expires', 'Payment Ref', 'Actions'].map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading...</td></tr>
              ) : filtered.map(t => {
                const expires = new Date(t.plan_expires_at)
                const daysLeft = Math.ceil((expires.getTime() - Date.now()) / 864e5)
                return (
                  <tr key={t.id}>
                    <td style={{ color: 'white', fontWeight: 500 }}>{t.business_name}</td>
                    <td style={{ color: '#94a3b8' }}>{t.email}</td>
                    <td><span className="badge" style={{ background: PLAN_COLOR[t.plan] + '20', color: PLAN_COLOR[t.plan] }}>{t.plan}</span></td>
                    <td><span className="badge" style={{ background: STATUS_COLOR[t.plan_status] + '20', color: STATUS_COLOR[t.plan_status] }}>{t.plan_status}</span></td>
                    <td>
                      <div style={{ color: daysLeft <= 0 ? '#ef4444' : daysLeft <= 7 ? '#f59e0b' : '#94a3b8', fontSize: 13 }}>
                        {expires.toLocaleDateString('en-IN')}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{daysLeft > 0 ? `${daysLeft}d left` : 'Expired'}</div>
                    </td>
                    <td style={{ color: '#64748b', fontSize: 12, fontFamily: 'monospace' }}>{t.payment_id || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button onClick={() => openEdit(t)} style={{ fontSize: 11, color: '#3b82f6', background: 'rgba(59,130,246,0.1)', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Edit</button>
                        <button onClick={() => extend(t.id, 30)} style={{ fontSize: 11, color: '#22c55e', background: 'rgba(34,197,94,0.1)', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>+30d</button>
                        <button onClick={() => extend(t.id, 365)} style={{ fontSize: 11, color: '#a78bfa', background: 'rgba(167,139,250,0.1)', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>+1yr</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={() => setSelected(null)}>
          <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, width: '100%', maxWidth: 480, padding: 32 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: 'white', fontWeight: 600, fontSize: 17, marginBottom: 4 }}>Edit Subscription</h3>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>{selected.business_name} · {selected.email}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Plan</label>
                <select value={form.plan} onChange={e => setForm((f: any) => ({ ...f, plan: e.target.value }))} className="input-base">
                  <option value="starter">Starter — ₹399/mo</option>
                  <option value="growth">Growth — ₹699/mo</option>
                  <option value="pro">Pro — ₹999/mo</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Status</label>
                <select value={form.plan_status} onChange={e => setForm((f: any) => ({ ...f, plan_status: e.target.value }))} className="input-base">
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Expiry Date</label>
                <input type="date" value={form.expires_at} onChange={e => setForm((f: any) => ({ ...f, expires_at: e.target.value }))} className="input-base" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Payment Reference</label>
                <input value={form.payment_id} onChange={e => setForm((f: any) => ({ ...f, payment_id: e.target.value }))} className="input-base" placeholder="Razorpay order ID, UPI ref, bank UTR..." />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Internal Notes</label>
                <textarea value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} className="input-base" rows={2} placeholder="Paid via bank transfer on 1 Aug..." style={{ resize: 'none' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={() => setSelected(null)} className="btn-s">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-p">{saving ? 'Saving...' : 'Update'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
