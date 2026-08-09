'use client'
import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui'

declare global { interface Window { Razorpay: any } }

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
    // Load Razorpay checkout script
    if (!document.getElementById('razorpay-script')) {
      const script = document.createElement('script')
      script.id = 'razorpay-script'
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      document.body.appendChild(script)
    }
  }, [])

  const loadStatus = async () => {
    try {
      const r = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_status' })
      }).then(r => r.json())
      setStatus(r)
    } catch (e) {
      console.error('Failed to load subscription status:', e)
    }
    setLoading(false)
  }

  const subscribe = async (plan: string) => {
    setProcessing(true)
    try {
      // Step 1: Create Razorpay subscription on our server
      const r = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_subscription', plan })
      }).then(res => res.json())

      if (r.error) {
        toast(r.error, 'error')
        setProcessing(false)
        return
      }

      // Step 2: Check Razorpay is loaded
      if (!window.Razorpay) {
        toast('Payment gateway is loading. Please try again in a moment.', 'error')
        setProcessing(false)
        return
      }

      // Step 3: Open Razorpay checkout
      const options = {
        key: r.key,
        subscription_id: r.subscription_id,
        name: 'SahajVyapar',
        description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan — Rs.${r.amount}/month`,
        prefill: {
          name: r.tenant?.name || '',
          email: r.tenant?.email || '',
        },
        notes: {
          business_name: r.tenant?.business_name || '',
        },
        theme: { color: '#2563eb' },
        handler: (response: any) => {
          // Payment successful — webhook will activate the plan
          // response contains: razorpay_payment_id, razorpay_subscription_id, razorpay_signature
          toast('Payment successful! Your plan is being activated...', 'success')
          setShowPlans(false)
          setProcessing(false)
          // Reload status after 3 seconds (webhook may take a moment)
          setTimeout(() => loadStatus(), 3000)
        },
        modal: {
          ondismiss: () => {
            setProcessing(false)
          }
        }
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', (response: any) => {
        toast(`Payment failed: ${response.error?.description || 'Please try again'}`, 'error')
        setProcessing(false)
      })
      rzp.open()

    } catch (err: any) {
      toast('Something went wrong. Please try again.', 'error')
      setProcessing(false)
    }
  }

  const cancelSubscription = async () => {
    if (!confirm('Cancel subscription? You can still use the app until your current period ends.')) return
    setProcessing(true)
    const r = await fetch('/api/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel_subscription' })
    }).then(r => r.json())
    setProcessing(false)
    if (r.error) { toast(r.error, 'error'); return }
    toast(r.message || 'Subscription cancelled.')
    loadStatus()
  }

  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-800 rounded w-1/4" />
          <div className="h-16 bg-slate-800 rounded" />
        </div>
      </div>
    )
  }

  const expiresAt = status?.plan_expires_at ? new Date(status.plan_expires_at) : null
  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / 864e5) : 0
  const isExpired = daysLeft <= 0
  const isTrial = status?.plan_status === 'trial'
  const isActive = status?.plan_status === 'active'
  const isCancelled = status?.plan_status === 'cancelled'

  const planColor: any = { starter: 'text-amber-400', growth: 'text-blue-400', pro: 'text-purple-400' }
  const planBg: any = {
    starter: 'bg-amber-500/10 border-amber-500/20',
    growth: 'bg-blue-500/10 border-blue-500/20',
    pro: 'bg-purple-500/10 border-purple-500/20'
  }

  return (
    <div className="card p-6">
      <ToastContainer />
      <h2 className="text-white font-semibold mb-6">Plan & Subscription</h2>

      {/* Current Plan Card */}
      <div className={`rounded-xl border p-5 mb-6 ${planBg[status?.plan] || 'bg-slate-800/50 border-slate-700'}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Current Plan</div>
            <div className={`text-2xl font-bold capitalize ${planColor[status?.plan] || 'text-white'}`}>
              {status?.plan || 'Unknown'}
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                isActive ? 'bg-green-500/15 text-green-400' :
                isTrial ? 'bg-amber-500/15 text-amber-400' :
                'bg-red-500/15 text-red-400'
              }`}>
                {isTrial ? 'Trial' : isActive ? 'Active' : isCancelled ? 'Cancelled' : 'Expired'}
              </span>
              {expiresAt && (
                <span className={`text-sm ${isExpired ? 'text-red-400' : daysLeft <= 5 ? 'text-amber-400' : 'text-slate-400'}`}>
                  {isExpired ? 'Expired' : `${daysLeft} days left`} · expires {expiresAt.toLocaleDateString('en-IN')}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-slate-400 text-xs mb-1">Monthly</div>
            <div className={`text-xl font-bold ${planColor[status?.plan] || 'text-white'}`}>
              Rs.{PLANS.find(p => p.id === status?.plan)?.price || 0}
            </div>
          </div>
        </div>

        {/* Warning banners */}
        {isExpired && !isCancelled && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            ⚠️ Your plan has expired. Subscribe now to continue using SahajVyapar.
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

      {/* Action Buttons */}
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
      <p className="text-slate-600 text-xs">Auto-renews monthly · Cancel anytime · Secure payment via Razorpay</p>

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
              return (
                <div key={plan.id} className={`rounded-xl border-2 p-5 transition-all ${
                  isCurrent ? 'border-blue-500 bg-blue-500/5' : 'border-slate-700 hover:border-slate-600'
                }`}>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{plan.name}</div>
                  <div className="text-2xl font-bold text-white mb-1">
                    Rs.{plan.price}<span className="text-sm font-normal text-slate-400">/mo</span>
                  </div>
                  <ul className="mt-3 mb-4 space-y-1.5">
                    {plan.features.map(f => (
                      <li key={f} className="text-xs text-slate-400 flex items-center gap-1.5">
                        <span className="text-green-400">✓</span>{f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <div className="text-center text-xs text-blue-400 font-semibold py-2 border border-blue-500/30 rounded-lg">
                      Current Plan ✓
                    </div>
                  ) : (
                    <button
                      onClick={() => subscribe(plan.id)}
                      disabled={processing}
                      className="w-full py-2.5 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processing ? 'Opening payment...' : `Subscribe Rs.${plan.price}/mo`}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-slate-600 text-xs mt-4 text-center">
            Payments are processed securely by Razorpay · Test mode: use card 4111 1111 1111 1111
          </p>
        </div>
      )}
    </div>
  )
}
