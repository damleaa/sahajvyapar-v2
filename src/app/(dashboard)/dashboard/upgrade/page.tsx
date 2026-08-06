import Link from 'next/link'

export default function UpgradePage() {
  return (
    <div className="max-w-2xl mx-auto py-16 text-center">
      <div className="text-5xl mb-6">🚀</div>
      <h1 className="text-2xl font-bold text-white mb-3">Upgrade Your Plan</h1>
      <p className="text-slate-400 mb-10">Unlock more features to grow your business</p>

      <div className="grid grid-cols-3 gap-4 mb-10">
        {[
          { plan: 'Starter', price: '₹399', color: 'border-slate-700', features: ['100 products', 'Sales', 'Basic reports'] },
          { plan: 'Growth', price: '₹699', color: 'border-blue-500', badge: 'Most Popular', features: ['500 products', 'GST Invoice', 'Customers + Ledger', 'Suppliers + PO', 'Returns'] },
          { plan: 'Pro', price: '₹999', color: 'border-purple-500', features: ['Unlimited products', 'Exhibitions + P&L', 'Full Reports', 'Sahaj Insights', 'Business Health'] },
        ].map(p => (
          <div key={p.plan} className={`card p-5 border-2 ${p.color} relative`}>
            {p.badge && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-3 py-0.5 rounded-full">{p.badge}</div>}
            <div className="text-slate-400 text-xs font-semibold uppercase mb-2">{p.plan}</div>
            <div className="text-white text-2xl font-bold mb-1">{p.price}<span className="text-slate-400 text-sm font-normal">/mo</span></div>
            <ul className="mt-3 space-y-1.5">
              {p.features.map(f => <li key={f} className="text-slate-400 text-xs flex items-center gap-1.5"><span className="text-green-400">✓</span>{f}</li>)}
            </ul>
          </div>
        ))}
      </div>

      <p className="text-slate-500 text-sm mb-6">Contact us to upgrade your plan</p>
      <div className="flex gap-3 justify-center">
        <a href="mailto:support@sahajvyapar.in" className="btn-primary px-6">Contact Support</a>
        <Link href="/dashboard" className="btn-secondary px-6">Back to Dashboard</Link>
      </div>
    </div>
  )
}
