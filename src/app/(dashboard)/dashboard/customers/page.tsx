'use client'
import { useState, useEffect } from 'react'
import { Plus, Users, IndianRupee } from 'lucide-react'
import { Modal, useToast, EmptyState, Badge, LockedFeature } from '@/components/ui'

interface Customer { id: string; name: string; phone?: string; email?: string; credit_balance: number; created_at: string }

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [modal, setModal] = useState<'add' | 'ledger' | 'payment' | null>(null)
  const [selected, setSelected] = useState<Customer | null>(null)
  const [ledger, setLedger] = useState<any[]>([])
  const [form, setForm] = useState<any>({})
  const [payForm, setPayForm] = useState({ amount: '', note: '' })
  const { toast, ToastContainer } = useToast()

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const data = await fetch('/api/customers').then(r => r.json())
    if (data?.locked) { setLocked(true); setLoading(false); return }
    setCustomers(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  const openLedger = async (c: Customer) => {
    setSelected(c)
    const entries = await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'ledger', customer_id: c.id }) }).then(r => r.json())
    setLedger(entries)
    setModal('ledger')
  }

  const saveCustomer = async () => {
    if (!form.name) { toast('Name is required', 'error'); return }
    if (form.phone && !/^[6-9]\d{9}$/.test(form.phone)) { toast('Enter valid 10-digit mobile number', 'error'); return }
    const r = await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save', ...form }) }).then(r => r.json())
    if (r.error) { toast(r.error, 'error'); return }
    toast('Customer saved!')
    setModal(null)
    load()
  }

  const recordPayment = async () => {
    if (!payForm.amount || Number(payForm.amount) <= 0) { toast('Enter valid amount', 'error'); return }
    const r = await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'record_payment', customer_id: selected?.id, ...payForm }) }).then(r => r.json())
    if (r.error) { toast(r.error, 'error'); return }
    toast('Payment recorded!')
    setModal(null)
    load()
  }

  if (locked) return <LockedFeature feature="Customer Management" plan="Growth" />

  return (
    <div className="max-w-6xl mx-auto">
      <ToastContainer />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Customers</h1>
          <p className="text-slate-400 text-sm mt-0.5">{customers.length} customers · ₹{customers.reduce((s, c) => s + Number(c.credit_balance), 0).toLocaleString('en-IN')} outstanding</p>
        </div>
        <button onClick={() => { setForm({}); setModal('add') }} className="btn-primary"><Plus className="w-4 h-4" /> Add Customer</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              {['Customer', 'Phone', 'Email', 'Credit Balance', ''].map(h => (
                <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? <tr><td colSpan={5} className="py-12 text-center text-slate-500">Loading...</td></tr>
            : customers.length === 0 ? <tr><td colSpan={5}><EmptyState icon={<Users className="w-6 h-6" />} title="No customers yet" action={<button onClick={() => { setForm({}); setModal('add') }} className="btn-primary">Add Customer</button>} /></td></tr>
            : customers.map(c => (
              <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="font-medium text-white text-sm">{c.name}</div>
                </td>
                <td className="px-5 py-3.5 text-slate-400 text-sm">{c.phone || '—'}</td>
                <td className="px-5 py-3.5 text-slate-400 text-sm">{c.email || '—'}</td>
                <td className="px-5 py-3.5">
                  {Number(c.credit_balance) > 0 ? <Badge color="red">₹{Number(c.credit_balance).toLocaleString('en-IN')}</Badge> : <span className="text-slate-500 text-sm">—</span>}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex gap-2">
                    <button onClick={() => openLedger(c)} className="text-xs text-blue-400 hover:text-blue-300">Ledger</button>
                    {Number(c.credit_balance) > 0 && (
                      <button onClick={() => { setSelected(c); setPayForm({ amount: '', note: '' }); setModal('payment') }} className="text-xs text-green-400 hover:text-green-300">Record Payment</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Customer Modal */}
      <Modal open={modal === 'add'} onClose={() => setModal(null)} title="Add Customer" size="sm">
        <div className="p-6 space-y-4">
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Name *</label><input value={form.name || ''} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} className="input-base" /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Phone</label><input value={form.phone || ''} onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))} className="input-base" placeholder="10-digit mobile" maxLength={10} /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label><input value={form.email || ''} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} className="input-base" /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Address</label><textarea value={form.address || ''} onChange={e => setForm((f: any) => ({ ...f, address: e.target.value }))} className="input-base" rows={2} /></div>
        </div>
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          <button onClick={saveCustomer} className="btn-primary">Save Customer</button>
        </div>
      </Modal>

      {/* Ledger Modal */}
      <Modal open={modal === 'ledger'} onClose={() => setModal(null)} title={`Ledger — ${selected?.name}`} size="md">
        <div className="p-6">
          <div className="bg-slate-800/50 rounded-xl p-4 mb-4 flex justify-between items-center">
            <span className="text-slate-400 text-sm">Credit Outstanding</span>
            <span className="text-red-400 font-bold text-xl">₹{Number(selected?.credit_balance || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="space-y-2">
            {ledger.length === 0 ? <p className="text-slate-500 text-sm text-center py-4">No ledger entries</p>
            : ledger.map(e => (
              <div key={e.id} className="flex items-center justify-between py-2 border-b border-slate-800">
                <div>
                  <div className="text-sm text-white">{e.note}</div>
                  <div className="text-xs text-slate-500">{new Date(e.created_at).toLocaleDateString('en-IN')}</div>
                </div>
                <Badge color={e.entry_type === 'credit' ? 'red' : 'green'}>
                  {e.entry_type === 'credit' ? '+' : '-'}₹{Number(e.amount).toLocaleString('en-IN')}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal open={modal === 'payment'} onClose={() => setModal(null)} title={`Record Payment — ${selected?.name}`} size="sm">
        <div className="p-6 space-y-4">
          <div className="bg-slate-800/50 rounded-xl p-3 text-sm text-slate-400">Outstanding: <span className="text-white font-bold">₹{Number(selected?.credit_balance || 0).toLocaleString('en-IN')}</span></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Amount Received (₹) *</label><input type="number" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} className="input-base" max={selected?.credit_balance} /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Note</label><input value={payForm.note} onChange={e => setPayForm(f => ({ ...f, note: e.target.value }))} className="input-base" placeholder="e.g. UPI ref: XXXX" /></div>
        </div>
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          <button onClick={recordPayment} className="btn-primary">Record Payment</button>
        </div>
      </Modal>
    </div>
  )
}
