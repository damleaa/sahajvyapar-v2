'use client'
import { useState, useEffect } from 'react'
import { Plus, ClipboardList } from 'lucide-react'
import { Modal, useToast, EmptyState, Badge, LockedFeature } from '@/components/ui'

export default function PurchaseOrdersPage() {
  const [pos, setPOs] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [modal, setModal] = useState<'create' | 'receive' | null>(null)
  const [selectedPO, setSelectedPO] = useState<any>(null)
  const [form, setForm] = useState<any>({ items: [{ product_id: '', ordered_qty: 1, unit_price: 0 }] })
  const { toast, ToastContainer } = useToast()

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const [p, s, pr] = await Promise.all([
      fetch('/api/purchase-orders').then(r => r.json()),
      fetch('/api/suppliers').then(r => r.json()),
      fetch('/api/inventory').then(r => r.json()),
    ])
    if (p?.locked) { setLocked(true); setLoading(false); return }
    setPOs(Array.isArray(p) ? p : [])
    setSuppliers(Array.isArray(s) ? s : [])
    setProducts(Array.isArray(pr) ? pr : [])
    setLoading(false)
  }

  const createPO = async () => {
    if (!form.supplier_id) { toast('Select a supplier', 'error'); return }
    const validItems = form.items.filter((i: any) => i.product_id && i.ordered_qty > 0)
    if (!validItems.length) { toast('Add at least one item', 'error'); return }
    const r = await fetch('/api/purchase-orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', ...form, items: validItems }) }).then(r => r.json())
    if (r.error) { toast(r.error, 'error'); return }
    toast(`PO created: ${r.po_number}`)
    setModal(null)
    load()
  }

  const receivePO = async () => {
    const items = selectedPO.po_items.map((i: any) => ({ ...i, receiving_now: Number(i.receiving_now || 0) }))
    const r = await fetch('/api/purchase-orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'receive', po_id: selectedPO.id, items, supplier_ref_number: selectedPO.supplier_ref_number }) }).then(r => r.json())
    if (r.error) { toast(r.error, 'error'); return }
    toast('Stock received and inventory updated!')
    setModal(null)
    load()
  }

  const statusColor: any = { draft: 'slate', sent: 'blue', partial: 'yellow', received: 'green', cancelled: 'red' }

  if (locked) return <LockedFeature feature="Purchase Orders" plan="Growth" />

  return (
    <div className="max-w-6xl mx-auto">
      <ToastContainer />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Purchase Orders</h1>
        <button onClick={() => { setForm({ supplier_id: '', expected_date: '', supplier_ref_number: '', notes: '', items: [{ product_id: '', ordered_qty: 1, unit_price: 0 }] }); setModal('create') }} className="btn-primary"><Plus className="w-4 h-4" /> Create PO</button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-slate-800">{['PO Number', 'Supplier', 'Supplier Ref', 'Date', 'Amount', 'Status', ''].map(h => <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? <tr><td colSpan={7} className="py-12 text-center text-slate-500">Loading...</td></tr>
            : pos.length === 0 ? <tr><td colSpan={7}><EmptyState icon={<ClipboardList className="w-6 h-6" />} title="No purchase orders yet" /></td></tr>
            : pos.map(po => (
              <tr key={po.id} className="hover:bg-slate-800/30">
                <td className="px-5 py-3.5 text-blue-400 font-medium text-sm">{po.po_number}</td>
                <td className="px-5 py-3.5 text-white text-sm">{po.supplier_name || '—'}</td>
                <td className="px-5 py-3.5 text-slate-400 text-sm font-mono">{po.supplier_ref_number || '—'}</td>
                <td className="px-5 py-3.5 text-slate-400 text-sm">{new Date(po.created_at).toLocaleDateString('en-IN')}</td>
                <td className="px-5 py-3.5 font-semibold text-white text-sm">₹{Number(po.total_amount).toLocaleString('en-IN')}</td>
                <td className="px-5 py-3.5"><Badge color={statusColor[po.status]}>{po.status}</Badge></td>
                <td className="px-5 py-3.5">
                  {['draft', 'sent', 'partial'].includes(po.status) && (
                    <button onClick={() => {
                      setSelectedPO({ ...po, po_items: po.po_items.map((i: any) => ({ ...i, receiving_now: i.ordered_qty - i.received_qty })) })
                      setModal('receive')
                    }} className="text-xs text-green-400 hover:text-green-300">Receive Stock</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create PO Modal */}
      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Create Purchase Order" size="xl">
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Supplier *</label>
              <select value={form.supplier_id} onChange={e => setForm((f: any) => ({ ...f, supplier_id: e.target.value }))} className="input-base">
                <option value="">Select supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Expected Delivery</label><input type="date" value={form.expected_date || ''} onChange={e => setForm((f: any) => ({ ...f, expected_date: e.target.value }))} className="input-base" /></div>
            <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Supplier Ref No.</label><input value={form.supplier_ref_number || ''} onChange={e => setForm((f: any) => ({ ...f, supplier_ref_number: e.target.value }))} className="input-base" placeholder="Supplier's invoice/ref number" /></div>
          </div>
          <div>
            <div className="flex justify-between mb-2"><label className="text-sm font-medium text-slate-300">Items *</label><button onClick={() => setForm((f: any) => ({ ...f, items: [...f.items, { product_id: '', ordered_qty: 1, unit_price: 0 }] }))} className="text-xs text-blue-400">+ Add Item</button></div>
            <div className="space-y-2">
              {form.items?.map((item: any, idx: number) => (
                <div key={idx} className="grid grid-cols-10 gap-2 items-center">
                  <div className="col-span-5"><select value={item.product_id} onChange={e => {
                    const p = products.find((x: any) => x.id === e.target.value)
                    setForm((f: any) => ({ ...f, items: f.items.map((x: any, i: number) => i === idx ? { ...x, product_id: e.target.value, unit_price: p?.cost_price || 0 } : x) }))
                  }} className="input-base text-sm"><option value="">Select product</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                  <div className="col-span-2"><input type="number" value={item.ordered_qty} onChange={e => setForm((f: any) => ({ ...f, items: f.items.map((x: any, i: number) => i === idx ? { ...x, ordered_qty: Number(e.target.value) } : x) }))} className="input-base text-sm" placeholder="Qty" min={1} /></div>
                  <div className="col-span-2"><input type="number" value={item.unit_price} onChange={e => setForm((f: any) => ({ ...f, items: f.items.map((x: any, i: number) => i === idx ? { ...x, unit_price: Number(e.target.value) } : x) }))} className="input-base text-sm" placeholder="Unit cost" min={0} /></div>
                  <div className="col-span-1 text-right">{form.items.length > 1 && <button onClick={() => setForm((f: any) => ({ ...f, items: f.items.filter((_: any, i: number) => i !== idx) }))} className="text-red-400 text-lg">×</button>}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          <button onClick={createPO} className="btn-primary">Create PO</button>
        </div>
      </Modal>

      {/* Receive Stock Modal */}
      <Modal open={modal === 'receive'} onClose={() => setModal(null)} title={`Receive Stock — ${selectedPO?.po_number}`} size="lg">
        <div className="p-6 space-y-4">
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Supplier Invoice / Ref No.</label>
            <input value={selectedPO?.supplier_ref_number || ''} onChange={e => setSelectedPO((p: any) => ({ ...p, supplier_ref_number: e.target.value }))} className="input-base" placeholder="Enter supplier's invoice number" />
          </div>
          <div className="space-y-2">
            {selectedPO?.po_items?.map((item: any, idx: number) => (
              <div key={item.id} className="grid grid-cols-5 gap-3 items-center bg-slate-800/30 rounded-lg px-4 py-3">
                <div className="col-span-2 text-sm font-medium text-white">{item.product_name}</div>
                <div className="text-xs text-slate-400">Ordered: {item.ordered_qty} | Received: {item.received_qty}</div>
                <div><input type="number" value={item.receiving_now || 0} onChange={e => setSelectedPO((p: any) => ({ ...p, po_items: p.po_items.map((x: any, i: number) => i === idx ? { ...x, receiving_now: Number(e.target.value) } : x) }))} className="input-base text-sm" min={0} max={item.ordered_qty - item.received_qty} placeholder="Receiving now" /></div>
                <div className="text-xs text-slate-500">Max: {item.ordered_qty - item.received_qty}</div>
              </div>
            ))}
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
            ⚠ Stock will be automatically updated when you confirm receipt
          </div>
        </div>
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          <button onClick={receivePO} className="btn-primary">Confirm Receipt & Update Stock</button>
        </div>
      </Modal>
    </div>
  )
}
