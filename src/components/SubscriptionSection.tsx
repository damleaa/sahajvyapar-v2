'use client'
import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui'

declare global {
  interface Window { Razorpay: any }
}

const PLANS = [
  { id: 'starter', name: 'Starter', price: 399, features: ['100 products', 'Sales recording', 'Basic reports'] },
  { id: 'growth', name: 'Growth', price: 699, features: ['500 products', 'GST Invoice + WhatsApp', 'Customers + Ledger', 'Suppliers + PO + Returns'] },
  { id: 'pro', name: 'Pro', price: 999, features: ['Unlimited products', 'Everything in Growth', 'Exhibitions + P&L', 'Full Reports + Insights'] },
]

export default function SubscriptionSection() {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showPlans, setShowPlans] = useState(false)
  const { toast, ToastContainer } = useToast()

  useEffect(() => {
    loadStatus()
    // Load Razorpay script
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    document.body.appendChild(script)
  }, [])

  const loadStatus = async () => {
    const r = await fetch('/api/subscriptions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_status' })
    }).then(r => r.json())
    setStatus(r)
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

      const options = {
        key: r.key,
        subscription_id: r.subscription_id,
        name: 'SahajVyapar',
        description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan — ₹${r.amount}/month`,
        image: '/logo.png',
        prefill: {
          name: r.tenant.owner_name,
          email: r.tenant.email,
        },
        notes: { business_name: r.tenant.business_name },
        theme: { color: '#2563eb' },
        handler: async (response: any) => {
          toast('Payment successful! Your plan is now active.', 'success')
          setShowPlans(false)
          setTimeout(() => loadStatus(), 2000)
        },
        modal: {
          ondismiss: () => {
            setProcessing(false)
          }
        }
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
      setProcessing(false)
    } catch (err) {
      toast('Something went wrong. Please try again.', 'error')
      setProcessing(false)
    }
  }

  const cancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel? You can still use the app until your current period ends.')) return
    setProcessing(true)
    const r = await fetch('/api/subscriptions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel_subscription' })
    }).then(r => r.json())
    setProcessing(false)
    if (r.error) { toast(r.error, 'error'); return }
    toast(r.message || 'Subscription cancelled.')
    loadStatus()
  }

  if (loading) return <div className="card p-6 animate-pulse"><div className="h-4 bg-slate-800 rounded w-1/3" /></div>

  const expiresAt = status?.plan_expires_at ? new Date(status.plan_expires_at) : null
  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / 864e5) : 0
  const isExpired = daysLeft <= 0
  const isTrial = status?.plan_status === 'trial'
  const isActive = status?.plan_status === 'active'
  const isCancelled = status?.plan_status === 'cancelled'

  const planColor: any = { starter: 'text-amber-400', growth: 'text-blue-400', pro: 'text-purple-400' }
  const planBg: any = { starter: 'bg-amber-500/10 border-amber-500/20', growth: 'bg-blue-500/10 border-blue-500/20', pro: 'bg-purple-500/10 border-purple-500/20' }

  return (
    <div className="card p-6">
      <ToastContainer />
      <h2 className="text-white font-semibold mb-6">Plan & Subscription</h2>

      {/* Current Plan Status */}
      <div className={`rounded-xl border p-5 mb-6 ${planBg[status?.plan] || 'bg-slate-800/50 border-slate-700'}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Current Plan</div>
            <div className={`text-2xl font-bold capitalize ${planColor[status?.plan] || 'text-white'}`}>
              {status?.plan || 'Unknown'}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className={`badge ${isActive ? 'badge-green' : isTrial ? 'badge-yellow' : 'badge-red'}`}>
                {isTrial ? 'Trial' : isActive ? 'Active' : isCancelled ? 'Cancelled' : 'Expired'}
              </span>
              {expiresAt && (
                <span className={`text-sm ${isExpired ? 'text-red-400' : daysLeft <= 5 ? 'text-amber-400' : 'text-slate-400'}`}>
                  {isExpired ? 'Expired' : `${daysLeft} days left`} · {expiresAt.toLocaleDateString('en-IN')}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-slate-400 text-xs mb-1">Monthly</div>
            <div className={`text-xl font-bold ${planColor[status?.plan] || 'text-white'}`}>
              ₹{PLANS.find(p => p.id === status?.plan)?.price || 0}
            </div>
          </div>
        </div>

        {/* Expiry warning */}
        {(isExpired || daysLeft <= 5) && !isCancelled && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${isExpired ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'}`}>
            {isExpired
              ? '⚠️ Your plan has expired. Subscribe to continue using SahajVyapar.'
              : `⏰ Your ${isTrial ? 'trial' : 'plan'} expires in ${daysLeft} days. Subscribe to avoid interruption.`
            }
          </div>
        )}

        {isCancelled && (
          <div className="mt-4 p-3 bg-slate-700/50 rounded-lg text-sm text-slate-400">
            ℹ️ Subscription cancelled. Access continues until {expiresAt?.toLocaleDateString('en-IN')}.
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap">
        {(!isActive || isTrial || isExpired) && (
          <button onClick={() => setShowPlans(true)} className="btn-primary">
            {isTrial || isExpired ? 'Subscribe Now' : 'Change Plan'}
          </button>
        )}
        {isActive && !isCancelled && (
          <>
            <button onClick={() => setShowPlans(true)} className="btn-secondary">Change Plan</button>
            <button onClick={cancelSubscription} disabled={processing} className="px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-all">
              Cancel Subscription
            </button>
          </>
        )}
        {isCancelled && (
          <button onClick={() => setShowPlans(true)} className="btn-primary">Resubscribe</button>
        )}
      </div>

      {/* Plan Selection */}
      {showPlans && (
        <div className="mt-6 pt-6 border-t border-slate-800">
          <h3 className="text-white font-medium mb-4">Choose a Plan</h3>
          <div className="grid grid-cols-3 gap-4">
            {PLANS.map(plan => {
              const isCurrent = plan.id === status?.plan && isActive
              return (
                <div key={plan.id} className={`rounded-xl border-2 p-5 transition-all ${isCurrent ? 'border-blue-500 bg-blue-500/5' : 'border-slate-700 hover:border-slate-600'}`}>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{plan.name}</div>
                  <div className="text-2xl font-bold text-white mb-1">₹{plan.price}<span className="text-sm font-normal text-slate-400">/mo</span></div>
                  <ul className="mt-3 mb-4 space-y-1.5">
                    {plan.features.map(f => (
                      <li key={f} className="text-xs text-slate-400 flex items-center gap-1.5">
                        <span className="text-green-400">✓</span>{f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <div className="text-center text-xs text-blue-400 font-medium py-2">Current Plan</div>
                  ) : (
                    <button
                      onClick={() => subscribe(plan.id)}
                      disabled={processing}
                      className="w-full py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-50"
                    >
                      {processing ? 'Processing...' : `Subscribe ₹${plan.price}/mo`}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          <button onClick={() => setShowPlans(false)} className="mt-4 text-slate-400 text-sm hover:text-slate-200">Cancel</button>
        </div>
      )}
    </div>
  )
}
