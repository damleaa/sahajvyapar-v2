'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const GST_RATE = 0.18

function extractGST(amount: number) {
  const base = amount / (1 + GST_RATE)
  const gst = amount - base
  return {
    base: Math.round(base * 100) / 100,
    cgst: Math.round(gst / 2 * 100) / 100,
    sgst: Math.round(gst / 2 * 100) / 100,
    total_gst: Math.round(gst * 100) / 100
  }
}

function numToWords(num: number): string {
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']
  if (num === 0) return 'Zero'
  const convert = (n: number): string => {
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' '+ones[n%10] : '')
    if (n < 1000) return ones[Math.floor(n/100)]+' Hundred'+(n%100 ? ' '+convert(n%100) : '')
    if (n < 100000) return convert(Math.floor(n/1000))+' Thousand'+(n%1000 ? ' '+convert(n%1000) : '')
    return convert(Math.floor(n/100000))+' Lakh'+(n%100000 ? ' '+convert(n%100000) : '')
  }
  return convert(Math.floor(num)) + ' Rupees Only'
}

export default function PaymentsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPayment, setSelectedPayment] = useState<any>(null)

  useEffect(() => {
    fetch('/api/payments')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setData(d)
        setLoading(false)
      })
      .catch(() => { setError('Failed to load payments'); setLoading(false) })
  }, [])

  const printInvoice = (payment: any) => {
    setSelectedPayment(payment)
    setTimeout(() => window.print(), 400)
  }

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 bg-slate-800 rounded animate-pulse w-48" />
      <div className="h-64 bg-slate-800 rounded-xl animate-pulse" />
    </div>
  )

  if (error) return (
    <div className="card p-8 text-center">
      <div className="text-red-400 mb-2">{error}</div>
      <Link href="/dashboard/settings" className="text-blue-400 text-sm">Go to Settings →</Link>
    </div>
  )

  const payments: any[] = data?.payments || []
  const profile = data?.profile || {}
  const tenant = data?.tenant || {}
  const summary = data?.summary || {}

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; color: black !important; }
          @page { margin: 10mm; size: A4; }
        }
        .print-only { display: none; }
      `}</style>

      {/* Print invoice */}
      {selectedPayment && (
        <div className="print-only" style={{ fontFamily: 'Arial, sans-serif', background: 'white', color: '#000', padding: 0 }}>
          <div style={{ border: '2px solid #1e293b', maxWidth: 800, margin: '0 auto' }}>
            {/* Invoice header */}
            <div style={{ background: '#1e3a5f', color: 'white', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>Emotiquant Technologies OPC Pvt. Ltd.</div>
                <div style={{ fontSize: 11, marginTop: 4, opacity: 0.85 }}>Airoli, Navi Mumbai, Maharashtra - 400708</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>GSTIN: <strong>27AAICE7117P1Z3</strong></div>
                <div style={{ fontSize: 11 }}>SAC Code: 998314</div>
                <div style={{ fontSize: 11 }}>Email: support@sahajvyapar.in</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>TAX INVOICE</div>
                <div style={{ marginTop: 10, background: 'rgba(255,255,255,0.15)', padding: '8px 12px', borderRadius: 4, fontSize: 12 }}>
                  <div>Invoice: <strong>SV-{selectedPayment.id?.slice(-8).toUpperCase()}</strong></div>
                  <div style={{ marginTop: 4 }}>Date: <strong>{new Date(selectedPayment.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
                </div>
              </div>
            </div>

            {/* Bill To */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #d1d5db' }}>
              <div style={{ padding: '12px 16px', borderRight: '1px solid #d1d5db' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Bill To</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{tenant.business_name}</div>
                <div style={{ fontSize: 12, color: '#475569' }}>{tenant.email}</div>
              </div>
              <div style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Payment Info</div>
                <div style={{ fontSize: 12 }}>Method: <strong>{(selectedPayment.method || 'Online').toUpperCase()}</strong></div>
                <div style={{ fontSize: 12 }}>Ref: <strong style={{ fontFamily: 'monospace', fontSize: 10 }}>{selectedPayment.id}</strong></div>
                <div style={{ fontSize: 12 }}>Status: <strong style={{ color: '#16a34a' }}>PAID</strong></div>
              </div>
            </div>

            {/* Items */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#e2e8f0' }}>
                  {['Description', 'SAC', 'Period', 'Taxable Amt', 'CGST 9%', 'SGST 9%', 'Total'].map(h => (
                    <th key={h} style={{ padding: '8px', border: '1px solid #d1d5db', fontSize: 11, fontWeight: 700, textAlign: ['Taxable Amt','CGST 9%','SGST 9%','Total'].includes(h) ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const g = extractGST(selectedPayment.amount)
                  const period = new Date(selectedPayment.created_at)
                  const periodEnd = new Date(period)
                  periodEnd.setMonth(periodEnd.getMonth() + 1)
                  return (
                    <tr>
                      <td style={{ padding: '8px', border: '1px solid #d1d5db', fontSize: 12, fontWeight: 600 }}>
                        SahajVyapar {(selectedPayment.plan || summary.current_plan || 'Starter').charAt(0).toUpperCase() + (selectedPayment.plan || summary.current_plan || 'starter').slice(1)} Plan — Monthly Subscription
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #d1d5db', fontSize: 11, textAlign: 'center' }}>998314</td>
                      <td style={{ padding: '8px', border: '1px solid #d1d5db', fontSize: 10 }}>
                        {period.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})} to {periodEnd.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #d1d5db', fontSize: 12, textAlign: 'right' }}>Rs.{g.base.toFixed(2)}</td>
                      <td style={{ padding: '8px', border: '1px solid #d1d5db', fontSize: 12, textAlign: 'right' }}>Rs.{g.cgst.toFixed(2)}</td>
                      <td style={{ padding: '8px', border: '1px solid #d1d5db', fontSize: 12, textAlign: 'right' }}>Rs.{g.sgst.toFixed(2)}</td>
                      <td style={{ padding: '8px', border: '1px solid #d1d5db', fontSize: 12, textAlign: 'right', fontWeight: 700 }}>Rs.{selectedPayment.amount.toFixed(2)}</td>
                    </tr>
                  )
                })()}
              </tbody>
            </table>

            {/* Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #d1d5db' }}>
              <div style={{ padding: '12px 16px', borderRight: '1px solid #d1d5db' }}>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6 }}>This is a computer generated invoice.</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>Generated by SahajVyapar &middot; sahajvyapar.in</div>
              </div>
              <div style={{ padding: '12px 16px' }}>
                {(() => {
                  const g = extractGST(selectedPayment.amount)
                  return (
                    <>
                      {[['Base (excl. GST)', `Rs.${g.base.toFixed(2)}`], ['CGST @ 9%', `Rs.${g.cgst.toFixed(2)}`], ['SGST @ 9%', `Rs.${g.sgst.toFixed(2)}`]].map(([l,v]) => (
                        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 12, color: '#475569' }}>
                          <span>{l}</span><span>{v}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 4px', fontSize: 15, fontWeight: 700, color: '#1e293b', borderTop: '2px solid #1e293b', marginTop: 4 }}>
                        <span>Total Paid</span><span>Rs.{selectedPayment.amount.toFixed(2)}</span>
                      </div>
                      <div style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic' }}>{numToWords(selectedPayment.amount)}</div>
                    </>
                  )
                })()}
              </div>
            </div>

            <div style={{ background: '#1e3a5f', color: 'rgba(255,255,255,0.6)', padding: '8px 16px', fontSize: 10, textAlign: 'center' }}>
              SahajVyapar &middot; sahajvyapar.in &middot; support@sahajvyapar.in &middot; GSTIN: 27AAICE7117P1Z3
            </div>
          </div>
        </div>
      )}

      {/* Screen view */}
      <div className="no-print">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Payment History</h1>
            <p className="text-slate-400 text-sm mt-1">Last 6 months &middot; All prices incl. 18% GST</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Paid', value: `Rs.${(summary.total_paid || 0).toFixed(2)}`, color: 'text-green-400' },
            { label: 'Active Plan', value: (summary.current_plan || '—').charAt(0).toUpperCase() + (summary.current_plan || '').slice(1), color: 'text-blue-400' },
            { label: 'Next Due', value: summary.next_due ? new Date(summary.next_due).toLocaleDateString('en-IN') : '—', color: 'text-amber-400' },
            { label: 'Invoices', value: payments.length, color: 'text-purple-400' },
          ].map(c => (
            <div key={c.label} className="card p-4">
              <div className={`text-xl font-bold ${c.color}`}>{c.value}</div>
              <div className="text-slate-500 text-xs mt-1">{c.label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-white font-medium">Payment Records</h2>
            <span className="text-slate-500 text-xs">Click "GST Invoice" to download</span>
          </div>

          {payments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-3">💳</div>
              <div className="text-slate-400 text-sm font-medium mb-1">No payment records yet</div>
              <div className="text-slate-600 text-xs mb-4">
                Payment history appears here after your first subscription payment.
                {summary.plan_status === 'trial' && ' You are currently on a free trial.'}
              </div>
              <Link href="/dashboard/settings" className="btn-primary text-sm">
                Subscribe Now →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Invoice #', 'Date', 'Plan', 'Base Amt', 'CGST 9%', 'SGST 9%', 'Total Paid', 'Method', 'Status', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {payments.map((p: any) => {
                    const g = extractGST(p.amount)
                    return (
                      <tr key={p.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-3 text-xs font-mono text-slate-500">SV-{p.id?.slice(-8).toUpperCase()}</td>
                        <td className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">
                          {new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                            p.plan === 'pro' ? 'bg-purple-500/15 text-purple-400' :
                            p.plan === 'growth' ? 'bg-blue-500/15 text-blue-400' :
                            'bg-amber-500/15 text-amber-400'
                          }`}>{p.plan || summary.current_plan}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-400">Rs.{g.base.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-slate-400">Rs.{g.cgst.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-slate-400">Rs.{g.sgst.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-white">Rs.{p.amount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-xs text-slate-400 capitalize">{p.method || 'online'}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">Paid</span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => printInvoice(p)}
                            className="text-xs text-blue-400 hover:text-blue-300 font-medium whitespace-nowrap"
                          >
                            GST Invoice ↓
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4 p-4 bg-slate-800/30 rounded-xl">
          <p className="text-slate-500 text-xs">
            All invoices include 18% GST (CGST 9% + SGST 9%) &middot; SAC: 998314 &middot; GSTIN: 27AAICE7117P1Z3
          </p>
          <p className="text-slate-600 text-xs mt-1">
            For B2B ITC claims, email your GSTIN to support@sahajvyapar.in — we will issue a B2B invoice within 2 business days.
          </p>
        </div>
      </div>
    </>
  )
}
