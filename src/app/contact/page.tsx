import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Contact Us — SahajVyapar',
  description: 'Get in touch with the SahajVyapar support team.',
}

export default function ContactPage() {
  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#f1f5f9' }}>
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 5%', display: 'flex', alignItems: 'center', height: 56 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 30, height: 30, background: '#2563eb', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13 }}>S</div>
          <span style={{ color: 'white', fontWeight: 600, fontSize: 15 }}>SahajVyapar</span>
        </Link>
      </nav>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'white', marginBottom: 8 }}>Contact Us</h1>
          <p style={{ color: '#64748b', fontSize: 15 }}>We usually respond within 1–2 business days</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 48 }}>
          {[
            {
              icon: '💬',
              title: 'General Support',
              desc: 'Questions about features, account issues, billing',
              contact: 'support@sahajvyapar.in',
              href: 'mailto:support@sahajvyapar.in',
              response: 'Within 2 business days',
            },
            {
              icon: '🔒',
              title: 'Privacy & Data',
              desc: 'Data requests, privacy concerns, GDPR/PDPA queries',
              contact: 'privacy@sahajvyapar.in',
              href: 'mailto:privacy@sahajvyapar.in',
              response: 'Within 30 days (as per law)',
            },
            {
              icon: '⚖️',
              title: 'Legal & Compliance',
              desc: 'Legal notices, terms queries, compliance issues',
              contact: 'legal@sahajvyapar.in',
              href: 'mailto:legal@sahajvyapar.in',
              response: 'Within 7 business days',
            },
            {
              icon: '🚨',
              title: 'Grievance Officer',
              desc: 'Unresolved complaints, escalations under IT Act 2000',
              contact: 'grievance@sahajvyapar.in',
              href: 'mailto:grievance@sahajvyapar.in',
              response: 'Within 30 days (statutory)',
            },
          ].map(item => (
            <div key={item.title} style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '20px 22px' }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>{item.icon}</div>
              <div style={{ color: 'white', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{item.title}</div>
              <div style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>{item.desc}</div>
              <a href={item.href} style={{ color: '#3b82f6', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: 6 }}>{item.contact}</a>
              <div style={{ color: '#475569', fontSize: 11 }}>⏱ {item.response}</div>
            </div>
          ))}
        </div>

        {/* Company info */}
        <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '24px 28px', marginBottom: 32 }}>
          <h2 style={{ color: 'white', fontWeight: 600, fontSize: 16, marginBottom: 16 }}>Company Information</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { label: 'Company Name', value: 'Emotiquant Technologies OPC Pvt. Ltd.' },
              { label: 'CIN', value: 'Registered in India' },
              { label: 'Registered Address', value: 'Airoli, Navi Mumbai, Maharashtra - 400708' },
              { label: 'Product', value: 'SahajVyapar (sahajvyapar.in)' },
            ].map(item => (
              <div key={item.label}>
                <div style={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{item.label}</div>
                <div style={{ color: '#cbd5e1', fontSize: 14 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ quick links */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>Also useful:</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            {[
              ['/privacy-policy', 'Privacy Policy'],
              ['/terms-of-service', 'Terms of Service'],
              ['/refund-policy', 'Refund Policy'],
              ['/register', 'Start Free Trial'],
            ].map(([href, label]) => (
              <Link key={href} href={href} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#94a3b8', fontSize: 13, textDecoration: 'none' }}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '24px 5%', textAlign: 'center' }}>
        <p style={{ color: '#334155', fontSize: 12 }}>© 2026 Emotiquant Technologies OPC Pvt. Ltd. All rights reserved.</p>
      </footer>
    </div>
  )
}
