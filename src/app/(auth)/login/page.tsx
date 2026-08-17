'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">S</div>
            <span className="text-white text-xl font-bold">SahajVyapar</span>
            <span className="bg-amber-500 text-black text-xs font-bold px-1.5 py-0.5 rounded">BETA</span>
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
                autoComplete="email"
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
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-slate-500 text-xs">or</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          <Link
            href="/register"
            className="flex items-center justify-center gap-2 w-full py-2.5 border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition-all"
          >
            New business? Start 7-day free trial →
          </Link>

          <div className="mt-5 p-3 bg-amber-500/8 border border-amber-500/15 rounded-xl">
            <p className="text-amber-400/80 text-xs text-center">
              🔬 Beta version · Test environment · Dummy payments only
            </p>
          </div>
        </div>

        <div className="mt-4 flex justify-center gap-4">
          <Link href="/privacy-policy" className="text-slate-600 text-xs hover:text-slate-400">Privacy Policy</Link>
          <Link href="/terms-of-service" className="text-slate-600 text-xs hover:text-slate-400">Terms</Link>
          <Link href="/contact" className="text-slate-600 text-xs hover:text-slate-400">Contact</Link>
        </div>
      </div>
    </div>
  )
}
