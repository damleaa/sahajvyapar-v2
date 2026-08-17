'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

function calcGST(amount: number, gstRate: number) {
  const gstAmount = amount * gstRate / 100
  return { cgst: gstAmount / 2, sgst: gstAmount / 2, total: gstAmount }
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

const fm = (n: number) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
const s = (n: number) => `Rs.${fm(n)}`

export default function InvoicePage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/invoice?sale_id=${params.id}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); setLoading(false) })
      .catch(() => { setError('Failed to load invoice'); setLoading(false) })
  }, [params.id])

  const whatsappShare = () => {
    if (!data) return
    const url = window.location.href
    const msg = `Invoice: ${data.sale.invoice_number}\nAmount: Rs.${fm(data.sale.final_amount)}\nThank you for your business!\n\n${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#64748b' }}>Loading invoice...</div>
    </div>
  )

  if (error || !data) return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ color: '#ef4444' }}>{error || 'Invoice not found'}</div>
      <Link href="/dashboard/sales" style={{ color: '#3b82f6' }}>Back to Sales</Link>
    </div>
  )

  const { sale, profile, tenant } = data
  const items: any[] = sale.sale_items || []

  const hsnMap: Record<string, any> = {}
  items.forEach((item: any) => {
    const hsn = item.hsn_code || 'N/A'
    const gst = calcGST(Number(item.total_price), Number(item.gst_rate) || 0)
    if (!hsnMap[hsn]) hsnMap[hsn] = { hsn, taxable: 0, rate: Number(item.gst_rate) || 0, cgst: 0, sgst: 0, total: 0 }
    hsnMap[hsn].taxable += Number(item.total_price)
    hsnMap[hsn].cgst += gst.cgst
    hsnMap[hsn].sgst += gst.sgst
    hsnMap[hsn].total += gst.total
  })

  const hsnRows = Object.values(hsnMap)
  const subtotal = items.reduce((acc: number, i: any) => acc + Number(i.total_price), 0)
  const totalCGST = hsnRows.reduce((acc: number, h: any) => acc + h.cgst, 0)
  const totalSGST = hsnRows.reduce((acc: number, h: any) => acc + h.sgst, 0)
  const discount = Number(sale.discount_amount) || 0
  const grandTotal = Number(sale.final_amount)

  const cell = (txt: any, align = 'left', bold = false, small = false) => (
    <td style={{ padding: '6px 8px', border: '1px solid #d1d5db', fontSize: small ? 11 : 12, textAlign: align as any, fontWeight: bold ? 700 : 400 }}>{txt}</td>
  )

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } @page { margin: 8mm; size: A4; } }`}</style>

      {/* Action bar */}
      <div className="no-print" style={{ background: '#1e293b', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid #334155' }}>
        <Link href="/dashboard/sales" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none' }}>
          &larr; Back to Sales
        </Link>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={whatsappShare} style={{ padding: '8px 16px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Share on WhatsApp
          </button>
          <button onClick={() => window.print()} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Print / Download PDF
          </button>
        </div>
      </div>

      {/* Invoice */}
      <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '24px 16px', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', background: 'white', border: '2px solid #1e293b' }}>

          {/* Header */}
          <div style={{ background: '#1e3a5f', color: 'white', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              {profile?.logo_base64 && (
                <img src={`data:image/png;base64,${profile.logo_base64}`} alt="Logo" style={{ height: 48, marginBottom: 8, objectFit: 'contain', background: 'white', padding: 4, borderRadius: 4 }} />
              )}
              <div style={{ fontSize: 18, fontWeight: 700 }}>{tenant?.business_name || 'Business'}</div>
              {profile?.address && <div style={{ fontSize: 11, marginTop: 4, opacity: 0.85 }}>{profile.address}</div>}
              {(profile?.city || profile?.state) && (
                <div style={{ fontSize: 11, opacity: 0.85 }}>{[profile.city, profile.state, profile.pincode].filter(Boolean).join(', ')}</div>
              )}
              {profile?.gstin && <div style={{ fontSize: 11, marginTop: 4 }}>GSTIN: <strong>{profile.gstin}</strong></div>}
              {profile?.pan && <div style={{ fontSize: 11 }}>PAN: {profile.pan}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 1 }}>TAX INVOICE</div>
              <div style={{ marginTop: 10, background: 'rgba(255,255,255,0.15)', padding: '8px 12px', borderRadius: 4, fontSize: 12 }}>
                <div>Invoice No: <strong>{sale.invoice_number}</strong></div>
                <div style={{ marginTop: 4 }}>Date: <strong>{new Date(sale.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #d1d5db' }}>
            <div style={{ padding: '12px 16px', borderRight: '1px solid #d1d5db' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Bill To</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{sale.customer_name || 'Walk-in Customer'}</div>
            </div>
            <div style={{ padding: '12px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Payment</div>
              <div style={{ fontSize: 12 }}>Method: <strong>{(sale.payment_method || 'cash').toUpperCase()}</strong></div>
              <div style={{ fontSize: 12 }}>Status: <strong style={{ color: sale.payment_status === 'paid' ? '#16a34a' : '#dc2626' }}>{(sale.payment_status || 'paid').toUpperCase()}</strong></div>
            </div>
          </div>

          {/* Items */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#e2e8f0' }}>
                {['#', 'Description', 'HSN', 'Qty', 'Rate', 'Amount', 'GST%', 'GST Amt', 'Total'].map(h => (
                  <th key={h} style={{ padding: '7px 8px', border: '1px solid #d1d5db', fontSize: 11, fontWeight: 700, textAlign: ['Rate','Amount','GST Amt','Total'].includes(h) ? 'right' : ['#','Qty','GST%'].includes(h) ? 'center' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, idx: number) => {
                const gst = calcGST(Number(item.total_price), Number(item.gst_rate) || 0)
                return (
                  <tr key={item.id} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                    {cell(idx + 1, 'center')}
                    {cell(item.product_name, 'left', true)}
                    {cell(item.hsn_code || '—', 'center', false, true)}
                    {cell(item.quantity, 'center')}
                    {cell(s(item.unit_price), 'right')}
                    {cell(s(item.total_price), 'right')}
                    {cell(`${item.gst_rate || 0}%`, 'center')}
                    <td style={{ padding: '6px 8px', border: '1px solid #d1d5db', fontSize: 12, textAlign: 'right', color: '#64748b' }}>{s(gst.total)}</td>
                    {cell(s(Number(item.total_price) + gst.total), 'right', true)}
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* HSN Summary + Totals */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #d1d5db' }}>
            <div style={{ padding: '12px 16px', borderRight: '1px solid #d1d5db' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>HSN-wise Tax Summary</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#f1f5f9' }}>
                  {['HSN', 'Taxable', 'Rate', 'CGST', 'SGST', 'Total'].map(h => (
                    <th key={h} style={{ padding: '4px 6px', border: '1px solid #e2e8f0', fontSize: 10, textAlign: h === 'HSN' ? 'left' : 'right' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {hsnRows.map((h: any) => (
                    <tr key={h.hsn}>
                      <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', fontSize: 10 }}>{h.hsn}</td>
                      <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', fontSize: 10, textAlign: 'right' }}>{s(h.taxable)}</td>
                      <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', fontSize: 10, textAlign: 'right' }}>{h.rate}%</td>
                      <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', fontSize: 10, textAlign: 'right' }}>{s(h.cgst)}</td>
                      <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', fontSize: 10, textAlign: 'right' }}>{s(h.sgst)}</td>
                      <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', fontSize: 10, textAlign: 'right', fontWeight: 700 }}>{s(h.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '12px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Amount Summary</div>
              {[
                ['Subtotal (before tax)', s(subtotal)],
                ...(discount > 0 ? [['Discount', `-${s(discount)}`]] : []),
                ['CGST', s(totalCGST)],
                ['SGST', s(totalSGST)],
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
                {[profile.bank_name && `Bank: ${profile.bank_name}`, profile.account_no && `A/C: ${profile.account_no}`, profile.ifsc && `IFSC: ${profile.ifsc}`].filter(Boolean).join('  |  ')}
              </div>
            </div>
          )}

          {/* Notes + Signature */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #d1d5db' }}>
            <div style={{ padding: '12px 16px', borderRight: '1px solid #d1d5db' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Notes</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{sale.notes || 'Thank you for your business!'}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6 }}>This is a computer generated invoice.</div>
            </div>
            <div style={{ padding: '12px 16px', textAlign: 'right' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 48 }}>For {tenant?.business_name}</div>
              <div style={{ borderTop: '1px solid #94a3b8', paddingTop: 4, fontSize: 10, color: '#64748b' }}>Authorised Signatory</div>
            </div>
          </div>

          {/* Bottom */}
          <div style={{ background: '#1e3a5f', color: 'rgba(255,255,255,0.6)', padding: '8px 16px', fontSize: 10, textAlign: 'center' }}>
            Generated by SahajVyapar &middot; sahajvyapar.in
          </div>
        </div>
      </div>
    </>
  )
}
