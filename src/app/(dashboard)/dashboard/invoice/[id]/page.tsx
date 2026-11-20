import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

// GST Invoice rendering rules:
// - Each line item may have a different GST rate (5%, 12%, 18%, 28%, 0%)
// - Intra-state sale: CGST + SGST = GST rate / 2 each
// - Inter-state sale: IGST = full GST rate
// - is_inter_state is derived server-side from customer state vs seller state
// - NEVER compute GST from items[0].gst_rate — that breaks mixed-rate invoices
// - Use persisted taxable_amount / cgst_amount / sgst_amount / igst_amount from DB
//   If those fields are NULL (older rows), compute from unit_price × quantity × rate

interface SaleItem {
  id: string
  product_name: string
  hsn_code?: string
  quantity: number
  unit_price: number
  gst_rate: number
  total_price: number          // = unit_price × quantity (before GST)
  taxable_amount?: number      // persisted field (preferred)
  cgst_amount?: number         // persisted CGST
  sgst_amount?: number         // persisted SGST
  igst_amount?: number         // persisted IGST
}

interface GSTLineBreakdown {
  rate: number
  taxableAmount: number
  cgst: number
  sgst: number
  igst: number
}

/** Aggregate per-rate GST breakdown for the HSN summary table */
function buildGSTBreakdown(items: SaleItem[], isInterState: boolean): GSTLineBreakdown[] {
  const map = new Map<number, GSTLineBreakdown>()

  for (const item of items) {
    // Prefer persisted amounts; fall back to computed
    const taxable =
      item.taxable_amount != null
        ? Number(item.taxable_amount)
        : Number(item.unit_price) * Number(item.quantity)

    const rate = Number(item.gst_rate) || 0
    const existing = map.get(rate) ?? { rate, taxableAmount: 0, cgst: 0, sgst: 0, igst: 0 }

    if (isInterState) {
      const igst =
        item.igst_amount != null
          ? Number(item.igst_amount)
          : taxable * (rate / 100)
      map.set(rate, {
        ...existing,
        taxableAmount: existing.taxableAmount + taxable,
        igst: existing.igst + igst,
      })
    } else {
      const cgst =
        item.cgst_amount != null
          ? Number(item.cgst_amount)
          : taxable * (rate / 200)
      const sgst =
        item.sgst_amount != null
          ? Number(item.sgst_amount)
          : taxable * (rate / 200)
      map.set(rate, {
        ...existing,
        taxableAmount: existing.taxableAmount + taxable,
        cgst: existing.cgst + cgst,
        sgst: existing.sgst + sgst,
      })
    }
  }

  // Sort by rate ascending; skip 0% rate rows (no tax)
  return Array.from(map.values()).sort((a, b) => a.rate - b.rate)
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, business_name, owner_name, email, phone')
    .eq('owner_id', user.id)
    .single()
  if (!tenant) return notFound()

  const { data: profile } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('tenant_id', tenant.id)
    .single()

  const { data: sale } = await supabase
    .from('sales')
    .select(`
      *,
      sale_items (
        id, product_name, hsn_code, quantity, unit_price, gst_rate, total_price,
        taxable_amount, cgst_amount, sgst_amount, igst_amount
      )
    `)
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .single()

  if (!sale) return notFound()

  const items: SaleItem[] = sale.sale_items || []

  // Determine intra/inter state
  // is_inter_state is stored on the sale row (set by create_sale RPC from customer state vs profile state)
  // Fall back to false (intra-state) if not present — safer for GST (CGST+SGST shown)
  const isInterState = Boolean(sale.is_inter_state)

  const gstBreakdown = buildGSTBreakdown(items, isInterState)

  const totalTaxable = gstBreakdown.reduce((s, r) => s + r.taxableAmount, 0)
  const totalCGST   = gstBreakdown.reduce((s, r) => s + r.cgst, 0)
  const totalSGST   = gstBreakdown.reduce((s, r) => s + r.sgst, 0)
  const totalIGST   = gstBreakdown.reduce((s, r) => s + r.igst, 0)
  const totalTax    = isInterState ? totalIGST : (totalCGST + totalSGST)
  const finalTotal  = Number(sale.final_amount)

  const displayStatus = sale.payment_status === 'paid' ? 'PAID' : 'PAYMENT PENDING'
  const isPaid = sale.payment_status === 'paid'
  const isPartialOrPending = sale.payment_status === 'partial' || sale.payment_status === 'pending'

  const dark = '#0f172a'

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: 800, margin: '0 auto', padding: '20px', background: '#f8fafc', minHeight: '100vh' }}>

      {/* Action buttons — hidden on print */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 12, justifyContent: 'flex-end' }} className="no-print">
        <button onClick={() => window.print()}
          style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
          🖨 Print / Save PDF
        </button>
        {isPartialOrPending && (
          <a href="/dashboard/sales"
            style={{ padding: '10px 20px', background: '#f59e0b', color: 'white', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            ⊕ Add Payment Tranche
          </a>
        )}
      </div>

      {/* Invoice Paper */}
      <div style={{ background: 'white', padding: 40, borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, paddingBottom: 24, borderBottom: '2px solid #e2e8f0' }}>
          <div>
            {profile?.logo_base64 && (
              <img src={`data:image/png;base64,${profile.logo_base64}`} alt="Logo"
                style={{ height: 60, marginBottom: 12, objectFit: 'contain' }} />
            )}
            <div style={{ fontSize: 22, fontWeight: 700, color: dark }}>{tenant.business_name}</div>
            {profile?.address && <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{profile.address}</div>}
            {(profile?.city || profile?.state) && (
              <div style={{ fontSize: 12, color: '#475569' }}>
                {[profile.city, profile.state, profile.pincode].filter(Boolean).join(', ')}
              </div>
            )}
            {profile?.gstin && (
              <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                GSTIN: <strong style={{ color: dark }}>{profile.gstin}</strong>
              </div>
            )}
            {tenant.phone && <div style={{ fontSize: 12, color: '#475569' }}>Ph: {tenant.phone}</div>}
            {tenant.email && <div style={{ fontSize: 12, color: '#475569' }}>{tenant.email}</div>}
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1e40af', letterSpacing: -1 }}>
              {isInterState ? 'TAX INVOICE (IGST)' : 'TAX INVOICE'}
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, color: '#64748b' }}>Invoice No.</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: dark }}>{sale.invoice_number}</div>
            </div>
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 13, color: '#64748b' }}>Date</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: dark }}>
                {new Date(sale.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
            {isInterState && (
              <div style={{ marginTop: 8, background: '#fef3c7', borderRadius: 4, padding: '4px 8px', fontSize: 11, color: '#92400e', fontWeight: 600 }}>
                INTER-STATE SUPPLY
              </div>
            )}
          </div>
        </div>

        {/* Bill To + Payment Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Bill To</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: dark }}>{sale.customer_name || 'Walk-in Customer'}</div>
            {sale.customer_address && <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{sale.customer_address}</div>}
            {sale.customer_state && <div style={{ fontSize: 12, color: '#475569' }}>State: {sale.customer_state}</div>}
            {sale.customer_gstin && <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>GSTIN: {sale.customer_gstin}</div>}
          </div>

          <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Payment Details</div>
            <div style={{ fontSize: 13, color: dark, marginBottom: 4 }}>
              Method: <strong style={{ color: dark }}>{(sale.payment_method || 'Cash').toUpperCase()}</strong>
            </div>
            <div style={{ fontSize: 13, color: dark }}>
              Status:{' '}
              <strong style={{ color: isPaid ? '#16a34a' : '#dc2626' }}>
                {displayStatus}
              </strong>
            </div>
            {isPartialOrPending && (
              <div style={{ fontSize: 11, color: '#dc2626', marginTop: 6, fontStyle: 'italic' }}>
                * Balance due — payment pending
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
          <thead>
            <tr style={{ background: '#1e293b' }}>
              {['#', 'Description', 'HSN', 'Qty', 'Rate (₹)', 'GST%', 'Amount (₹)'].map(h => (
                <th key={h} style={{
                  padding: '10px 12px',
                  textAlign: h === '#' || h === 'Qty' || h === 'GST%' ? 'center' : h === 'Rate (₹)' || h === 'Amount (₹)' ? 'right' : 'left',
                  fontSize: 11, fontWeight: 600, color: 'white', textTransform: 'uppercase', letterSpacing: '0.04em'
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 13, color: dark }}>{idx + 1}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 500, color: dark }}>{item.product_name}</td>
                <td style={{ padding: '10px 12px', fontSize: 12, color: '#64748b' }}>{item.hsn_code || '—'}</td>
                <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 13, color: dark }}>{item.quantity}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, color: dark }}>
                  {Number(item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 13, color: dark }}>{item.gst_rate || 0}%</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: dark }}>
                  {Number(item.total_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* GST Breakdown Table — required by GST Act for tax invoices */}
        {gstBreakdown.some(r => r.rate > 0) && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              GST Summary
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left', color: '#475569' }}>HSN / Rate</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right', color: '#475569' }}>Taxable Amt</th>
                  {isInterState ? (
                    <th style={{ padding: '6px 10px', textAlign: 'right', color: '#475569' }}>IGST</th>
                  ) : (
                    <>
                      <th style={{ padding: '6px 10px', textAlign: 'right', color: '#475569' }}>CGST</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right', color: '#475569' }}>SGST</th>
                    </>
                  )}
                  <th style={{ padding: '6px 10px', textAlign: 'right', color: '#475569' }}>Total Tax</th>
                </tr>
              </thead>
              <tbody>
                {gstBreakdown.filter(r => r.rate > 0).map(r => (
                  <tr key={r.rate} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px 10px', color: dark }}>
                      {r.rate}% {isInterState ? `IGST` : `(CGST ${r.rate / 2}% + SGST ${r.rate / 2}%)`}
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: dark }}>
                      ₹{r.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    {isInterState ? (
                      <td style={{ padding: '6px 10px', textAlign: 'right', color: dark }}>
                        ₹{r.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    ) : (
                      <>
                        <td style={{ padding: '6px 10px', textAlign: 'right', color: dark }}>
                          ₹{r.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', color: dark }}>
                          ₹{r.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </>
                    )}
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: dark }}>
                      ₹{(isInterState ? r.igst : r.cgst + r.sgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 28 }}>
          <div style={{ width: 300 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: dark }}>
              <span>Taxable Amount</span>
              <span>₹{totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            {Number(sale.discount_amount) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#16a34a' }}>
                <span>Discount</span>
                <span>−₹{Number(sale.discount_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            {isInterState ? (
              totalIGST > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: dark }}>
                  <span>IGST</span>
                  <span>₹{totalIGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )
            ) : (
              <>
                {totalCGST > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: dark }}>
                    <span>CGST</span>
                    <span>₹{totalCGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {totalSGST > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: dark }}>
                    <span>SGST</span>
                    <span>₹{totalSGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </>
            )}

            {totalTax === 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 12, color: '#64748b' }}>
                <span>Tax</span><span>Nil</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#1e293b', borderRadius: 8, marginTop: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>Total</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#60a5fa' }}>
                ₹{finalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Bank Details */}
        {(profile?.bank_name || profile?.account_no) && (
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16, marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Bank Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12 }}>
              {profile.bank_name && <div><span style={{ color: '#64748b' }}>Bank: </span><strong style={{ color: dark }}>{profile.bank_name}</strong></div>}
              {profile.account_no && <div><span style={{ color: '#64748b' }}>A/c: </span><strong style={{ color: dark }}>{profile.account_no}</strong></div>}
              {profile.ifsc && <div><span style={{ color: '#64748b' }}>IFSC: </span><strong style={{ color: dark }}>{profile.ifsc}</strong></div>}
            </div>
          </div>
        )}

        {/* Notes */}
        {sale.notes && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Notes:</div>
            <div style={{ fontSize: 13, color: dark }}>{sale.notes}</div>
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            This is a computer-generated invoice and does not require a signature.
            {profile?.gstin && ` · GSTIN: ${profile.gstin}`}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'right' }}>
            <div style={{ fontWeight: 600, color: dark, marginBottom: 2 }}>For {tenant.business_name}</div>
            <div>Authorised Signatory</div>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  )
}
