'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Package, ShoppingCart, Users, Truck,
  ClipboardList, RotateCcw, BarChart3, Store, Settings, LogOut,
  Sparkles, ReceiptIndianRupee, Menu, X
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
]

// Bottom nav items for mobile (most used)
const BOTTOM_NAV = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/dashboard/inventory', label: 'Stock', icon: Package },
  { href: '/dashboard/sales', label: 'Sales', icon: ShoppingCart },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

function NavContent({ tenant, pathname, onClose }: { tenant: SidebarProps['tenant']; pathname: string; onClose?: () => void }) {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
    router.refresh()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">S</div>
          <div className="min-w-0">
            <div className="text-white font-semibold text-sm truncate">{tenant.business_name}</div>
            <div className="text-slate-400 text-xs truncate">{tenant.owner_name}</div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 ml-2">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Plan badge */}
      <div className="px-4 py-2 border-b border-slate-800">
        <span className={`badge text-xs capitalize ${
          tenant.plan === 'pro' ? 'badge-purple' :
          tenant.plan === 'growth' ? 'badge-blue' : 'badge-yellow'
        }`}>
          {tenant.plan} Plan
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const locked = item.plan && !canAccess(tenant.plan, item.plan)
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={locked ? '/dashboard/upgrade' : item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm transition-all ${
                active
                  ? 'bg-blue-600 text-white font-medium'
                  : locked
                  ? 'text-slate-600 cursor-default'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {locked && (
                <span className="text-xs font-medium text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded capitalize">
                  {tenant.plan === 'starter' ? 'Growth' : 'Pro'}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-all w-full"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  )
}

export default function Sidebar({ tenant }: SidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  // Prevent body scroll when drawer open
  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex w-60 bg-slate-900 border-r border-slate-800 flex-col h-full flex-shrink-0">
        <NavContent tenant={tenant} pathname={pathname} />
      </div>

      {/* Mobile: hamburger button in top bar (rendered via TopBar) */}
      {/* We expose mobileOpen state via a global event */}

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        </div>
      )}

      {/* Mobile drawer */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 flex flex-col transform transition-transform duration-300 ease-in-out md:hidden ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <NavContent tenant={tenant} pathname={pathname} onClose={() => setMobileOpen(false)} />
      </div>

      {/* Mobile: Bottom navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-slate-900 border-t border-slate-800 flex items-center justify-around px-2 pb-safe" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
        {BOTTOM_NAV.map(item => {
          const Icon = item.icon
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all ${active ? 'text-blue-400' : 'text-slate-500'}`}>
              <Icon className={`w-5 h-5 ${active ? 'text-blue-400' : 'text-slate-500'}`} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          )
        })}
        {/* More button opens drawer */}
        <button onClick={() => setMobileOpen(true)} className="flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl text-slate-500">
          <Menu className="w-5 h-5" />
          <span className="text-xs font-medium">More</span>
        </button>
      </nav>
    </>
  )
}
