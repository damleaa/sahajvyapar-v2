import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SahajVyapar — Vyapar itna aasaan kabhi nahi tha',
  description: 'Home business aur exhibition sellers ke liye inventory, sales, GST invoice — sab ek jagah.',
}

export default function HomePage() {
  return (
    <div style={{ fontFamily: "Sora, -apple-system, sans-serif", background: '#0f172a', color: '#f1f5f9', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; }
        .ticker-wrap { background: rgba(37,99,235,0.12); border-top: 1px solid rgba(37,99,235,0.2); border-bottom: 1px solid rgba(37,99,235,0.2); overflow: hidden; padding: 10px 0; }
        .ticker { display: flex; white-space: nowrap; animation: ticker 30s linear infinite; }
        .ticker-item { display: inline-flex; align-items: center; gap: 8px; color: #94a3b8; font-size: 13px; font-weight: 500; padding: 0 32px; }
        @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .btn-primary { display: inline-flex; align-items: center; padding: 13px 28px; background: #2563eb; color: white; border-radius: 10px; font-size: 15px; font-weight: 600; text-decoration: none; transition: all 0.2s; }
        .btn-primary:hover { background: #3b82f6; transform: translateY(-1px); box-shadow: 0 4px 20px rgba(37,99,235,0.4); }
        .btn-secondary { display: inline-flex; align-items: center; padding: 13px 28px; background: rgba(255,255,255,0.06); color: #f1f5f9; border-radius: 10px; font-size: 15px; font-weight: 600; text-decoration: none; border: 1px solid rgba(255,255,255,0.12); transition: all 0.2s; }
        .btn-secondary:hover { background: rgba(255,255,255,0.1); }
        .nav-link { color: #94a3b8; text-decoration: none; font-size: 14px; font-weight: 500; padding: 8px 14px; transition: color 0.2s; }
        .nav-link:hover { color: white; }
        .card { background: #1e293b; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px; transition: all 0.2s; }
        .card:hover { border-color: rgba(37,99,235,0.35); background: rgba(37,99,235,0.05); transform: translateY(-2px); }
        .price-card { background: #0f172a; border: 1.5px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 28px; position: relative; }
        .price-card.featured { border-color: #2563eb; background: rgba(37,99,235,0.06); }
        @media (max-width: 768px) {
          .hero-grid, .feat-grid, .price-grid { grid-template-columns: 1fr !important; }
          .mockup { display: none !important; }
          .nav-links a.hide { display: none; }
        }
      `}</style>

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 5%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 36, height: 36, background: '#2563eb', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 15 }}>S</div>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 17 }}>SahajVyapar</span>
        </Link>
        <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <a href="#features" className="nav-link hide">Features</a>
          <a href="#pricing" className="nav-link hide">Pricing</a>
          <Link href="/login" style={{ background: 'rgba(255,255,255,0.06)', color: '#f1f5f9', padding: '9px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.12)', marginLeft: 8 }}>Login</Link>
          <Link href="/register" style={{ background: '#2563eb', color: 'white', padding: '9px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none', marginLeft: 6 }}>Free Trial</Link>
        </div>
      </nav>

      {/* TICKER */}
      <div className="ticker-wrap">
        <div className="ticker">
          {['📦 Stock kabhi out-of-sync nahi hoga ◆', '🧾 GST Invoice 10 seconds mein ◆', '🎪 Exhibition P&L automatic ◆', '👥 Udhaar track — ek nazar mein ◆', '📋 PO se inventory auto-update ◆', '↩ Returns? Stock wapas, hisaab clear ◆',
            '📦 Stock kabhi out-of-sync nahi hoga ◆', '🧾 GST Invoice 10 seconds mein ◆', '🎪 Exhibition P&L automatic ◆', '👥 Udhaar track — ek nazar mein ◆', '📋 PO se inventory auto-update ◆', '↩ Returns? Stock wapas, hisaab clear ◆'].map((item, i) => (
            <span key={i} className="ticker-item">{item}</span>
          ))}
        </div>
      </div>

      {/* HERO */}
      <section style={{ padding: '90px 5% 80px', maxWidth: 1100, margin: '0 auto' }}>
        <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)', color: '#3b82f6', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '5px 14px', borderRadius: 20, marginBottom: 22 }}>
              <div style={{ width: 6, height: 6, background: '#3b82f6', borderRadius: '50%' }} />
              Home Business &amp; Exhibition Sellers ke liye
            </div>
            <h1 style={{ fontSize: 'clamp(30px, 3.5vw, 46px)', fontWeight: 800, lineHeight: 1.15, color: 'white', marginBottom: 18 }}>
              Vyapar itna<br /><span style={{ color: '#3b82f6' }}>aasaan</span> kabhi<br />nahi tha
            </h1>
            <p style={{ fontSize: 16, color: '#94a3b8', lineHeight: 1.75, marginBottom: 34, maxWidth: 430 }}>Notebook chhodo. Excel band karo. SahajVyapar mein stock, sales, GST invoice, customers — sab ek jagah.</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
              <Link href="/register" className="btn-primary">7 Din Free Try Karein</Link>
              <a href="#features" className="btn-secondary">Features Dekhein</a>
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {['Koi credit card nahi', '7 din bilkul free', '5 minute setup'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94a3b8' }}>
                  <span style={{ color: '#22c55e' }}>✓</span> {t}
                </div>
              ))}
            </div>
          </div>
          <div className="mockup" style={{ background: '#1e293b', borderRadius: 16, border: '1px solid rgba(255,255,255,0.12)', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>
            <div style={{ background: '#0d1117', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {['#ef4444','#f59e0b','#22c55e'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 5, height: 20, marginLeft: 8, display: 'flex', alignItems: 'center', padding: '0 10px' }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>sahajvyapar.in/dashboard</span>
              </div>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'white', marginBottom: 12 }}>Good morning, Priya! 👋</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                {[['₹24,800','Month Revenue','#4ade80'],['38','Sales','white'],['3','Low Stock','#f87171'],['₹1,200','Credit Due','#fbbf24']].map(([v,l,c]) => (
                  <div key={l} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: c }}>{v}</div>
                    <div style={{ fontSize: 9, color: '#64748b', marginTop: 1, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden' }}>
                {[['Lavender Candle','40','#4ade80','Good'],['Beaded Necklace','3','#f87171','Low'],['Hamper Box','9','#fbbf24','Watch']].map(([name,stock,color,status]) => (
                  <div key={name} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '7px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: 10, color: 'white' }}>{name}</span>
                    <span style={{ fontSize: 10, color: '#64748b' }}>{stock}</span>
                    <span style={{ fontSize: 9, fontWeight: 600, color: color, background: color + '20', padding: '2px 6px', borderRadius: 20 }}>{status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PAIN POINTS */}
      <section style={{ background: '#1e293b', borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '80px 5%' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: 12 }}>Yeh toh hota hi hai na?</p>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: 'white', marginBottom: 44, lineHeight: 1.25 }}>Aapka business deserve karta hai<br />better than a notebook</h2>
          <div className="feat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {[['🎪','"Exhibition ke baad profit pata nahi hota"','Stall cost, expenses, aur sales — sab manually calculate karna padta hai. SahajVyapar automatically P&L dikhata hai.'],
              ['👥','"Customer ka udhaar track nahi hota"','Notebook mein likhte ho, phir bhool jaate ho. Customer ledger mein har credit sale aur payment automatically record hoti hai.'],
              ['🧾','"GST invoice banane mein ghante lagte hain"','Excel mein format karna, manually calculate karna — sab time waste. SahajVyapar mein 10 seconds mein proper GST invoice ready.']
            ].map(([emoji,q,a]) => (
              <div key={q} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 24 }}>
                <div style={{ fontSize: 28, marginBottom: 14 }}>{emoji}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'white', marginBottom: 8, lineHeight: 1.45, fontStyle: 'italic' }}>{q}</div>
                <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.65 }}>{a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding: '80px 5%' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: 12 }}>Features</p>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: 'white', marginBottom: 14 }}>Poora business, ek jagah</h2>
          <p style={{ fontSize: 15, color: '#94a3b8', maxWidth: 500, lineHeight: 1.75, marginBottom: 44 }}>Tally nahi. Zoho nahi. Bas simple aur kaam ka.</p>
          <div className="feat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {[['📦','Inventory Management','Products add karein, stock track karein, low stock alerts paaein. HSN code aur GST rate bhi set karein.'],
              ['🧾','GST Invoice','Proper tax invoice with CGST/SGST. Aapka logo, GSTIN, bank details include. WhatsApp pe share karein.'],
              ['👥','Customer Ledger','Credit sales automatically record hoti hain. Customer ka balance ek nazar mein. Udhaar clear.'],
              ['🎪','Exhibition P&L','Stall cost, travel, other expenses enter karein. SahajVyapar automatically net profit ya loss calculate karega.'],
              ['📋','Purchase Orders','Supplier se order place karein. Stock receive karo — inventory automatically update.'],
              ['↩','Returns & Refunds','Customer ne product wapas kiya? Stock automatically add back. Credit note generate hoti hai.']
            ].map(([icon,title,desc]) => (
              <div key={title} className="card">
                <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 16 }}>{icon}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'white', marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.65 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ background: '#1e293b', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '80px 5%' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: 12 }}>Pricing</p>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: 'white', marginBottom: 14 }}>Simple pricing, koi surprise nahi</h2>
          <p style={{ fontSize: 15, color: '#94a3b8', marginBottom: 44 }}>Annual plan lein aur 2 mahine free paaein. Sab plans mein 7-din free trial included.</p>
          <div className="price-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {[
              {plan:'Starter',price:'₹399',yr:'₹3,990/year',desc:'Home sellers getting started',col:'#94a3b8',featured:false,features:[['100 products',true],['Sales + Basic reports',true],['GST Invoice',false],['Customers + Ledger',false],['Exhibitions',false]],href:'/register?plan=starter'},
              {plan:'Growth',price:'₹699',yr:'₹6,990/year',desc:'Active sellers managing customers',col:'#3b82f6',featured:true,features:[['500 products',true],['GST Invoice + WhatsApp',true],['Customers + Ledger + Returns',true],['Suppliers + Purchase Orders',true],['Exhibitions',false]],href:'/register?plan=growth'},
              {plan:'Pro',price:'₹999',yr:'₹9,990/year',desc:'Exhibition sellers & serious businesses',col:'#a78bfa',featured:false,features:[['Unlimited products',true],['Everything in Growth',true],['Exhibitions + P&L',true],['Full Reports + Insights',true],['Business Health Score',true]],href:'/register?plan=pro'},
            ].map(({plan,price,yr,desc,col,featured,features,href}) => (
              <div key={plan} className={"price-card" + (featured ? " featured" : "")}>
                {featured && <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: '#2563eb', color: 'white', fontSize: 11, fontWeight: 600, padding: '3px 14px', borderRadius: 20, whiteSpace: 'nowrap' }}>Most Popular</div>}
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', marginBottom: 10 }}>{plan}</div>
                <div style={{ fontSize: 34, fontWeight: 800, color: col, lineHeight: 1 }}>{price}<span style={{ fontSize: 14, fontWeight: 500, color: '#64748b' }}>/mo</span></div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, marginBottom: 6 }}>{yr} · 2 months free</div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{desc}</div>
                {features.map(([f,ok]) => (
                  <div key={f as string} style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: ok ? '#f1f5f9' : '#475569', marginBottom: 9 }}>
                    <span style={{ marginRight: 8, color: ok ? '#22c55e' : '#334155' }}>{ok ? '✓' : '✗'}</span>{f as string}
                  </div>
                ))}
                <Link href={href} style={{ display: 'block', textAlign: 'center', marginTop: 22, padding: 11, borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none', background: featured ? '#2563eb' : 'rgba(255,255,255,0.06)', color: featured ? 'white' : '#f1f5f9', border: featured ? 'none' : '1px solid rgba(255,255,255,0.1)' }}>
                  Start Free Trial
                </Link>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', marginTop: 22, fontSize: 13, color: '#64748b' }}>
            Sab plans mein <strong style={{ color: '#3b82f6' }}>7-din free trial</strong> — koi credit card nahi chahiye.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 5%', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: 'white', marginBottom: 16 }}>Shuru karein aaj hi</h2>
          <p style={{ fontSize: 15, color: '#94a3b8', marginBottom: 32, lineHeight: 1.7 }}>7 din free mein try karein — koi credit card nahi chahiye. 5 minute mein setup.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
            <Link href="/register" className="btn-primary">Free Trial Shuru Karein →</Link>
            <Link href="/login" className="btn-secondary">Login karein</Link>
          </div>
          <div style={{ padding: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Demo accounts (password: Demo@1234)</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[['Starter','starter@demo.sahajvyapar.in'],['Growth','growth@demo.sahajvyapar.in'],['Pro','pro@demo.sahajvyapar.in']].map(([plan,email]) => (
                <div key={plan} style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 8, padding: '6px 12px', fontSize: 12 }}>
                  <span style={{ color: '#3b82f6', fontWeight: 600 }}>{plan}:</span> <span style={{ color: '#94a3b8' }}>{email}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#0d1117', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '48px 5% 28px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 40, marginBottom: 40, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, background: '#2563eb', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>S</div>
                <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>SahajVyapar</span>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', lineHeight: 1.7, maxWidth: 240 }}>Home business aur exhibition sellers ke liye banaya gaya — India ka apna business management tool.</p>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.3)', marginBottom: 14 }}>Product</div>
              {[['#features','Features'],['#pricing','Pricing'],['/register','Free Trial'],['/login','Login']].map(([href,label]) => (
                <div key={label} style={{ marginBottom: 10 }}><a href={href} style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>{label}</a></div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.3)', marginBottom: 14 }}>Support</div>
              <div style={{ marginBottom: 10 }}><a href="mailto:support@sahajvyapar.in" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>support@sahajvyapar.in</a></div>
              <div><a href="https://demo.sahajvyapar.in" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>v1 Demo App</a></div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>© 2026 SahajVyapar. Sab rights reserved.</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>Made with ❤️ for Indian small businesses</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
