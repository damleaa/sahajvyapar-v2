'use client'
import { useState, useEffect } from 'react'
import { Plus, ShoppingCart, Share2, FileText, PlusCircle, X } from 'lucide-react'
import { Modal, useToast, EmptyState, Badge } from '@/components/ui'

interface Sale {
  id: string; invoice_number: string; customer_name: string
  final_amount: number; payment_method: string; payment_status: string
  created_at: string; sale_items?: any[]
}
interface Product { id: string; name: string; selling_price: number; stock_quantity: number; gst_rate: number; hsn_code?: string }
interface Customer { id: string; name: string; credit_balance: number }

// Fix (d): number input that clears zero placeholder properly
function NumInput({ value, onChange, placeholder = '0', min = 0, className = '' }: any) {
  return (
    <input
      type="number"
      value={value === 0 || value === '' || value === undefined || value === null ? '' : value}
      onChange={e => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      placeholder={placeholder}
      min={min}
      className={`input-base ${className}`}
    />
  )
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'new_sale' | 'add_payment' | null>(null)
  const [saving, setSaving] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [salePayments, setSalePayments] = useState<any[]>([])  // existing payments for selected sale
  const { toast, ToastContainer } = useToast()

  const [form, setForm] = useState({
    customer_id: '',
    customer_name: '',   // Fix: start empty, not "Walk-in Customer"
    payment_method: 'cash',
    payment_status: 'paid',
    discount_amount: 0,
    notes: '',
    partial_amount: 0,
  })
  const [items, setItems] = useState([{ product_id: '', unit_price: 0, quantity: 1, gst_rate: 0, hsn_code: '' }])
  const [payForm, setPayForm] = useState({ amount: 0, method: 'cash', note: '' })

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    const [s, p, c] = await Promise.all([
      fetch('/api/sales').then(r => r.json()),
      fetch('/api/inventory').then(r => r.json()),
      fetch('/api/customers').then(r => r.json()),
    ])
    setSales(Array.isArray(s) ? s : [])
    setProducts(Array.isArray(p) ? p : [])
    setCustomers(Array.isArray(c) ? c : [])
    setLoading(false)
  }

  const openNewSale = () => {
    setForm({
      customer_id: '',
      customer_name: '',   // Fix: blank so placeholder shows "Walk-in Customer"
      payment_method: 'cash',
      payment_status: 'paid',
      discount_amount: 0,
      notes: '',
      partial_amount: 0,
    })
    setItems([{ product_id: '', unit_price: 0, quantity: 1, gst_rate: 0, hsn_code: '' }])
    setModal('new_sale')
  }

  const selectProduct = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return
    setItems(items => items.map((item, i) => i === index
      ? { ...item, product_id: productId, unit_price: product.selling_price, gst_rate: product.gst_rate, hsn_code: product.hsn_code || '' }
      : item
    ))
  }

  const subtotal = items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unit_price || 0), 0)
  const total = subtotal - Number(form.discount_amount || 0)
  const balanceDue = form.payment_status === 'partial' ? Math.max(0, total - Number(form.partial_amount || 0)) : 0

  const saveSale = async () => {
    const validItems = items.filter(i => i.product_id && Number(i.quantity) > 0)
    if (!validItems.length) { toast('Add at least one item', 'error'); return }

    if (form.payment_status === 'partial' && Number(form.partial_amount) <= 0) {
      toast('Enter amount paid in first tranche', 'error'); return
    }
    if (form.payment_status === 'partial' && Number(form.partial_amount) >= total) {
      toast('Partial amount cannot be equal to or more than total — use "Paid in full" instead', 'error'); return
    }

    for (const item of validItems) {
      const product = products.find(p => p.id === item.product_id)
      if (product && product.stock_quantity < Number(item.quantity)) {
        toast(`Insufficient stock for ${product.name}. Available: ${product.stock_quantity}`, 'error')
        return
      }
    }

    setSaving(true)
    const r = await fetch('/api/sales', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        ...form,
        customer_name: form.customer_name || 'Walk-in Customer',
        items: validItems,
      }),
    }).then(r => r.json())
    setSaving(false)

    if (r.error) { toast(r.error, 'error'); return }
    toast(`Sale recorded! Invoice: ${r.invoice_number}`)
    setModal(null)
    loadAll()
  }

  // Open payment modal and load existing payments for this sale
  const openPaymentModal = async (sale: Sale) => {
    setSelectedSale(sale)
    setPayForm({ amount: 0, method: 'cash', note: '' })
    // Load existing payments
    const r = await fetch(`/api/sales?payments_for=${sale.id}`).then(r => r.json())
    setSalePayments(Array.isArray(r.payments) ? r.payments : [])
    setModal('add_payment')
  }

  const recordPayment = async () => {
    if (!payForm.amount || Number(payForm.amount) <= 0) { toast('Enter valid amount', 'error'); return }
    if (!selectedSale) return

    setSaving(true)
    const r = await fetch('/api/sales', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'record_payment',
        sale_id: selectedSale.id,
        amount: Number(payForm.amount),
        method: payForm.method,
        note: payForm.note,
      }),
    }).then(r => r.json())
    setSaving(false)

    if (r.error) { toast(r.error, 'error'); return }
    toast(r.new_status === 'paid' ? '✓ Invoice fully paid!' : 'Payment tranche recorded!')
    setModal(null)
    loadAll()
  }

  const whatsappShare = (sale: Sale) => {
    const msg = `Invoice: ${sale.invoice_number}\nAmount: ₹${Number(sale.final_amount).toLocaleString('en-IN')}\nThank you for your purchase!`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const statusColor: any = { paid: 'green', pending: 'red', partial: 'yellow' }
  const methodColor: any = { cash: 'green', upi: 'blue', card: 'purple', credit: 'red', bank: 'slate' }

  // Total collected so far for the selected sale
  const totalCollected = salePayments.reduce((s, p) => s + Number(p.amount), 0)
  const remainingBalance = selectedSale ? Math.max(0, Number(selectedSale.final_amount) - totalCollected) : 0

  return (
    <div className="max-w-6xl mx-auto">
      <ToastContainer />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Sales</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {sales.length} invoices · ₹{sales.reduce((s, x) => s + Number(x.final_amount), 0).toLocaleString('en-IN')} total
          </p>
        </div>
        <button onClick={openNewSale} className="btn-primary"><Plus className="w-4 h-4" /> New Sale</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              {['Invoice', 'Customer', 'Date', 'Amount', 'Method', 'Status', ''].map(h => (
                <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-500">Loading...</td></tr>
            ) : sales.length === 0 ? (
              <tr><td colSpan={7}><EmptyState icon={<ShoppingCart className="w-6 h-6" />} title="No sales yet" description="Record your first sale to get started" action={<button onClick={openNewSale} className="btn-primary">New Sale</button>} /></td></tr>
            ) : sales.map(sale => (
              <tr key={sale.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-5 py-3.5">
                  <a href={`/dashboard/invoice/${sale.id}`} target="_blank" rel="noopener noreferrer"
                    className="font-medium text-blue-400 text-sm hover:text-blue-300 flex items-center gap-1">
                    {sale.invoice_number} <FileText className="w-3 h-3 opacity-60" />
                  </a>
                </td>
                <td className="px-5 py-3.5 text-white text-sm">{sale.customer_name}</td>
                <td className="px-5 py-3.5 text-slate-400 text-sm">{new Date(sale.created_at).toLocaleDateString('en-IN')}</td>
                <td className="px-5 py-3.5 font-semibold text-white text-sm">₹{Number(sale.final_amount).toLocaleString('en-IN')}</td>
                <td className="px-5 py-3.5"><Badge color={methodColor[sale.payment_method] || 'slate'}>{sale.payment_method.toUpperCase()}</Badge></td>
                <td className="px-5 py-3.5"><Badge color={statusColor[sale.payment_status] || 'slate'}>{sale.payment_status}</Badge></td>
                <td className="px-5 py-3.5">
                  <div className="flex gap-1 items-center">
                    <button onClick={() => whatsappShare(sale)} className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-all" title="Share on WhatsApp">
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    {(sale.payment_status === 'pending' || sale.payment_status === 'partial') && (
                      <button
                        onClick={() => openPaymentModal(sale)}
                        className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                        title="Add payment tranche"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── New Sale Modal ────────────────────────────────────── */}
      <Modal open={modal === 'new_sale'} onClose={() => setModal(null)} title="New Sale" size="xl">
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Customer (optional)</label>
              <select
                value={form.customer_id}
                onChange={e => {
                  const c = customers.find(c => c.id === e.target.value)
                  setForm(f => ({
                    ...f,
                    customer_id: e.target.value,
                    // Fix: replace the name fully, don't append
                    customer_name: c?.name || '',
                  }))
                }}
                className="input-base"
              >
                <option value="">Walk-in Customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Customer Name</label>
              <input
                value={form.customer_name}
                onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                className="input-base"
                placeholder="Walk-in Customer"   // Fix: shows as placeholder, not value
              />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">Items *</label>
              <button onClick={() => setItems(i => [...i, { product_id: '', unit_price: 0, quantity: 1, gst_rate: 0, hsn_code: '' }])} className="text-xs text-blue-400 hover:text-blue-300">+ Add Item</button>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <select value={item.product_id} onChange={e => selectProduct(idx, e.target.value)} className="input-base text-sm">
                      <option value="">Select product</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} (₹{p.selling_price}) — {p.stock_quantity} left</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <NumInput value={item.quantity} onChange={(v: any) => setItems(i => i.map((x, j) => j === idx ? { ...x, quantity: v || 1 } : x))} placeholder="Qty" min={1} />
                  </div>
                  <div className="col-span-3">
                    {/* Fix: price clears properly */}
                    <NumInput value={item.unit_price} onChange={(v: any) => setItems(i => i.map((x, j) => j === idx ? { ...x, unit_price: v } : x))} placeholder="Price" />
                  </div>
                  <div className="col-span-1 text-right text-sm text-white font-medium">
                    ₹{(Number(item.quantity || 0) * Number(item.unit_price || 0)).toLocaleString('en-IN')}
                  </div>
                  <div className="col-span-1 text-right">
                    {items.length > 1 && <button onClick={() => setItems(i => i.filter((_, j) => j !== idx))} className="text-red-400 hover:text-red-300 text-lg leading-none">×</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Payment Method</label>
              <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} className="input-base">
                {['cash', 'upi', 'card', 'credit', 'bank'].map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Payment Status</label>
              <select value={form.payment_status} onChange={e => setForm(f => ({ ...f, payment_status: e.target.value }))} className="input-base">
                <option value="paid">Paid in full</option>
                <option value="pending">Pending / Credit</option>
                <option value="partial">Partial payment</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Discount (₹)</label>
              <NumInput value={form.discount_amount} onChange={(v: any) => setForm(f => ({ ...f, discount_amount: v }))} />
            </div>
          </div>

          {/* Partial payment — first tranche */}
          {form.payment_status === 'partial' && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-3">
              <div className="text-amber-400 text-sm font-medium">Partial Payment — Tranche 1</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Amount Paid Now (₹) *</label>
                  <NumInput value={form.partial_amount} onChange={(v: any) => setForm(f => ({ ...f, partial_amount: v }))} placeholder="Enter amount received" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Balance Remaining (₹)</label>
                  <div className="input-base bg-slate-900 text-red-400 font-semibold cursor-default">
                    ₹{balanceDue.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
              <p className="text-xs text-amber-400/70">
                More tranches can be added from the Sales list after saving — click the <span className="font-bold">⊕</span> icon on this invoice row.
              </p>
            </div>
          )}

          <div className="bg-slate-800/50 rounded-xl p-4 flex items-center justify-between">
            <div className="text-slate-400 text-sm">
              Subtotal: ₹{subtotal.toLocaleString('en-IN')}
              {Number(form.discount_amount) > 0 && <span className="text-green-400 ml-2">− ₹{Number(form.discount_amount).toLocaleString('en-IN')}</span>}
            </div>
            <span className="text-white font-bold text-xl">Total: ₹{total.toLocaleString('en-IN')}</span>
          </div>
        </div>
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          <button onClick={saveSale} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Record Sale'}</button>
        </div>
      </Modal>

      {/* ── Add Payment Tranche Modal ─────────────────────────── */}
      <Modal open={modal === 'add_payment'} onClose={() => setModal(null)} title={`Record Payment — ${selectedSale?.invoice_number}`} size="sm">
        <div className="p-6 space-y-4">

          {/* Invoice summary */}
          <div className="bg-slate-800/50 rounded-xl p-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Customer</span>
              <span className="text-white font-medium">{selectedSale?.customer_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Invoice Total</span>
              <span className="text-white font-medium">₹{Number(selectedSale?.final_amount || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Already Collected</span>
              <span className="text-green-400 font-medium">₹{totalCollected.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-slate-700 pt-2 mt-2">
              <span className="text-slate-300 font-medium">Balance Due</span>
              <span className="text-red-400 font-bold text-base">₹{remainingBalance.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Existing tranches */}
          {salePayments.length > 0 && (
            <div>
              <div className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Payment History</div>
              <div className="space-y-1.5">
                {salePayments.map((p, i) => (
                  <div key={p.id || i} className="flex items-center justify-between bg-slate-800/30 rounded-lg px-3 py-2">
                    <div>
                      <span className="text-xs text-slate-400">Tranche {i + 1}</span>
                      {p.note && <span className="text-xs text-slate-500 ml-2">· {p.note}</span>}
                    </div>
                    <div className="text-right">
                      <span className="text-green-400 text-sm font-medium">₹{Number(p.amount).toLocaleString('en-IN')}</span>
                      <span className="text-slate-500 text-xs ml-1.5">{p.payment_method?.toUpperCase()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New tranche */}
          <div className="space-y-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              New Payment (Tranche {salePayments.length + 1})
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Amount (₹) *</label>
              <NumInput
                value={payForm.amount}
                onChange={(v: any) => setPayForm(f => ({ ...f, amount: Math.min(v, remainingBalance) }))}
                placeholder={`Max ₹${remainingBalance.toLocaleString('en-IN')}`}
              />
              {Number(payForm.amount) > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  Balance after this: ₹{Math.max(0, remainingBalance - Number(payForm.amount)).toLocaleString('en-IN')}
                  {Number(payForm.amount) >= remainingBalance && <span className="text-green-400 ml-1">· Invoice fully paid ✓</span>}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Payment Method</label>
              <select value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))} className="input-base">
                {['cash', 'upi', 'card', 'bank'].map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Reference / Note</label>
              <input value={payForm.note} onChange={e => setPayForm(f => ({ ...f, note: e.target.value }))} className="input-base" placeholder="e.g. UPI ref: XXXX" />
            </div>
          </div>
        </div>
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          <button onClick={recordPayment} disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : `Record ₹${Number(payForm.amount || 0).toLocaleString('en-IN')}`}
          </button>
        </div>
      </Modal>
    </div>
  )
}
