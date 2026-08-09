'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

declare global { interface Window { Razorpay: any } }

const PLANS = [
  { id: 'starter', name: 'Starter', price: 399 },
  { id: 'growth', name: 'Growth', price: 699 },
  { id: 'pro', name: 'Pro', price: 999 },
]

export default function AccountExpiredPage() {
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState<any>(null)

  useEffect(() => {
    fetch('/api/subscriptions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_status' })
    }).then(r => r.json()).then(setStatus)

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    document.body.appendChild(script)
  }, [])

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
        alert('Payment successful! Your account will be reactivated shortly.')
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
        <div className="text-6xl mb-6">🔒</div>
        <h1 className="text-2xl font-bold text-white mb-3">Account Suspended</h1>
        <p className="text-slate-400 mb-2">Your subscription has expired and the grace period has ended.</p>
        <p className="text-slate-400 mb-8 text-sm">Subscribe to reactivate your account and access all your data.</p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {PLANS.map(plan => (
            <div key={plan.id} className="card p-5 border-2 border-slate-700">
              <div className="text-slate-400 text-xs font-semibold uppercase mb-2">{plan.name}</div>
              <div className="text-white text-2xl font-bold mb-4">₹{plan.price}<span className="text-slate-400 text-sm font-normal">/mo</span></div>
              <button
                onClick={() => subscribe(plan.id)}
                disabled={processing}
                className="w-full py-2.5 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-50">
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
