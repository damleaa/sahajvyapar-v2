'use client'
import { useState, useCallback } from 'react'
import { X, Lock } from 'lucide-react'

// ── Modal — clicking backdrop does NOT close (b fix) ──────────────
interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  allowBackdropClose?: boolean  // opt-in only — default false
}

export function Modal({ open, onClose, title, children, size = 'md', allowBackdropClose = false }: ModalProps) {
  if (!open) return null
  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      // Only close on backdrop click if explicitly opted in
      onClick={allowBackdropClose ? onClose : undefined}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal panel — always stop propagation so it never accidentally closes */}
      <div
        className={`relative w-full ${widths[size]} bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 flex-shrink-0">
          <h2 className="text-white font-semibold text-base">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────
const badgeColors: any = {
  green:  'bg-green-500/15 text-green-400 border border-green-500/20',
  red:    'bg-red-500/15 text-red-400 border border-red-500/20',
  yellow: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  blue:   'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  purple: 'bg-purple-500/15 text-purple-400 border border-purple-500/20',
  slate:  'bg-slate-700/50 text-slate-300 border border-slate-600/30',
  orange: 'bg-orange-500/15 text-orange-400 border border-orange-500/20',
}

export function Badge({ children, color = 'slate' }: { children: React.ReactNode; color?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${badgeColors[color] || badgeColors.slate}`}>
      {children}
    </span>
  )
}

// ── EmptyState ────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      {icon && <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 mb-4">{icon}</div>}
      <div className="text-white font-medium mb-1">{title}</div>
      {description && <div className="text-slate-400 text-sm mb-4">{description}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

// ── LockedFeature ─────────────────────────────────────────────────
export function LockedFeature({ feature, plan }: { feature: string; plan: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mb-4">
        <Lock className="w-6 h-6 text-amber-400" />
      </div>
      <div className="text-white font-semibold text-lg mb-1">{feature}</div>
      <div className="text-slate-400 text-sm mb-5">Available on {plan} plan and above</div>
      <a href="/dashboard/settings" className="btn-primary">Upgrade Plan →</a>
    </div>
  )
}

// ── useToast ──────────────────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState<{ id: number; message: string; type: string }[]>([])

  const toast = useCallback((message: string, type: string = 'success') => {
    const id = Date.now()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])

  const ToastContainer = useCallback(() => (
    <div className="fixed bottom-24 md:bottom-6 right-4 z-[100] space-y-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-lg pointer-events-auto transition-all ${
          t.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-600 text-white'
        }`}>
          {t.type === 'error' ? '✕' : '✓'} {t.message}
        </div>
      ))}
    </div>
  ), [toasts])

  return { toast, ToastContainer }
}
