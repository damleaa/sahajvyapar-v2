'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SUPERADMIN_PASSWORD = process.env.NEXT_PUBLIC_SUPERADMIN_KEY || 'SV@SuperAdmin2026'

export default function SuperAdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === SUPERADMIN_PASSWORD) {
      sessionStorage.setItem('sv_admin_auth', 'true')
      router.push('/superadmin/dashboard')
    } else {
      setError('Invalid password')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">⚡</div>
          <h1 className="text-white text-xl font-bold">SahajVyapar Admin</h1>
          <p className="text-slate-400 text-sm mt-1">Superadmin Access Only</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 mb-4 text-sm">{error}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Admin Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-base" placeholder="••••••••" required autoFocus />
            </div>
            <button type="submit" className="btn-primary w-full py-3">Access Admin Panel →</button>
          </form>
        </div>
      </div>
    </div>
  )
}
