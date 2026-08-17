'use client'
import { useState, useEffect } from 'react'
import { Plus, ShoppingCart, FileText, Share2, ExternalLink } from 'lucide-react'
import { Modal, useToast, EmptyState, Badge } from '@/components/ui'

interface Sale { id: string; invoice_number: string; customer_name: string; final_amount: number; payment_method: string; payment_status: string; created_at: string; sale_items?: any[] }
interface Product { id: string; name: string; selling_price: number; stock_quantity: number; gst_rate: number; hsn_code?: string }
interface Customer { id: string; name: string }

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast, ToastContainer } = useToast()

  const [form, setForm] = useState({
    customer_id: '', customer_name: 'Walk-in Customer',
    payment_method: 'cash', payment_status: 'paid',
    discount_amount: 0, notes: '',
  })
  const [items, setItems] = useState([{ product_id: '', unit_price: 0, quantity: 1, gst_rate: 0, hsn_code: '' }])

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
    setForm({ customer_id: '', customer_name: 'Walk-in Customer', payment_method: 'cash', payment_status: 'paid', discount_amount: 0, notes: '' })
    setItems([{ product_id: '', unit_price: 0, quantity: 1, gst_rate: 0, hsn_code: '' }])
    setModal(true)
  }

  const selectProduct = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return
    setItems(items => items.map((item, i) => i === index ? { ...item, product_id: productId, unit_price: product.selling_price, gst_rate: product.gst_rate, hsn_code: product.hsn_code || '' } : item))
  }

  const subtotal = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0)
  const total = subtotal - Number(form.discount_amount)

  const saveSale = async () => {
    const validItems = items.filter(i => i.product_id && Number(i.quantity) > 0)
    if (!validItems.length) { toast('Add at least one item', 'error'); return }

    // Check stock
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
      body: JSON.stringify({ action: 'create', ...form, items: validItems }),
    }).then(r => r.json())
    setSaving(false)

    if (r.error) { toast(r.error, 'error'); return }
    toast(`Sale recorded! Invoice: ${r.invoice_number}`)
    setModal(false)
    loadAll()
  }

  const whatsappShare = (sale: Sale) => {
    const msg = `Invoice: ${sale.invoice_number}\nAmount: ₹${Number(sale.final_amount).toLocaleString('en-IN')}\nThank you for your purchase!`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const statusColor: any = { paid: 'green', pending: 'red', partial: 'yellow' }
  const methodColor: any = { cash: 'green', upi: 'blue', card: 'purple', credit: 'red', bank: 'slate' }

  return (
    <div className="max-w-6xl mx-auto">
      <ToastContainer />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Sales</h1>
          <p className="text-slate-400 text-sm mt-0.5">{sales.length} invoices · ₹{sales.reduce((s, x) => s + Number(x.final_amount), 0).toLocaleString('en-IN')} total</p>
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
                <td className="px-5 py-3.5 font-medium text-blue-400 text-sm">{sale.invoice_number}</td>
                <td className="px-5 py-3.5 text-white text-sm">{sale.customer_name}</td>
                <td className="px-5 py-3.5 text-slate-400 text-sm">{new Date(sale.created_at).toLocaleDateString('en-IN')}</td>
                <td className="px-5 py-3.5 font-semibold text-white text-sm">₹{Number(sale.final_amount).toLocaleString('en-IN')}</td>
                <td className="px-5 py-3.5"><Badge color={methodColor[sale.payment_method] || 'slate'}>{sale.payment_method.toUpperCase()}</Badge></td>
                <td className="px-5 py-3.5"><Badge color={statusColor[sale.payment_status] || 'slate'}>{sale.payment_status}</Badge></td>
                <td className="px-5 py-3.5">
                  <div className="flex gap-1">
                    <a href={`/dashboard/invoice/${sale.id}`} target="_blank" className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all" title="View / Print Invoice"><FileText className="w-3.5 h-3.5" /></a>
                    <button onClick={() => whatsappShare(sale)} className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-all" title="Share on WhatsApp"><Share2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Sale Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="New Sale" size="xl">
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Customer</label>
              <select value={form.customer_id} onChange={e => {
                const c = customers.find(c => c.id === e.target.value)
                setForm(f => ({ ...f, customer_id: e.target.value, customer_name: c?.name || 'Walk-in Customer' }))
              }} className="input-base">
                <option value="">Walk-in Customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Customer Name</label>
              <input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} className="input-base" placeholder="Walk-in Customer" />
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
                    <input type="number" value={item.quantity} onChange={e => setItems(i => i.map((x, j) => j === idx ? { ...x, quantity: Number(e.target.value) } : x))} className="input-base text-sm" placeholder="Qty" min={1} />
                  </div>
                  <div className="col-span-3">
                    <input type="number" value={item.unit_price} onChange={e => setItems(i => i.map((x, j) => j === idx ? { ...x, unit_price: Number(e.target.value) } : x))} className="input-base text-sm" placeholder="Price" min={0} />
                  </div>
                  <div className="col-span-1 text-right text-sm text-white font-medium">
                    ₹{(Number(item.quantity) * Number(item.unit_price)).toLocaleString('en-IN')}
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
                <option value="paid">Paid</option>
                <option value="pending">Pending (Credit)</option>
                <option value="partial">Partial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Discount (₹)</label>
              <input type="number" value={form.discount_amount} onChange={e => setForm(f => ({ ...f, discount_amount: Number(e.target.value) }))} className="input-base" min={0} />
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 flex items-center justify-between">
            <span className="text-slate-400 text-sm">Subtotal: ₹{subtotal.toLocaleString('en-IN')}</span>
            <span className="text-white font-bold text-xl">Total: ₹{total.toLocaleString('en-IN')}</span>
          </div>
        </div>
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={saveSale} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Record Sale'}</button>
        </div>
      </Modal>
    </div>
  )
}
