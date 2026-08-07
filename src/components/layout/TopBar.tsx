'use client'

import { Bell } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

interface TopBarProps {
  tenant: { business_name: string; plan: string; plan_status: string; plan_expires_at: string }
  user: User
}

export default function TopBar({ tenant, user }: TopBarProps) {
  const expiresAt = new Date(tenant.plan_expires_at)
  const now = new Date()
  const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const isExpired = daysLeft <= 0
  const isExpiringSoon = daysLeft > 0 && daysLeft <= 3
  const isTrial = tenant.plan_status === 'trial'

  return (
    <div className="h-14 bg-slate-950 border-b border-slate-800 px-6 flex items-center justify-between flex-shrink-0">
      <div className="text-slate-400 text-sm">
        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>

      <div className="flex items-center gap-3">
        {/* Plan expiry indicator */}
        {isExpired ? (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span>⚠️</span>
            <span>{isTrial ? 'Trial expired' : 'Plan expired'} — <a href="/dashboard/upgrade" className="underline font-semibold">Renew now</a></span>
          </div>
        ) : isExpiringSoon ? (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span>⏰</span>
            <span>{isTrial ? 'Trial' : 'Plan'} expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''} — <a href="/dashboard/upgrade" className="underline">Upgrade</a></span>
          </div>
        ) : isTrial ? (
          <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs px-3 py-1.5 rounded-lg">
            Trial · {daysLeft} days left · expires {expiresAt.toLocaleDateString('en-IN')}
          </div>
        ) : (
          <div className="text-slate-600 text-xs">
            {tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1)} · expires {expiresAt.toLocaleDateString('en-IN')}
          </div>
        )}

        <button className="relative p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all">
          <Bell className="w-4 h-4" />
        </button>
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
          {user.email?.charAt(0).toUpperCase()}
        </div>
      </div>
    </div>
  )
}
