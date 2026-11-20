'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 399,
    display: '₹399',
    color: 'border-slate-700',
    badge: '',
    features: ['100 products', 'Sales recording', 'Basic reports', 'Stock alerts'],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 699,
    display: '₹699',
    color: 'border-blue-500',
    badge: 'Most Popular',
    features: ['500 products', 'GST Invoice', 'Customer Ledger', 'Suppliers + PO', 'Returns & Refunds'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 999,
    display: '₹999',
    color: 'border-purple-500',
    badge: '',
    features: ['Unlimited products', 'Everything in Growth', 'Exhibitions + P&L', 'Full Reports', 'Priority Support'],
  },
]

declare global {
  interface Window { Razorpay: any }
}

export default function UpgradePage() {
  const router = useRouter()
  const [currentStatus, setCurrentStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_status' }),
    })
      .then(r => r.json())
      .then(d => { setCurrentStatus(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleSubscribe = async (planId: string) => {
    setSubscribing(true)
    setError('')

    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_subscription', plan: planId }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to create subscription')

      // Load Razorpay checkout
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      document.body.appendChild(script)
      script.onload = () => {
        const rzp = new window.Razorpay({
          key: data.key,
          subscription_id: data.subscription_id,
          name: 'SahajVyapar',
          description: `${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan — Monthly`,
          prefill: {
            name: data.tenant?.name || '',
            email: data.tenant?.email || '',
          },
          theme: { color: '#2563eb' },
          handler: () => {
            router.push('/dashboard/payments?upgraded=1')
          },
        })
        rzp.open()
        setSubscribing(false)
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
      setSubscribing(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center text-slate-400">Loading...</div>
    )
  }

  const activePlan = currentStatus?.plan
  const planStatus = currentStatus?.plan_status

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="text-center mb-10">
        <div className="text-4xl mb-4">🚀</div>
        <h1 className="text-2xl font-bold text-white mb-2">Choose Your Plan</h1>
        <p className="text-slate-400 text-sm">
          {planStatus === 'trial'
            ? '7-day free trial active — subscribe now to continue after trial ends'
            : `Current plan: ${activePlan?.charAt(0).toUpperCase() + activePlan?.slice(1)}`}
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 mb-6 text-sm text-center">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {PLANS.map(plan => {
          const isCurrent = activePlan === plan.id && planStatus === 'active'
          return (
            <div key={plan.id} className={`card p-6 border-2 relative flex flex-col ${isCurrent ? plan.color : 'border-slate-800'}`}>
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-3 py-0.5 rounded-full">
                  {plan.badge}
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 right-4 bg-green-600 text-white text-xs font-semibold px-3 py-0.5 rounded-full">
                  Active
                </div>
              )}
              <div className="text-slate-400 text-xs font-semibold uppercase mb-1">{plan.name}</div>
              <div className="text-white text-3xl font-bold mb-1">
                {plan.display}<span className="text-slate-400 text-sm font-normal">/mo</span>
              </div>
              <ul className="mt-3 space-y-1.5 flex-1 mb-5">
                {plan.features.map(f => (
                  <li key={f} className="text-slate-400 text-xs flex items-start gap-1.5">
                    <span className="text-green-400 mt-0.5">✓</span>{f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <div className="text-center text-green-400 text-sm font-medium py-2">✓ Your current plan</div>
              ) : (
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={subscribing}
                  className="btn-primary w-full py-2.5 text-sm disabled:opacity-50"
                >
                  {subscribing ? 'Processing...' : `Subscribe — ${plan.display}/mo`}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-center text-slate-500 text-xs">
        Payments secured by Razorpay · GST included · Cancel anytime
      </p>
    </div>
  )
}
