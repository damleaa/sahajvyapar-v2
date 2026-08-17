import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Coming Soon — SahajVyapar Demo',
  description: 'SahajVyapar Demo V1 is coming soon.',
}

export default function ComingSoonPage() {
  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`}</style>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
        <div style={{ width: 40, height: 40, background: '#2563eb', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 18 }}>S</div>
        <span style={{ color: 'white', fontWeight: 700, fontSize: 20 }}>SahajVyapar</span>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 480 }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>🚧</div>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: 'white', marginBottom: 12, lineHeight: 1.2 }}>
          Demo V1 App<br />
          <span style={{ color: '#3b82f6' }}>Coming Soon</span>
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 16, lineHeight: 1.75, marginBottom: 32 }}>
          आम्ही Demo V1 App तयार करत आहोत.<br />
          लवकरच उपलब्ध होईल!
        </p>

        {/* Progress bar - decorative */}
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 100, height: 8, marginBottom: 8, overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(90deg, #2563eb, #7c3aed)', height: '100%', width: '65%', borderRadius: 100 }} />
        </div>
        <p style={{ color: '#475569', fontSize: 13, marginBottom: 40 }}>65% complete</p>

        {/* CTA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px', background: '#2563eb', color: 'white', borderRadius: 12, fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>
            Try SahajVyapar V2 Now →
          </Link>
          <Link href="/" style={{ color: '#64748b', fontSize: 13, textDecoration: 'none' }}>
            ← Back to Home
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: 'fixed', bottom: 24, color: '#334155', fontSize: 12 }}>
        © 2026 Emotiquant Technologies OPC Pvt. Ltd.
      </div>
    </div>
  )
}
