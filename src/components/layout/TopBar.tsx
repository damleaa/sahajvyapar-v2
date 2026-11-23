'use client'

import { Bell, LogOut, User as UserIcon } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import GlobalSearch from '@/components/GlobalSearch'

interface TopBarProps {
  tenant: {
    business_name: string
    plan: string
    plan_status: string
    plan_expires_at: string
    next_payment_due?: string
  }
  user: User
}

export default function TopBar({ tenant, user }: TopBarProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const expiresAt = tenant.plan_expires_at ? new Date(tenant.plan_expires_at) : null
  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
  const isExpired = daysLeft !== null && daysLeft <= 0
  const isExpiringSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 3
  const isTrial = tenant.plan_status === 'trial'

  const handleLogout = async () => {
    setMenuOpen(false)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
    router.refresh()
  }

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  return (
    <div className="h-14 bg-slate-950 border-b border-slate-800 px-4 md:px-6 flex items-center gap-3 flex-shrink-0">
      {/* Left: business name on mobile */}
      <p className="md:hidden text-white text-sm font-semibold truncate max-w-[120px] flex-shrink-0">
        {tenant.business_name}
      </p>
      <p className="hidden md:block text-slate-400 text-sm flex-shrink-0">
        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

      {/* Search */}
      <div className="flex-1 flex justify-center md:justify-start">
        <GlobalSearch />
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isExpired ? (
          <a href="/dashboard/payments" className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap">
            <span>⚠️</span>
            <span className="hidden sm:inline">{isTrial ? 'Trial' : 'Plan'} expired — </span>
            <span className="font-semibold">Renew</span>
          </a>
        ) : isExpiringSoon ? (
          <a href="/dashboard/payments" className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap">
            <span>⏰</span>
            <span>{daysLeft}d left</span>
          </a>
        ) : (
          <div className="hidden md:block text-slate-600 text-xs">
            <span className="capitalize">{isTrial ? 'Free Trial' : tenant.plan}</span>
            {expiresAt && <span> · expires {expiresAt.toLocaleDateString('en-IN')}</span>}
          </div>
        )}

        <button className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all">
          <Bell className="w-4 h-4" />
        </button>

        {/* Avatar + dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold hover:bg-blue-500 transition-all"
            title="Account"
          >
            {(tenant.business_name || user.email || 'U').charAt(0).toUpperCase()}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-10 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
              {/* User info */}
              <div className="px-4 py-3 border-b border-slate-800">
                <div className="text-white text-sm font-medium truncate">{tenant.business_name}</div>
                <div className="text-slate-400 text-xs truncate">{user.email}</div>
                <div className="mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    isTrial ? 'bg-amber-500/20 text-amber-400' :
                    tenant.plan === 'pro' ? 'bg-purple-500/20 text-purple-400' :
                    tenant.plan === 'growth' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {isTrial ? 'Free Trial' : `${tenant.plan} plan`}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="p-1">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
