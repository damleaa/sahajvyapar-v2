'use client'
import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui'

declare global { interface Window { Razorpay: any } }

// GST calculation (18% inclusive)
const GST_RATE = 0.18
const extractGST = (inclusive: number) => {
  const gst = inclusive - (inclusive / (1 + GST_RATE))
  const base = inclusive / (1 + GST_RATE)
  return { base: Math.round(base * 100) / 100, cgst: Math.round(gst / 2 * 100) / 100, sgst: Math.round(gst / 2 * 100) / 100, total_gst: Math.round(gst * 100) / 100 }
}

const PLANS = [
  { id: 'starter', name: 'Starter', price: 399, features: ['100 products', 'Sales recording', 'Basic reports', 'Expenses'] },
  { id: 'growth',  name: 'Growth',  price: 699, features: ['500 products', 'GST Invoice + WhatsApp', 'Customers + Ledger', 'Suppliers + PO + Returns'] },
  { id: 'pro',     name: 'Pro',     price: 999, features: ['Unlimited products', 'Everything in Growth', 'Exhibitions + P&L', 'Full Reports + Insights'] },
]

export default function SubscriptionSection() {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showPlans, setShowPlans] = useState(false)
  const [showGST, setShowGST] = useState(false)
  const { toast, ToastContainer } = useToast()

  useEffect(() => {
    loadStatus()
    if (!document.getElementById('razorpay-script')) {
      const s = document.createElement('script')
      s.id = 'razorpay-script'
      s.src = 'https://checkout.razorpay.com/v1/checkout.js'
      s.async = true
      document.body.appendChild(s)
    }
  }, [])

  const loadStatus = async () => {
    try {
      const r = await fetch('/api/subscriptions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_status' })
      }).then(r => r.json())
      setStatus(r)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const subscribe = async (plan: string) => {
    setProcessing(true)
    try {
      const r = await fetch('/api/subscriptions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_subscription', plan })
      }).then(r => r.json())

      if (r.error) { toast(r.error, 'error'); setProcessing(false); return }
      if (!window.Razorpay) { toast('Payment gateway loading. Try again in a moment.', 'error'); setProcessing(false); return }

      const rzp = new window.Razorpay({
        key: r.key,
        subscription_id: r.subscription_id,
        name: 'SahajVyapar',
        description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan — Rs.${r.amount}/month (incl. 18% GST)`,
        prefill: { name: r.tenant?.name || '', email: r.tenant?.email || '' },
        notes: { business_name: r.tenant?.business_name || '', gstin: r.tenant?.gstin || '' },
        theme: { color: '#2563eb' },
        handler: () => {
          toast('Payment successful! Your plan is being activated...', 'success')
          setShowPlans(false); setProcessing(false)
          setTimeout(() => loadStatus(), 3000)
        },
        modal: { ondismiss: () => setProcessing(false) }
      })
      rzp.on('payment.failed', (res: any) => {
        toast(`Payment failed: ${res.error?.description || 'Please try again'}`, 'error')
        setProcessing(false)
      })
      rzp.open()
    } catch { toast('Something went wrong. Please try again.', 'error'); setProcessing(false) }
  }

  const cancelSubscription = async () => {
    if (!confirm('Cancel auto-renewal? You can still use the app until your current period ends.')) return
    setProcessing(true)
    const r = await fetch('/api/subscriptions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel_subscription' })
    }).then(r => r.json())
    setProcessing(false)
    if (r.error) { toast(r.error, 'error'); return }
    toast(r.message || 'Auto-renewal cancelled.')
    loadStatus()
  }

  if (loading) return <div className="card p-6"><div className="animate-pulse h-24 bg-slate-800 rounded-lg" /></div>

  const expiresAt = status?.plan_expires_at ? new Date(status.plan_expires_at) : null
  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / 864e5) : 0
  const isExpired = daysLeft <= 0
  const isTrial = status?.plan_status === 'trial'
  const isActive = status?.plan_status === 'active'
  const isCancelled = status?.plan_status === 'cancelled'

  const planColor: any = { starter: 'text-amber-400', growth: 'text-blue-400', pro: 'text-purple-400' }
  const planBg: any = { starter: 'bg-amber-500/10 border-amber-500/20', growth: 'bg-blue-500/10 border-blue-500/20', pro: 'bg-purple-500/10 border-purple-500/20' }

  const currentPlan = PLANS.find(p => p.id === status?.plan)
  const gst = currentPlan ? extractGST(currentPlan.price) : null

  return (
    <div className="card p-6">
      <ToastContainer />
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white font-semibold">Plan & Subscription</h2>
        <button onClick={() => setShowGST(!showGST)} className="text-xs text-slate-500 hover:text-slate-300 underline">
          {showGST ? 'Hide' : 'View'} GST breakup
        </button>
      </div>

      {/* GST Breakup */}
      {showGST && gst && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-5 text-sm">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">GST Breakup — {currentPlan?.name} Plan</div>
          <div className="space-y-1.5">
            {[
              ['Base amount (excl. GST)', `Rs.${gst.base}`],
              ['CGST @ 9%', `Rs.${gst.cgst}`],
              ['SGST @ 9%', `Rs.${gst.sgst}`],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between text-xs">
                <span className="text-slate-400">{l}</span>
                <span className="text-slate-300">{v}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-semibold border-t border-slate-700 pt-2 mt-2">
              <span className="text-white">Total (incl. GST)</span>
              <span className="text-white">Rs.{currentPlan?.price}</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            SAC Code: 998314 &middot; Seller GSTIN: 27AAICE7117P1Z3 &middot; 18% GST inclusive
          </div>
          <div className="mt-1 text-xs text-slate-500">
            For ITC claims, share your GSTIN with us at support@sahajvyapar.in — we will issue a B2B invoice.
          </div>
        </div>
      )}

      {/* Current Plan Card */}
      <div className={`rounded-xl border p-5 mb-6 ${planBg[status?.plan] || 'bg-slate-800/50 border-slate-700'}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Current Plan</div>
            <div className={`text-2xl font-bold capitalize ${planColor[status?.plan] || 'text-white'}`}>{status?.plan}</div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                isActive ? 'bg-green-500/15 text-green-400' :
                isTrial ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400'
              }`}>{isTrial ? 'Trial' : isActive ? 'Active' : isCancelled ? 'Cancelled' : 'Expired'}</span>
              {expiresAt && (
                <span className={`text-sm ${isExpired ? 'text-red-400' : daysLeft <= 5 ? 'text-amber-400' : 'text-slate-400'}`}>
                  {isExpired ? 'Expired' : `${daysLeft} days left`} &middot; {expiresAt.toLocaleDateString('en-IN')}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-slate-400 text-xs mb-1">Monthly</div>
            <div className={`text-xl font-bold ${planColor[status?.plan] || 'text-white'}`}>Rs.{currentPlan?.price || 0}</div>
            <div className="text-xs text-slate-500">incl. 18% GST</div>
          </div>
        </div>

        {isExpired && !isCancelled && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            ⚠️ Your plan has expired. Subscribe now to continue.
          </div>
        )}
        {!isExpired && daysLeft <= 5 && !isCancelled && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-400">
            ⏰ {isTrial ? 'Trial' : 'Plan'} expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}. Subscribe to avoid interruption.
          </div>
        )}
        {isCancelled && (
          <div className="mt-4 p-3 bg-slate-700/50 rounded-lg text-sm text-slate-400">
            ℹ️ Auto-renewal cancelled. Access continues until {expiresAt?.toLocaleDateString('en-IN')}.
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap mb-2">
        {(!isActive || isTrial || isExpired || isCancelled) && (
          <button onClick={() => setShowPlans(true)} className="btn-primary">
            {isTrial ? 'Subscribe Now' : isExpired ? 'Renew Now' : isCancelled ? 'Resubscribe' : 'Subscribe'}
          </button>
        )}
        {isActive && !isCancelled && (
          <>
            <button onClick={() => setShowPlans(true)} className="btn-secondary">Change Plan</button>
            <button onClick={cancelSubscription} disabled={processing}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-all disabled:opacity-50">
              Cancel Auto-renewal
            </button>
          </>
        )}
      </div>
      <p className="text-slate-600 text-xs">All prices inclusive of 18% GST &middot; Auto-renews monthly &middot; Cancel anytime &middot; Secure payment via Razorpay</p>

      {/* Plan Selection */}
      {showPlans && (
        <div className="mt-6 pt-6 border-t border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium">Choose a Plan</h3>
            <button onClick={() => setShowPlans(false)} className="text-slate-500 hover:text-slate-300 text-sm">✕ Close</button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {PLANS.map(plan => {
              const isCurrent = plan.id === status?.plan && isActive && !isCancelled
              const g = extractGST(plan.price)
              return (
                <div key={plan.id} className={`rounded-xl border-2 p-5 transition-all ${isCurrent ? 'border-blue-500 bg-blue-500/5' : 'border-slate-700 hover:border-slate-600'}`}>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{plan.name}</div>
                  <div className="text-2xl font-bold text-white mb-0.5">Rs.{plan.price}<span className="text-sm font-normal text-slate-400">/mo</span></div>
                  <div className="text-xs text-slate-600 mb-3">Base Rs.{g.base} + GST Rs.{g.total_gst}</div>
                  <ul className="mb-4 space-y-1.5">
                    {plan.features.map(f => (
                      <li key={f} className="text-xs text-slate-400 flex items-center gap-1.5">
                        <span className="text-green-400">✓</span>{f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <div className="text-center text-xs text-blue-400 font-semibold py-2 border border-blue-500/30 rounded-lg">Current Plan ✓</div>
                  ) : (
                    <button onClick={() => subscribe(plan.id)} disabled={processing}
                      className="w-full py-2.5 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-50">
                      {processing ? 'Opening...' : `Subscribe Rs.${plan.price}/mo`}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-slate-600 text-xs mt-4 text-center">
            All prices inclusive of 18% GST (SAC: 998314) &middot; GSTIN: 27AAICE7117P1Z3 &middot; Secure payment via Razorpay
          </p>
        </div>
      )}
    </div>
  )
}
