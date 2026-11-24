import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SahajVyapar — Hisaab kitaab ka jhanjhat khatam',
  description: 'Dukaan, ghar, exhibition — sab ka hisaab ek jagah. Inventory, GST invoice, customer ledger, exhibition P&L — 5 minute mein shuru karein.',
}

export default function HomePage() {
  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: '#0b1120', color: '#f1f5f9', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; -webkit-font-smoothing: antialiased; }

        .sv-container { max-width: 1100px; margin: 0 auto; padding: 0 5%; }
        .sv-label { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #3b82f6; margin-bottom: 10px; }

        /* Nav */
        .sv-nav { position: sticky; top: 0; z-index: 100; background: rgba(11,17,32,0.85); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.08); height: 64px; display: flex; align-items: center; }
        .sv-nav .sv-container { display: flex; align-items: center; justify-content: space-between; width: 100%; }
        .sv-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .sv-logo-mark { width: 36px; height: 36px; background: #2563eb; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 15px; font-family: 'Sora', sans-serif; }
        .sv-logo-name { color: white; font-weight: 700; font-size: 17px; font-family: 'Sora', sans-serif; }
        .sv-nav-actions { display: flex; align-items: center; gap: 8px; }
        .sv-nav-links { display: flex; align-items: center; gap: 2px; margin-right: 8px; }
        .sv-nav-link { color: #94a3b8; text-decoration: none; font-size: 14px; font-weight: 500; padding: 8px 14px; border-radius: 8px; transition: all 0.15s; }
        .sv-nav-link:hover { color: white; background: rgba(255,255,255,0.05); }
        .sv-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 20px; border-radius: 10px; font-size: 14px; font-weight: 600; text-decoration: none; font-family: 'Inter', sans-serif; transition: all 0.15s; cursor: pointer; border: none; }
        .sv-btn-ghost { background: rgba(255,255,255,0.05); color: #f1f5f9; border: 1px solid rgba(255,255,255,0.08); }
        .sv-btn-ghost:hover { background: rgba(255,255,255,0.1); }
        .sv-btn-primary { background: #2563eb; color: white; }
        .sv-btn-primary:hover { background: #3b82f6; transform: translateY(-1px); box-shadow: 0 4px 20px rgba(37,99,235,0.35); }
        .sv-btn-lg { padding: 13px 28px; font-size: 15px; border-radius: 12px; }

        /* Trust bar */
        .sv-trust-bar { background: rgba(34,197,94,0.07); border-bottom: 1px solid rgba(34,197,94,0.15); padding: 10px 0; }
        .sv-trust-bar .sv-container { display: flex; align-items: center; justify-content: center; gap: 28px; flex-wrap: wrap; }
        .sv-trust-item { display: flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 500; color: rgba(255,255,255,0.65); }
        .sv-trust-dot { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; flex-shrink: 0; }
        .sv-trust-dot-amber { width: 7px; height: 7px; border-radius: 50%; background: #f59e0b; flex-shrink: 0; }

        /* Hero */
        .sv-hero { padding: 96px 0 80px; position: relative; overflow: hidden; }
        .sv-hero::before { content: ''; position: absolute; top: -200px; left: 50%; transform: translateX(-30%); width: 700px; height: 700px; background: radial-gradient(ellipse, rgba(37,99,235,0.14) 0%, transparent 70%); pointer-events: none; }
        .sv-hero-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; position: relative; }
        .sv-hero-eyebrow { display: inline-flex; align-items: center; gap: 8px; background: rgba(37,99,235,0.12); border: 1px solid rgba(37,99,235,0.3); color: #3b82f6; font-size: 11.5px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; padding: 5px 14px; border-radius: 20px; margin-bottom: 20px; }
        .sv-h1 { font-family: 'Sora', sans-serif; font-size: clamp(32px, 3.8vw, 50px); font-weight: 800; line-height: 1.12; color: white; margin-bottom: 16px; }
        .sv-hero-sub { font-size: 16px; color: #94a3b8; line-height: 1.75; margin-bottom: 32px; max-width: 440px; }
        .sv-hero-cta { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 28px; }
        .sv-hero-trust { display: flex; gap: 20px; flex-wrap: wrap; }
        .sv-hero-trust-item { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: #64748b; }

        /* Mockup */
        .sv-mockup-wrap { background: #1e293b; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); overflow: hidden; box-shadow: 0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03); }
        .sv-mockup-chrome { background: #0d1117; padding: 10px 14px; display: flex; align-items: center; gap: 6px; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .sv-mockup-url { flex: 1; background: rgba(255,255,255,0.05); border-radius: 5px; height: 20px; margin-left: 8px; display: flex; align-items: center; padding: 0 10px; font-size: 10px; color: rgba(255,255,255,0.3); font-family: monospace; }
        .sv-mockup-body { padding: 16px; }
        .sv-mockup-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-bottom: 10px; }
        .sv-stat-tile { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 8px; padding: 9px 11px; }
        .sv-stat-val { font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; }
        .sv-stat-label { font-size: 8.5px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 1px; }
        .sv-mockup-table { border: 1px solid rgba(255,255,255,0.08); border-radius: 7px; overflow: hidden; }
        .sv-table-row { display: grid; grid-template-columns: 2fr 1fr 1fr; padding: 6px 9px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 10px; }
        .sv-badge { font-size: 8.5px; font-weight: 600; padding: 2px 6px; border-radius: 20px; display: inline-block; }
        .sv-mockup-invoice { margin-top: 10px; background: rgba(37,99,235,0.07); border: 1px solid rgba(37,99,235,0.2); border-radius: 8px; padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; }

        /* Pain */
        .sv-pain-section { background: #111827; border-top: 1px solid rgba(255,255,255,0.08); border-bottom: 1px solid rgba(255,255,255,0.08); padding: 80px 0; }
        .sv-pain-h2 { font-family: 'Sora', sans-serif; font-size: clamp(24px, 3vw, 36px); font-weight: 700; color: white; margin-bottom: 48px; line-height: 1.2; }
        .sv-pain-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
        .sv-pain-card { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px; transition: border-color 0.2s; }
        .sv-pain-card:hover { border-color: rgba(37,99,235,0.3); }
        .sv-pain-q { font-size: 15px; font-weight: 600; color: white; line-height: 1.45; font-style: italic; margin-bottom: 10px; }
        .sv-pain-a { font-size: 13px; color: #94a3b8; line-height: 1.65; }

        /* Steps */
        .sv-steps-section { padding: 80px 0; }
        .sv-steps-h2 { font-family: 'Sora', sans-serif; font-size: clamp(24px, 3vw, 36px); font-weight: 700; color: white; margin-bottom: 10px; }
        .sv-steps-sub { font-size: 15px; color: #94a3b8; margin-bottom: 48px; line-height: 1.65; }
        .sv-steps-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 2px; position: relative; }
        .sv-steps-grid::before { content: ''; position: absolute; top: 28px; left: 16.6%; right: 16.6%; height: 1px; background: linear-gradient(to right, transparent, #2563eb, transparent); pointer-events: none; }
        .sv-step-card { padding: 32px 24px; text-align: center; }
        .sv-step-num { width: 56px; height: 56px; border-radius: 50%; background: rgba(37,99,235,0.12); border: 1.5px solid rgba(37,99,235,0.3); color: #3b82f6; font-family: 'Sora', sans-serif; font-weight: 700; font-size: 18px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
        .sv-step-title { font-size: 15px; font-weight: 600; color: white; margin-bottom: 8px; font-family: 'Sora', sans-serif; }
        .sv-step-desc { font-size: 13px; color: #94a3b8; line-height: 1.65; }

        /* Features */
        .sv-feat-section { background: #111827; border-top: 1px solid rgba(255,255,255,0.08); padding: 80px 0; }
        .sv-feat-h2 { font-family: 'Sora', sans-serif; font-size: clamp(24px, 3vw, 36px); font-weight: 700; color: white; margin-bottom: 10px; }
        .sv-feat-sub { font-size: 15px; color: #94a3b8; margin-bottom: 48px; }
        .sv-feat-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
        .sv-feat-card { background: #0b1120; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px; transition: all 0.2s; }
        .sv-feat-card:hover { border-color: rgba(37,99,235,0.35); transform: translateY(-2px); }
        .sv-feat-icon { width: 44px; height: 44px; border-radius: 11px; background: rgba(37,99,235,0.12); border: 1px solid rgba(37,99,235,0.2); display: flex; align-items: center; justify-content: center; font-size: 19px; margin-bottom: 16px; }
        .sv-feat-title { font-size: 15px; font-weight: 600; color: white; margin-bottom: 6px; }
        .sv-feat-desc { font-size: 13px; color: #94a3b8; line-height: 1.65; }

        /* Pricing */
        .sv-price-section { padding: 80px 0; }
        .sv-price-h2 { font-family: 'Sora', sans-serif; font-size: clamp(24px, 3vw, 36px); font-weight: 700; color: white; margin-bottom: 10px; }
        .sv-price-sub { font-size: 15px; color: #94a3b8; margin-bottom: 48px; }
        .sv-price-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
        .sv-price-card { background: #0b1120; border: 1.5px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 28px; position: relative; transition: transform 0.2s; }
        .sv-price-card:hover { transform: translateY(-2px); }
        .sv-price-card-featured { background: rgba(37,99,235,0.05); border-color: #2563eb; }
        .sv-most-popular { position: absolute; top: -11px; left: 50%; transform: translateX(-50%); background: #2563eb; color: white; font-size: 11px; font-weight: 600; padding: 3px 14px; border-radius: 20px; white-space: nowrap; }
        .sv-plan-name { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 10px; }
        .sv-plan-price { font-size: 36px; font-weight: 800; line-height: 1; font-family: 'Sora', sans-serif; font-variant-numeric: tabular-nums; }
        .sv-plan-desc { font-size: 13px; color: #64748b; margin-top: 4px; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .sv-plan-feat { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: #f1f5f9; margin-bottom: 9px; }
        .sv-plan-feat-off { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: #64748b; margin-bottom: 9px; }
        .sv-plan-btn { display: block; text-align: center; margin-top: 22px; padding: 11px; border-radius: 10px; font-size: 14px; font-weight: 600; text-decoration: none; transition: all 0.15s; }
        .sv-plan-btn-primary { background: #2563eb; color: white; }
        .sv-plan-btn-primary:hover { background: #3b82f6; }
        .sv-plan-btn-secondary { background: rgba(255,255,255,0.05); color: #f1f5f9; border: 1px solid rgba(255,255,255,0.08); }
        .sv-plan-btn-secondary:hover { background: rgba(255,255,255,0.1); }
        .sv-price-note { text-align: center; margin-top: 20px; font-size: 13px; color: #64748b; }

        /* CTA */
        .sv-cta-section { background: #111827; border-top: 1px solid rgba(255,255,255,0.08); padding: 96px 0; }
        .sv-cta-inner { max-width: 640px; margin: 0 auto; text-align: center; }
        .sv-cta-h2 { font-family: 'Sora', sans-serif; font-size: clamp(28px, 3.5vw, 44px); font-weight: 800; color: white; margin-bottom: 14px; line-height: 1.15; }
        .sv-cta-sub { font-size: 16px; color: #94a3b8; margin-bottom: 36px; line-height: 1.7; }
        .sv-cta-buttons { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 24px; }
        .sv-cta-reassurance { display: flex; gap: 20px; justify-content: center; flex-wrap: wrap; }
        .sv-reassurance-item { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: #64748b; }
        .sv-cta-demo { margin-top: 20px; padding: 10px 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; font-size: 12px; color: #64748b; }
        .sv-cta-demo a { color: #3b82f6; text-decoration: none; }

        /* Footer */
        .sv-footer { background: #070d1a; border-top: 1px solid rgba(255,255,255,0.08); padding: 48px 0 28px; }
        .sv-footer-inner { display: flex; justify-content: space-between; gap: 40px; margin-bottom: 40px; flex-wrap: wrap; }
        .sv-footer-col-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: rgba(255,255,255,0.3); margin-bottom: 14px; }
        .sv-footer-link { display: block; margin-bottom: 10px; font-size: 13px; color: rgba(255,255,255,0.45); text-decoration: none; transition: color 0.15s; }
        .sv-footer-link:hover { color: rgba(255,255,255,0.75); }
        .sv-footer-bottom { border-top: 1px solid rgba(255,255,255,0.08); padding-top: 24px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; }

        @media (max-width: 768px) {
          .sv-hero-grid { grid-template-columns: 1fr !important; gap: 40px; }
          .sv-mockup-wrap { display: none !important; }
          .sv-pain-grid, .sv-feat-grid, .sv-price-grid { grid-template-columns: 1fr !important; }
          .sv-steps-grid { grid-template-columns: 1fr !important; }
          .sv-steps-grid::before { display: none; }
          .sv-nav-links { display: none !important; }
          .sv-trust-bar .sv-container { gap: 14px; }
        }
      `}</style>

      {/* NAV */}
      <nav className="sv-nav">
        <div className="sv-container">
          <Link href="/" className="sv-logo">
            <div className="sv-logo-mark">S</div>
            <span className="sv-logo-name">SahajVyapar</span>
          </Link>
          <div className="sv-nav-actions">
            <div className="sv-nav-links">
              <a href="/#howitworks" className="sv-nav-link">How it works</a>
              <a href="/#features" className="sv-nav-link">Features</a>
              <a href="/#pricing" className="sv-nav-link">Pricing</a>
            </div>
            <Link href="/login" className="sv-btn sv-btn-ghost">Login</Link>
            <Link href="/register" className="sv-btn sv-btn-primary">Start Free Trial</Link>
          </div>
        </div>
      </nav>

      {/* TRUST BAR */}
      <div className="sv-trust-bar">
        <div className="sv-container">
          {[
            { dot: 'green', text: 'Early Access — Abhi join karein' },
            { dot: 'amber', text: '7-day free trial — koi credit card nahi' },
            { dot: 'green', text: 'Cancel anytime — koi lock-in nahi' },
            { dot: 'green', text: '5 minute setup' },
          ].map(({ dot, text }) => (
            <div key={text} className="sv-trust-item">
              <div className={dot === 'amber' ? 'sv-trust-dot-amber' : 'sv-trust-dot'} />
              {text}
            </div>
          ))}
        </div>
      </div>

      {/* HERO */}
      <section className="sv-hero">
        <div className="sv-container">
          <div className="sv-hero-grid">
            <div>
              <div className="sv-hero-eyebrow">
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6' }} />
                Dukaan · Ghar · Exhibition — Sab ke liye
              </div>
              <h1 className="sv-h1">
                Hisaab kitaab ka<br />
                <span style={{ color: '#3b82f6' }}>jhanjhat khatam.</span><br />
                <span style={{ color: '#22c55e' }}>Business shuru.</span>
              </h1>
              <p className="sv-hero-sub">
                Notebook band karo. Excel hatao. SahajVyapar mein aapka poora business —
                stock, sales, GST invoice, customers — sab ek jagah, 5 minute mein ready.
              </p>
              <div className="sv-hero-cta">
                <Link href="/register" className="sv-btn sv-btn-primary sv-btn-lg">7 Din Free Try Karein →</Link>
                <a href="/#howitworks" className="sv-btn sv-btn-ghost sv-btn-lg">Kaise kaam karta hai?</a>
              </div>
              <div className="sv-hero-trust">
                {['Koi credit card nahi', '7 din bilkul free', '5 minute mein setup'].map(t => (
                  <div key={t} className="sv-hero-trust-item">
                    <span style={{ color: '#22c55e' }}>✓</span> {t}
                  </div>
                ))}
              </div>
            </div>

            {/* Dashboard mockup */}
            <div className="sv-mockup-wrap">
              <div className="sv-mockup-chrome">
                {['#ef4444', '#f59e0b', '#22c55e'].map(c => (
                  <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                ))}
                <div className="sv-mockup-url">sahajvyapar.in/dashboard</div>
              </div>
              <div className="sv-mockup-body">
                <div style={{ fontSize: 12, fontWeight: 600, color: 'white', marginBottom: 10, fontFamily: "'Sora', sans-serif" }}>
                  Good morning, Priya! 👋
                </div>
                <div className="sv-mockup-stats">
                  {[['₹24,800', 'Month Revenue', '#4ade80'], ['38', 'Sales Today', 'white'], ['3', 'Low Stock', '#f87171'], ['₹1,200', 'Udhaar Due', '#fbbf24']].map(([v, l, c]) => (
                    <div key={l} className="sv-stat-tile">
                      <div className="sv-stat-val" style={{ color: c }}>{v}</div>
                      <div className="sv-stat-label">{l}</div>
                    </div>
                  ))}
                </div>
                <div className="sv-mockup-table">
                  <div className="sv-table-row" style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {['PRODUCT', 'STOCK', 'STATUS'].map(h => (
                      <span key={h} style={{ fontSize: 9, color: '#64748b', fontWeight: 600 }}>{h}</span>
                    ))}
                  </div>
                  {[
                    ['Lavender Candle', '40', 'Good', '#22c55e', 'rgba(34,197,94,0.1)'],
                    ['Beaded Necklace', '3', 'Low', '#ef4444', 'rgba(239,68,68,0.1)'],
                    ['Gift Hamper', '9', 'Watch', '#f59e0b', 'rgba(245,158,11,0.1)'],
                  ].map(([name, qty, status, color, bg], i) => (
                    <div key={name} className="sv-table-row" style={i === 2 ? { borderBottom: 'none' } : {}}>
                      <span style={{ color: 'rgba(255,255,255,0.8)' }}>{name}</span>
                      <span style={{ color: '#64748b' }}>{qty}</span>
                      <span className="sv-badge" style={{ color, background: bg }}>{status}</span>
                    </div>
                  ))}
                </div>
                <div className="sv-mockup-invoice">
                  <div>
                    <div style={{ fontSize: 9.5, color: '#64748b' }}>GST Invoice — INV-2026-034</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#3b82f6', marginTop: 2 }}>₹2,360 · Sharma Enterprises</div>
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: '#22c55e', background: 'rgba(34,197,94,0.1)', padding: '3px 8px', borderRadius: 20 }}>✓ Sent</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PAIN POINTS */}
      <section className="sv-pain-section">
        <div className="sv-container">
          <p className="sv-label">Yeh toh hota hi hai na?</p>
          <h2 className="sv-pain-h2">Notebook aur Excel ka time<br />waste hona band karo</h2>
          <div className="sv-pain-grid">
            {[
              ['🎪', '"Exhibition ke baad pata nahi hota — profit hua ya loss?"', 'Stall cost, travel, inventory — sab manually calculate karna padta hai. SahajVyapar automatically net P&L dikhata hai.'],
              ['👥', '"Customer ka udhaar notebook mein hai, bhool jaata hoon."', 'Har credit sale aur payment automatically record hoti hai. Customer ka balance ek nazar mein — ek bhi paisa miss nahi hoga.'],
              ['🧾', '"GST invoice banane mein ghante waste hote hain Excel mein."', '10 seconds mein proper GST invoice ready. CGST/SGST, GSTIN, PDF — sab included. Customer ko seedha share karein.'],
            ].map(([emoji, q, a]) => (
              <div key={q} className="sv-pain-card">
                <div style={{ fontSize: 26, marginBottom: 14 }}>{emoji}</div>
                <div className="sv-pain-q">{q}</div>
                <div className="sv-pain-a">{a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="sv-steps-section" id="howitworks">
        <div className="sv-container">
          <p className="sv-label">3 Steps</p>
          <h2 className="sv-steps-h2">Shuru karna itna aasaan hai</h2>
          <p className="sv-steps-sub">Koi training nahi chahiye. Bas sign up karo aur shuru ho jao.</p>
          <div className="sv-steps-grid">
            {[
              ['1', 'Free Trial Shuru Karein', 'Email se sign up. Business name, GSTIN — bas itna. 2 minute mein account ready. Koi payment nahi chahiye abhi.'],
              ['2', 'Products Add Karein', 'Apne products ki list add karo — naam, rate, HSN, GST rate. Ek baar karo, phir automatically track hota rahega.'],
              ['3', 'Business Run Karein', 'Sales record karo, GST invoice bhejo, stock track karo — SahajVyapar baaki sab karta hai. Aap sirf business karo.'],
            ].map(([num, title, desc]) => (
              <div key={num} className="sv-step-card">
                <div className="sv-step-num">{num}</div>
                <div className="sv-step-title">{title}</div>
                <div className="sv-step-desc">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="sv-feat-section" id="features">
        <div className="sv-container">
          <p className="sv-label">Features</p>
          <h2 className="sv-feat-h2">Poora business, ek jagah</h2>
          <p className="sv-feat-sub">Tally nahi. Zoho nahi. Bas simple aur kaam ka — aapke business ke liye bana.</p>
          <div className="sv-feat-grid">
            {[
              ['📦', 'Inventory Management', 'Products add karo, real-time stock track karo, low stock alerts pao. HSN code aur GST rate sab set karo.'],
              ['🧾', 'GST Invoice', '10 second mein proper tax invoice. CGST/SGST, aapka logo, GSTIN, bank details — PDF download karo ya customer ko bhejo.'],
              ['👥', 'Customer Ledger', 'Credit sales automatically record. Customer ka balance ek nazar mein. Udhaar clear karein bina kuch yaad kiye.'],
              ['🎪', 'Exhibition P&L', 'Stall cost, travel, expenses enter karo. SahajVyapar automatically net profit ya loss calculate karega — har exhibition ke liye.'],
              ['📋', 'Purchase Orders', 'Supplier se order place karo. Stock receive karo — inventory automatically update. Supplier payments bhi track hote hain.'],
              ['↩', 'Returns & Refunds', 'Customer ne product wapas kiya? Stock automatically add back. Customer balance update. Koi manual entry nahi.'],
            ].map(([icon, title, desc]) => (
              <div key={title} className="sv-feat-card">
                <div className="sv-feat-icon">{icon}</div>
                <div className="sv-feat-title">{title}</div>
                <div className="sv-feat-desc">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="sv-price-section" id="pricing">
        <div className="sv-container">
          <p className="sv-label">Pricing</p>
          <h2 className="sv-price-h2">Simple pricing, koi surprise nahi</h2>
          <p className="sv-price-sub">Sab plans mein 7-din free trial — koi credit card nahi chahiye. Cancel anytime.</p>
          <div className="sv-price-grid">
            {[
              {
                plan: 'Starter', price: '₹399', color: '#94a3b8', featured: false,
                desc: 'Ghar se kaam karne waale — basic management shuru karo',
                feats: [['100 products', true], ['Sales tracking + basic reports', true], ['GST Invoice', false], ['Customer Ledger', false], ['Exhibitions', false]],
                href: '/register?plan=starter',
              },
              {
                plan: 'Growth', price: '₹699', color: '#3b82f6', featured: true,
                desc: 'Active sellers — customers, GST invoice, full tracking',
                feats: [['500 products', true], ['GST Invoice + PDF export', true], ['Customers + Ledger + Returns', true], ['Suppliers + Purchase Orders', true], ['Exhibitions', false]],
                href: '/register?plan=growth',
              },
              {
                plan: 'Pro', price: '₹999', color: '#a78bfa', featured: false,
                desc: 'Exhibition sellers & serious businesses — full power',
                feats: [['Unlimited products', true], ['Everything in Growth', true], ['Exhibitions + P&L tracker', true], ['Full Reports + Insights', true], ['Data Export (CSV)', true]],
                href: '/register?plan=pro',
              },
            ].map(({ plan, price, color, featured, desc, feats, href }) => (
              <div key={plan} className={`sv-price-card${featured ? ' sv-price-card-featured' : ''}`}>
                {featured && <div className="sv-most-popular">Most Popular</div>}
                <div className="sv-plan-name">{plan}</div>
                <div className="sv-plan-price" style={{ color }}>
                  {price}<span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>/mo</span>
                </div>
                <div className="sv-plan-desc">{desc}</div>
                {feats.map(([f, ok]) => (
                  <div key={f as string} className={ok ? 'sv-plan-feat' : 'sv-plan-feat-off'}>
                    <span style={{ color: ok ? '#22c55e' : '#1a2540', fontSize: 13, flexShrink: 0, marginTop: 1 }}>{ok ? '✓' : '✗'}</span>
                    {f as string}
                  </div>
                ))}
                <Link href={href} className={`sv-plan-btn ${featured ? 'sv-plan-btn-primary' : 'sv-plan-btn-secondary'}`}>
                  Start Free Trial
                </Link>
              </div>
            ))}
          </div>
          <p className="sv-price-note">
            Sab plans mein <strong style={{ color: '#3b82f6' }}>7-din free trial</strong> — koi credit card nahi chahiye.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="sv-cta-section">
        <div className="sv-container">
          <div className="sv-cta-inner">
            <h2 className="sv-cta-h2">
              Aaj se apna business<br />
              <span style={{ color: '#3b82f6' }}>manage karo</span> sahi se.
            </h2>
            <p className="sv-cta-sub">
              7 din free mein dekho SahajVyapar kaise kaam karta hai —
              koi commitment nahi, koi credit card nahi. 5 minute setup.
            </p>
            <div className="sv-cta-buttons">
              <Link href="/register" className="sv-btn sv-btn-primary sv-btn-lg">Free Trial Shuru Karein →</Link>
              <Link href="/login" className="sv-btn sv-btn-ghost sv-btn-lg">Login karein</Link>
            </div>
            <div className="sv-cta-reassurance">
              {['7 din free', 'Credit card nahi', 'Cancel anytime', '5 min setup'].map(t => (
                <div key={t} className="sv-reassurance-item">
                  <span style={{ color: '#22c55e' }}>✓</span> {t}
                </div>
              ))}
            </div>
            <div className="sv-cta-demo">
              Guided demo chahiye? <a href="mailto:support@sahajvyapar.in">support@sahajvyapar.in</a> par likhein — personally walkthrough karenge.
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="sv-footer">
        <div className="sv-container">
          <div className="sv-footer-inner">
            <div>
              <Link href="/" className="sv-logo" style={{ textDecoration: 'none' }}>
                <div className="sv-logo-mark">S</div>
                <span className="sv-logo-name">SahajVyapar</span>
              </Link>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', lineHeight: 1.7, maxWidth: 230, marginTop: 10 }}>
                Home business aur exhibition sellers ke liye banaya gaya — India ka apna business management tool.
              </p>
              <p style={{ marginTop: 6, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
                Operated by Emotiquant Technologies OPC Pvt. Ltd.
              </p>
            </div>
            <div>
              <div className="sv-footer-col-title">Product</div>
              {[['/#howitworks', 'How it works'], ['/#features', 'Features'], ['/#pricing', 'Pricing'], ['/register', 'Free Trial'], ['/login', 'Login']].map(([href, label]) => (
                <a key={label} href={href} className="sv-footer-link">{label}</a>
              ))}
            </div>
            <div>
              <div className="sv-footer-col-title">Support</div>
              <a href="mailto:support@sahajvyapar.in" className="sv-footer-link">support@sahajvyapar.in</a>
              <a href="/coming-soon" className="sv-footer-link">
                Demo App <span style={{ fontSize: 10, color: '#475569' }}>(coming soon)</span>
              </a>
            </div>
            <div>
              <div className="sv-footer-col-title">Legal</div>
              {['/privacy-policy|Privacy Policy', '/terms-of-service|Terms of Service', '/refund-policy|Refund Policy', '/contact|Contact Us'].map(item => {
                const [href, label] = item.split('|')
                return <a key={href} href={href} className="sv-footer-link">{label}</a>
              })}
            </div>
          </div>
          <div className="sv-footer-bottom">
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>© 2026 SahajVyapar. Sab rights reserved.</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Made with ❤️ for Indian small businesses</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
