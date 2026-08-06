'use client'
import { useState } from 'react'
import { X } from 'lucide-react'

// ── Modal ──────────────────────────────────────────────────
interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}
export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className={`relative w-full ${widths[size]} bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col`}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 flex-shrink-0">
          <h3 className="text-white font-semibold">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

// ── Badge ──────────────────────────────────────────────────
export function Badge({ children, color = 'blue' }: { children: React.ReactNode; color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'slate' }) {
  const colors = {
    blue: 'bg-blue-500/15 text-blue-400',
    green: 'bg-green-500/15 text-green-400',
    red: 'bg-red-500/15 text-red-400',
    yellow: 'bg-amber-500/15 text-amber-400',
    purple: 'bg-purple-500/15 text-purple-400',
    slate: 'bg-slate-500/15 text-slate-400',
  }
  return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${colors[color]}`}>{children}</span>
}

// ── Empty State ────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 mb-4">{icon}</div>
      <div className="text-white font-medium mb-1">{title}</div>
      {description && <div className="text-slate-500 text-sm mb-4">{description}</div>}
      {action}
    </div>
  )
}

// ── Locked Feature ─────────────────────────────────────────
export function LockedFeature({ feature, plan }: { feature: string; plan: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-4xl mb-4">🔒</div>
      <div className="text-white font-semibold text-lg mb-2">{feature}</div>
      <div className="text-slate-400 text-sm mb-6 max-w-xs">
        This feature is available on the {plan} plan and above.
      </div>
      <a href="/dashboard/upgrade" className="btn-primary px-6 py-2.5">Upgrade Plan →</a>
    </div>
  )
}

// ── Toast ──────────────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: 'success' | 'error' }[]>([])
  const toast = (msg: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
  }
  const ToastContainer = () => (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map(t => (
        <div key={t.id} className={`px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${
          t.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>{t.msg}</div>
      ))}
    </div>
  )
  return { toast, ToastContainer }
}
