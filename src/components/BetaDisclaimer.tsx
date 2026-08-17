'use client'
import { useState, useEffect } from 'react'

const BETA_VERSION = 'v1.0'
const STORAGE_KEY = `sv_beta_accepted_${BETA_VERSION}`

export default function BetaDisclaimer() {
  const [show, setShow] = useState(false)
  const [checks, setChecks] = useState({
    understand_beta: false,
    no_real_data: false,
    payment_dummy: false,
    demo_purpose: false,
    no_liability: false,
  })
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    // Check localStorage first for quick hide
    const localAccepted = localStorage.getItem(STORAGE_KEY)
    if (localAccepted) return

    // Then verify with server
    fetch('/api/beta').then(r => r.json()).then(data => {
      if (!data.accepted) {
        setTimeout(() => setShow(true), 500) // slight delay for better UX
      } else {
        localStorage.setItem(STORAGE_KEY, data.accepted_at)
      }
    }).catch(() => {
      // If API fails, show disclaimer anyway
      setShow(true)
    })
  }, [])

  const allChecked = Object.values(checks).every(Boolean) && name.trim().length >= 2

  const accept = async () => {
    if (!allChecked) return
    setLoading(true)
    try {
      await fetch('/api/beta', { method: 'POST' })
      localStorage.setItem(STORAGE_KEY, new Date().toISOString())
      setShow(false)
    } catch {
      // Store locally even if API fails
      localStorage.setItem(STORAGE_KEY, new Date().toISOString())
      setShow(false)
    }
    setLoading(false)
  }

  if (!show) return null

  const CheckItem = ({ id, label }: { id: keyof typeof checks; label: string }) => (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div
        onClick={() => setChecks(c => ({ ...c, [id]: !c[id] }))}
        className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all cursor-pointer ${
          checks[id] ? 'bg-blue-600 border-blue-600' : 'border-slate-600 group-hover:border-slate-400'
        }`}
      >
        {checks[id] && <span className="text-white text-xs font-bold">✓</span>}
      </div>
      <span className="text-slate-300 text-sm leading-relaxed">{label}</span>
    </label>
  )

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🔬</div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-lg">SahajVyapar</span>
                <span className="bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">BETA v1.0</span>
              </div>
              <p className="text-amber-400 text-xs mt-0.5">Please read before proceeding</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 overflow-y-auto max-h-[60vh]">
          
          {/* Beta notice */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-5">
            <p className="text-blue-300 text-sm leading-relaxed">
              You are accessing a <strong className="text-blue-200">beta version</strong> of SahajVyapar. 
              This platform is currently under active development and is being shared for 
              <strong className="text-blue-200"> evaluation and feedback purposes only</strong>.
            </p>
          </div>

          {/* Key warnings */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { icon: '⚠️', title: 'Beta Software', desc: 'Features may change, bugs may exist, data may be reset' },
              { icon: '💳', title: 'Dummy Payments', desc: 'Payment gateway is in TEST mode — no real money is charged' },
              { icon: '🧪', title: 'Demo Accounts', desc: 'Demo accounts are for testing only — not real businesses' },
              { icon: '🔒', title: 'Your Data', desc: 'Do not enter real customer/business data in this beta' },
            ].map(w => (
              <div key={w.title} className="bg-slate-800/60 border border-slate-700 rounded-xl p-3">
                <div className="text-lg mb-1">{w.icon}</div>
                <div className="text-white text-xs font-semibold mb-0.5">{w.title}</div>
                <div className="text-slate-400 text-xs leading-relaxed">{w.desc}</div>
              </div>
            ))}
          </div>

          {/* Checkboxes */}
          <div className="space-y-3.5 mb-5">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Please confirm you understand:</p>
            <CheckItem id="understand_beta" label="I understand this is a BETA version under active development. Features may be incomplete, change, or be unavailable without notice." />
            <CheckItem id="no_real_data" label="I will NOT enter real business data, actual customer information, real financial records, or sensitive personal data in this beta environment." />
            <CheckItem id="payment_dummy" label="I understand that the payment gateway is in TEST/DEMO mode. No real money will be charged. Any subscription shown is for demonstration only." />
            <CheckItem id="demo_purpose" label="I am accessing this platform for evaluation, testing, or demo purposes only and not for conducting actual business operations." />
            <CheckItem id="no_liability" label="I acknowledge that Emotiquant Technologies OPC Pvt. Ltd. is not liable for any data loss, business impact, or decisions made based on this beta software." />
          </div>

          {/* Name field */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Your Name <span className="text-slate-500 font-normal">(as acknowledgement)</span>
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter your full name to proceed"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 border-t border-slate-800">
          <button
            onClick={accept}
            disabled={!allChecked || loading}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
              allChecked && !loading
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {loading ? 'Saving...' : allChecked ? 'I Understand — Enter SahajVyapar Beta →' : 'Please check all boxes and enter your name to proceed'}
          </button>
          <p className="text-slate-600 text-xs text-center mt-3">
            Your acceptance is recorded with timestamp and IP address for compliance purposes.
            <br />By proceeding, you agree to our{' '}
            <a href="/terms-of-service" target="_blank" className="text-slate-500 hover:text-slate-400 underline">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy-policy" target="_blank" className="text-slate-500 hover:text-slate-400 underline">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
