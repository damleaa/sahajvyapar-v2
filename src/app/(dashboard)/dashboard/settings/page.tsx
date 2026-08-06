'use client'
import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui'

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>({})
  const [categories, setCategories] = useState<any[]>([])
  const [globalCats, setGlobalCats] = useState<any[]>([])
  const [catSuggestions, setCatSuggestions] = useState<any[]>([])
  const [newCatName, setNewCatName] = useState('')
  const [saving, setSaving] = useState(false)
  const { toast, ToastContainer } = useToast()

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    const [p, c, g] = await Promise.all([
      fetch('/api/settings').then(r => r.json()),
      fetch('/api/settings/categories').then(r => r.json()),
      fetch('/api/settings/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'global' }) }).then(r => r.json()),
    ])
    setProfile(p || {})
    setCategories(Array.isArray(c) ? c : [])
    setGlobalCats(Array.isArray(g) ? g : [])
  }

  const saveProfile = async () => {
    if (profile.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(profile.gstin)) { toast('Invalid GSTIN format', 'error'); return }
    if (profile.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(profile.pan)) { toast('Invalid PAN format', 'error'); return }
    if (profile.pincode && !/^\d{6}$/.test(profile.pincode)) { toast('Pincode must be 6 digits', 'error'); return }
    if (profile.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(profile.ifsc)) { toast('Invalid IFSC code', 'error'); return }
    setSaving(true)
    const r = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile) }).then(r => r.json())
    setSaving(false)
    if (r.error) { toast(r.error, 'error'); return }
    toast('Business profile saved!')
  }

  const uploadLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) { toast('Logo must be under 500KB', 'error'); return }
    const reader = new FileReader()
    reader.onload = (ev) => setProfile((p: any) => ({ ...p, logo_base64: (ev.target?.result as string)?.split(',')[1] }))
    reader.readAsDataURL(file)
  }

  const addCategory = async () => {
    if (!newCatName.trim()) return
    const r = await fetch('/api/settings/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save', name: newCatName.trim() }) }).then(r => r.json())
    if (r.error) { toast(r.error, 'error'); return }
    toast('Category added!')
    setNewCatName(''); setCatSuggestions([])
    const c = await fetch('/api/settings/categories').then(r => r.json())
    setCategories(Array.isArray(c) ? c : [])
  }

  const deleteCategory = async (id: string) => {
    await fetch('/api/settings/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id }) })
    const c = await fetch('/api/settings/categories').then(r => r.json())
    setCategories(Array.isArray(c) ? c : [])
  }

  const filterSuggestions = (q: string) => {
    setNewCatName(q)
    if (!q.trim()) { setCatSuggestions([]); return }
    const existing = categories.map(c => c.name.toLowerCase())
    setCatSuggestions(globalCats.filter(g => g.name.toLowerCase().includes(q.toLowerCase()) && !existing.includes(g.name.toLowerCase())).slice(0, 5))
  }

  const f = (label: string, key: string, placeholder = '', type = 'text') => (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      <input type={type} value={profile[key] || ''} onChange={e => setProfile((p: any) => ({ ...p, [key]: type === 'text' ? e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') === e.target.value.toUpperCase() && ['gstin', 'pan', 'ifsc'].includes(key) ? e.target.value.toUpperCase() : e.target.value : e.target.value }))} className="input-base" placeholder={placeholder} />
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto">
      <ToastContainer />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm mt-0.5">Manage your business profile and preferences</p>
      </div>

      {/* Business Profile */}
      <div className="card p-6 mb-6">
        <h2 className="text-white font-semibold mb-6">Business Profile</h2>

        {/* Logo */}
        <div className="flex items-center gap-5 mb-6 pb-6 border-b border-slate-800">
          <div className="w-20 h-20 rounded-xl bg-slate-800 border-2 border-dashed border-slate-600 flex items-center justify-center overflow-hidden flex-shrink-0">
            {profile.logo_base64 ? (
              <img src={`data:image/png;base64,${profile.logo_base64}`} alt="Logo" className="w-full h-full object-cover" />
            ) : <span className="text-slate-500 text-xs text-center px-2">No Logo</span>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Business Logo</label>
            <input type="file" accept="image/*" onChange={uploadLogo} className="text-sm text-slate-400" />
            <p className="text-slate-500 text-xs mt-1">PNG or JPG · Max 500KB · Appears on invoices</p>
          </div>
        </div>

        {/* Tax Info */}
        <div className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tax Information</div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">GSTIN</label><input value={profile.gstin || ''} onChange={e => setProfile((p: any) => ({ ...p, gstin: e.target.value.toUpperCase() }))} className="input-base" placeholder="27AAAAA0000A1Z5" maxLength={15} /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">PAN</label><input value={profile.pan || ''} onChange={e => setProfile((p: any) => ({ ...p, pan: e.target.value.toUpperCase() }))} className="input-base" placeholder="AAAAA0000A" maxLength={10} /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Invoice Prefix</label><input value={profile.invoice_prefix || ''} onChange={e => setProfile((p: any) => ({ ...p, invoice_prefix: e.target.value }))} className="input-base" placeholder="INV" /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Financial Year</label><input value={profile.financial_year || ''} onChange={e => setProfile((p: any) => ({ ...p, financial_year: e.target.value }))} className="input-base" placeholder="2025-26" /></div>
        </div>

        {/* Address */}
        <div className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Business Address</div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="col-span-3"><label className="block text-sm font-medium text-slate-300 mb-1.5">Street Address</label><input value={profile.address || ''} onChange={e => setProfile((p: any) => ({ ...p, address: e.target.value }))} className="input-base" placeholder="Building, Street, Area" /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">City</label><input value={profile.city || ''} onChange={e => setProfile((p: any) => ({ ...p, city: e.target.value }))} className="input-base" /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">State</label><input value={profile.state || ''} onChange={e => setProfile((p: any) => ({ ...p, state: e.target.value }))} className="input-base" /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Pincode</label><input value={profile.pincode || ''} onChange={e => setProfile((p: any) => ({ ...p, pincode: e.target.value }))} className="input-base" maxLength={6} /></div>
        </div>

        {/* Bank Details */}
        <div className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Bank Details (shown on invoice)</div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Bank Name</label><input value={profile.bank_name || ''} onChange={e => setProfile((p: any) => ({ ...p, bank_name: e.target.value }))} className="input-base" placeholder="HDFC Bank" /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Account Number</label><input value={profile.account_no || ''} onChange={e => setProfile((p: any) => ({ ...p, account_no: e.target.value }))} className="input-base" /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">IFSC Code</label><input value={profile.ifsc || ''} onChange={e => setProfile((p: any) => ({ ...p, ifsc: e.target.value.toUpperCase() }))} className="input-base" placeholder="HDFC0001234" maxLength={11} /></div>
        </div>

        <button onClick={saveProfile} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Business Profile'}</button>
      </div>

      {/* Categories */}
      <div className="card p-6">
        <h2 className="text-white font-semibold mb-4">My Categories</h2>
        <div className="relative mb-4">
          <input value={newCatName} onChange={e => filterSuggestions(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCategory()} className="input-base pr-20" placeholder="Type category name..." />
          <button onClick={addCategory} className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary py-1.5 text-xs">Add</button>
          {catSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-slate-800 border border-slate-700 rounded-xl mt-1 z-50 overflow-hidden shadow-xl">
              {catSuggestions.map((s: any) => <div key={s.id} onClick={() => { setNewCatName(s.name); setCatSuggestions([]) }} className="px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 cursor-pointer">{s.name}</div>)}
            </div>
          )}
        </div>
        <div className="space-y-1">
          {categories.map(c => (
            <div key={c.id} className="flex items-center justify-between py-2 border-b border-slate-800">
              <span className="text-sm text-white">{c.name}</span>
              <button onClick={() => deleteCategory(c.id)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
            </div>
          ))}
          {categories.length === 0 && <p className="text-slate-500 text-sm py-4 text-center">No categories yet. Add one above.</p>}
        </div>
      </div>
    </div>
  )
}
