import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — SahajVyapar',
  description: 'Terms and conditions for using SahajVyapar platform.',
}

const Section = ({ title, children }: any) => (
  <div style={{ marginBottom: '2rem' }}>
    <h2 style={{ color: 'white', fontSize: 18, fontWeight: 600, marginBottom: '0.75rem' }}>{title}</h2>
    {children}
  </div>
)

const P = ({ children }: any) => <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.8, marginBottom: '0.75rem' }}>{children}</p>
const UL = ({ items }: { items: string[] }) => (
  <ul style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.8, paddingLeft: '1.25rem', marginBottom: '0.75rem' }}>
    {items.map(i => <li key={i} style={{ marginBottom: '0.3rem' }}>{i}</li>)}
  </ul>
)

export default function TermsOfService() {
  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#f1f5f9' }}>
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 5%', display: 'flex', alignItems: 'center', height: 56 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 30, height: 30, background: '#2563eb', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13 }}>S</div>
          <span style={{ color: 'white', fontWeight: 600, fontSize: 15 }}>SahajVyapar</span>
        </Link>
      </nav>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'white', marginBottom: 8 }}>Terms of Service</h1>
          <p style={{ color: '#64748b', fontSize: 13 }}>Last updated: 1 August 2026 · Effective immediately</p>
        </div>

        <P>These Terms of Service ("Terms") govern your access to and use of SahajVyapar, operated by <strong style={{ color: '#cbd5e1' }}>Emotiquant Technologies OPC Pvt. Ltd.</strong> ("Company", "we", "us"). By creating an account, you agree to these Terms.</P>

        <Section title="1. Eligibility">
          <P>You must be at least 18 years old and legally capable of entering into contracts under Indian law to use SahajVyapar. By using the platform, you represent that you meet these requirements.</P>
        </Section>

        <Section title="2. Account Registration">
          <UL items={[
            'You must provide accurate, complete information during registration.',
            'You are responsible for maintaining the security of your account credentials.',
            'You must notify us immediately of any unauthorised use of your account.',
            'One account per business entity. Multiple accounts for the same business are not permitted.',
          ]} />
        </Section>

        <Section title="3. Subscription & Payment">
          <P>SahajVyapar is a subscription-based service. All plans include a 7-day free trial.</P>
          <UL items={[
            'Subscription fees are charged monthly in advance via Razorpay.',
            'Prices are in Indian Rupees (INR) and inclusive of applicable GST.',
            'Subscriptions auto-renew unless cancelled before the renewal date.',
            'You may cancel your subscription at any time. Access continues until the end of the paid period.',
            'We reserve the right to change pricing with 30 days notice to existing subscribers.',
          ]} />
        </Section>

        <Section title="4. Free Trial">
          <UL items={[
            'All new accounts receive a 7-day free trial with full Pro plan features.',
            'No credit card is required to start the trial.',
            'After the trial, you must subscribe to a paid plan to continue using the service.',
            'A 3-day grace period applies after the trial or plan expiry before the account is suspended.',
          ]} />
        </Section>

        <Section title="5. Acceptable Use">
          <P>You agree NOT to use SahajVyapar to:</P>
          <UL items={[
            'Violate any applicable Indian or international law or regulation',
            'Store or transmit fraudulent, inaccurate or misleading information',
            'Infringe intellectual property rights of any third party',
            'Attempt to reverse engineer, decompile or exploit the platform',
            'Conduct any activity that disrupts or interferes with our services',
            'Create accounts for the purpose of abusing free trials',
          ]} />
        </Section>

        <Section title="6. Data Ownership">
          <P>You retain full ownership of all business data you enter into SahajVyapar (inventory, sales, customers, etc.). We do not claim any rights over your data. We process your data solely to provide the service.</P>
          <P>You grant us a limited licence to host, store and process your data for the purpose of operating the platform.</P>
        </Section>

        <Section title="7. Data Export & Portability">
          <P>You can export your data in CSV format at any time from the Settings section. Upon account deletion, you have 30 days to export your data before it is permanently deleted.</P>
        </Section>

        <Section title="8. Service Availability">
          <P>We aim for 99% uptime but do not guarantee uninterrupted service. We may perform scheduled maintenance with advance notice. We are not liable for losses arising from service downtime.</P>
        </Section>

        <Section title="9. Limitation of Liability">
          <P>To the maximum extent permitted by Indian law, the Company's total liability for any claim arising from use of SahajVyapar shall not exceed the amount you paid us in the 3 months preceding the claim.</P>
          <P>We are not liable for: indirect or consequential losses; loss of business profits; loss of data due to user error; or issues caused by third-party services (Razorpay, Supabase, etc.).</P>
        </Section>

        <Section title="10. Intellectual Property">
          <P>The SahajVyapar platform, including its design, code, and content, is owned by Emotiquant Technologies OPC Pvt. Ltd. and protected under Indian copyright law. You may not copy, reproduce or distribute any part of the platform without our written permission.</P>
        </Section>

        <Section title="11. Termination">
          <P>We may suspend or terminate your account if you:</P>
          <UL items={[
            'Violate these Terms of Service',
            'Fail to pay subscription fees after the grace period',
            'Engage in fraudulent or abusive behaviour',
            'Request account deletion',
          ]} />
          <P>Upon termination, your right to access the platform ceases immediately. You may request data export before termination.</P>
        </Section>

        <Section title="12. Governing Law & Disputes">
          <P>These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Navi Mumbai, Maharashtra.</P>
          <P>For disputes below ₹50 lakhs, we agree to attempt resolution through mediation before litigation.</P>
        </Section>

        <Section title="13. Changes to Terms">
          <P>We may update these Terms with reasonable notice (typically 14 days via email). Continued use of the platform after changes constitutes acceptance.</P>
        </Section>

        <Section title="14. Contact">
          <P>For any queries regarding these Terms, contact us at:</P>
          <UL items={[
            'Email: legal@sahajvyapar.in',
            'Company: Emotiquant Technologies OPC Pvt. Ltd.',
            'Address: Airoli, Navi Mumbai, Maharashtra - 400708',
          ]} />
        </Section>
      </div>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '24px 5%', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
          {[['/', 'Home'], ['/privacy-policy', 'Privacy Policy'], ['/refund-policy', 'Refund Policy'], ['/contact', 'Contact']].map(([href, label]) => (
            <Link key={href} href={href} style={{ color: '#64748b', fontSize: 13, textDecoration: 'none' }}>{label}</Link>
          ))}
        </div>
        <p style={{ color: '#334155', fontSize: 12, marginTop: 12 }}>© 2026 Emotiquant Technologies OPC Pvt. Ltd. All rights reserved.</p>
      </footer>
    </div>
  )
}
