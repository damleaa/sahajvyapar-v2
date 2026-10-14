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
  days_after: number   // if return is after this many days from sale date...
  percentage: number   // ...deduct this %
}

interface Return {
  id: string
  invoice_number: string
  customer_name: string
  product_name: string
  quantity: number
  return_amount: number
  deduction_type?: string
  deduction_amount?: number
  refund_amount?: number
  deduction_note?: string
  reason: string
  status: string
  created_at: string
  sale_date?: string
}

const EMPTY_RULE_FORM = {
  name: '',
  rule_type: 'percentage' as 'flat' | 'percentage' | 'time_based',
  flat_amount: 0,
  percentage: 0,
  time_tiers: [{ days_after: 0, percentage: 0 }] as TimeTier[],
  is_active: true,
}

const EMPTY_RETURN_FORM = {
  invoice_number: '',
  customer_name: '',
  product_name: '',
  quantity: 1,
  return_amount: 0,
  reason: '',
  deduction_rule_id: '',
  sale_date: '',
}

export default function ReturnsPage() {
  const [returns, setReturns] = useState<Return[]>([])
  const [rules, setRules] = useState<DeductionRule[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'returns' | 'rules'>('returns')

  // return modal
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [returnForm, setReturnForm] = useState({ ...EMPTY_RETURN_FORM })
  const [returnSaving, setReturnSaving] = useState(false)

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
    setReturns(retData.returns || [])
    setRules(rulesData.rules || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  /* ── compute deduction preview ────────────────────────────── */
  function computeDeduction(returnAmount: number, ruleid: string, saleDate: string): { type: string; amount: number; note: string } {
    const rule = rules.find(r => r.id === ruleid)
    if (!rule) return { type: '', amount: 0, note: '' }

    if (rule.rule_type === 'flat') {
      return { type: 'flat', amount: rule.flat_amount || 0, note: `Flat deduction: ₹${rule.flat_amount}` }
    }

    if (rule.rule_type === 'percentage') {
      const amt = (returnAmount * (rule.percentage || 0)) / 100
      return { type: 'percentage', amount: amt, note: `${rule.percentage}% deduction` }
    }

    if (rule.rule_type === 'time_based' && saleDate && rule.time_tiers) {
      const daysDiff = Math.floor((Date.now() - new Date(saleDate).getTime()) / (1000 * 60 * 60 * 24))
      // Find the highest tier where days_after <= daysDiff (sorted desc)
      const sorted = [...rule.time_tiers].sort((a, b) => b.days_after - a.days_after)
      const tier = sorted.find(t => daysDiff >= t.days_after)
      if (!tier) return { type: 'time_based', amount: 0, note: 'No deduction (within free return window)' }
      const amt = (returnAmount * tier.percentage) / 100
      return {
        type: 'time_based',
        amount: amt,
        note: `${tier.percentage}% deduction (return after ${tier.days_after} days — ${daysDiff} days since sale)`,
      }
    }

    return { type: '', amount: 0, note: '' }
  }

  // live deduction preview for current return form
  const deductionPreview = returnForm.deduction_rule_id
    ? computeDeduction(returnForm.return_amount, returnForm.deduction_rule_id, returnForm.sale_date)
    : null
  const refundAmount = returnForm.return_amount - (deductionPreview?.amount || 0)

  /* ── save return ──────────────────────────────────────────── */
  async function saveReturn() {
    if (!returnForm.customer_name && !returnForm.invoice_number) return alert('Enter invoice number or customer name')
    if (!returnForm.return_amount) return alert('Enter return amount')
    setReturnSaving(true)
    const body = {
      action: 'create',
      ...returnForm,
      deduction_type: deductionPreview?.type || null,
      deduction_amount: deductionPreview?.amount || 0,
      deduction_note: deductionPreview?.note || null,
      refund_amount: refundAmount,
    }
    const res = await fetch('/api/returns', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const data = await res.json()
    setReturnSaving(false)
    if (data.error) return alert(data.error)
    setShowReturnModal(false)
    setReturnForm({ ...EMPTY_RETURN_FORM })
    fetchAll()
  }

  /* ── save deduction rule ──────────────────────────────────── */
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

  /* ── tier helpers ─────────────────────────────────────────── */
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
            <button onClick={() => { setReturnForm({ ...EMPTY_RETURN_FORM }); setShowReturnModal(true) }} className="btn-primary">
              + New Return
            </button>
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
          <div className="card text-center py-12 text-slate-400">No returns recorded yet.</div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="text-left pb-3 pr-4">Invoice / Customer</th>
                  <th className="text-left pb-3 pr-4">Product</th>
                  <th className="text-right pb-3 pr-4">Return Amt</th>
                  <th className="text-right pb-3 pr-4">Deduction</th>
                  <th className="text-right pb-3 pr-4">Refund</th>
                  <th className="text-left pb-3 pr-4">Reason</th>
                  <th className="text-left pb-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {returns.map(ret => (
                  <tr key={ret.id} className="hover:bg-slate-700/20">
                    <td className="py-3 pr-4">
                      <div className="text-blue-400 font-mono text-xs">{ret.invoice_number}</div>
                      <div className="text-white text-xs">{ret.customer_name}</div>
                    </td>
                    <td className="py-3 pr-4 text-slate-300">{ret.product_name} × {ret.quantity}</td>
                    <td className="py-3 pr-4 text-right text-white">₹{Number(ret.return_amount).toFixed(2)}</td>
                    <td className="py-3 pr-4 text-right">
                      {ret.deduction_amount ? (
                        <span className="text-red-400">-₹{Number(ret.deduction_amount).toFixed(2)}</span>
                      ) : <span className="text-slate-600">—</span>}
                      {ret.deduction_note && (
                        <div className="text-slate-500 text-xs">{ret.deduction_note}</div>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-right text-green-400 font-medium">
                      ₹{Number(ret.refund_amount ?? ret.return_amount).toFixed(2)}
                    </td>
                    <td className="py-3 pr-4 text-slate-400 text-xs">{ret.reason}</td>
                    <td className="py-3 text-slate-500 text-xs">{new Date(ret.created_at).toLocaleDateString('en-IN')}</td>
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
                        <span>
                          Time-based tiers:{' '}
                          {[...rule.time_tiers]
                            .sort((a, b) => a.days_after - b.days_after)
                            .map(t => `${t.percentage}% after ${t.days_after}d`)
                            .join(' · ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
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
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-base">Invoice #</label>
              <input className="input-base" placeholder="INV-001" value={returnForm.invoice_number}
                onChange={e => setReturnForm(f => ({ ...f, invoice_number: e.target.value }))} />
            </div>
            <div>
              <label className="label-base">Sale Date</label>
              <input type="date" className="input-base" value={returnForm.sale_date}
                onChange={e => setReturnForm(f => ({ ...f, sale_date: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="label-base">Customer Name</label>
            <input className="input-base" placeholder="Customer name" value={returnForm.customer_name}
              onChange={e => setReturnForm(f => ({ ...f, customer_name: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-base">Product Name</label>
              <input className="input-base" placeholder="Product" value={returnForm.product_name}
                onChange={e => setReturnForm(f => ({ ...f, product_name: e.target.value }))} />
            </div>
            <div>
              <label className="label-base">Qty Returned</label>
              <NumInput value={returnForm.quantity} onChange={v => setReturnForm(f => ({ ...f, quantity: v }))} min={1} placeholder="1" />
            </div>
          </div>

          <div>
            <label className="label-base">Return Amount (₹)</label>
            <NumInput value={returnForm.return_amount} onChange={v => setReturnForm(f => ({ ...f, return_amount: v }))} placeholder="0.00" />
          </div>

          <div>
            <label className="label-base">Return Reason</label>
            <input className="input-base" placeholder="e.g. Defective, Wrong size..." value={returnForm.reason}
              onChange={e => setReturnForm(f => ({ ...f, reason: e.target.value }))} />
          </div>

          {/* Deduction rule */}
          <div>
            <label className="label-base">Deduction Rule (optional)</label>
            <select className="input-base" value={returnForm.deduction_rule_id}
              onChange={e => setReturnForm(f => ({ ...f, deduction_rule_id: e.target.value }))}>
              <option value="">— No deduction (full refund) —</option>
              {rules.filter(r => r.is_active).map(r => (
                <option key={r.id} value={r.id}>{r.name} ({r.rule_type})</option>
              ))}
            </select>
          </div>

          {/* Live deduction preview */}
          {returnForm.return_amount > 0 && (
            <div className="bg-slate-800 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Return Amount</span><span>₹{returnForm.return_amount.toFixed(2)}</span>
              </div>
              {deductionPreview && deductionPreview.amount > 0 && (
                <>
                  <div className="flex justify-between text-red-400">
                    <span>Deduction</span><span>-₹{deductionPreview.amount.toFixed(2)}</span>
                  </div>
                  <div className="text-slate-500 text-xs">{deductionPreview.note}</div>
                </>
              )}
              <div className="flex justify-between text-green-400 font-semibold border-t border-slate-700 pt-1">
                <span>Refund Amount</span><span>₹{Math.max(0, refundAmount).toFixed(2)}</span>
              </div>
            </div>
          )}

          {rules.filter(r => r.is_active).length === 0 && (
            <div className="text-xs text-slate-500">
              No active deduction rules. Go to the{' '}
              <button onClick={() => { setShowReturnModal(false); setActiveTab('rules') }}
                className="text-blue-400 hover:underline">Deduction Rules tab</button>{' '}
              to configure them.
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowReturnModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={saveReturn} disabled={returnSaving} className="btn-primary flex-1 disabled:opacity-50">
              {returnSaving ? 'Saving...' : 'Record Return'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── RULE MODAL ────────────────────────────────────────── */}
      <Modal open={showRuleModal} onClose={() => setShowRuleModal(false)}
        title={editRuleId ? 'Edit Rule' : 'New Deduction Rule'} allowBackdropClose={false}>
        <div className="space-y-4">

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

          {/* flat */}
          {ruleForm.rule_type === 'flat' && (
            <div>
              <label className="label-base">Deduction Amount (₹)</label>
              <NumInput value={ruleForm.flat_amount} onChange={v => setRuleForm(f => ({ ...f, flat_amount: v }))} placeholder="0" />
              <p className="text-xs text-slate-500 mt-1">This fixed amount will be deducted from every return using this rule.</p>
            </div>
          )}

          {/* percentage */}
          {ruleForm.rule_type === 'percentage' && (
            <div>
              <label className="label-base">Percentage (%)</label>
              <NumInput value={ruleForm.percentage} onChange={v => setRuleForm(f => ({ ...f, percentage: v }))} placeholder="0" max={100} />
              <p className="text-xs text-slate-500 mt-1">This % of the return amount will be deducted.</p>
            </div>
          )}

          {/* time_based */}
          {ruleForm.rule_type === 'time_based' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label-base">Deduction Tiers</label>
                <button onClick={addTier} className="text-xs text-blue-400 hover:text-blue-300">+ Add Tier</button>
              </div>
              <p className="text-xs text-slate-500 mb-2">
                Set % deductions based on how many days after the sale date the return happens.
                The highest matching tier is applied.
              </p>
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
              <div className="text-xs text-slate-500 mt-1">
                Example: 0% if returned within 7 days, 5% after 7 days, 10% after 30 days → add 3 tiers.
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input type="checkbox" id="rule-active" checked={ruleForm.is_active}
              onChange={e => setRuleForm(f => ({ ...f, is_active: e.target.checked }))}
              className="accent-blue-500" />
            <label htmlFor="rule-active" className="text-slate-300 text-sm">Active (available to select on returns)</label>
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
