'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">S</div>
            <span className="text-white text-xl font-bold">SahajVyapar</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          {sent ? (
            <div className="text-center">
              <div className="text-4xl mb-4">📧</div>
              <h2 className="text-white text-xl font-semibold mb-2">Check your email</h2>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                We sent a password reset link to <strong className="text-slate-200">{email}</strong>.
                Check your inbox and follow the link to reset your password.
              </p>
              <p className="text-slate-500 text-xs mb-4">
                Didn't receive it? Check spam, or wait a minute and try again.
              </p>
              <button
                onClick={() => setSent(false)}
                className="text-blue-400 text-sm hover:text-blue-300"
              >
                Try a different email
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-white text-xl font-semibold mb-1">Forgot password?</h2>
              <p className="text-slate-400 text-sm mb-6">
                Enter your registered email and we'll send you a reset link.
              </p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 mb-4 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input-base"
                    placeholder="you@business.com"
                    required
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3"
                >
                  {loading ? 'Sending...' : 'Send Reset Link →'}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 text-center">
            <Link href="/login" className="text-slate-500 text-sm hover:text-slate-300">
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
