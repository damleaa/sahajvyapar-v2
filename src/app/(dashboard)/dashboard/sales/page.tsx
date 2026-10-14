'use client'

import { useState, useEffect } from 'react'

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

  useEffect(() => {
    fetchAll()
  }, [])

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

      // Inventory/Products: plain array (returns NextResponse.json(products) — plain array)
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

      // Exhibitions: { exhibitions: [...] } — filter to active + completed only (not upcoming)
      const exhibitionsData = await exhibitionsRes.json()
      const allExhibitions: Exhibition[] = Array.isArray(exhibitionsData)
        ? exhibitionsData
        : (exhibitionsData.exhibitions || [])
      const eligible = allExhibitions.filter(
        (e: Exhibition) => e.status === 'active' || e.status === 'completed'
      )
      setExhibitions(eligible)
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

  // Filtered sales
  const filteredSales = sales.filter(s => {
    if (filterExhibition && s.exhibition_id !== filterExhibition) return false
    if (filterPayment && s.payment_method !== filterPayment) return false
    if (filterDate && s.sale_date !== filterDate) return false
    return true
  })

  const totalRevenue = filteredSales.reduce((s, sale) => s + (sale.final_amount || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-500 text-sm">Loading sales...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filteredSales.length} sale{filteredSales.length !== 1 ? 's' : ''} · ₹{totalRevenue.toLocaleString('en-IN')} total
          </p>
        </div>
        <button
          onClick={openModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + New Sale
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {exhibitions.length > 0 && (
          <select
            value={filterExhibition}
            onChange={e => setFilterExhibition(e.target.value)}
            className="text-sm border rounded-lg px-3 py-1.5 bg-white text-gray-700"
          >
            <option value="">All Exhibitions</option>
            {exhibitions.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        )}
        <select
          value={filterPayment}
          onChange={e => setFilterPayment(e.target.value)}
          className="text-sm border rounded-lg px-3 py-1.5 bg-white text-gray-700"
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
          className="text-sm border rounded-lg px-3 py-1.5 bg-white text-gray-700"
        />
        {(filterExhibition || filterPayment || filterDate) && (
          <button
            onClick={() => { setFilterExhibition(''); setFilterPayment(''); setFilterDate('') }}
            className="text-sm text-blue-600 hover:text-blue-800 px-2"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Sales Table */}
      {filteredSales.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <p className="text-gray-400 text-lg">No sales yet</p>
          <p className="text-gray-400 text-sm mt-1">Click "New Sale" to record your first sale</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Exhibition</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Items</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Payment</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(sale.sale_date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {sale.customer_name || <span className="text-gray-400 italic">Walk-in</span>}
                    </td>
                    <td className="px-4 py-3">
                      {sale.exhibition_name ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          {sale.exhibition_name}
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {Array.isArray(sale.items) ? sale.items.length : 0} item{Array.isArray(sale.items) && sale.items.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-3">
                      <span className="capitalize text-gray-600">{sale.payment_method?.replace('_', ' ')}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      ₹{Number(sale.final_amount || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── New Sale Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          {/* Modal: flex-col so footer is always anchored at bottom, never cut off */}
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col"
            style={{ maxHeight: 'min(90vh, 700px)' }}
          >
            {/* Header — never scrolls */}
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">New Sale</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Body — scrolls if content overflows */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">

              {/* Date + Payment */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Sale Date</label>
                  <input
                    type="date"
                    value={saleDate}
                    onChange={e => setSaleDate(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <label className="block text-xs font-medium text-gray-600 mb-1">Customer (optional)</label>
                  <select
                    value={customerId}
                    onChange={e => setCustomerId(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Walk-in customer</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Exhibition dropdown — only shown if active/completed exhibitions exist */}
              {exhibitions.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Link to Exhibition <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <select
                    value={exhibitionId}
                    onChange={e => setExhibitionId(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">No exhibition</option>
                    {exhibitions.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.status})
                      </option>
                    ))}
                  </select>
                  {exhibitionId && (
                    <p className="mt-1 text-xs text-purple-600 font-medium">
                      ✓ This sale's amount will auto-reflect in the exhibition's P&L
                    </p>
                  )}
                </div>
              )}

              {/* Add product row */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Add Items</label>
                <div className="flex gap-2">
                  <select
                    value={selectedProduct}
                    onChange={e => setSelectedProduct(e.target.value)}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-16 border rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={addItem}
                    disabled={!selectedProduct}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Items table */}
              {items.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Product</th>
                        <th className="text-center px-2 py-2 text-xs font-medium text-gray-500">Qty</th>
                        <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Price</th>
                        <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Total</th>
                        <th className="w-6 px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {items.map(item => (
                        <tr key={item.product_id}>
                          <td className="px-3 py-2 text-gray-800">{item.product_name}</td>
                          <td className="px-2 py-2 text-center">
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={e => updateItemQty(item.product_id, Number(e.target.value))}
                              className="w-12 border rounded px-1 py-0.5 text-center text-sm"
                            />
                          </td>
                          <td className="px-3 py-2 text-right text-gray-600">₹{item.unit_price}</td>
                          <td className="px-3 py-2 text-right font-medium">₹{item.total.toLocaleString('en-IN')}</td>
                          <td className="px-2 py-2 text-center">
                            <button onClick={() => removeItem(item.product_id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="bg-gray-50 border-t px-3 py-2 space-y-0.5">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Subtotal</span><span>₹{subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    {gstAmount > 0 && (
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>GST</span><span>₹{gstAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-semibold text-gray-900 pt-1 border-t mt-1">
                      <span>Total</span><span>₹{finalAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Any additional notes..."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Error */}
              {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}
            </div>

            {/* Footer — never scrolls, always visible */}
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex items-center justify-between shrink-0">
              <div className="text-sm text-gray-500">
                {items.length > 0 && (
                  <span className="font-semibold text-gray-800">
                    ₹{finalAmount.toLocaleString('en-IN')} · {items.length} item{items.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveSale}
                  disabled={saving || items.length === 0}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 rounded-lg transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Sale'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
