import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — SahajVyapar',
  description: 'How SahajVyapar collects, uses and protects your personal data.',
}

export default function PrivacyPolicy() {
  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#f1f5f9' }}>
      <style>{`
        .prose h2 { color: white; font-size: 18px; font-weight: 600; margin: 2rem 0 0.75rem; }
        .prose h3 { color: #cbd5e1; font-size: 15px; font-weight: 500; margin: 1.25rem 0 0.5rem; }
        .prose p { color: #94a3b8; font-size: 14px; line-height: 1.8; margin-bottom: 0.75rem; }
        .prose ul { color: #94a3b8; font-size: 14px; line-height: 1.8; padding-left: 1.25rem; margin-bottom: 0.75rem; }
        .prose li { margin-bottom: 0.3rem; }
        .prose a { color: #3b82f6; text-decoration: none; }
        .prose a:hover { text-decoration: underline; }
      `}</style>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 5%', display: 'flex', alignItems: 'center', height: 56 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 30, height: 30, background: '#2563eb', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13 }}>S</div>
          <span style={{ color: 'white', fontWeight: 600, fontSize: 15 }}>SahajVyapar</span>
        </Link>
      </nav>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'white', marginBottom: 8 }}>Privacy Policy</h1>
          <p style={{ color: '#64748b', fontSize: 13 }}>Last updated: 1 August 2026</p>
        </div>

        <div className="prose">
          <p>SahajVyapar ("we", "our", "us") is operated by <strong style={{ color: '#cbd5e1' }}>Emotiquant Technologies OPC Pvt. Ltd.</strong>, registered in India. This Privacy Policy explains how we collect, use, disclose and protect your information when you use our platform at sahajvyapar.in.</p>
          <p>By using SahajVyapar, you agree to the collection and use of information in accordance with this policy.</p>

          <h2>1. Information We Collect</h2>
          <h3>1.1 Account & Business Information</h3>
          <ul>
            <li>Name, email address, and password (hashed)</li>
            <li>Business name, GSTIN, PAN, and address</li>
            <li>Bank account details (for invoice display only — not stored on payment servers)</li>
            <li>Business logo (stored as base64)</li>
          </ul>
          <h3>1.2 Business Data You Enter</h3>
          <ul>
            <li>Inventory, products, stock levels</li>
            <li>Sales records, invoices, customer ledger</li>
            <li>Supplier information, purchase orders</li>
            <li>Exhibition records and expenses</li>
          </ul>
          <h3>1.3 Payment Information</h3>
          <ul>
            <li>We use Razorpay to process payments. We do not store card numbers, UPI IDs or bank credentials.</li>
            <li>We store subscription IDs and payment reference numbers for billing records.</li>
          </ul>
          <h3>1.4 Technical Data</h3>
          <ul>
            <li>IP address, browser type, device type</li>
            <li>Pages visited, time spent (via anonymous analytics)</li>
            <li>Error logs for debugging</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <ul>
            <li>To provide, maintain and improve the SahajVyapar platform</li>
            <li>To process subscription payments via Razorpay</li>
            <li>To send transactional emails (plan expiry reminders, receipts)</li>
            <li>To detect and prevent fraud or abuse</li>
            <li>To comply with legal obligations under Indian law</li>
            <li>To generate aggregate, anonymised usage statistics</li>
          </ul>
          <p>We do not sell your personal data to third parties. We do not use your business data (inventory, sales, customers) for any purpose other than operating your account.</p>

          <h2>3. Data Storage & Security</h2>
          <p>Your data is stored on Supabase (PostgreSQL) hosted on AWS infrastructure. Data is encrypted at rest and in transit (TLS 1.2+). We use row-level security (RLS) to ensure your business data is accessible only to you.</p>
          <p>We follow the IT Act, 2000 and SPDI Rules, 2011 for data protection.</p>

          <h2>4. Data Retention</h2>
          <p>We retain your account data for as long as your account is active. If you request account deletion, we will delete your personal data within 30 days, subject to any legal hold requirements. Business transaction records may be retained for 7 years as required under Indian tax law.</p>

          <h2>5. Third-Party Services</h2>
          <ul>
            <li><strong style={{ color: '#cbd5e1' }}>Razorpay</strong> — payment processing (PCI DSS compliant)</li>
            <li><strong style={{ color: '#cbd5e1' }}>Supabase</strong> — database and authentication</li>
            <li><strong style={{ color: '#cbd5e1' }}>Vercel</strong> — hosting and CDN</li>
          </ul>
          <p>Each third party has their own privacy policy. We recommend reviewing them.</p>

          <h2>6. Your Rights</h2>
          <p>Under applicable Indian law, you have the right to:</p>
          <ul>
            <li>Access the personal data we hold about you</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Object to processing of your data</li>
            <li>Data portability — export your business data in CSV format</li>
          </ul>

          <h2>7. Cookies</h2>
          <p>We use essential cookies for authentication (Supabase session cookies). We do not use advertising or tracking cookies.</p>

          <h2>8. Children's Privacy</h2>
          <p>SahajVyapar is not directed at persons under 18. We do not knowingly collect data from minors.</p>

          <h2>9. Changes to This Policy</h2>
          <p>We may update this policy periodically. We will notify you via email or in-app notification for material changes. Continued use of the platform constitutes acceptance of the updated policy.</p>

          <h2>10. Contact Us</h2>
          <p>For privacy-related queries, contact our Grievance Officer:</p>
          <ul>
            <li>Email: <a href="mailto:privacy@sahajvyapar.in">privacy@sahajvyapar.in</a></li>
            <li>Company: Emotiquant Technologies OPC Pvt. Ltd.</li>
            <li>Address: Airoli, Navi Mumbai, Maharashtra, India</li>
            <li>Response time: Within 30 days as per IT Act requirements</li>
          </ul>
        </div>
      </div>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '24px 5%', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
          {[['/', 'Home'], ['/terms-of-service', 'Terms'], ['/refund-policy', 'Refund Policy'], ['/contact', 'Contact']].map(([href, label]) => (
            <Link key={href} href={href} style={{ color: '#64748b', fontSize: 13, textDecoration: 'none' }}>{label}</Link>
          ))}
        </div>
        <p style={{ color: '#334155', fontSize: 12, marginTop: 12 }}>© 2026 Emotiquant Technologies OPC Pvt. Ltd. All rights reserved.</p>
      </footer>
    </div>
  )
}
