'use client'
import { useState, useEffect } from 'react'
import { Plus, RotateCcw } from 'lucide-react'
import { Modal, useToast, EmptyState, Badge, LockedFeature } from '@/components/ui'

export default function ReturnsPage() {
  const [returns, setReturns] = useState<any[]>([])
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [modal, setModal] = useState<'return' | 'refund' | null>(null)
  const [saleItems, setSaleItems] = useState<any[]>([])
  const [selectedReturn, setSelectedReturn] = useState<any>(null)
  const [form, setForm] = useState<any>({ sale_id: '', reason: '' })
  const [refundForm, setRefundForm] = useState<any>({ refund_amount: 0, refund_mode: 'cash', refund_note: '' })
  const { toast, ToastContainer } = useToast()

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const [r, s] = await Promise.all([
      fetch('/api/returns').then(r => r.json()),
      fetch('/api/sales').then(r => r.json()),
    ])
    if (r?.locked) { setLocked(true); setLoading(false); return }
    setReturns(Array.isArray(r) ? r : [])
    setSales(Array.isArray(s) ? s : [])
    setLoading(false)
  }

  const loadSaleItems = async (saleId: string) => {
    if (!saleId) { setSaleItems([]); return }
    const items = await fetch('/api/returns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'sale_items', sale_id: saleId }) }).then(r => r.json())
    setSaleItems((items || []).map((i: any) => ({ ...i, returned_qty: 0 })))
  }

  const createReturn = async () => {
    if (!form.sale_id) { toast('Select a sale', 'error'); return }
    const validItems = saleItems.filter(i => Number(i.returned_qty) > 0)
    if (!validItems.length) { toast('Enter return quantity for at least one item', 'error'); return }
    const r = await fetch('/api/returns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', ...form, items: validItems }) }).then(r => r.json())
    if (r.error) { toast(r.error, 'error'); return }
    toast(`Return saved! Credit Note: ${r.return_number}. Stock updated.`)
    setModal(null)
    load()
  }

  const recordRefund = async () => {
    if (!refundForm.refund_amount || Number(refundForm.refund_amount) <= 0) { toast('Enter valid amount', 'error'); return }
    const r = await fetch('/api/returns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'record_refund', return_id: selectedReturn.id, customer_id: selectedReturn.customer_id, ...refundForm }) }).then(r => r.json())
    if (r.error) { toast(r.error, 'error'); return }
    toast('Refund recorded!')
    setModal(null)
    load()
  }

  const totalReturnValue = returns.reduce((s, r) => s + Number(r.total_amount), 0)
  const pendingCount = returns.filter(r => r.refund_status === 'pending').length

  if (locked) return <LockedFeature feature="Returns & Refunds" plan="Growth" />

  return (
    <div className="max-w-6xl mx-auto">
      <ToastContainer />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Returns</h1>
          <p className="text-slate-400 text-sm mt-0.5">{returns.length} returns · {pendingCount} pending refunds · ₹{totalReturnValue.toLocaleString('en-IN')} total</p>
        </div>
        <button onClick={() => { setForm({ sale_id: '', reason: '' }); setSaleItems([]); setModal('return') }} className="btn-primary"><Plus className="w-4 h-4" /> New Return</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-slate-800">{['Credit Note', 'Customer', 'Against Invoice', 'Date', 'Amount', 'Refund', ''].map(h => <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? <tr><td colSpan={7} className="py-12 text-center text-slate-500">Loading...</td></tr>
            : returns.length === 0 ? <tr><td colSpan={7}><EmptyState icon={<RotateCcw className="w-6 h-6" />} title="No returns yet" /></td></tr>
            : returns.map(r => (
              <tr key={r.id} className="hover:bg-slate-800/30">
                <td className="px-5 py-3.5 text-blue-400 font-medium text-sm">{r.return_number}</td>
                <td className="px-5 py-3.5 text-white text-sm">{r.customer_name}</td>
                <td className="px-5 py-3.5 text-slate-400 text-sm">{r.sale_invoice || '—'}</td>
                <td className="px-5 py-3.5 text-slate-400 text-sm">{new Date(r.created_at).toLocaleDateString('en-IN')}</td>
                <td className="px-5 py-3.5 font-semibold text-white text-sm">₹{Number(r.total_amount).toLocaleString('en-IN')}</td>
                <td className="px-5 py-3.5"><Badge color={r.refund_status === 'refunded' ? 'green' : 'yellow'}>{r.refund_status}</Badge></td>
                <td className="px-5 py-3.5">
                  {r.refund_status === 'pending' && (
                    <button onClick={() => { setSelectedReturn(r); setRefundForm({ refund_amount: r.total_amount, refund_mode: 'cash', refund_note: '' }); setModal('refund') }} className="text-xs text-green-400 hover:text-green-300">Record Refund</button>
                  )}
                  {r.refund_status === 'refunded' && <span className="text-xs text-slate-500">via {r.refund_mode}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Return Modal */}
      <Modal open={modal === 'return'} onClose={() => setModal(null)} title="New Return / Credit Note" size="lg">
        <div className="p-6 space-y-4">
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Select Sale / Invoice *</label>
            <select value={form.sale_id} onChange={e => { setForm((f: any) => ({ ...f, sale_id: e.target.value })); loadSaleItems(e.target.value) }} className="input-base">
              <option value="">Select invoice...</option>
              {sales.map(s => <option key={s.id} value={s.id}>{s.invoice_number} — {s.customer_name} (₹{Number(s.final_amount).toLocaleString('en-IN')})</option>)}
            </select>
          </div>
          {saleItems.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Items to Return *</label>
              <div className="border border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead><tr className="bg-slate-800/50 border-b border-slate-700">{['Product', 'Sold Qty', 'Unit Price', 'Return Qty', 'Value'].map(h => <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-slate-800">
                    {saleItems.map((item: any, idx: number) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2.5 text-sm font-medium text-white">{item.product_name}</td>
                        <td className="px-4 py-2.5 text-sm text-slate-400">{item.quantity}</td>
                        <td className="px-4 py-2.5 text-sm text-slate-400">₹{Number(item.unit_price).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-2.5"><input type="number" value={item.returned_qty} onChange={e => setSaleItems(items => items.map((x, i) => i === idx ? { ...x, returned_qty: Number(e.target.value) } : x))} className="input-base text-sm w-20" min={0} max={item.quantity} /></td>
                        <td className="px-4 py-2.5 text-sm font-semibold text-white">₹{(Number(item.returned_qty) * Number(item.unit_price)).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-right mt-2 font-semibold text-white text-sm">
                Total Return: ₹{saleItems.reduce((s, i) => s + Number(i.returned_qty) * Number(i.unit_price), 0).toLocaleString('en-IN')}
              </div>
            </div>
          )}
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Reason for Return</label><textarea value={form.reason} onChange={e => setForm((f: any) => ({ ...f, reason: e.target.value }))} className="input-base" rows={2} placeholder="e.g. Defective product, wrong item..." /></div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">⚠ Stock will be automatically added back to inventory when return is saved</div>
        </div>
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          <button onClick={createReturn} className="btn-primary">Save Return & Update Stock</button>
        </div>
      </Modal>

      {/* Refund Modal */}
      <Modal open={modal === 'refund'} onClose={() => setModal(null)} title={`Record Refund — ${selectedReturn?.return_number}`} size="sm">
        <div className="p-6 space-y-4">
          <div className="bg-slate-800/50 rounded-xl p-3 text-sm">
            <div className="text-slate-400">Customer: <span className="text-white">{selectedReturn?.customer_name}</span></div>
            <div className="text-slate-400">Return Value: <span className="text-red-400 font-bold">₹{Number(selectedReturn?.total_amount || 0).toLocaleString('en-IN')}</span></div>
          </div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Refund Amount (₹) *</label><input type="number" value={refundForm.refund_amount} onChange={e => setRefundForm((f: any) => ({ ...f, refund_amount: Number(e.target.value) }))} className="input-base" /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Refund Mode *</label>
            <select value={refundForm.refund_mode} onChange={e => setRefundForm((f: any) => ({ ...f, refund_mode: e.target.value }))} className="input-base">
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank">Bank Transfer</option>
              <option value="adjusted_in_ledger">Adjusted in Customer Ledger</option>
            </select>
            {refundForm.refund_mode === 'adjusted_in_ledger' && <p className="text-xs text-slate-400 mt-1">Amount will be added as credit in customer account</p>}
          </div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Reference / Note</label><input value={refundForm.refund_note} onChange={e => setRefundForm((f: any) => ({ ...f, refund_note: e.target.value }))} className="input-base" placeholder="e.g. UPI ref: XXXX, UTR: XXXXXX" /></div>
        </div>
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          <button onClick={recordRefund} className="btn-primary">Confirm Refund</button>
        </div>
      </Modal>
    </div>
  )
}
