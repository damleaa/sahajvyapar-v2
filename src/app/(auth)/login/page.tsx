'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const result = await response.json()

    if (!response.ok) {
      setError(result.error || 'Sign in failed')
      setLoading(false)
      return
    }

    // The login route writes the Supabase session cookies before navigation.
    window.location.assign('/dashboard')
  }
    setEmail(demos[type])
    setPassword('Demo@1234')
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">S</div>
            <span className="text-white text-xl font-bold">SahajVyapar</span>
          </div>
          <p className="text-slate-400 text-sm">Inventory & Business Management</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <h2 className="text-white text-xl font-semibold mb-1">Welcome back</h2>
          <p className="text-slate-400 text-sm mb-6">Sign in to your account</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-base"
                placeholder="you@business.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-base"
                placeholder="••••••••"
                required
              />
            </div>
            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3 mt-2">
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-slate-500 text-xs">or</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          <Link href="/register"
            className="flex items-center justify-center gap-2 w-full py-2.5 border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition-all">
            New business? Start 7-day free trial →
          </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
