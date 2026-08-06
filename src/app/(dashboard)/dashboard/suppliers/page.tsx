'use client'
import { useState, useEffect } from 'react'
import { Plus, Truck } from 'lucide-react'
import { Modal, useToast, EmptyState, LockedFeature } from '@/components/ui'

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>({})
  const { toast, ToastContainer } = useToast()

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const data = await fetch('/api/suppliers').then(r => r.json())
    if (data?.locked) { setLocked(true); setLoading(false); return }
    setSuppliers(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  const save = async () => {
    if (!form.name) { toast('Supplier name is required', 'error'); return }
    if (form.phone && !/^[6-9]\d{9}$/.test(form.phone)) { toast('Enter valid 10-digit mobile number', 'error'); return }
    if (form.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(form.gstin)) { toast('Invalid GSTIN format', 'error'); return }
    const r = await fetch('/api/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save', ...form }) }).then(r => r.json())
    if (r.error) { toast(r.error, 'error'); return }
    toast('Supplier saved!')
    setModal(false)
    load()
  }

  if (locked) return <LockedFeature feature="Supplier Management" plan="Growth" />

  return (
    <div className="max-w-6xl mx-auto">
      <ToastContainer />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Suppliers</h1>
        <button onClick={() => { setForm({}); setModal(true) }} className="btn-primary"><Plus className="w-4 h-4" /> Add Supplier</button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-slate-800">{['Supplier', 'Phone', 'GSTIN', 'City', 'Payment Terms', ''].map(h => <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? <tr><td colSpan={6} className="py-12 text-center text-slate-500">Loading...</td></tr>
            : suppliers.length === 0 ? <tr><td colSpan={6}><EmptyState icon={<Truck className="w-6 h-6" />} title="No suppliers yet" action={<button onClick={() => { setForm({}); setModal(true) }} className="btn-primary">Add Supplier</button>} /></td></tr>
            : suppliers.map(s => (
              <tr key={s.id} className="hover:bg-slate-800/30">
                <td className="px-5 py-3.5"><div className="font-medium text-white text-sm">{s.name}</div>{s.email && <div className="text-slate-500 text-xs">{s.email}</div>}</td>
                <td className="px-5 py-3.5 text-slate-400 text-sm">{s.phone || '—'}</td>
                <td className="px-5 py-3.5 text-slate-400 text-sm font-mono">{s.gstin || '—'}</td>
                <td className="px-5 py-3.5 text-slate-400 text-sm">{s.city || '—'}</td>
                <td className="px-5 py-3.5 text-slate-400 text-sm">{s.payment_terms || '—'}</td>
                <td className="px-5 py-3.5"><button onClick={() => { setForm(s); setModal(true) }} className="text-xs text-blue-400 hover:text-blue-300">Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={form.id ? 'Edit Supplier' : 'Add Supplier'} size="md">
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="block text-sm font-medium text-slate-300 mb-1.5">Supplier Name *</label><input value={form.name || ''} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} className="input-base" /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Phone</label><input value={form.phone || ''} onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))} className="input-base" maxLength={10} /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label><input value={form.email || ''} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} className="input-base" /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">GSTIN</label><input value={form.gstin || ''} onChange={e => setForm((f: any) => ({ ...f, gstin: e.target.value.toUpperCase() }))} className="input-base" placeholder="27AAAAA0000A1Z5" maxLength={15} /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">City</label><input value={form.city || ''} onChange={e => setForm((f: any) => ({ ...f, city: e.target.value }))} className="input-base" /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">State</label><input value={form.state || ''} onChange={e => setForm((f: any) => ({ ...f, state: e.target.value }))} className="input-base" /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Payment Terms</label><select value={form.payment_terms || ''} onChange={e => setForm((f: any) => ({ ...f, payment_terms: e.target.value }))} className="input-base"><option value="">Select</option>{['On Delivery', 'Net 7', 'Net 15', 'Net 30', 'Net 45', 'Advance'].map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          <div className="col-span-2"><label className="block text-sm font-medium text-slate-300 mb-1.5">Notes</label><textarea value={form.notes || ''} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} className="input-base" rows={2} /></div>
        </div>
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={save} className="btn-primary">Save Supplier</button>
        </div>
      </Modal>
    </div>
  )
}
