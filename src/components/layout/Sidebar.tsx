'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, ShoppingCart, Users, Truck,
  ClipboardList, RotateCcw, BarChart3, Store, Settings, LogOut, Sparkles, ReceiptIndianRupee
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { canAccess, type PlanType } from '@/types'

interface SidebarProps {
  tenant: { business_name: string; plan: PlanType; owner_name: string }
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, plan: null },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Package, plan: null },
  { href: '/dashboard/sales', label: 'Sales', icon: ShoppingCart, plan: null },
  { href: '/dashboard/customers', label: 'Customers', icon: Users, plan: 'customers' as keyof typeof import('@/types').PLAN_FEATURES.pro },
  { href: '/dashboard/suppliers', label: 'Suppliers', icon: Truck, plan: 'suppliers' as keyof typeof import('@/types').PLAN_FEATURES.pro },
  { href: '/dashboard/purchase-orders', label: 'Purchase Orders', icon: ClipboardList, plan: 'purchase_orders' as keyof typeof import('@/types').PLAN_FEATURES.pro },
  { href: '/dashboard/returns', label: 'Returns', icon: RotateCcw, plan: 'returns' as keyof typeof import('@/types').PLAN_FEATURES.pro },
  { href: '/dashboard/exhibitions', label: 'Exhibitions', icon: Store, plan: 'exhibitions' as keyof typeof import('@/types').PLAN_FEATURES.pro },
  { href: '/dashboard/expenses', label: 'Expenses', icon: ReceiptIndianRupee, plan: null },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3, plan: null },
  { href: '/dashboard/insights', label: 'Sahaj Insights', icon: Sparkles, plan: 'exhibitions' as keyof typeof import('@/types').PLAN_FEATURES.pro },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, plan: null },
  { href: '/dashboard/admin', label: 'Admin', icon: Shield, plan: null },
]

export default function Sidebar({ tenant }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
    router.refresh()
  }

  return (
    <div className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col h-full flex-shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">S</div>
          <div className="min-w-0">
            <div className="text-white font-semibold text-sm truncate">{tenant.business_name}</div>
            <div className="text-slate-400 text-xs truncate">{tenant.owner_name}</div>
          </div>
        </div>
      </div>

      {/* Plan badge */}
      <div className="px-4 py-2 border-b border-slate-800">
        <span className={`badge text-xs capitalize ${
          tenant.plan === 'pro' ? 'badge-purple' :
          tenant.plan === 'growth' ? 'badge-blue' : 'badge-yellow'
        }`}>
          {tenant.plan} plan
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const isLocked = item.plan && !canAccess(tenant.plan, item.plan as any)
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))

          if (isLocked) {
            return (
              <Link
                key={item.href}
                href={`/dashboard/upgrade?feature=${item.plan}`}
                className="sidebar-link opacity-40 relative group"
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
                <span className="ml-auto text-xs bg-slate-700 px-1.5 py-0.5 rounded text-slate-400">Pro</span>
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4 border-t border-slate-800 pt-3">
        <button onClick={handleLogout} className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  )
}
