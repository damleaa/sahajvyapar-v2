'use client'

import { Bell } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

interface TopBarProps {
  tenant: { business_name: string; plan: string; plan_expires_at: string }
  user: User
}

export default function TopBar({ tenant, user }: TopBarProps) {
  const daysLeft = Math.ceil(
    (new Date(tenant.plan_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )
  const isTrialExpiring = daysLeft <= 3 && daysLeft > 0

  return (
    <div className="h-14 bg-slate-950 border-b border-slate-800 px-6 flex items-center justify-between flex-shrink-0">
      <div className="text-slate-400 text-sm">
        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>

      <div className="flex items-center gap-3">
        {isTrialExpiring && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-3 py-1.5 rounded-lg">
            Trial expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''} — <a href="/dashboard/upgrade" className="underline">Upgrade now</a>
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
