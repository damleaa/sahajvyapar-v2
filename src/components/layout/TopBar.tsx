'use client'

import { Bell, LogOut } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
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
  const expiresAt = new Date(tenant.plan_expires_at)
  const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const isExpired = daysLeft <= 0
  const isExpiringSoon = daysLeft > 0 && daysLeft <= 3
  const isTrial = tenant.plan_status === 'trial'

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
    router.refresh()
  }

  return (
    <div className="h-14 bg-slate-950 border-b border-slate-800 px-4 md:px-6 flex items-center gap-3 flex-shrink-0">
      {/* Left: business name on mobile */}
      <p className="md:hidden text-white text-sm font-semibold truncate max-w-[120px] flex-shrink-0">
        {tenant.business_name}
      </p>
      <p className="hidden md:block text-slate-400 text-sm flex-shrink-0">
        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

      {/* Search — takes remaining space */}
      <div className="flex-1 flex justify-center md:justify-start">
        <GlobalSearch />
      </div>

      {/* Right: expiry + notifications + avatar */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isExpired ? (
          <a href="/dashboard/settings" className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap">
            <span>⚠️</span>
            <span className="hidden sm:inline">{isTrial ? 'Trial' : 'Plan'} expired — </span>
            <span className="font-semibold">Renew</span>
          </a>
        ) : isExpiringSoon ? (
          <a href="/dashboard/settings" className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap">
            <span>⏰</span>
            <span>{daysLeft}d left</span>
          </a>
        ) : (
          <div className="hidden md:block text-slate-600 text-xs">
            <span className="capitalize">{tenant.plan}</span>
            {' · '}
            <span>expires {expiresAt.toLocaleDateString('en-IN')}</span>
          </div>
        )}

        <button className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all">
          <Bell className="w-4 h-4" />
        </button>

        <button
          onClick={handleLogout}
          className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold hover:bg-blue-500 transition-all"
          title="Logout"
        >
          {(tenant.business_name || user.email || 'U').charAt(0).toUpperCase()}
        </button>
      </div>
    </div>
  )
}
