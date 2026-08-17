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
  const [exportModal, setExportModal] = useState<any>(null)
  const [exportData, setExportData] = useState<any>(null)
  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState({ msg: '', type: '' })
  const [filters, setFilters] = useState({ search: '', plan: '', status: '', from: '', to: '' })

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

  const save = async () => {
    setSaving(true)
    const r = await fetch('/api/admin/subscription', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_subscription', tenant_id: selected.id, ...form }),
    }).then(r => r.json())
    setSaving(false)
    if (r.error) { showToast(r.error, 'error'); return }
    showToast('Updated!')
    setSelected(null); load()
  }

  const confirmExtend = async () => {
    if (extendForm.type === 'payment' && !extendForm.payment_ref.trim()) { showToast('Payment reference required', 'error'); return }
    if (extendForm.type === 'complimentary' && !extendForm.reason.trim()) { showToast('Reason required', 'error'); return }
    setSaving(true)
    const r = await fetch('/api/admin/subscription', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'extend', tenant_id: extendModal.id, days: extendForm.days,
        payment_id: extendForm.type === 'payment' ? extendForm.payment_ref : `COMP-${Date.now()}`,
        notes: extendForm.type === 'payment' ? `Payment: Rs.${extendForm.amount} | Ref: ${extendForm.payment_ref}` : `Complimentary: ${extendForm.reason}`,
      }),
    }).then(r => r.json())
    setSaving(false)
    if (r.error) { showToast(r.error, 'error'); return }
    showToast(`Extended ${extendForm.days} days!`)
    setExtendModal(null); load()
  }

  const confirmDelete = async () => {
    if (!deleteReason.trim()) { showToast('Reason required', 'error'); return }
    setSaving(true)
    const r = await fetch('/api/admin/subscription', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'soft_delete', tenant_id: deleteModal.id, reason: deleteReason }),
    }).then(r => r.json())
    setSaving(false)
    if (r.error) { showToast(r.error, 'error'); return }
    showToast('Account deleted')
    setDeleteModal(null); load()
  }

  const restoreAccount = async (t: any) => {
    if (!confirm(`Restore ${t.business_name}?`)) return
    await fetch('/api/admin/subscription', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restore', tenant_id: t.id, reason: 'Admin restore' }),
    })
    showToast('Restored!'); load()
  }

  // Apply filters
  const exportTenantData = async (t: any) => {
    setExportModal(t)
    setExportData(null)
    setExporting(true)
    try {
      const r = await fetch('/api/admin/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': process.env.NEXT_PUBLIC_SUPERADMIN_KEY || 'SV@SuperAdmin2026' },
        body: JSON.stringify({ tenant_id: t.id }),
      }).then(r => r.json())
      setExportData(r)
    } catch (err) {
      showToast('Export failed', 'error')
    }
    setExporting(false)
  }

  const downloadCSV = (name: string, csv: string) => {
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadJSON = () => {
    if (!exportData) return
    const blob = new Blob([JSON.stringify(exportData.data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${exportModal.business_name}_full_export_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetPassword = async (t: any) => {
    if (!confirm(`Send password reset email to ${t.email}?`)) return
    const r = await fetch('/api/admin/subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset_password', tenant_id: t.id, email: t.email }),
    }).then(r => r.json())
    if (r.error) { showToast('Error: ' + r.error, 'error'); return }
    showToast(`Reset email sent to ${t.email}`)
  }

  const filtered = tenants.filter(t => {
    if (filters.search && !t.business_name?.toLowerCase().includes(filters.search.toLowerCase()) && !t.email?.toLowerCase().includes(filters.search.toLowerCase())) return false
    if (filters.plan && t.plan !== filters.plan) return false
    if (filters.status && t.plan_status !== filters.status) return false
    if (filters.from && new Date(t.created_at) < new Date(filters.from)) return false
    if (filters.to && new Date(t.created_at) > new Date(filters.to + 'T23:59:59')) return false
    return true
  })

  const analytics = {
    total: tenants.length,
    active: tenants.filter(t => t.plan_status === 'active').length,
    trial: tenants.filter(t => t.plan_status === 'trial').length,
    expired: tenants.filter(t => ['expired', 'cancelled'].includes(t.plan_status)).length,
    mrr: tenants.filter(t => t.plan_status === 'active').reduce((s, t) => s + (PLAN_PRICES[t.plan] || 0), 0),
    expiringSoon: tenants.filter(t => { const d = Math.ceil((new Date(t.plan_expires_at).getTime() - Date.now()) / 864e5); return d > 0 && d <= 7 }).length,
  }

  const inp: any = { width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 13, color: 'white', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }
  const btnP: any = { padding: '9px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
  const btnS: any = { padding: '9px 20px', background: 'rgba(255,255,255,0.06)', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', fontFamily: 'Inter, sans-serif' }}>
      <style>{`* { box-sizing: border-box; } input,select,textarea { color: white !important; } table { width: 100%; border-collapse: collapse; } th { text-align: left; padding: 10px 14px; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid rgba(255,255,255,0.08); } td { padding: 10px 14px; font-size: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); vertical-align: top; } tr:hover td { background: rgba(255,255,255,0.02); } .badge { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 20px; display: inline-block; }`}</style>

      {toast.msg && <div style={{ position: 'fixed', bottom: 24, right: 24, background: toast.type === 'error' ? '#ef4444' : '#22c55e', color: 'white', padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, zIndex: 1000 }}>{toast.msg}</div>}

      {/* Header */}
      <div style={{ background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, background: '#7c3aed', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14 }}>⚡</div>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>SahajVyapar Superadmin</span>
          <span style={{ color: '#64748b', fontSize: 12, marginLeft: 8 }}>v2.0</span>
        </div>
        <button onClick={() => { sessionStorage.removeItem('sv_admin_auth'); router.push('/superadmin') }} style={{ color: '#94a3b8', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>Logout →</button>
      </div>

      <div style={{ padding: '24px 28px', maxWidth: 1300, margin: '0 auto' }}>

        {/* Analytics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Total', value: analytics.total, color: 'white' },
            { label: 'Active', value: analytics.active, color: '#22c55e' },
            { label: 'Trial', value: analytics.trial, color: '#f59e0b' },
            { label: 'Expired/Cancelled', value: analytics.expired, color: '#ef4444' },
            { label: 'Expiring 7d', value: analytics.expiringSoon, color: '#f97316' },
            { label: 'MRR', value: `Rs.${analytics.mrr.toLocaleString('en-IN')}`, color: '#3b82f6' },
          ].map(c => (
            <div key={c.label} style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 3, textTransform: 'uppercase' }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Plan Distribution */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
          {['starter', 'growth', 'pro'].map(plan => {
            const all = tenants.filter(t => t.plan === plan)
            const active = all.filter(t => t.plan_status === 'active')
            const trial = all.filter(t => t.plan_status === 'trial')
            return (
              <div key={plan} style={{ background: '#1e293b', border: `1px solid ${PLAN_COLOR[plan]}30`, borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{plan}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: PLAN_COLOR[plan] }}>{all.length} <span style={{ fontSize: 12, fontWeight: 400, color: '#64748b' }}>total</span></div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#22c55e' }}>{active.length} active</div>
                  <div style={{ fontSize: 11, color: '#f59e0b' }}>{trial.length} trial</div>
                  <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 2 }}>Rs.{(active.length * PLAN_PRICES[plan]).toLocaleString('en-IN')}/mo</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Filters */}
        <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 4, textTransform: 'uppercase' }}>Search</label>
              <input value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} placeholder="Business name or email..." style={inp} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 4, textTransform: 'uppercase' }}>Plan</label>
              <select value={filters.plan} onChange={e => setFilters(f => ({ ...f, plan: e.target.value }))} style={inp}>
                <option value="">All Plans</option>
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="pro">Pro</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 4, textTransform: 'uppercase' }}>Status</label>
              <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} style={inp}>
                <option value="">All Status</option>
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 4, textTransform: 'uppercase' }}>From</label>
              <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 4, textTransform: 'uppercase' }}>To</label>
              <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} style={inp} />
            </div>
            <button onClick={() => setFilters({ search: '', plan: '', status: '', from: '', to: '' })} style={{ ...btnS, padding: '8px 14px', fontSize: 12 }}>Clear</button>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: '#64748b' }}>Showing {filtered.length} of {tenants.length} tenants</div>
        </div>

        {/* Tenants Table */}
        <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>{['Business / Email', 'Plan', 'Status', 'Trial / Expiry', 'Next Payment', 'Payment Ref', 'Joined', 'Actions'].map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No tenants match filters</td></tr>
                ) : filtered.map(t => {
                  const expires = new Date(t.plan_expires_at)
                  const daysLeft = Math.ceil((expires.getTime() - Date.now()) / 864e5)
                  const isTrial = t.plan_status === 'trial'
                  const hasSubscription = !!t.razorpay_subscription_id
                  const nextPayment = t.next_payment_due ? new Date(t.next_payment_due) : null

                  return (
                    <tr key={t.id} style={{ opacity: t.deleted_at ? 0.45 : 1 }}>
                      <td>
                        <div style={{ color: 'white', fontWeight: 500, marginBottom: 1 }}>
                          {t.business_name}
                          {t.deleted_at && <span style={{ marginLeft: 5, fontSize: 9, background: '#ef444420', color: '#ef4444', padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>DELETED</span>}
                          {!t.is_active && !t.deleted_at && <span style={{ marginLeft: 5, fontSize: 9, background: '#f59e0b20', color: '#f59e0b', padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>SUSPENDED</span>}
                        </div>
                        <div style={{ color: '#64748b', fontSize: 11 }}>{t.email}</div>
                      </td>
                      <td><span className="badge" style={{ background: PLAN_COLOR[t.plan] + '20', color: PLAN_COLOR[t.plan] }}>{t.plan}</span></td>
                      <td><span className="badge" style={{ background: STATUS_COLOR[t.plan_status] + '20', color: STATUS_COLOR[t.plan_status] }}>{t.plan_status}</span></td>
                      <td>
                        {isTrial ? (
                          <div>
                            <div style={{ color: daysLeft <= 3 ? '#ef4444' : '#f59e0b', fontSize: 11, fontWeight: 600 }}>Trial: {daysLeft > 0 ? `${daysLeft}d left` : 'Expired'}</div>
                            <div style={{ color: '#64748b', fontSize: 10 }}>Ends: {expires.toLocaleDateString('en-IN')}</div>
                            {hasSubscription && <div style={{ color: '#22c55e', fontSize: 10 }}>✓ Subscribed</div>}
                          </div>
                        ) : (
                          <div>
                            <div style={{ color: daysLeft <= 0 ? '#ef4444' : daysLeft <= 7 ? '#f59e0b' : '#94a3b8', fontSize: 11 }}>
                              {daysLeft > 0 ? `${daysLeft}d left` : `${Math.abs(daysLeft)}d ago`}
                            </div>
                            <div style={{ color: '#64748b', fontSize: 10 }}>{expires.toLocaleDateString('en-IN')}</div>
                          </div>
                        )}
                      </td>
                      <td>
                        {nextPayment ? (
                          <div>
                            <div style={{ color: '#3b82f6', fontSize: 11 }}>{nextPayment.toLocaleDateString('en-IN')}</div>
                            <div style={{ color: '#64748b', fontSize: 10 }}>Rs.{PLAN_PRICES[t.plan]}</div>
                          </div>
                        ) : (
                          <div style={{ color: '#475569', fontSize: 11 }}>{t.plan_status === 'active' ? 'Auto-renew' : '—'}</div>
                        )}
                      </td>
                      <td style={{ color: '#64748b', fontSize: 11, fontFamily: 'monospace' }}>
                        {t.payment_id ? t.payment_id.substring(0, 16) + '...' : '—'}
                        {t.razorpay_subscription_id && <div style={{ color: '#475569', fontSize: 9 }}>{t.razorpay_subscription_id.substring(0, 16)}...</div>}
                      </td>
                      <td style={{ color: '#64748b', fontSize: 11 }}>{new Date(t.created_at).toLocaleDateString('en-IN')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <button onClick={() => { setSelected(t); setForm({ plan: t.plan, plan_status: t.plan_status, expires_at: t.plan_expires_at ? new Date(t.plan_expires_at).toISOString().split('T')[0] : '', payment_id: t.payment_id || '', notes: t.notes || '' }) }} style={{ fontSize: 10, color: '#3b82f6', background: 'rgba(59,130,246,0.1)', border: 'none', borderRadius: 5, padding: '3px 8px', cursor: 'pointer' }}>Edit</button>
                          {!t.deleted_at && <button onClick={() => { setExtendModal(t); setExtendForm({ type: 'payment', days: 30, payment_ref: '', amount: PLAN_PRICES[t.plan] || 0, reason: '' }) }} style={{ fontSize: 10, color: '#22c55e', background: 'rgba(34,197,94,0.1)', border: 'none', borderRadius: 5, padding: '3px 8px', cursor: 'pointer' }}>Extend</button>}
                          {t.deleted_at
                            ? <button onClick={() => restoreAccount(t)} style={{ fontSize: 10, color: '#a78bfa', background: 'rgba(167,139,250,0.1)', border: 'none', borderRadius: 5, padding: '3px 8px', cursor: 'pointer' }}>Restore</button>
                            : <button onClick={() => { setDeleteModal(t); setDeleteReason('') }} style={{ fontSize: 10, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 5, padding: '3px 8px', cursor: 'pointer' }}>Delete</button>
                          }
                          <button onClick={() => exportTenantData(t)} style={{ fontSize: 10, color: '#06b6d4', background: 'rgba(6,182,212,0.1)', border: 'none', borderRadius: 5, padding: '3px 8px', cursor: 'pointer' }}>Export</button>
                          <button onClick={() => resetPassword(t)} style={{ fontSize: 10, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: 'none', borderRadius: 5, padding: '3px 8px', cursor: 'pointer' }}>Reset PW</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Test Credentials Box */}
        <div style={{ marginTop: 20, background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Razorpay Test Credentials</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[
              { title: 'Test Card (Recurring)', lines: ['Card: 4111 1111 1111 1111', 'Expiry: 12/26', 'CVV: 123', 'OTP: 123456', 'Note: May fail for e-mandate'] },
              { title: 'Test UPI', lines: ['UPI ID: success@razorpay', 'For: One-time success simulation', 'UPI Failure: failure@razorpay', 'Note: Subscriptions need e-mandate'] },
              { title: 'E-Mandate (Recurring)', lines: ['Bank: Select any test bank', 'Account: Use demo credentials', 'Acc No: 1234567890', 'IFSC: UTIB0000001', 'Note: Best for subscription test'] },
            ].map(b => (
              <div key={b.title} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#3b82f6', marginBottom: 6 }}>{b.title}</div>
                {b.lines.map(l => (
                  <div key={l} style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2, fontFamily: l.startsWith('Note') ? 'inherit' : 'monospace' }}>
                    {l.startsWith('Note') ? <em style={{ fontFamily: 'inherit', color: '#64748b' }}>{l}</em> : l}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={() => setSelected(null)}>
          <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 18, width: '100%', maxWidth: 480, padding: 28 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: 'white', fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Edit Subscription</h3>
            <p style={{ color: '#64748b', fontSize: 12, marginBottom: 20 }}>{selected.business_name} · {selected.email}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 5 }}>Plan</label>
                <select value={form.plan} onChange={e => setForm((f: any) => ({ ...f, plan: e.target.value }))} style={inp}>
                  <option value="starter">Starter — Rs.399/mo</option>
                  <option value="growth">Growth — Rs.699/mo</option>
                  <option value="pro">Pro — Rs.999/mo</option>
                </select>
              </div>
              <div><label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 5 }}>Status</label>
                <select value={form.plan_status} onChange={e => setForm((f: any) => ({ ...f, plan_status: e.target.value }))} style={inp}>
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div><label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 5 }}>Expiry Date</label>
                <input type="date" value={form.expires_at} onChange={e => setForm((f: any) => ({ ...f, expires_at: e.target.value }))} style={inp} />
              </div>
              <div><label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 5 }}>Payment Reference</label>
                <input value={form.payment_id} onChange={e => setForm((f: any) => ({ ...f, payment_id: e.target.value }))} style={inp} placeholder="Razorpay ID, UPI ref, bank UTR..." />
              </div>
              <div><label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 5 }}>Internal Notes</label>
                <textarea value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} style={{ ...inp, resize: 'none' }} rows={2} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
              <button onClick={() => setSelected(null)} style={btnS}>Cancel</button>
              <button onClick={save} disabled={saving} style={btnP}>{saving ? 'Saving...' : 'Update'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Modal */}
      {extendModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={() => setExtendModal(null)}>
          <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 18, width: '100%', maxWidth: 480, padding: 28 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: 'white', fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Extend Subscription</h3>
            <p style={{ color: '#64748b', fontSize: 12, marginBottom: 16 }}>{extendModal.business_name} · {extendModal.plan} plan · Rs.{PLAN_PRICES[extendModal.plan]}/mo</p>

            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3, marginBottom: 16 }}>
              {[{ v: 'payment', l: '💳 With Payment' }, { v: 'complimentary', l: '🎁 Complimentary' }].map(opt => (
                <button key={opt.v} onClick={() => setExtendForm(f => ({ ...f, type: opt.v }))}
                  style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: extendForm.type === opt.v ? '#2563eb' : 'transparent', color: extendForm.type === opt.v ? 'white' : '#94a3b8' }}>
                  {opt.l}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>Duration</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[{ d: 7, l: '7d' }, { d: 30, l: '30d' }, { d: 90, l: '3mo' }, { d: 365, l: '1yr' }].map(opt => (
                    <button key={opt.d} onClick={() => setExtendForm(f => ({ ...f, days: opt.d, amount: Math.round(PLAN_PRICES[extendModal.plan] * opt.d / 30) }))}
                      style={{ flex: 1, padding: '7px 4px', borderRadius: 7, border: `1px solid ${extendForm.days === opt.d ? '#2563eb' : 'rgba(255,255,255,0.1)'}`, background: extendForm.days === opt.d ? 'rgba(37,99,235,0.15)' : 'transparent', color: extendForm.days === opt.d ? '#3b82f6' : '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>

              {extendForm.type === 'payment' ? (
                <>
                  <div><label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 5 }}>Amount Received (Rs.) *</label>
                    <input type="number" value={extendForm.amount} onChange={e => setExtendForm(f => ({ ...f, amount: Number(e.target.value) }))} style={inp} />
                  </div>
                  <div><label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 5 }}>Payment Reference * <span style={{ color: '#ef4444' }}>Required</span></label>
                    <input value={extendForm.payment_ref} onChange={e => setExtendForm(f => ({ ...f, payment_ref: e.target.value }))} style={inp} placeholder="UPI ref, Razorpay order ID, bank UTR, cheque no..." />
                  </div>
                </>
              ) : (
                <div><label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 5 }}>Reason * <span style={{ color: '#ef4444' }}>Required</span></label>
                  <textarea value={extendForm.reason} onChange={e => setExtendForm(f => ({ ...f, reason: e.target.value }))} style={{ ...inp, resize: 'none' }} rows={2} placeholder="Support case, partnership, referral reward, bug compensation..." />
                </div>
              )}

              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 12, fontSize: 12 }}>
                {[
                  ['Duration', `${extendForm.days} days`],
                  ['Type', extendForm.type === 'payment' ? `Paid Rs.${extendForm.amount}` : 'Complimentary'],
                  ['New expiry ~', (() => { const d = new Date(); d.setDate(d.getDate() + extendForm.days); return d.toLocaleDateString('en-IN') })()],
                ].map(([l, v]) => (
                  <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', marginBottom: 4 }}>
                    <span>{l}</span><span style={{ color: 'white', fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
              <button onClick={() => setExtendModal(null)} style={btnS}>Cancel</button>
              <button onClick={confirmExtend} disabled={saving} style={btnP}>{saving ? 'Processing...' : 'Confirm Extension'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={() => setDeleteModal(null)}>
          <div style={{ background: '#1e293b', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 18, width: '100%', maxWidth: 420, padding: 28 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🗑️</div>
            <h3 style={{ color: 'white', fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Soft Delete Account</h3>
            <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>{deleteModal.business_name} · {deleteModal.email}</p>
            <p style={{ color: '#ef4444', fontSize: 11, marginBottom: 16 }}>Account deactivated. Data preserved. Restorable.</p>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 5 }}>Reason * <span style={{ color: '#ef4444' }}>Required</span></label>
              <textarea value={deleteReason} onChange={e => setDeleteReason(e.target.value)}
                style={{ ...inp, resize: 'none', border: '1px solid rgba(239,68,68,0.3)' }} rows={3}
                placeholder="User requested closure, fraud, duplicate account, TOS violation..." autoFocus />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteModal(null)} style={btnS}>Cancel</button>
              <button onClick={confirmDelete} disabled={saving || !deleteReason.trim()}
                style={{ ...btnP, background: !deleteReason.trim() ? '#7f1d1d' : '#ef4444', opacity: !deleteReason.trim() ? 0.5 : 1 }}>
                {saving ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {exportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={() => { setExportModal(null); setExportData(null) }}>
          <div style={{ background: '#1e293b', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 18, width: '100%', maxWidth: 520, padding: 28 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>📦</div>
            <h3 style={{ color: 'white', fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Data Export</h3>
            <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 20 }}>{exportModal.business_name} · {exportModal.email}</p>

            {exporting ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#64748b' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                <div style={{ fontSize: 14 }}>Fetching data...</div>
              </div>
            ) : exportData ? (
              <div>
                {/* Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 20 }}>
                  {[
                    ['Products', exportData.data?.products?.length || 0, '#3b82f6'],
                    ['Sales', exportData.data?.sales?.length || 0, '#22c55e'],
                    ['Customers', exportData.data?.customers?.length || 0, '#f59e0b'],
                    ['Expenses', exportData.data?.expenses?.length || 0, '#a78bfa'],
                  ].map(([label, count, color]) => (
                    <div key={label as string} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: color as string }}>{count as number}</div>
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* Download buttons */}
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Download as CSV</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                  {[
                    ['Products', 'products'],
                    ['Sales', 'sales'],
                    ['Customers', 'customers'],
                    ['Expenses', 'expenses'],
                  ].map(([label, key]) => (
                    <button key={key} onClick={() => downloadCSV(`${exportModal.business_name}_${key}`, exportData.csv[key] || '')}
                      disabled={!exportData.csv[key]}
                      style={{ padding: '8px 12px', background: exportData.csv[key] ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${exportData.csv[key] ? 'rgba(6,182,212,0.3)' : 'rgba(255,255,255,0.05)'}`, borderRadius: 8, color: exportData.csv[key] ? '#06b6d4' : '#475569', fontSize: 12, cursor: exportData.csv[key] ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                      ↓ {label} CSV
                    </button>
                  ))}
                </div>
                <button onClick={downloadJSON}
                  style={{ width: '100%', padding: '10px', background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 8, color: '#3b82f6', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ↓ Download Complete Export (JSON) — All Tables
                </button>
                <p style={{ color: '#475569', fontSize: 11, marginTop: 8, textAlign: 'center' }}>
                  Exported at {new Date().toLocaleString('en-IN')} · Share securely with the user only
                </p>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#ef4444' }}>Export failed. Try again.</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => { setExportModal(null); setExportData(null) }} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.06)', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}