'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'

interface InvoiceData {
  sale: any
  profile: any
  tenant: any
}

function calcGST(amount: number, gstRate: number, isInterstate = false) {
  const gstAmount = amount * gstRate / 100
  if (isInterstate) return { igst: gstAmount, cgst: 0, sgst: 0, total: gstAmount }
  return { igst: 0, cgst: gstAmount / 2, sgst: gstAmount / 2, total: gstAmount }
}

function numToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  if (num === 0) return 'Zero'
  const convert = (n: number): string => {
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '')
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '')
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '')
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '')
  }
  const rupees = Math.floor(num)
  const paise = Math.round((num - rupees) * 100)
  let result = convert(rupees) + ' Rupees'
  if (paise > 0) result += ' and ' + convert(paise) + ' Paise'
  return result + ' Only'
}

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<InvoiceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/invoice?sale_id=${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setData(d)
        setLoading(false)
      })
  }, [id])

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-gray-400">Loading invoice...</div>
    </div>
  )

  if (error || !data) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-red-500 mb-4">{error || 'Invoice not found'}</div>
        <Link href="/dashboard/sales" className="text-blue-600 hover:underline">← Back to Sales</Link>
      </div>
    </div>
  )

  const { sale, profile, tenant } = data
  const items = sale.sale_items || []
  const isInterstate = false // can be determined by comparing seller/buyer state later

  // Calculate HSN-wise GST summary
  const hsnSummary: Record<string, any> = {}
  items.forEach((item: any) => {
    const hsn = item.hsn_code || 'N/A'
    const gst = calcGST(item.total_price, item.gst_rate || 0, isInterstate)
    if (!hsnSummary[hsn]) {
      hsnSummary[hsn] = { hsn, taxable: 0, rate: item.gst_rate || 0, cgst: 0, sgst: 0, igst: 0, total: 0 }
    }
    hsnSummary[hsn].taxable += item.total_price
    hsnSummary[hsn].cgst += gst.cgst
    hsnSummary[hsn].sgst += gst.sgst
    hsnSummary[hsn].igst += gst.igst
    hsnSummary[hsn].total += gst.total
  })

  const subtotal = items.reduce((s: number, i: any) => s + Number(i.total_price), 0)
  const totalGST = Object.values(hsnSummary).reduce((s: number, h: any) => s + h.total, 0)
  const discount = Number(sale.discount_amount) || 0
  const grandTotal = Number(sale.final_amount)

  const s = (n: number) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  const td = (content: string | number, align = 'left', bold = false) =>
    `<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:12px;text-align:${align};${bold ? 'font-weight:600;' : ''}">${content}</td>`

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          .invoice-wrapper { padding: 0 !important; background: white !important; }
        }
        @page { margin: 10mm; size: A4; }
        body { font-family: Arial, sans-serif; }
      `}</style>

      {/* Action bar - hidden on print */}
      <div className="no-print bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <Link href="/dashboard/sales" className="text-slate-400 hover:text-white text-sm flex items-center gap-2">
          ← Back to Sales
        </Link>
        <div className="flex gap-3">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Invoice ${sale.invoice_number}\nAmount: ₹${Number(sale.final_amount).toLocaleString('en-IN')}\nThank you for your purchase!\n\nFor invoice: ${window?.location?.href || ''}`)}`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-all"
          >
            📱 Share on WhatsApp
          </a>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all"
          >
            🖨️ Print / Download PDF
          </button>
        </div>
      </div>

      {/* Invoice */}
      <div className="invoice-wrapper bg-white min-h-screen p-8 max-w-4xl mx-auto">
        <div style={{ border: '2px solid #1e293b', padding: 0, fontFamily: 'Arial, sans-serif' }}>

          {/* Header */}
          <div style={{ background: '#1e3a5f', color: 'white', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              {profile?.logo_base64 && (
                <img src={`data:image/png;base64,${profile.logo_base64}`} alt="Logo" style={{ height: 50, marginBottom: 8, objectFit: 'contain' }} />
              )}
              <div style={{ fontSize: 20, fontWeight: 700 }}>{tenant?.business_name}</div>
              {profile?.address && <div style={{ fontSize: 11, marginTop: 4, opacity: 0.85 }}>{profile.address}</div>}
              {(profile?.city || profile?.state) && <div style={{ fontSize: 11, opacity: 0.85 }}>{[profile.city, profile.state, profile.pincode].filter(Boolean).join(', ')}</div>}
              {profile?.gstin && <div style={{ fontSize: 11, marginTop: 4 }}>GSTIN: <strong>{profile.gstin}</strong></div>}
              {profile?.pan && <div style={{ fontSize: 11 }}>PAN: {profile.pan}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>TAX INVOICE</div>
              <div style={{ fontSize: 12, marginTop: 8, background: 'rgba(255,255,255,0.15)', padding: '6px 12px', borderRadius: 4 }}>
                <div>Invoice No: <strong>{sale.invoice_number}</strong></div>
                <div>Date: <strong>{new Date(sale.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #d1d5db' }}>
            <div style={{ padding: '12px 16px', borderRight: '1px solid #d1d5db' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Bill To</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{sale.customer_name || 'Walk-in Customer'}</div>
              {sale.customer_phone && <div style={{ fontSize: 12, color: '#475569' }}>📞 {sale.customer_phone}</div>}
            </div>
            <div style={{ padding: '12px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Payment Details</div>
              <div style={{ fontSize: 12 }}>Method: <strong>{(sale.payment_method || 'Cash').toUpperCase()}</strong></div>
              <div style={{ fontSize: 12 }}>Status: <strong style={{ color: sale.payment_status === 'paid' ? '#16a34a' : '#dc2626' }}>{(sale.payment_status || 'paid').toUpperCase()}</strong></div>
            </div>
          </div>

          {/* Items Table */}
          <div style={{ padding: '0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  {['#', 'Description', 'HSN', 'Qty', 'Rate (₹)', 'Amount (₹)', 'GST%', 'GST Amt (₹)', 'Total (₹)'].map(h => (
                    <th key={h} style={{ padding: '8px', border: '1px solid #d1d5db', fontSize: 11, fontWeight: 700, textAlign: h === '#' || h === 'Qty' || h === 'GST%' ? 'center' : h.includes('₹') ? 'right' : 'left', background: '#e2e8f0', color: '#1e293b' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, idx: number) => {
                  const gst = calcGST(item.total_price, item.gst_rate || 0, isInterstate)
                  return (
                    <tr key={item.id} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                      <td style={{ padding: '6px 8px', border: '1px solid #d1d5db', fontSize: 12, textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ padding: '6px 8px', border: '1px solid #d1d5db', fontSize: 12, fontWeight: 500 }}>{item.product_name}</td>
                      <td style={{ padding: '6px 8px', border: '1px solid #d1d5db', fontSize: 11, textAlign: 'center', color: '#64748b' }}>{item.hsn_code || '—'}</td>
                      <td style={{ padding: '6px 8px', border: '1px solid #d1d5db', fontSize: 12, textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ padding: '6px 8px', border: '1px solid #d1d5db', fontSize: 12, textAlign: 'right' }}>{s(item.unit_price)}</td>
                      <td style={{ padding: '6px 8px', border: '1px solid #d1d5db', fontSize: 12, textAlign: 'right' }}>{s(item.total_price)}</td>
                      <td style={{ padding: '6px 8px', border: '1px solid #d1d5db', fontSize: 12, textAlign: 'center' }}>{item.gst_rate || 0}%</td>
                      <td style={{ padding: '6px 8px', border: '1px solid #d1d5db', fontSize: 12, textAlign: 'right', color: '#64748b' }}>{s(gst.total)}</td>
                      <td style={{ padding: '6px 8px', border: '1px solid #d1d5db', fontSize: 12, textAlign: 'right', fontWeight: 600 }}>{s(Number(item.total_price) + gst.total)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Totals + HSN Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #d1d5db' }}>

            {/* HSN Summary */}
            <div style={{ padding: '12px 16px', borderRight: '1px solid #d1d5db' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>HSN-wise Tax Summary</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    {['HSN', 'Taxable', 'Rate', ...(isInterstate ? ['IGST'] : ['CGST', 'SGST']), 'Total'].map(h => (
                      <th key={h} style={{ padding: '4px 6px', border: '1px solid #e2e8f0', textAlign: h === 'HSN' ? 'left' : 'right', fontSize: 10 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.values(hsnSummary).map((h: any) => (
                    <tr key={h.hsn}>
                      <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', fontSize: 10 }}>{h.hsn}</td>
                      <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', textAlign: 'right', fontSize: 10 }}>{s(h.taxable)}</td>
                      <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', textAlign: 'right', fontSize: 10 }}>{h.rate}%</td>
                      {isInterstate
                        ? <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', textAlign: 'right', fontSize: 10 }}>{s(h.igst)}</td>
                        : <>
                          <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', textAlign: 'right', fontSize: 10 }}>{s(h.cgst)}</td>
                          <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', textAlign: 'right', fontSize: 10 }}>{s(h.sgst)}</td>
                        </>
                      }
                      <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', textAlign: 'right', fontSize: 10, fontWeight: 600 }}>{s(h.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Amount Summary */}
            <div style={{ padding: '12px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Amount Summary</div>
              {[
                ['Subtotal', s(subtotal)],
                ...(discount > 0 ? [['Discount', `-${s(discount)}`]] : []),
                ...(!isInterstate
                  ? [
                    ['CGST', s(Object.values(hsnSummary).reduce((sum: number, h: any) => sum + h.cgst, 0))],
                    ['SGST', s(Object.values(hsnSummary).reduce((sum: number, h: any) => sum + h.sgst, 0))],
                  ]
                  : [['IGST', s(totalGST)]]
                ),
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, borderBottom: '1px solid #f1f5f9', color: '#475569' }}>
                  <span>{label}</span><span>{value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 4px', fontSize: 16, fontWeight: 700, color: '#1e293b', borderTop: '2px solid #1e293b', marginTop: 4 }}>
                <span>Grand Total</span><span>{s(grandTotal)}</span>
              </div>
              <div style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic', marginTop: 4 }}>
                {numToWords(grandTotal)}
              </div>
            </div>
          </div>

          {/* Bank Details */}
          {(profile?.bank_name || profile?.account_no) && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid #d1d5db', background: '#f8fafc' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Bank Details</div>
              <div style={{ fontSize: 11, color: '#374151' }}>
                {profile.bank_name && <span>Bank: <strong>{profile.bank_name}</strong> &nbsp;|&nbsp; </span>}
                {profile.account_no && <span>A/C: <strong>{profile.account_no}</strong> &nbsp;|&nbsp; </span>}
                {profile.ifsc && <span>IFSC: <strong>{profile.ifsc}</strong></span>}
              </div>
            </div>
          )}

          {/* Notes + Signature */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #d1d5db' }}>
            <div style={{ padding: '12px 16px', borderRight: '1px solid #d1d5db' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Terms & Notes</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                {sale.notes || 'Thank you for your business!'}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6 }}>
                This is a computer generated invoice.
              </div>
            </div>
            <div style={{ padding: '12px 16px', textAlign: 'right' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 40 }}>For {tenant?.business_name}</div>
              <div style={{ borderTop: '1px solid #94a3b8', paddingTop: 4, fontSize: 10, color: '#64748b' }}>Authorised Signatory</div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ background: '#1e3a5f', color: 'rgba(255,255,255,0.7)', padding: '8px 16px', fontSize: 10, textAlign: 'center' }}>
            Generated by SahajVyapar · sahajvyapar.in · {tenant?.business_name}
          </div>
        </div>
      </div>
    </>
  )
}
