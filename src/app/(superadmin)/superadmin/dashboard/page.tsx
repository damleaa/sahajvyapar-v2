'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const PLAN_COLOR: any = { starter: '#f59e0b', growth: '#3b82f6', pro: '#a78bfa' }
const STATUS_COLOR: any = { trial: '#f59e0b', active: '#22c55e', expired: '#ef4444', cancelled: '#94a3b8' }
const PLAN_PRICES: any = { starter: 399, growth: 699, pro: 999 }

export default function SuperAdminDashboard() {
  const router = useRouter()
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState<any>({})
  const [extendModal, setExtendModal] = useState<any>(null)
  const [extendForm, setExtendForm] = useState({ type: 'payment', days: 30, payment_ref: '', amount: 0, reason: '' })
  const [deleteModal, setDeleteModal] = useState<any>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState({ msg: '', type: '' })
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!sessionStorage.getItem('sv_admin_auth')) { router.push('/superadmin'); return }
    }
    load()
  }, [])

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: '' }), 4000)
  }

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

  const openExtend = (t: any) => {
    setExtendModal(t)
    setExtendForm({ type: 'payment', days: 30, payment_ref: '', amount: PLAN_PRICES[t.plan] || 0, reason: '' })
  }

  const openDelete = (t: any) => {
    setDeleteModal(t)
    setDeleteReason('')
  }

  const save = async () => {
    setSaving(true)
    const r = await fetch('/api/admin/subscription', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_subscription', tenant_id: selected.id, ...form }),
    }).then(r => r.json())
    setSaving(false)
    if (r.error) { showToast('Error: ' + r.error, 'error'); return }
    showToast('Updated!')
    setSelected(null)
    load()
  }

  const confirmExtend = async () => {
    if (extendForm.type === 'payment' && !extendForm.payment_ref.trim()) {
      showToast('Payment reference is required', 'error'); return
    }
    if (extendForm.type === 'complimentary' && !extendForm.reason.trim()) {
      showToast('Reason is required for complimentary extension', 'error'); return
    }
    setSaving(true)
    const r = await fetch('/api/admin/subscription', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'extend',
        tenant_id: extendModal.id,
        days: extendForm.days,
        payment_id: extendForm.type === 'payment' ? extendForm.payment_ref : `COMP-${Date.now()}`,
        notes: extendForm.type === 'payment'
          ? `Payment: Rs.${extendForm.amount} | Ref: ${extendForm.payment_ref}`
          : `Complimentary: ${extendForm.reason}`,
      }),
    }).then(r => r.json())
    setSaving(false)
    if (r.error) { showToast('Error: ' + r.error, 'error'); return }
    showToast(`Extended ${extendForm.days} days! New expiry: ${new Date(r.new_expiry).toLocaleDateString('en-IN')}`)
    setExtendModal(null)
    load()
  }

  const confirmDelete = async () => {
    if (!deleteReason.trim()) { showToast('Deletion reason is mandatory', 'error'); return }
    setSaving(true)
    const r = await fetch('/api/admin/subscription', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'soft_delete', tenant_id: deleteModal.id, reason: deleteReason }),
    }).then(r => r.json())
    setSaving(false)
    if (r.error) { showToast('Error: ' + r.error, 'error'); return }
    showToast('Account deleted')
    setDeleteModal(null)
    load()
  }

  const restoreAccount = async (t: any) => {
    if (!confirm(`Restore ${t.business_name}?`)) return
    const r = await fetch('/api/admin/subscription', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restore', tenant_id: t.id, reason: 'Admin restore' }),
    }).then(r => r.json())
    if (r.error) { showToast('Error: ' + r.error, 'error'); return }
    showToast('Account restored!')
    load()
  }

  const filtered = tenants.filter(t =>
    t.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  )

  const analytics = {
    total: tenants.length,
    active: tenants.filter(t => t.plan_status === 'active').length,
    trial: tenants.filter(t => t.plan_status === 'trial').length,
    expired: tenants.filter(t => ['expired', 'cancelled'].includes(t.plan_status)).length,
    mrr: tenants.filter(t => t.plan_status === 'active').reduce((s, t) => s + (PLAN_PRICES[t.plan] || 0), 0),
    expiringSoon: tenants.filter(t => {
      const d = Math.ceil((new Date(t.plan_expires_at).getTime() - Date.now()) / 864e5)
      return d > 0 && d <= 7 && t.plan_status !== 'cancelled'
    }).length,
  }

  const inp: any = { width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 14, color: 'white', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }
  const btnP: any = { padding: '9px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
  const btnS: any = { padding: '9px 20px', background: 'rgba(255,255,255,0.06)', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', fontFamily: 'Inter, sans-serif' }}>
      <style>{`* { box-sizing: border-box; } input,select,textarea { color: white; background: rgba(255,255,255,0.06); } table { width: 100%; border-collapse: collapse; } th { text-align: left; padding: 12px 16px; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid rgba(255,255,255,0.08); } td { padding: 12px 16px; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.05); vertical-align: middle; } tr:hover td { background: rgba(255,255,255,0.02); } .badge { font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; display: inline-block; }`}</style>

      {toast.msg && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: toast.type === 'error' ? '#ef4444' : '#22c55e', color: 'white', padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, zIndex: 1000 }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, background: '#7c3aed', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 16 }}>⚡</div>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>SahajVyapar Superadmin</span>
        </div>
        <button onClick={() => { sessionStorage.removeItem('sv_admin_auth'); router.push('/superadmin') }} style={{ color: '#94a3b8', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}>Logout</button>
      </div>

      <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>

        {/* Analytics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total', value: analytics.total, color: 'white' },
            { label: 'Active', value: analytics.active, color: '#22c55e' },
            { label: 'Trial', value: analytics.trial, color: '#f59e0b' },
            { label: 'Expired', value: analytics.expired, color: '#ef4444' },
            { label: 'Expiring 7d', value: analytics.expiringSoon, color: '#f97316' },
            { label: 'MRR', value: `Rs.${analytics.mrr.toLocaleString('en-IN')}`, color: '#3b82f6' },
          ].map(c => (
            <div key={c.label} style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, textTransform: 'uppercase' }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Plan Distribution */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
          {['starter', 'growth', 'pro'].map(plan => {
            const count = tenants.filter(t => t.plan === plan).length
            const activeMRR = tenants.filter(t => t.plan === plan && t.plan_status === 'active').length * PLAN_PRICES[plan]
            return (
              <div key={plan} style={{ background: '#1e293b', border: `1px solid ${PLAN_COLOR[plan]}30`, borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{plan}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: PLAN_COLOR[plan] }}>{count} <span style={{ fontSize: 13, fontWeight: 400, color: '#64748b' }}>tenants</span></div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Rs.{activeMRR.toLocaleString('en-IN')}/mo active MRR</div>
              </div>
            )
          })}
        </div>

        {/* Tenants Table */}
        <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ color: 'white', fontWeight: 600, fontSize: 15 }}>All Tenants ({filtered.length})</h2>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search business or email..." style={{ ...inp, width: 260, border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>{['Business', 'Email', 'Plan', 'Status', 'Expires', 'Payment Ref', 'Actions'].map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading...</td></tr>
                ) : filtered.map(t => {
                  const expires = new Date(t.plan_expires_at)
                  const daysLeft = Math.ceil((expires.getTime() - Date.now()) / 864e5)
                  return (
                    <tr key={t.id} style={{ opacity: t.deleted_at ? 0.5 : 1 }}>
                      <td style={{ color: 'white', fontWeight: 500 }}>
                        {t.business_name}
                        {t.deleted_at && <span style={{ marginLeft: 6, fontSize: 10, background: '#ef444420', color: '#ef4444', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>DELETED</span>}
                        {!t.is_active && !t.deleted_at && <span style={{ marginLeft: 6, fontSize: 10, background: '#f59e0b20', color: '#f59e0b', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>SUSPENDED</span>}
                      </td>
                      <td style={{ color: '#94a3b8' }}>{t.email}</td>
                      <td><span className="badge" style={{ background: PLAN_COLOR[t.plan] + '20', color: PLAN_COLOR[t.plan] }}>{t.plan}</span></td>
                      <td><span className="badge" style={{ background: STATUS_COLOR[t.plan_status] + '20', color: STATUS_COLOR[t.plan_status] }}>{t.plan_status}</span></td>
                      <td>
                        <div style={{ color: daysLeft <= 0 ? '#ef4444' : daysLeft <= 7 ? '#f59e0b' : '#94a3b8', fontSize: 13 }}>{expires.toLocaleDateString('en-IN')}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{daysLeft > 0 ? `${daysLeft}d left` : `${Math.abs(daysLeft)}d ago`}</div>
                      </td>
                      <td style={{ color: '#64748b', fontSize: 12, fontFamily: 'monospace' }}>{t.payment_id ? t.payment_id.substring(0, 18) + '...' : '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          <button onClick={() => openEdit(t)} style={{ fontSize: 11, color: '#3b82f6', background: 'rgba(59,130,246,0.1)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>Edit</button>
                          {!t.deleted_at && <button onClick={() => openExtend(t)} style={{ fontSize: 11, color: '#22c55e', background: 'rgba(34,197,94,0.1)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>Extend</button>}
                          {t.deleted_at
                            ? <button onClick={() => restoreAccount(t)} style={{ fontSize: 11, color: '#a78bfa', background: 'rgba(167,139,250,0.1)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>Restore</button>
                            : <button onClick={() => openDelete(t)} style={{ fontSize: 11, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>Delete</button>
                          }
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={() => setSelected(null)}>
          <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, width: '100%', maxWidth: 480, padding: 32 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: 'white', fontWeight: 600, fontSize: 17, marginBottom: 4 }}>Edit Subscription</h3>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>{selected.business_name}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Plan</label>
                <select value={form.plan} onChange={e => setForm((f: any) => ({ ...f, plan: e.target.value }))} style={inp}>
                  <option value="starter">Starter — Rs.399/mo</option>
                  <option value="growth">Growth — Rs.699/mo</option>
                  <option value="pro">Pro — Rs.999/mo</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Status</label>
                <select value={form.plan_status} onChange={e => setForm((f: any) => ({ ...f, plan_status: e.target.value }))} style={inp}>
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Expiry Date</label>
                <input type="date" value={form.expires_at} onChange={e => setForm((f: any) => ({ ...f, expires_at: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Payment Reference</label>
                <input value={form.payment_id} onChange={e => setForm((f: any) => ({ ...f, payment_id: e.target.value }))} style={inp} placeholder="Razorpay ID, UPI ref, bank UTR..." />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} style={{ ...inp, resize: 'none' }} rows={2} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setSelected(null)} style={btnS}>Cancel</button>
              <button onClick={save} disabled={saving} style={btnP}>{saving ? 'Saving...' : 'Update'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Modal */}
      {extendModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={() => setExtendModal(null)}>
          <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, width: '100%', maxWidth: 480, padding: 32 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: 'white', fontWeight: 600, fontSize: 17, marginBottom: 4 }}>Extend Subscription</h3>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>{extendModal.business_name} · {extendModal.plan} plan</p>

            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4, marginBottom: 20 }}>
              {[{ v: 'payment', l: 'With Payment' }, { v: 'complimentary', l: 'Complimentary' }].map(opt => (
                <button key={opt.v} onClick={() => setExtendForm(f => ({ ...f, type: opt.v }))}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: extendForm.type === opt.v ? '#2563eb' : 'transparent', color: extendForm.type === opt.v ? 'white' : '#94a3b8' }}>
                  {opt.v === 'payment' ? '💳 ' : '🎁 '}{opt.l}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Duration</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[{ d: 7, l: '7 days' }, { d: 30, l: '30 days' }, { d: 90, l: '3 months' }, { d: 365, l: '1 year' }].map(opt => (
                    <button key={opt.d} onClick={() => setExtendForm(f => ({ ...f, days: opt.d, amount: Math.round(PLAN_PRICES[extendModal.plan] * opt.d / 30) }))}
                      style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: `1px solid ${extendForm.days === opt.d ? '#2563eb' : 'rgba(255,255,255,0.1)'}`, background: extendForm.days === opt.d ? 'rgba(37,99,235,0.15)' : 'transparent', color: extendForm.days === opt.d ? '#3b82f6' : '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>

              {extendForm.type === 'payment' ? (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Amount Received (Rs.) *</label>
                    <input type="number" value={extendForm.amount} onChange={e => setExtendForm(f => ({ ...f, amount: Number(e.target.value) }))} style={inp} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Payment Reference * <span style={{ color: '#ef4444' }}>Required</span></label>
                    <input value={extendForm.payment_ref} onChange={e => setExtendForm(f => ({ ...f, payment_ref: e.target.value }))} style={inp} placeholder="UPI ref, Razorpay order ID, bank UTR..." />
                  </div>
                </>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Reason * <span style={{ color: '#ef4444' }}>Required</span></label>
                  <textarea value={extendForm.reason} onChange={e => setExtendForm(f => ({ ...f, reason: e.target.value }))} style={{ ...inp, resize: 'none' }} rows={3} placeholder="e.g. Support case, partnership, bug compensation, referral..." />
                </div>
              )}

              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 14, fontSize: 13 }}>
                {[
                  ['Duration', `${extendForm.days} days`],
                  ['Type', extendForm.type === 'payment' ? `Paid Rs.${extendForm.amount}` : 'Complimentary'],
                  ['New expiry (approx)', (() => { const d = new Date(); d.setDate(d.getDate() + extendForm.days); return d.toLocaleDateString('en-IN') })()],
                ].map(([l, v]) => (
                  <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', marginBottom: 6 }}>
                    <span>{l}</span><span style={{ color: 'white' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setExtendModal(null)} style={btnS}>Cancel</button>
              <button onClick={confirmExtend} disabled={saving} style={btnP}>{saving ? 'Processing...' : 'Confirm Extension'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={() => setDeleteModal(null)}>
          <div style={{ background: '#1e293b', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20, width: '100%', maxWidth: 440, padding: 32 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ color: 'white', fontWeight: 600, fontSize: 17, marginBottom: 4 }}>Soft Delete Account</h3>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>{deleteModal.business_name} · {deleteModal.email}</p>
            <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 20 }}>Account will be deactivated. Data is preserved and can be restored.</p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Reason * <span style={{ color: '#ef4444' }}>Required</span></label>
              <textarea
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
                style={{ ...inp, resize: 'none', border: '1px solid rgba(239,68,68,0.3)' }}
                rows={3}
                placeholder="e.g. User requested closure, fraud detected, duplicate account, TOS violation..."
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteModal(null)} style={btnS}>Cancel</button>
              <button onClick={confirmDelete} disabled={saving || !deleteReason.trim()}
                style={{ ...btnP, background: !deleteReason.trim() ? '#7f1d1d' : '#ef4444', opacity: !deleteReason.trim() ? 0.6 : 1 }}>
                {saving ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
