'use client'

import { useEffect, useState, useCallback } from 'react'
import { Modal } from '@/components/ui'
import NumInput from '@/components/NumInput'

/* ── types ────────────────────────────────────────────────── */
interface DeductionRule {
  id: string
  name: string
  rule_type: 'flat' | 'percentage' | 'time_based'
  flat_amount?: number
  percentage?: number
  time_tiers?: TimeTier[]
  is_active: boolean
  created_at: string
}

interface TimeTier {
  days_after: number
  percentage: number
}

interface SaleItem {
  id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

interface ReturnItem extends SaleItem {
  returned_qty: number
}

interface Return {
  id: string
  return_number: string
  customer_name: string
  reason: string
  total_amount: number
  deduction_amount: number
  deduction_note: string
  refund_amount: number
  refund_status: string
  status: string
  created_at: string
  return_items: { product_name: string; returned_qty: number; unit_price: number }[]
}

const EMPTY_RULE_FORM = {
  name: '',
  rule_type: 'percentage' as 'flat' | 'percentage' | 'time_based',
  flat_amount: 0,
  percentage: 0,
  time_tiers: [{ days_after: 0, percentage: 0 }] as TimeTier[],
  is_active: true,
}

export default function ReturnsPage() {
  const [returns, setReturns] = useState<Return[]>([])
  const [rules, setRules] = useState<DeductionRule[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'returns' | 'rules'>('returns')

  // return modal
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [invoiceInput, setInvoiceInput] = useState('')
  const [fetchingItems, setFetchingItems] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [saleId, setSaleId] = useState('')
  const [saleDate, setSaleDate] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([])
  const [reason, setReason] = useState('')
  const [deductionRuleId, setDeductionRuleId] = useState('')
  const [returnSaving, setReturnSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // rule modal
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [editRuleId, setEditRuleId] = useState<string | null>(null)
  const [ruleForm, setRuleForm] = useState({ ...EMPTY_RULE_FORM })
  const [ruleSaving, setRuleSaving] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [retRes, rulesRes] = await Promise.all([
      fetch('/api/returns'),
      fetch('/api/return-rules'),
    ])
    const [retData, rulesData] = await Promise.all([retRes.json(), rulesRes.json()])
    setReturns(retData.returns || retData || [])
    setRules(rulesData.rules || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  /* ── fetch sale items by invoice number ───────────────────── */
  async function fetchSaleItems() {
    if (!invoiceInput.trim()) return
    setFetchingItems(true)
    setFetchError('')
    setReturnItems([])
    setSaleId('')
    setSaleDate('')
    setCustomerName('')

    // Search sales by invoice number
    const res = await fetch(`/api/sales?search=${encodeURIComponent(invoiceInput.trim())}`)
    const data = await res.json()
    const sales = Array.isArray(data) ? data : []
    const sale = sales.find((s: any) =>
      s.invoice_number?.toLowerCase() === invoiceInput.trim().toLowerCase()
    )

    if (!sale) {
      setFetchError('Invoice not found. Please check the number and try again.')
      setFetchingItems(false)
      return
    }

    setSaleId(sale.id)
    setSaleDate(sale.sale_date || sale.created_at?.split('T')[0] || '')
    setCustomerName(sale.customer_name || 'Walk-in Customer')

    // Fetch sale items
    const itemsRes = await fetch('/api/returns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sale_items', sale_id: sale.id }),
    })
    const items: SaleItem[] = await itemsRes.json()
    setReturnItems(items.map(i => ({ ...i, returned_qty: 0 })))
    setFetchingItems(false)
  }

  function openReturnModal() {
    setInvoiceInput('')
    setFetchError('')
    setSaleId('')
    setSaleDate('')
    setCustomerName('')
    setReturnItems([])
    setReason('')
    setDeductionRuleId('')
    setSaveError('')
    setShowReturnModal(true)
  }

  /* ── compute deduction ────────────────────────────────────── */
  function computeDeduction(returnAmount: number, ruleId: string, saleDt: string) {
    const rule = rules.find(r => r.id === ruleId)
    if (!rule) return { amount: 0, note: '' }

    if (rule.rule_type === 'flat') {
      return { amount: rule.flat_amount || 0, note: `Flat deduction: ₹${rule.flat_amount}` }
    }
    if (rule.rule_type === 'percentage') {
      const amt = (returnAmount * (rule.percentage || 0)) / 100
      return { amount: amt, note: `${rule.percentage}% deduction` }
    }
    if (rule.rule_type === 'time_based' && saleDt && rule.time_tiers) {
      const daysDiff = Math.floor((Date.now() - new Date(saleDt).getTime()) / 86400000)
      const sorted = [...rule.time_tiers].sort((a, b) => b.days_after - a.days_after)
      const tier = sorted.find(t => daysDiff >= t.days_after)
      if (!tier) return { amount: 0, note: 'No deduction (within free return window)' }
      const amt = (returnAmount * tier.percentage) / 100
      return { amount: amt, note: `${tier.percentage}% deduction (${daysDiff} days since sale)` }
    }
    return { amount: 0, note: '' }
  }

  const selectedItems = returnItems.filter(i => i.returned_qty > 0)
  const returnTotal = selectedItems.reduce((s, i) => s + i.returned_qty * i.unit_price, 0)
  const deduction = deductionRuleId ? computeDeduction(returnTotal, deductionRuleId, saleDate) : { amount: 0, note: '' }
  const refundAmount = Math.max(0, returnTotal - deduction.amount)

  /* ── save return ──────────────────────────────────────────── */
  async function saveReturn() {
    if (!saleId) return setSaveError('Please fetch a sale first')
    if (selectedItems.length === 0) return setSaveError('Select at least one item to return')
    setReturnSaving(true)
    setSaveError('')

    const res = await fetch('/api/returns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        sale_id: saleId,
        reason,
        deduction_rule_id: deductionRuleId || null,
        deduction_type: deductionRuleId ? rules.find(r => r.id === deductionRuleId)?.rule_type : null,
        deduction_amount: deduction.amount,
        deduction_note: deduction.note || null,
        refund_amount: refundAmount,
        items: selectedItems.map(i => ({
          sale_item_id: i.id,
          product_id: i.product_id,
          product_name: i.product_name,
          returned_qty: i.returned_qty,
          unit_price: i.unit_price,
        })),
      }),
    })
    const data = await res.json()
    setReturnSaving(false)
    if (data.error) return setSaveError(data.error)
    setShowReturnModal(false)
    fetchAll()
  }

  /* ── deduction rule CRUD ──────────────────────────────────── */
  async function saveRule() {
    if (!ruleForm.name.trim()) return alert('Rule name is required')
    setRuleSaving(true)
    const body = editRuleId
      ? { action: 'update', id: editRuleId, ...ruleForm }
      : { action: 'create', ...ruleForm }
    const res = await fetch('/api/return-rules', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const data = await res.json()
    setRuleSaving(false)
    if (data.error) return alert(data.error)
    setShowRuleModal(false)
    fetchAll()
  }

  function openNewRule() {
    setEditRuleId(null)
    setRuleForm({ ...EMPTY_RULE_FORM })
    setShowRuleModal(true)
  }

  function openEditRule(rule: DeductionRule) {
    setEditRuleId(rule.id)
    setRuleForm({
      name: rule.name,
      rule_type: rule.rule_type,
      flat_amount: rule.flat_amount || 0,
      percentage: rule.percentage || 0,
      time_tiers: rule.time_tiers || [{ days_after: 0, percentage: 0 }],
      is_active: rule.is_active,
    })
    setShowRuleModal(true)
  }

  async function deleteRule(id: string) {
    if (!confirm('Delete this rule?')) return
    await fetch('/api/return-rules', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    })
    fetchAll()
  }

  function addTier() {
    setRuleForm(f => ({ ...f, time_tiers: [...(f.time_tiers || []), { days_after: 0, percentage: 0 }] }))
  }
  function removeTier(idx: number) {
    setRuleForm(f => ({ ...f, time_tiers: (f.time_tiers || []).filter((_, i) => i !== idx) }))
  }
  function updateTier(idx: number, field: 'days_after' | 'percentage', val: number) {
    setRuleForm(f => {
      const tiers = [...(f.time_tiers || [])]
      tiers[idx] = { ...tiers[idx], [field]: val }
      return { ...f, time_tiers: tiers }
    })
  }

  function ruleTypeBadge(type: string) {
    const map: Record<string, string> = {
      flat: 'bg-blue-900 text-blue-300',
      percentage: 'bg-amber-900 text-amber-300',
      time_based: 'bg-purple-900 text-purple-300',
    }
    const labels: Record<string, string> = { flat: 'Flat ₹', percentage: 'Percentage %', time_based: 'Time-based' }
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[type] || ''}`}>{labels[type] || type}</span>
  }

  return (
    <div className="p-6 space-y-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Returns</h1>
          <p className="text-slate-400 text-sm mt-1">Manage product returns with configurable deduction rules</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'rules' && (
            <button onClick={openNewRule} className="btn-secondary text-sm">+ New Rule</button>
          )}
          {activeTab === 'returns' && (
            <button onClick={openReturnModal} className="btn-primary">+ New Return</button>
          )}
        </div>
      </div>

      {/* tabs */}
      <div className="flex gap-1 bg-slate-800 rounded-lg p-1 w-fit">
        {(['returns', 'rules'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTab === tab ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'
            }`}>
            {tab === 'returns' ? '📦 Returns' : '⚙️ Deduction Rules'}
          </button>
        ))}
      </div>

      {/* ── RETURNS LIST ─────────────────────────────────────── */}
      {activeTab === 'returns' && (
        loading ? <div className="text-slate-400">Loading...</div> :
        returns.length === 0 ? (
          <div className="card text-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </div>
              <p className="text-white font-medium">No returns recorded yet</p>
              <p className="text-slate-500 text-sm">Record a return by fetching a sale invoice</p>
              <button onClick={openReturnModal} className="btn-primary mt-2">+ New Return</button>
            </div>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Return #', 'Customer', 'Items', 'Return Amt', 'Deduction', 'Refund', 'Status', 'Date'].map(h => (
                    <th key={h} className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {returns.map(ret => (
                  <tr key={ret.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-xs text-blue-400">{ret.return_number}</td>
                    <td className="px-4 py-3.5 text-slate-300 text-sm">{ret.customer_name}</td>
                    <td className="px-4 py-3.5 text-slate-400 text-xs">
                      {(ret.return_items || []).map((i, idx) => (
                        <div key={idx}>{i.product_name} × {i.returned_qty}</div>
                      ))}
                    </td>
                    <td className="px-4 py-3.5 text-white">₹{Number(ret.total_amount).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3.5">
                      {ret.deduction_amount > 0
                        ? <span className="text-red-400">-₹{Number(ret.deduction_amount).toLocaleString('en-IN')}</span>
                        : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-green-400 font-semibold">
                      ₹{Number(ret.refund_amount ?? ret.total_amount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        ret.status === 'completed' ? 'bg-green-900 text-green-300' :
                        ret.status === 'cancelled' ? 'bg-red-900 text-red-300' :
                        'bg-amber-900 text-amber-300'
                      }`}>{ret.status}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs">
                      {new Date(ret.created_at).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── RULES LIST ───────────────────────────────────────── */}
      {activeTab === 'rules' && (
        loading ? <div className="text-slate-400">Loading...</div> :
        rules.length === 0 ? (
          <div className="card text-center py-12 text-slate-400">
            No deduction rules configured.<br />
            <span className="text-xs mt-1 block">Create rules to automatically deduct from return amounts.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map(rule => (
              <div key={rule.id} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{rule.name}</span>
                      {ruleTypeBadge(rule.rule_type)}
                      {!rule.is_active && <span className="text-xs text-slate-500">(inactive)</span>}
                    </div>
                    <div className="text-slate-400 text-xs mt-1">
                      {rule.rule_type === 'flat' && `Deduct ₹${rule.flat_amount} flat from every return`}
                      {rule.rule_type === 'percentage' && `Deduct ${rule.percentage}% from return amount`}
                      {rule.rule_type === 'time_based' && rule.time_tiers && (
                        <span>Time-based: {[...rule.time_tiers].sort((a, b) => a.days_after - b.days_after).map(t => `${t.percentage}% after ${t.days_after}d`).join(' · ')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <button onClick={() => openEditRule(rule)} className="text-xs text-slate-400 hover:text-white">Edit</button>
                    <button onClick={() => deleteRule(rule.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── NEW RETURN MODAL ──────────────────────────────────── */}
      <Modal open={showReturnModal} onClose={() => setShowReturnModal(false)} title="Record Return" allowBackdropClose={false}>
        <div className="p-6 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 130px)' }}>

          {/* Step 1: Invoice lookup */}
          <div>
            <label className="label-base">Invoice Number</label>
            <div className="flex gap-2">
              <input
                className="input-base flex-1"
                placeholder="e.g. INV/2025-26/001"
                value={invoiceInput}
                onChange={e => setInvoiceInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchSaleItems()}
              />
              <button
                onClick={fetchSaleItems}
                disabled={fetchingItems || !invoiceInput.trim()}
                className="btn-primary disabled:opacity-40 whitespace-nowrap"
              >
                {fetchingItems ? 'Fetching...' : 'Fetch'}
              </button>
            </div>
            {fetchError && <p className="text-red-400 text-xs mt-1">{fetchError}</p>}
          </div>

          {/* Step 2: Sale details + items */}
          {returnItems.length > 0 && (
            <>
              <div className="bg-slate-800/60 rounded-lg px-4 py-3 text-sm">
                <span className="text-slate-400">Customer: </span>
                <span className="text-white font-medium">{customerName}</span>
                {saleDate && (
                  <span className="text-slate-500 ml-3 text-xs">
                    Sale date: {new Date(saleDate).toLocaleDateString('en-IN')}
                  </span>
                )}
              </div>

              <div>
                <label className="label-base">Select Items to Return</label>
                <div className="rounded-lg overflow-hidden border border-slate-700">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Product</th>
                        <th className="text-center px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Sold</th>
                        <th className="text-center px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Return Qty</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {returnItems.map((item, idx) => (
                        <tr key={item.id} className="bg-slate-900/50">
                          <td className="px-3 py-2 text-slate-200">{item.product_name}</td>
                          <td className="px-3 py-2 text-center text-slate-400">{item.quantity}</td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number"
                              min={0}
                              max={item.quantity}
                              value={item.returned_qty}
                              onChange={e => {
                                const val = Math.min(Number(e.target.value), item.quantity)
                                setReturnItems(items => items.map((it, i) => i === idx ? { ...it, returned_qty: Math.max(0, val) } : it))
                              }}
                              className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-center text-sm text-white"
                            />
                          </td>
                          <td className="px-3 py-2 text-right text-white">
                            {item.returned_qty > 0
                              ? `₹${(item.returned_qty * item.unit_price).toLocaleString('en-IN')}`
                              : <span className="text-slate-600">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Step 3: Reason */}
              <div>
                <label className="label-base">Return Reason</label>
                <input
                  className="input-base"
                  placeholder="e.g. Defective product, Wrong size..."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                />
              </div>

              {/* Step 4: Deduction rule */}
              <div>
                <label className="label-base">Deduction Rule <span className="text-slate-500 font-normal">(optional)</span></label>
                <select
                  className="input-base"
                  value={deductionRuleId}
                  onChange={e => setDeductionRuleId(e.target.value)}
                >
                  <option value="">— No deduction (full refund) —</option>
                  {rules.filter(r => r.is_active).map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.rule_type})</option>
                  ))}
                </select>
                {rules.filter(r => r.is_active).length === 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    No active rules.{' '}
                    <button onClick={() => { setShowReturnModal(false); setActiveTab('rules') }} className="text-blue-400 hover:underline">
                      Configure deduction rules
                    </button>
                  </p>
                )}
              </div>

              {/* Step 5: Summary preview */}
              {returnTotal > 0 && (
                <div className="bg-slate-800 rounded-lg p-3 text-sm space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Return Amount ({selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''})</span>
                    <span>₹{returnTotal.toLocaleString('en-IN')}</span>
                  </div>
                  {deduction.amount > 0 && (
                    <>
                      <div className="flex justify-between text-red-400">
                        <span>Deduction</span><span>-₹{deduction.amount.toFixed(2)}</span>
                      </div>
                      <div className="text-slate-500 text-xs">{deduction.note}</div>
                    </>
                  )}
                  <div className="flex justify-between text-green-400 font-semibold border-t border-slate-700 pt-1 mt-1">
                    <span>Refund Amount</span><span>₹{refundAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {saveError && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{saveError}</p>
          )}
        </div>

        {/* Fixed footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
          <div className="text-sm text-slate-400">
            {returnTotal > 0 && (
              <span className="text-white font-semibold">Refund: ₹{refundAmount.toLocaleString('en-IN')}</span>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowReturnModal(false)} disabled={returnSaving} className="btn-secondary">Cancel</button>
            <button
              onClick={saveReturn}
              disabled={returnSaving || selectedItems.length === 0}
              className="btn-primary disabled:opacity-40"
            >
              {returnSaving ? 'Saving...' : 'Record Return'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── RULE MODAL ────────────────────────────────────────── */}
      <Modal open={showRuleModal} onClose={() => setShowRuleModal(false)}
        title={editRuleId ? 'Edit Rule' : 'New Deduction Rule'} allowBackdropClose={false}>
        <div className="p-6 space-y-4">

          <div>
            <label className="label-base">Rule Name *</label>
            <input className="input-base" placeholder="e.g. Standard 10% deduction"
              value={ruleForm.name} onChange={e => setRuleForm(f => ({ ...f, name: e.target.value }))} />
          </div>

          <div>
            <label className="label-base">Rule Type</label>
            <select className="input-base" value={ruleForm.rule_type}
              onChange={e => setRuleForm(f => ({ ...f, rule_type: e.target.value as typeof f.rule_type }))}>
              <option value="flat">Flat Amount — fixed ₹ deducted</option>
              <option value="percentage">Percentage — % of return amount</option>
              <option value="time_based">Time-Based — % depends on days since sale</option>
            </select>
          </div>

          {ruleForm.rule_type === 'flat' && (
            <div>
              <label className="label-base">Deduction Amount (₹)</label>
              <NumInput value={ruleForm.flat_amount} onChange={v => setRuleForm(f => ({ ...f, flat_amount: v }))} placeholder="0" />
            </div>
          )}

          {ruleForm.rule_type === 'percentage' && (
            <div>
              <label className="label-base">Percentage (%)</label>
              <NumInput value={ruleForm.percentage} onChange={v => setRuleForm(f => ({ ...f, percentage: v }))} placeholder="0" max={100} />
            </div>
          )}

          {ruleForm.rule_type === 'time_based' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label-base">Deduction Tiers</label>
                <button onClick={addTier} className="text-xs text-blue-400 hover:text-blue-300">+ Add Tier</button>
              </div>
              <p className="text-xs text-slate-500 mb-2">Highest matching tier is applied.</p>
              {(ruleForm.time_tiers || []).map((tier, idx) => (
                <div key={idx} className="flex items-center gap-3 mb-2 bg-slate-800 rounded-lg p-3">
                  <div className="flex-1">
                    <label className="label-base text-xs">After (days)</label>
                    <NumInput value={tier.days_after} onChange={v => updateTier(idx, 'days_after', v)} placeholder="0" min={0} />
                  </div>
                  <div className="flex-1">
                    <label className="label-base text-xs">Deduct (%)</label>
                    <NumInput value={tier.percentage} onChange={v => updateTier(idx, 'percentage', v)} placeholder="0" min={0} max={100} />
                  </div>
                  {(ruleForm.time_tiers || []).length > 1 && (
                    <button onClick={() => removeTier(idx)} className="text-red-400 hover:text-red-300 text-lg leading-none mt-4">×</button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input type="checkbox" id="rule-active" checked={ruleForm.is_active}
              onChange={e => setRuleForm(f => ({ ...f, is_active: e.target.checked }))}
              className="accent-blue-500" />
            <label htmlFor="rule-active" className="text-slate-300 text-sm">Active</label>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowRuleModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={saveRule} disabled={ruleSaving} className="btn-primary flex-1 disabled:opacity-50">
              {ruleSaving ? 'Saving...' : editRuleId ? 'Update' : 'Create Rule'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
