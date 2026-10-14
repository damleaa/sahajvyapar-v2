'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui'

interface Product {
  id: string
  name: string
  selling_price: number
  stock_quantity: number
  unit: string
  gst_rate: number
}

interface Customer {
  id: string
  name: string
  phone?: string
}

interface Exhibition {
  id: string
  name: string
  status: string
  start_date: string
  end_date: string
}

interface SaleItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  gst_rate: number
  total: number
}

interface Sale {
  id: string
  sale_date: string
  customer_id?: string
  customer_name?: string
  exhibition_id?: string
  exhibition_name?: string
  items: SaleItem[]
  subtotal: number
  gst_amount: number
  final_amount: number
  payment_method: string
  status: string
  notes?: string
  created_at: string
}

const PAYMENT_METHODS = ['cash', 'upi', 'card', 'bank_transfer', 'credit']

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [customersLocked, setCustomersLocked] = useState(false)

  // Form state
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0])
  const [customerId, setCustomerId] = useState('')
  const [exhibitionId, setExhibitionId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<SaleItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState('')
  const [qty, setQty] = useState(1)

  // Filter state
  const [filterExhibition, setFilterExhibition] = useState('')
  const [filterPayment, setFilterPayment] = useState('')
  const [filterDate, setFilterDate] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    try {
      const [salesRes, productsRes, customersRes, exhibitionsRes] = await Promise.all([
        fetch('/api/sales'),
        fetch('/api/inventory'),
        fetch('/api/customers'),
        fetch('/api/exhibitions'),
      ])

      // Sales: plain array
      const salesData = await salesRes.json()
      setSales(Array.isArray(salesData) ? salesData : [])

      // Inventory: plain array
      const productsData = await productsRes.json()
      setProducts(Array.isArray(productsData) ? productsData : [])

      // Customers: plain array OR { locked: true } for starter plan
      const customersData = await customersRes.json()
      if (customersData && customersData.locked) {
        setCustomersLocked(true)
        setCustomers([])
      } else {
        setCustomers(Array.isArray(customersData) ? customersData : [])
      }

      // Exhibitions: { exhibitions: [...] } — active + completed only (not upcoming)
      const exhibitionsData = await exhibitionsRes.json()
      const allExhibitions: Exhibition[] = Array.isArray(exhibitionsData)
        ? exhibitionsData
        : (exhibitionsData.exhibitions || [])
      setExhibitions(allExhibitions.filter(
        (e: Exhibition) => e.status === 'active' || e.status === 'completed'
      ))
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  function openModal() {
    setSaleDate(new Date().toISOString().split('T')[0])
    setCustomerId('')
    setExhibitionId('')
    setPaymentMethod('cash')
    setNotes('')
    setItems([])
    setSelectedProduct('')
    setQty(1)
    setError('')
    setShowModal(true)
  }

  function addItem() {
    const product = products.find(p => p.id === selectedProduct)
    if (!product) return
    const existing = items.find(i => i.product_id === selectedProduct)
    if (existing) {
      setItems(items.map(i =>
        i.product_id === selectedProduct
          ? { ...i, quantity: i.quantity + qty, total: (i.quantity + qty) * i.unit_price }
          : i
      ))
    } else {
      setItems([...items, {
        product_id: product.id,
        product_name: product.name,
        quantity: qty,
        unit_price: product.selling_price,
        gst_rate: product.gst_rate || 0,
        total: qty * product.selling_price,
      }])
    }
    setSelectedProduct('')
    setQty(1)
  }

  function removeItem(productId: string) {
    setItems(items.filter(i => i.product_id !== productId))
  }

  function updateItemQty(productId: string, newQty: number) {
    if (newQty <= 0) { removeItem(productId); return }
    setItems(items.map(i =>
      i.product_id === productId
        ? { ...i, quantity: newQty, total: newQty * i.unit_price }
        : i
    ))
  }

  const subtotal = items.reduce((s, i) => s + i.total, 0)
  const gstAmount = items.reduce((s, i) => s + (i.total * i.gst_rate / 100), 0)
  const finalAmount = subtotal + gstAmount

  async function saveSale() {
    if (items.length === 0) { setError('Add at least one item'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          sale_date: saleDate,
          customer_id: customerId || null,
          exhibition_id: exhibitionId || null,
          items,
          subtotal,
          gst_amount: gstAmount,
          final_amount: finalAmount,
          payment_method: paymentMethod,
          notes: notes || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to save'); return }
      setShowModal(false)
      fetchAll()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const filteredSales = sales.filter(s => {
    if (filterExhibition && s.exhibition_id !== filterExhibition) return false
    if (filterPayment && s.payment_method !== filterPayment) return false
    if (filterDate && s.sale_date !== filterDate) return false
    return true
  })

  const totalRevenue = filteredSales.reduce((s, sale) => s + (sale.final_amount || 0), 0)

  if (loading) {
    return <div className="p-6 text-slate-400">Loading...</div>
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sales</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {filteredSales.length} sale{filteredSales.length !== 1 ? 's' : ''} · ₹{totalRevenue.toLocaleString('en-IN')} total
          </p>
        </div>
        <button onClick={openModal} className="btn-primary">+ New Sale</button>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap gap-3 px-4 py-3 items-center">
        {exhibitions.length > 0 && (
          <select
            value={filterExhibition}
            onChange={e => setFilterExhibition(e.target.value)}
            className="input-base text-sm py-1.5 w-auto"
          >
            <option value="">All Exhibitions</option>
            {exhibitions.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        )}
        <select
          value={filterPayment}
          onChange={e => setFilterPayment(e.target.value)}
          className="input-base text-sm py-1.5 w-auto"
        >
          <option value="">All Payments</option>
          {PAYMENT_METHODS.map(m => (
            <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1).replace('_', ' ')}</option>
          ))}
        </select>
        <input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="input-base text-sm py-1.5 w-auto"
        />
        {(filterExhibition || filterPayment || filterDate) && (
          <button
            onClick={() => { setFilterExhibition(''); setFilterPayment(''); setFilterDate('') }}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Clear
          </button>
        )}
      </div>

      {/* Sales Table */}
      {filteredSales.length === 0 ? (
        <div className="card text-center py-12 text-slate-400">
          No sales yet. Click "New Sale" to record your first sale.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                {['Date', 'Customer', 'Exhibition', 'Items', 'Payment', 'Amount'].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider last:text-right">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredSales.map(sale => (
                <tr key={sale.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3.5 text-slate-300 text-sm">
                    {new Date(sale.sale_date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-5 py-3.5 text-slate-300 text-sm">
                    {sale.customer_name || <span className="text-slate-500 italic">Walk-in</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    {sale.exhibition_name
                      ? <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-900 text-purple-300">{sale.exhibition_name}</span>
                      : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 text-sm">
                    {Array.isArray(sale.items) ? sale.items.length : 0} item{Array.isArray(sale.items) && sale.items.length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 text-sm capitalize">
                    {sale.payment_method?.replace('_', ' ')}
                  </td>
                  <td className="px-5 py-3.5 text-right text-white font-semibold text-sm">
                    ₹{Number(sale.final_amount || 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Sale Modal — uses app Modal component, matches inventory/exhibitions style */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="New Sale"
        allowBackdropClose={false}
      >
        {/* Modal body — scrollable, footer fixed inside Modal */}
        <div className="p-6 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 130px)' }}>

          {/* Date + Payment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-base">Sale Date</label>
              <input
                type="date"
                value={saleDate}
                onChange={e => setSaleDate(e.target.value)}
                className="input-base"
              />
            </div>
            <div>
              <label className="label-base">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="input-base"
              >
                {PAYMENT_METHODS.map(m => (
                  <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1).replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Customer */}
          {!customersLocked && (
            <div>
              <label className="label-base">Customer <span className="text-slate-500 font-normal">(optional)</span></label>
              <select
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
                className="input-base"
              >
                <option value="">Walk-in customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</option>
                ))}
              </select>
            </div>
          )}

          {/* Exhibition — only if active/completed exhibitions exist */}
          {exhibitions.length > 0 && (
            <div>
              <label className="label-base">Link to Exhibition <span className="text-slate-500 font-normal">(optional)</span></label>
              <select
                value={exhibitionId}
                onChange={e => setExhibitionId(e.target.value)}
                className="input-base"
              >
                <option value="">No exhibition</option>
                {exhibitions.map(e => (
                  <option key={e.id} value={e.id}>{e.name} ({e.status})</option>
                ))}
              </select>
              {exhibitionId && (
                <p className="mt-1 text-xs text-purple-400">
                  ✓ This sale's amount will auto-reflect in the exhibition's P&L
                </p>
              )}
            </div>
          )}

          {/* Add Items */}
          <div>
            <label className="label-base">Add Items</label>
            <div className="flex gap-2">
              <select
                value={selectedProduct}
                onChange={e => setSelectedProduct(e.target.value)}
                className="input-base flex-1"
              >
                <option value="">Select product...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ₹{p.selling_price} (stock: {p.stock_quantity})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={e => setQty(Number(e.target.value))}
                className="input-base w-16 text-center px-2"
              />
              <button
                onClick={addItem}
                disabled={!selectedProduct}
                className="btn-primary disabled:opacity-40 whitespace-nowrap"
              >
                Add
              </button>
            </div>
          </div>

          {/* Items table */}
          {items.length > 0 && (
            <div className="rounded-lg overflow-hidden border border-slate-700">
              <table className="w-full text-sm">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Product</th>
                    <th className="text-center px-2 py-2 text-xs font-semibold text-slate-500 uppercase">Qty</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Price</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Total</th>
                    <th className="w-6 px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {items.map(item => (
                    <tr key={item.product_id} className="bg-slate-900/50">
                      <td className="px-3 py-2 text-slate-200">{item.product_name}</td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={e => updateItemQty(item.product_id, Number(e.target.value))}
                          className="w-12 bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-center text-sm text-white"
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-slate-400">₹{item.unit_price}</td>
                      <td className="px-3 py-2 text-right text-white font-medium">₹{item.total.toLocaleString('en-IN')}</td>
                      <td className="px-2 py-2 text-center">
                        <button onClick={() => removeItem(item.product_id)} className="text-red-500 hover:text-red-400 text-xs">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bg-slate-800 border-t border-slate-700 px-3 py-2 space-y-0.5">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Subtotal</span><span>₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                {gstAmount > 0 && (
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>GST</span><span>₹{gstAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold text-white pt-1 border-t border-slate-700 mt-1">
                  <span>Total</span><span>₹{finalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="label-base">Notes <span className="text-slate-500 font-normal">(optional)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Any additional notes..."
              className="input-base resize-none"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Fixed footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
          <div className="text-sm text-slate-400">
            {items.length > 0 && (
              <span className="font-semibold text-white">
                ₹{finalAmount.toLocaleString('en-IN')} · {items.length} item{items.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowModal(false)} disabled={saving} className="btn-secondary">Cancel</button>
            <button onClick={saveSale} disabled={saving || items.length === 0} className="btn-primary disabled:opacity-40">
              {saving ? 'Saving...' : 'Save Sale'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
