'use client'

import { useEffect, useState, useCallback } from 'react'
import { Modal } from '@/components/ui'
import NumInput from '@/components/NumInput'

/* ── types ────────────────────────────────────────────────── */
interface Product { id: string; name: string; selling_price: number; stock_quantity: number; gst_rate: number }
interface Customer { id: string; name: string; phone?: string; credit_balance?: number }
interface Exhibition { id: string; name: string; status: string; start_date: string; end_date: string }

interface SaleItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  gst_rate: number
  discount: number
}

interface SalePayment { id: string; amount: number; payment_method: string; note?: string; created_at: string }

interface Sale {
  id: string
  invoice_number: string
  customer_name: string
  customer_phone: string
  items: SaleItem[]
  subtotal: number
  gst_amount: number
  discount_amount: number
  final_amount: number
  amount_paid: number
  payment_method: string
  status: string
  notes: string
  created_at: string
  exhibition_id?: string
  exhibition_name?: string
}

const EMPTY_FORM = {
  customer_id: '',
  customer_name: '',
  customer_phone: '',
  items: [] as SaleItem[],
  discount_amount: 0,
  payment_method: 'cash',
  amount_paid: 0,
  notes: '',
  exhibition_id: '',
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [salePayments, setSalePayments] = useState<SalePayment[]>([])
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  // payment tranche form
  const [payForm, setPayForm] = useState({ amount: 0, payment_method: 'cash', note: '' })
  const [payingSaving, setPayingSaving] = useState(false)

  /* ── fetch all data ───────────────────────────────────────── */
  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [salesRes, productsRes, customersRes, exhibitionsRes] = await Promise.all([
      fetch('/api/sales'),
      fetch('/api/products'),
      fetch('/api/customers'),
      fetch('/api/exhibitions'),
    ])
    const [salesData, productsData, customersData, exhibitionsData] = await Promise.all([
      salesRes.json(),
      productsRes.json(),
      customersRes.json(),
      exhibitionsRes.json(),
    ])
    setSales(salesData.sales || [])
    setProducts(productsData.products || [])
    setCustomers(customersData.customers || [])
    // Only show active / upcoming exhibitions in dropdown
    const activeExhibitions = (exhibitionsData.exhibitions || []).filter(
      (e: Exhibition) => e.status === 'active' || e.status === 'completed'
    )
    setExhibitions(activeExhibitions)
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  /* ── computed totals ──────────────────────────────────────── */
  const subtotal = form.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const gstAmount = form.items.reduce((s, i) => s + (i.quantity * i.unit_price * i.gst_rate) / 100, 0)
  const finalAmount = subtotal + gstAmount - (form.discount_amount || 0)
  const balance = finalAmount - (form.amount_paid || 0)

  /* ── add item row ─────────────────────────────────────────── */
  function addItem() {
    setForm(f => ({
      ...f,
      items: [...f.items, { product_id: '', product_name: '', quantity: 1, unit_price: 0, gst_rate: 0, discount: 0 }],
    }))
  }

  function removeItem(idx: number) {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  }

  function updateItem(idx: number, field: string, value: string | number) {
    setForm(f => {
      const items = [...f.items]
      if (field === 'product_id') {
        const prod = products.find(p => p.id === value)
        items[idx] = {
          ...items[idx],
          product_id: String(value),
          product_name: prod?.name || '',
          unit_price: prod?.selling_price || 0,
          gst_rate: prod?.gst_rate || 0,
        }
      } else {
        items[idx] = { ...items[idx], [field]: value }
      }
      return { ...f, items }
    })
  }

  /* ── save sale ────────────────────────────────────────────── */
  async function saveSale() {
    if (form.items.length === 0) return alert('Add at least one item')
    setSaving(true)
    const body = {
      action: 'create',
      ...form,
      subtotal,
      gst_amount: gstAmount,
      final_amount: finalAmount,
      exhibition_id: form.exhibition_id || null,
    }
    const res = await fetch('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    setSaving(false)
    if (data.error) return alert(data.error)
    setShowModal(false)
    setForm({ ...EMPTY_FORM })
    fetchAll()
  }

  /* ── open payment tranche modal ───────────────────────────── */
  async function openPaymentModal(sale: Sale) {
    setSelectedSale(sale)
    setPayForm({ amount: 0, payment_method: 'cash', note: '' })
    const res = await fetch(`/api/sales?payments_for=${sale.id}`)
    const data = await res.json()
    setSalePayments(data.payments || [])
    setShowPaymentModal(true)
  }

  /* ── record payment tranche ───────────────────────────────── */
  async function recordPayment() {
    if (!selectedSale || !payForm.amount) return
    setPayingSaving(true)
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'record_payment', sale_id: selectedSale.id, ...payForm }),
    })
    const data = await res.json()
    setPayingSaving(false)
    if (data.error) return alert(data.error)
    // reload payments
    const res2 = await fetch(`/api/sales?payments_for=${selectedSale.id}`)
    const d2 = await res2.json()
    setSalePayments(d2.payments || [])
    setPayForm({ amount: 0, payment_method: 'cash', note: '' })
    fetchAll()
  }

  /* ── whatsapp share ───────────────────────────────────────── */
  function shareWhatsApp(sale: Sale) {
    const msg = `Invoice ${sale.invoice_number}\nAmount: ₹${sale.final_amount}\nPaid: ₹${sale.amount_paid}\nBalance: ₹${sale.final_amount - sale.amount_paid}\nView: ${window.location.origin}/dashboard/invoice/${sale.id}`
    window.open(`https://wa.me/${sale.customer_phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  /* ── filtered sales ───────────────────────────────────────── */
  const filtered = sales.filter(s =>
    s.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    s.invoice_number.toLowerCase().includes(search.toLowerCase())
  )

  /* ── status badge ─────────────────────────────────────────── */
  function statusBadge(status: string) {
    if (status === 'paid') return <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-900 text-green-300">PAID</span>
    if (status === 'partial') return <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-900 text-amber-300">PARTIAL</span>
    return <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-900 text-red-300">PENDING</span>
  }

  /* ── render ───────────────────────────────────────────────── */
  return (
    <div className="p-6 space-y-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sales</h1>
          <p className="text-slate-400 text-sm mt-1">Record sales & generate GST invoices</p>
        </div>
        <button onClick={() => { setForm({ ...EMPTY_FORM }); setShowModal(true) }} className="btn-primary">
          + New Sale
        </button>
      </div>

      {/* search */}
      <input
        className="input-base w-full max-w-sm"
        placeholder="Search by customer or invoice..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* sales table */}
      {loading ? (
        <div className="text-slate-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12 text-slate-400">No sales yet. Click + New Sale to get started.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400">
                <th className="text-left pb-3 pr-4">Invoice</th>
                <th className="text-left pb-3 pr-4">Customer</th>
                <th className="text-left pb-3 pr-4">Exhibition</th>
                <th className="text-right pb-3 pr-4">Amount</th>
                <th className="text-right pb-3 pr-4">Paid</th>
                <th className="text-left pb-3 pr-4">Status</th>
                <th className="text-left pb-3 pr-4">Date</th>
                <th className="text-left pb-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filtered.map(sale => (
                <tr key={sale.id} className="hover:bg-slate-700/20">
                  <td className="py-3 pr-4 text-blue-400 font-mono text-xs">{sale.invoice_number}</td>
                  <td className="py-3 pr-4 text-white">
                    <div>{sale.customer_name || 'Walk-in Customer'}</div>
                    {sale.customer_phone && <div className="text-slate-400 text-xs">{sale.customer_phone}</div>}
                  </td>
                  <td className="py-3 pr-4">
                    {sale.exhibition_name ? (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-900 text-purple-300">
                        🏪 {sale.exhibition_name}
                      </span>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right text-white font-medium">₹{sale.final_amount?.toFixed(2)}</td>
                  <td className="py-3 pr-4 text-right text-slate-300">₹{sale.amount_paid?.toFixed(2)}</td>
                  <td className="py-3 pr-4">{statusBadge(sale.status)}</td>
                  <td className="py-3 pr-4 text-slate-400 text-xs">
                    {new Date(sale.created_at).toLocaleDateString('en-IN')}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <a href={`/dashboard/invoice/${sale.id}`} target="_blank" rel="noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300">Invoice</a>
                      {(sale.status === 'partial' || sale.status === 'pending') && (
                        <button onClick={() => openPaymentModal(sale)}
                          className="text-xs text-amber-400 hover:text-amber-300">+ Pay</button>
                      )}
                      {sale.customer_phone && (
                        <button onClick={() => shareWhatsApp(sale)}
                          className="text-xs text-green-400 hover:text-green-300">WA</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── NEW SALE MODAL ──────────────────────────────────────── */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Sale" allowBackdropClose={false}>
        <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">

          {/* Customer */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-base">Customer</label>
              <select
                className="input-base"
                value={form.customer_id}
                onChange={e => {
                  const c = customers.find(c => c.id === e.target.value)
                  setForm(f => ({ ...f, customer_id: e.target.value, customer_name: c?.name || '', customer_phone: c?.phone || '' }))
                }}
              >
                <option value="">Walk-in Customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label-base">Customer Name</label>
              <input className="input-base" placeholder="Walk-in Customer" value={form.customer_name}
                onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="label-base">Phone</label>
            <input className="input-base" placeholder="9876543210" value={form.customer_phone}
              onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} />
          </div>

          {/* Exhibition (optional) */}
          {exhibitions.length > 0 && (
            <div>
              <label className="label-base">Exhibition (optional)</label>
              <select
                className="input-base"
                value={form.exhibition_id}
                onChange={e => setForm(f => ({ ...f, exhibition_id: e.target.value }))}
              >
                <option value="">— Regular Sale (no exhibition) —</option>
                {exhibitions.map(ex => (
                  <option key={ex.id} value={ex.id}>
                    🏪 {ex.name} ({ex.status})
                  </option>
                ))}
              </select>
              {form.exhibition_id && (
                <p className="text-xs text-purple-400 mt-1">
                  ✓ This sale's amount will auto-reflect in the exhibition's P&L
                </p>
              )}
            </div>
          )}

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label-base">Items</label>
              <button onClick={addItem} className="text-xs text-blue-400 hover:text-blue-300">+ Add Item</button>
            </div>
            {form.items.length === 0 && (
              <div className="text-slate-500 text-sm text-center py-3 border border-dashed border-slate-700 rounded-lg">
                No items added yet
              </div>
            )}
            {form.items.map((item, idx) => (
              <div key={idx} className="bg-slate-800 rounded-lg p-3 mb-2 space-y-2">
                <div className="flex items-start gap-2">
                  <select
                    className="input-base flex-1"
                    value={item.product_id}
                    onChange={e => updateItem(idx, 'product_id', e.target.value)}
                  >
                    <option value="">Select product</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (₹{p.selling_price})</option>)}
                  </select>
                  <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-300 text-lg leading-none mt-2">×</button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="label-base text-xs">Qty</label>
                    <NumInput value={item.quantity} onChange={v => updateItem(idx, 'quantity', v)} min={1} placeholder="1" />
                  </div>
                  <div>
                    <label className="label-base text-xs">Unit Price</label>
                    <NumInput value={item.unit_price} onChange={v => updateItem(idx, 'unit_price', v)} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="label-base text-xs">GST %</label>
                    <NumInput value={item.gst_rate} onChange={v => updateItem(idx, 'gst_rate', v)} placeholder="0" />
                  </div>
                </div>
                <div className="text-right text-slate-300 text-xs">
                  Line total: ₹{(item.quantity * item.unit_price * (1 + item.gst_rate / 100)).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Discount */}
          <div>
            <label className="label-base">Discount (₹)</label>
            <NumInput value={form.discount_amount} onChange={v => setForm(f => ({ ...f, discount_amount: v }))} placeholder="0" />
          </div>

          {/* Totals */}
          {form.items.length > 0 && (
            <div className="bg-slate-800 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>GST</span><span>₹{gstAmount.toFixed(2)}</span>
              </div>
              {(form.discount_amount || 0) > 0 && (
                <div className="flex justify-between text-red-400">
                  <span>Discount</span><span>-₹{(form.discount_amount || 0).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-white font-semibold border-t border-slate-700 pt-1 mt-1">
                <span>Total</span><span>₹{finalAmount.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Payment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-base">Payment Method</label>
              <select className="input-base" value={form.payment_method}
                onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="credit">Customer Credit</option>
              </select>
            </div>
            <div>
              <label className="label-base">Amount Paid (₹)</label>
              <NumInput value={form.amount_paid} onChange={v => setForm(f => ({ ...f, amount_paid: v }))} placeholder="0.00" />
            </div>
          </div>

          {form.items.length > 0 && balance > 0 && (
            <div className="text-amber-400 text-sm">
              Balance pending: ₹{balance.toFixed(2)} — will be saved as partial payment
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="label-base">Notes</label>
            <textarea className="input-base" rows={2} placeholder="Any notes..."
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={saveSale} disabled={saving || form.items.length === 0} className="btn-primary flex-1 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Sale'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── PAYMENT TRANCHE MODAL ──────────────────────────────── */}
      <Modal open={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Add Payment" allowBackdropClose={false}>
        {selectedSale && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Invoice</span>
                <span className="text-white font-mono">{selectedSale.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total</span>
                <span className="text-white">₹{selectedSale.final_amount?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Paid so far</span>
                <span className="text-green-400">₹{selectedSale.amount_paid?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-700 pt-1">
                <span className="text-slate-400">Balance</span>
                <span className="text-amber-400 font-semibold">
                  ₹{(selectedSale.final_amount - selectedSale.amount_paid).toFixed(2)}
                </span>
              </div>
            </div>

            {salePayments.length > 0 && (
              <div>
                <p className="label-base mb-2">Payment history</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {salePayments.map(p => (
                    <div key={p.id} className="flex justify-between text-xs bg-slate-800 rounded px-3 py-2">
                      <span className="text-slate-400">{new Date(p.created_at).toLocaleDateString('en-IN')} · {p.payment_method}</span>
                      <span className="text-green-400">+₹{p.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-base">Amount (₹)</label>
                <NumInput value={payForm.amount} onChange={v => setPayForm(f => ({ ...f, amount: v }))} placeholder="0.00" />
              </div>
              <div>
                <label className="label-base">Method</label>
                <select className="input-base" value={payForm.payment_method}
                  onChange={e => setPayForm(f => ({ ...f, payment_method: e.target.value }))}>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label-base">Note (optional)</label>
              <input className="input-base" placeholder="e.g. UPI reference" value={payForm.note}
                onChange={e => setPayForm(f => ({ ...f, note: e.target.value }))} />
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowPaymentModal(false)} className="btn-secondary flex-1">Close</button>
              <button onClick={recordPayment} disabled={payingSaving || !payForm.amount} className="btn-primary flex-1 disabled:opacity-50">
                {payingSaving ? 'Saving...' : 'Record Payment'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
