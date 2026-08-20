'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const ADMIN_KEY = 'SV@SuperAdmin2026'
const fm = (n: number) => `Rs.${Number(n||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

export default function RevenueDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!sessionStorage.getItem('sv_admin_auth')) { router.push('/superadmin'); return }
    }
    fetch('/api/admin/revenue', {
      headers: { 'x-admin-key': ADMIN_KEY }
    }).then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontFamily: 'Inter, sans-serif' }}>
      Loading revenue data...
    </div>
  )

  const s = data?.summary || {}
  const monthly = data?.monthly || {}
  const byPlan = data?.by_plan || {}

  const maxMonthly = Math.max(...Object.values(monthly).map((m: any) => m.collected || 0), 1)

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', fontFamily: 'Inter, sans-serif', padding: '24px' }}>
      <style>{`* { box-sizing: border-box; }`}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <Link href="/superadmin/dashboard" style={{ color: '#64748b', fontSize: 13, textDecoration: 'none' }}>&larr; Back to Tenants</Link>
            <h1 style={{ color: 'white', fontSize: 22, fontWeight: 700, margin: '8px 0 4px' }}>Revenue & Settlements</h1>
            <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Last 6 months &middot; Live from Razorpay</p>
          </div>
          <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 14px', fontSize: 12, color: '#64748b' }}>
            Razorpay fee est. ~2% of collected
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'MRR (incl. GST)', value: fm(s.mrr || 0), sub: `Base: ${fm(s.mrr_ex_gst || 0)}`, color: '#22c55e' },
            { label: 'ARR', value: fm(s.arr || 0), sub: 'Annualised', color: '#3b82f6' },
            { label: 'Total Collected', value: fm(s.total_collected || 0), sub: 'Last 6 months', color: '#a78bfa' },
            { label: 'Net Revenue', value: fm(s.net_revenue || 0), sub: `After refunds + fees`, color: '#f59e0b' },
          ].map(c => (
            <div key={c.label} style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px' }}>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{c.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>{c.sub}</div>
            </div>
          ))}
        </div>

        {/* GST + Fees breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px' }}>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>GST Liability (Monthly)</div>
            {[
              ['Total GST collected', fm(s.mrr_gst || 0)],
              ['CGST (9%)', fm((s.mrr_gst || 0) / 2)],
              ['SGST (9%)', fm((s.mrr_gst || 0) / 2)],
            ].map(([l, v]) => (
              <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12, borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#94a3b8' }}>
                <span>{l}</span><span style={{ color: 'white', fontWeight: 500 }}>{v}</span>
              </div>
            ))}
            <div style={{ fontSize: 10, color: '#475569', marginTop: 8 }}>GSTIN: 27AAICE7117P1Z3 &middot; File GSTR-1 monthly</div>
          </div>

          <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px' }}>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Deductions (6 months)</div>
            {[
              ['Razorpay fees (~2%)', fm(s.razorpay_fees || 0)],
              ['Refunds issued', fm(s.total_refunds || 0)],
              ['Total deductions', fm((s.razorpay_fees || 0) + (s.total_refunds || 0))],
            ].map(([l, v]) => (
              <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12, borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#94a3b8' }}>
                <span>{l}</span><span style={{ color: l === 'Total deductions' ? '#ef4444' : 'white', fontWeight: 500 }}>{v}</span>
              </div>
            ))}
            <div style={{ fontSize: 10, color: '#475569', marginTop: 8 }}>Actual Razorpay fees visible in Razorpay &rarr; Reports &rarr; Settlements</div>
          </div>

          <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px' }}>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Subscriber Mix</div>
            {[
              ['Starter (Rs.399/mo)', byPlan.starter || 0, '#f59e0b'],
              ['Growth (Rs.699/mo)', byPlan.growth || 0, '#3b82f6'],
              ['Pro (Rs.999/mo)', byPlan.pro || 0, '#a78bfa'],
              ['Total active', s.active_subscribers || 0, '#22c55e'],
            ].map(([l, v, c]) => (
              <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12, borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#94a3b8' }}>
                <span>{l}</span><span style={{ color: c as string, fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly chart */}
        <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '20px', marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Monthly Collection (Last 6 Months)</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: 120 }}>
            {Object.entries(monthly).map(([month, d]: [string, any]) => {
              const height = Math.max((d.collected / maxMonthly) * 100, 4)
              const [y, m] = month.split('-')
              const label = new Date(Number(y), Number(m) - 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
              return (
                <div key={month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: 10, color: '#64748b' }}>{d.collected > 0 ? `Rs.${Math.round(d.collected)}` : ''}</div>
                  <div style={{ width: '100%', background: 'rgba(37,99,235,0.3)', borderRadius: 4, position: 'relative', display: 'flex', alignItems: 'flex-end', height: 80 }}>
                    <div style={{ width: '100%', background: '#2563eb', borderRadius: 4, height: `${height}%`, minHeight: 4 }} />
                  </div>
                  {d.refunds > 0 && <div style={{ fontSize: 9, color: '#ef4444' }}>-Rs.{Math.round(d.refunds)}</div>}
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>{label}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent payments */}
        <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>Recent Payments</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Payment ID', 'Date', 'Amount', 'Method', 'Email', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.recent_payments || []).length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#475569', fontSize: 13 }}>No payments found. Payments will appear here once live mode is active.</td></tr>
                ) : (data?.recent_payments || []).map((p: any) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '10px 14px', fontSize: 11, fontFamily: 'monospace', color: '#64748b' }}>{p.id}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#94a3b8' }}>{new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: 'white', fontWeight: 600 }}>{fm(p.amount)}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#94a3b8', textTransform: 'capitalize' }}>{p.method}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b' }}>{p.email || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Refunds */}
        {(data?.recent_refunds || []).length > 0 && (
          <div style={{ background: '#1e293b', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ color: '#ef4444', fontWeight: 600, fontSize: 14 }}>Refunds</div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Refund ID', 'Payment ID', 'Amount', 'Date', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recent_refunds.map((r: any) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '10px 14px', fontSize: 11, fontFamily: 'monospace', color: '#64748b' }}>{r.id}</td>
                    <td style={{ padding: '10px 14px', fontSize: 11, fontFamily: 'monospace', color: '#475569' }}>{r.payment_id}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: '#ef4444', fontWeight: 600 }}>{fm(r.amount)}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#94a3b8' }}>{new Date(r.created_at).toLocaleDateString('en-IN')}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
