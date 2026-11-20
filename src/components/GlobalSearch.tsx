'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Package, ShoppingCart, Users, Truck, BarChart3, Settings, Store, ReceiptIndianRupee, RotateCcw, ClipboardList, Sparkles, CreditCard, X } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3, category: 'Navigation' },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Package, category: 'Navigation' },
  { href: '/dashboard/sales', label: 'Sales', icon: ShoppingCart, category: 'Navigation' },
  { href: '/dashboard/customers', label: 'Customers', icon: Users, category: 'Navigation' },
  { href: '/dashboard/suppliers', label: 'Suppliers', icon: Truck, category: 'Navigation' },
  { href: '/dashboard/purchase-orders', label: 'Purchase Orders', icon: ClipboardList, category: 'Navigation' },
  { href: '/dashboard/returns', label: 'Returns', icon: RotateCcw, category: 'Navigation' },
  { href: '/dashboard/exhibitions', label: 'Exhibitions', icon: Store, category: 'Navigation' },
  { href: '/dashboard/expenses', label: 'Expenses', icon: ReceiptIndianRupee, category: 'Navigation' },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3, category: 'Navigation' },
  { href: '/dashboard/payments', label: 'Payments', icon: CreditCard, category: 'Navigation' },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, category: 'Navigation' },
  { href: '/dashboard/insights', label: 'Sahaj Insights', icon: Sparkles, category: 'Navigation' },
]

interface SearchResult {
  id: string
  type: 'nav' | 'product' | 'sale' | 'customer'
  label: string
  sub?: string
  href: string
  icon: any
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState(0)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<any>(null)

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setResults(NAV_ITEMS.map(n => ({ id: n.href, type: 'nav', label: n.label, href: n.href, icon: n.icon })))
      setSelected(0)
    }
  }, [open])

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(NAV_ITEMS.map(n => ({ id: n.href, type: 'nav', label: n.label, href: n.href, icon: n.icon })))
      return
    }

    const lower = q.toLowerCase()

    // Nav matches (instant)
    const navMatches: SearchResult[] = NAV_ITEMS
      .filter(n => n.label.toLowerCase().includes(lower))
      .map(n => ({ id: n.href, type: 'nav', label: n.label, href: n.href, icon: n.icon }))

    setResults(navMatches)
    setLoading(true)

    try {
      // Search products, sales, customers in parallel
      const [inv, sales, customers] = await Promise.all([
        fetch(`/api/inventory?search=${encodeURIComponent(q)}`).then(r => r.json()).catch(() => []),
        fetch(`/api/sales?search=${encodeURIComponent(q)}`).then(r => r.json()).catch(() => []),
        fetch(`/api/customers?search=${encodeURIComponent(q)}`).then(r => r.json()).catch(() => []),
      ])

      const productResults: SearchResult[] = (Array.isArray(inv) ? inv : [])
        .filter((p: any) => p.name?.toLowerCase().includes(lower))
        .slice(0, 4)
        .map((p: any) => ({
          id: `product-${p.id}`,
          type: 'product',
          label: p.name,
          sub: `Stock: ${p.stock_quantity} · Rs.${p.selling_price}`,
          href: '/dashboard/inventory',
          icon: Package,
        }))

      const saleResults: SearchResult[] = (Array.isArray(sales) ? sales : [])
        .filter((s: any) =>
          s.invoice_number?.toLowerCase().includes(lower) ||
          s.customer_name?.toLowerCase().includes(lower)
        )
        .slice(0, 3)
        .map((s: any) => ({
          id: `sale-${s.id}`,
          type: 'sale',
          label: s.invoice_number || 'Invoice',
          sub: `${s.customer_name} · Rs.${Number(s.final_amount).toLocaleString('en-IN')}`,
          href: `/dashboard/invoice/${s.id}`,
          icon: ShoppingCart,
        }))

      const customerResults: SearchResult[] = (Array.isArray(customers) ? customers : [])
        .filter((c: any) =>
          c.name?.toLowerCase().includes(lower) ||
          c.phone?.toLowerCase().includes(lower)
        )
        .slice(0, 3)
        .map((c: any) => ({
          id: `customer-${c.id}`,
          type: 'customer',
          label: c.name,
          sub: c.phone || c.email || '',
          href: '/dashboard/customers',
          icon: Users,
        }))

      setResults([...navMatches, ...productResults, ...saleResults, ...customerResults])
      setSelected(0)
    } catch {
      // Keep nav results on error
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 250)
    return () => clearTimeout(debounceRef.current)
  }, [query, search])

  const navigate = (result: SearchResult) => {
    router.push(result.href)
    setOpen(false)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && results[selected]) navigate(results[selected])
    if (e.key === 'Escape') setOpen(false)
  }

  const typeLabel: any = { nav: 'Page', product: 'Product', sale: 'Invoice', customer: 'Customer' }
  const typeColor: any = { nav: 'text-blue-400', product: 'text-green-400', sale: 'text-amber-400', customer: 'text-purple-400' }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 text-sm transition-all"
    >
      <Search className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Search...</span>
      <kbd className="hidden sm:inline text-xs bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
    </button>
  )

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] px-4" onClick={() => setOpen(false)}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search pages, products, invoices, customers..."
            className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-sm"
          />
          {loading && <div className="w-4 h-4 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin flex-shrink-0" />}
          <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-500 text-sm">
              {query ? 'No results found' : 'Type to search'}
            </div>
          ) : results.map((result, idx) => {
            const Icon = result.icon
            return (
              <button
                key={result.id}
                onClick={() => navigate(result)}
                onMouseEnter={() => setSelected(idx)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  selected === idx ? 'bg-slate-800' : 'hover:bg-slate-800/50'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  selected === idx ? 'bg-blue-600' : 'bg-slate-800'
                }`}>
                  <Icon className="w-3.5 h-3.5 text-slate-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{result.label}</div>
                  {result.sub && <div className="text-xs text-slate-500 truncate">{result.sub}</div>}
                </div>
                <span className={`text-xs flex-shrink-0 ${typeColor[result.type]}`}>
                  {typeLabel[result.type]}
                </span>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-800 text-xs text-slate-600">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> open</span>
          <span><kbd className="font-mono">esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
