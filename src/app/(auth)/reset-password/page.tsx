'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [validSession, setValidSession] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Supabase puts the token in the URL hash — check for valid session
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setValidSession(true)
      } else {
        // Check URL hash for access_token (Supabase reset flow)
        const hash = window.location.hash
        if (hash && hash.includes('access_token')) {
          setValidSession(true)
        } else {
          setError('Invalid or expired reset link. Please request a new one.')
        }
      }
    })
  }, [])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    setLoading(false)
    if (error) { setError(error.message); return }

    setDone(true)
    setTimeout(() => {
      window.location.href = '/dashboard'
    }, 2000)
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
          {done ? (
            <div className="text-center">
              <div className="text-4xl mb-4">✅</div>
              <h2 className="text-white text-xl font-semibold mb-2">Password updated!</h2>
              <p className="text-slate-400 text-sm">Redirecting you to dashboard...</p>
            </div>
          ) : (
            <>
              <h2 className="text-white text-xl font-semibold mb-1">Set new password</h2>
              <p className="text-slate-400 text-sm mb-6">Choose a strong password for your account.</p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 mb-4 text-sm">
                  {error}
                  {error.includes('expired') && (
                    <div className="mt-2">
                      <a href="/forgot-password" className="text-blue-400 hover:text-blue-300 underline text-xs">
                        Request a new reset link →
                      </a>
                    </div>
                  )}
                </div>
              )}

              {validSession && (
                <form onSubmit={handleReset} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">New Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="input-base"
                      placeholder="Min. 8 characters"
                      required
                      autoFocus
                    />
                    {password.length > 0 && (
                      <div className="flex gap-1 mt-1.5">
                        {[
                          { check: password.length >= 8, label: '8+ chars' },
                          { check: /[A-Z]/.test(password), label: 'Uppercase' },
                          { check: /[0-9]/.test(password), label: 'Number' },
                        ].map(({ check, label }) => (
                          <span key={label} className={`text-xs px-2 py-0.5 rounded-full ${check ? 'bg-green-500/15 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
                            {check ? '✓' : '·'} {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm Password</label>
                    <input
                      type="password"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      className="input-base"
                      placeholder="Re-enter password"
                      required
                    />
                    {confirm.length > 0 && password !== confirm && (
                      <p className="text-red-400 text-xs mt-1">Passwords don't match</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={loading || password !== confirm || password.length < 8}
                    className="btn-primary w-full py-3"
                  >
                    {loading ? 'Updating...' : 'Update Password →'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="text-slate-400">Loading...</div></div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
