'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

declare global { interface Window { Razorpay: any } }

const PLANS = [
  { id: 'starter', name: 'Starter', price: 399, features: ['Inventory', 'Sales', 'Payments', 'Customers', 'Suppliers', 'Expenses', 'Reports'] },
  { id: 'growth', name: 'Growth', price: 699, features: ['Everything in Starter', 'Purchase Orders', 'Returns', 'Exhibitions', 'Advanced Reports'] },
  { id: 'pro', name: 'Pro', price: 999, features: ['Everything in Growth', 'Sahaj Insights', 'Exhibition P&L', 'Business Health'] },
]

export default function AccountExpiredPage() {
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState<any>(null)
  const [earlyPayNote, setEarlyPayNote] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/subscriptions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_status' })
    }).then(r => r.json()).then(data => {
      setStatus(data)
      // If trial is still active (not yet expired), show early payment info
      if (data?.plan_status === 'trial' && data?.plan_expires_at) {
        const trialEnd = new Date(data.plan_expires_at)
        const now = new Date()
        if (now < trialEnd) {
          const paidStart = trialEnd.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
          const renewal = new Date(trialEnd.getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
          setEarlyPayNote(`Your paid plan will start on ${paidStart} (when trial ends). First renewal: ${renewal}.`)
        }
      }
    })

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    document.body.appendChild(script)
  }, [])

  const isTrial = status?.plan_status === 'trial'
  const isTrialExpired = isTrial && status?.plan_expires_at && new Date(status.plan_expires_at) < new Date()
  const isCancelled = status?.plan_status === 'cancelled'

  const subscribe = async (plan: string) => {
    setProcessing(true)
    const r = await fetch('/api/subscriptions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_subscription', plan })
    }).then(r => r.json())

    if (r.error) { alert(r.error); setProcessing(false); return }

    const options = {
      key: r.key,
      subscription_id: r.subscription_id,
      name: 'SahajVyapar',
      description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan — ₹${r.amount}/month`,
      prefill: { name: r.tenant?.name, email: r.tenant?.email },
      theme: { color: '#2563eb' },
      handler: () => {
        alert('Payment successful! Your account will be activated shortly.')
        window.location.href = '/dashboard'
      },
      modal: { ondismiss: () => setProcessing(false) }
    }

    new window.Razorpay(options).open()
    setProcessing(false)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl text-center">

        {/* Header — different message based on state */}
        {isTrialExpired ? (
          <>
            <div className="text-6xl mb-6">⏰</div>
            <h1 className="text-2xl font-bold text-white mb-3">Your Free Trial Has Ended</h1>
            <p className="text-slate-400 mb-2">You've completed your 7-day free trial.</p>
            <p className="text-slate-400 mb-8 text-sm">Subscribe to continue using SahajVyapar and access all your data.</p>
          </>
        ) : isCancelled ? (
          <>
            <div className="text-6xl mb-6">🔒</div>
            <h1 className="text-2xl font-bold text-white mb-3">Account Deactivated</h1>
            <p className="text-slate-400 mb-2">Your account has been deactivated (refund processed or manually cancelled).</p>
            <p className="text-slate-400 mb-8 text-sm">If you'd like to start fresh, subscribe to a new plan below.</p>
          </>
        ) : (
          <>
            <div className="text-6xl mb-6">🔒</div>
            <h1 className="text-2xl font-bold text-white mb-3">Subscription Expired</h1>
            <p className="text-slate-400 mb-2">Your subscription has expired and the grace period has ended.</p>
            <p className="text-slate-400 mb-8 text-sm">Subscribe to reactivate your account and access all your data.</p>
          </>
        )}

        {/* Early payment note */}
        {earlyPayNote && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6 text-left">
            <p className="text-blue-300 text-sm font-medium mb-1">ℹ️ Subscribing during trial</p>
            <p className="text-slate-400 text-sm">{earlyPayNote}</p>
            <p className="text-slate-500 text-xs mt-1">Refund window: 7 days after your trial ends (paid plan start date).</p>
          </div>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {PLANS.map((plan, i) => (
            <div key={plan.id} className={`card p-5 border-2 text-left ${i === 1 ? 'border-blue-500' : 'border-slate-700'}`}>
              {i === 1 && <div className="text-xs text-blue-400 font-semibold uppercase mb-2">Most Popular</div>}
              <div className="text-slate-400 text-xs font-semibold uppercase mb-1">{plan.name}</div>
              <div className="text-white text-2xl font-bold mb-3">₹{plan.price}<span className="text-slate-400 text-sm font-normal">/mo</span></div>
              <ul className="text-slate-400 text-xs space-y-1 mb-4">
                {plan.features.map(f => <li key={f}>✓ {f}</li>)}
              </ul>
              <button
                onClick={() => subscribe(plan.id)}
                disabled={processing}
                className={`w-full py-2.5 text-sm font-semibold rounded-lg transition-all disabled:opacity-50 ${
                  i === 1 ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'
                }`}>
                Subscribe
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-4">
          <Link href="/login" className="text-slate-400 text-sm hover:text-white">← Back to Login</Link>
          <a href="mailto:support@sahajvyapar.in" className="text-blue-400 text-sm hover:text-blue-300">Contact Support</a>
        </div>
      </div>
    </div>
  )
}
