'use client'
import { useState, useEffect } from 'react'
import { Plus, Search, Package, Edit2, Trash2, ArrowUpDown } from 'lucide-react'
import { Modal, useToast, EmptyState, Badge } from '@/components/ui'

interface Product {
  id: string; name: string; sku?: string; category_name?: string; category_id?: string
  unit: string; cost_price: number; selling_price: number; stock_quantity: number
  low_stock_alert: number; hsn_code?: string; gst_rate: number; description?: string
}
interface Category { id: string; name: string }

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'product' | 'stock' | null>(null)
  const [editing, setEditing] = useState<Product | null>(null)
  const [stockProduct, setStockProduct] = useState<Product | null>(null)
  const [form, setForm] = useState<any>({})
  const [stockForm, setStockForm] = useState({ type: 'in', qty: '', note: '' })
  const [saving, setSaving] = useState(false)
  const [globalCats, setGlobalCats] = useState<any[]>([])
  const [catSuggestions, setCatSuggestions] = useState<any[]>([])
  const [newCatName, setNewCatName] = useState('')
  const [showCatModal, setShowCatModal] = useState(false)
  const { toast, ToastContainer } = useToast()

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    const [p, c, g] = await Promise.all([
      fetch('/api/inventory').then(r => r.json()),
      fetch('/api/settings/categories').then(r => r.json()),
      fetch('/api/settings/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'global' }) }).then(r => r.json()),
    ])
    setProducts(Array.isArray(p) ? p : [])
    setCategories(Array.isArray(c) ? c : [])
    setGlobalCats(Array.isArray(g) ? g : [])
    setLoading(false)
  }

  const openAdd = () => {
    setEditing(null)
    setForm({ unit: 'piece', cost_price: 0, selling_price: 0, stock_quantity: 0, low_stock_alert: 5, gst_rate: 0 })
    setModal('product')
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({ ...p })
    setModal('product')
  }

  const saveProduct = async () => {
    if (!form.name) { toast('Product name is required', 'error'); return }
    if (Number(form.selling_price) < Number(form.cost_price)) { toast('Selling price should be ≥ cost price', 'error'); return }
    setSaving(true)
    const r = await fetch('/api/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save', ...form, id: editing?.id }) }).then(r => r.json())
    setSaving(false)
    if (r.error) { toast(r.error, 'error'); return }
    toast(editing ? 'Product updated!' : 'Product added!')
    setModal(null)
    loadAll()
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) return
    await fetch('/api/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id }) })
    toast('Product deleted')
    loadAll()
  }

  const adjustStock = async () => {
    if (!stockForm.qty || Number(stockForm.qty) <= 0) { toast('Enter valid quantity', 'error'); return }
    setSaving(true)
    await fetch('/api/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'adjust_stock', product_id: stockProduct?.id, movement_type: stockForm.type, quantity: stockForm.qty, note: stockForm.note }) })
    setSaving(false)
    toast('Stock updated!')
    setModal(null)
    loadAll()
  }

  const addCategory = async () => {
    if (!newCatName.trim()) return
    const r = await fetch('/api/settings/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save', name: newCatName.trim() }) }).then(r => r.json())
    if (r.error) { toast(r.error, 'error'); return }
    toast('Category added!')
    setNewCatName(''); setShowCatModal(false)
    const c = await fetch('/api/settings/categories').then(r => r.json())
    setCategories(Array.isArray(c) ? c : [])
  }

  const filterCatSuggestions = (q: string) => {
    setNewCatName(q)
    if (!q.trim()) { setCatSuggestions([]); return }
    const existing = categories.map(c => c.name.toLowerCase())
    setCatSuggestions(globalCats.filter(g => g.name.toLowerCase().includes(q.toLowerCase()) && !existing.includes(g.name.toLowerCase())).slice(0, 5))
  }

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()) || p.category_name?.toLowerCase().includes(search.toLowerCase()))
  const lowStockCount = products.filter(p => p.stock_quantity <= p.low_stock_alert).length

  return (
    <div className="max-w-6xl mx-auto">
      <ToastContainer />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventory</h1>
          <p className="text-slate-400 text-sm mt-0.5">{products.length} products · {lowStockCount > 0 && <span className="text-red-400">{lowStockCount} low stock</span>}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCatModal(true)} className="btn-secondary">+ Category</button>
          <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" /> Add Product</button>
        </div>
      </div>

      <div className="card mb-4 flex items-center gap-3 px-4 py-3">
        <Search className="w-4 h-4 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none flex-1" />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              {['Product', 'Category', 'Unit', 'Cost', 'Price', 'Stock', 'GST', ''].map(h => (
                <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-500">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8}><EmptyState icon={<Package className="w-6 h-6" />} title="No products yet" description="Add your first product to get started" action={<button onClick={openAdd} className="btn-primary">Add Product</button>} /></td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="font-medium text-white text-sm">{p.name}</div>
                  {p.sku && <div className="text-slate-500 text-xs">{p.sku}</div>}
                </td>
                <td className="px-5 py-3.5 text-slate-400 text-sm">{p.category_name || '—'}</td>
                <td className="px-5 py-3.5 text-slate-400 text-sm">{p.unit}</td>
                <td className="px-5 py-3.5 text-slate-400 text-sm">₹{Number(p.cost_price).toLocaleString('en-IN')}</td>
                <td className="px-5 py-3.5 text-white font-medium text-sm">₹{Number(p.selling_price).toLocaleString('en-IN')}</td>
                <td className="px-5 py-3.5">
                  <Badge color={p.stock_quantity === 0 ? 'red' : p.stock_quantity <= p.low_stock_alert ? 'yellow' : 'green'}>
                    {p.stock_quantity} {p.unit}
                  </Badge>
                </td>
                <td className="px-5 py-3.5 text-slate-400 text-sm">{p.gst_rate}%</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setStockProduct(p); setStockForm({ type: 'in', qty: '', note: '' }); setModal('stock') }} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all" title="Adjust stock"><ArrowUpDown className="w-3.5 h-3.5" /></button>
                    <button onClick={() => openEdit(p)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => deleteProduct(p.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Product Modal */}
      <Modal open={modal === 'product'} onClose={() => setModal(null)} title={editing ? 'Edit Product' : 'Add Product'} size="lg">
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Product Name *</label>
              <input value={form.name || ''} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} className="input-base" placeholder="e.g. Lavender Candle" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">SKU</label>
              <input value={form.sku || ''} onChange={e => setForm((f: any) => ({ ...f, sku: e.target.value }))} className="input-base" placeholder="e.g. LC-001" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Category</label>
              <select value={form.category_id || ''} onChange={e => setForm((f: any) => ({ ...f, category_id: e.target.value }))} className="input-base">
                <option value="">No category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Unit</label>
              <select value={form.unit || 'piece'} onChange={e => setForm((f: any) => ({ ...f, unit: e.target.value }))} className="input-base">
                {['piece', 'set', 'pair', 'box', 'kg', 'g', 'litre', 'ml', 'metre', 'dozen'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">HSN Code</label>
              <input value={form.hsn_code || ''} onChange={e => setForm((f: any) => ({ ...f, hsn_code: e.target.value }))} className="input-base" placeholder="e.g. 3406" maxLength={8} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Cost Price (₹) *</label>
              <input type="number" value={form.cost_price || 0} onChange={e => setForm((f: any) => ({ ...f, cost_price: e.target.value }))} className="input-base" min={0} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Selling Price (₹) *</label>
              <input type="number" value={form.selling_price || 0} onChange={e => setForm((f: any) => ({ ...f, selling_price: e.target.value }))} className="input-base" min={0} />
              {Number(form.selling_price) < Number(form.cost_price) && form.selling_price > 0 && (
                <p className="text-amber-400 text-xs mt-1">⚠ Selling price is below cost price</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Opening Stock</label>
              <input type="number" value={form.stock_quantity || 0} onChange={e => setForm((f: any) => ({ ...f, stock_quantity: e.target.value }))} className="input-base" min={0} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Low Stock Alert</label>
              <input type="number" value={form.low_stock_alert || 5} onChange={e => setForm((f: any) => ({ ...f, low_stock_alert: e.target.value }))} className="input-base" min={0} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">GST Rate (%)</label>
              <select value={form.gst_rate || 0} onChange={e => setForm((f: any) => ({ ...f, gst_rate: e.target.value }))} className="input-base">
                {[0, 3, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
              <textarea value={form.description || ''} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} className="input-base" rows={2} placeholder="Optional product description" />
            </div>
          </div>
        </div>
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          <button onClick={saveProduct} disabled={saving} className="btn-primary">{saving ? 'Saving...' : editing ? 'Update Product' : 'Add Product'}</button>
        </div>
      </Modal>

      {/* Stock Adjustment Modal */}
      <Modal open={modal === 'stock'} onClose={() => setModal(null)} title={`Adjust Stock — ${stockProduct?.name}`} size="sm">
        <div className="p-6 space-y-4">
          <div className="flex gap-2">
            {[{ v: 'in', l: 'Add Stock' }, { v: 'out', l: 'Remove Stock' }, { v: 'set', l: 'Set Exact' }].map(opt => (
              <button key={opt.v} onClick={() => setStockForm(f => ({ ...f, type: opt.v }))}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${stockForm.type === opt.v ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                {opt.l}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Quantity</label>
            <input type="number" value={stockForm.qty} onChange={e => setStockForm(f => ({ ...f, qty: e.target.value }))} className="input-base" placeholder="Enter quantity" min={0} />
            <p className="text-slate-500 text-xs mt-1">Current stock: {stockProduct?.stock_quantity} {stockProduct?.unit}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Note (optional)</label>
            <input value={stockForm.note} onChange={e => setStockForm(f => ({ ...f, note: e.target.value }))} className="input-base" placeholder="e.g. Physical count, Purchase received" />
          </div>
        </div>
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          <button onClick={adjustStock} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Update Stock'}</button>
        </div>
      </Modal>

      {/* Category Modal */}
      <Modal open={showCatModal} onClose={() => setShowCatModal(false)} title="Add Category" size="sm">
        <div className="p-6">
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Category Name *</label>
          <div className="relative">
            <input value={newCatName} onChange={e => filterCatSuggestions(e.target.value)} className="input-base" placeholder="Start typing e.g. Candles, Jewellery..." />
            {catSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-slate-800 border border-slate-700 rounded-xl mt-1 z-50 overflow-hidden shadow-xl">
                {catSuggestions.map((s: any) => (
                  <div key={s.id} onClick={() => { setNewCatName(s.name); setCatSuggestions([]) }} className="px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 cursor-pointer">{s.name}</div>
                ))}
              </div>
            )}
          </div>
          <p className="text-slate-500 text-xs mt-1.5">Type to see suggestions or enter any custom name</p>
        </div>
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button onClick={() => setShowCatModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={addCategory} className="btn-primary">Add Category</button>
        </div>
      </Modal>
    </div>
  )
}
