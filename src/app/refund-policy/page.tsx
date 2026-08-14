import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy — SahajVyapar',
  description: 'SahajVyapar refund and cancellation policy for subscription plans.',
}

export default function RefundPolicy() {
  const p = (text: string) => <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.8, marginBottom: '0.75rem' }}>{text}</p>
  const h2 = (text: string) => <h2 style={{ color: 'white', fontSize: 18, fontWeight: 600, margin: '2rem 0 0.75rem' }}>{text}</h2>
  const ul = (items: string[]) => <ul style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.8, paddingLeft: '1.25rem', marginBottom: '0.75rem' }}>{items.map(i => <li key={i} style={{ marginBottom: '0.3rem' }}>{i}</li>)}</ul>

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
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'white', marginBottom: 8 }}>Refund & Cancellation Policy</h1>
          <p style={{ color: '#64748b', fontSize: 13 }}>Last updated: 1 August 2026</p>
        </div>

        {p('This policy governs refunds and cancellations for subscriptions to SahajVyapar, operated by Emotiquant Technologies OPC Pvt. Ltd.')}

        {/* Summary box */}
        <div style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 12, padding: '16px 20px', marginBottom: '2rem' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#3b82f6', marginBottom: 8 }}>Quick Summary</div>
          <ul style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.7, paddingLeft: '1.25rem', margin: 0 }}>
            <li>7-day free trial — no charge, cancel anytime</li>
            <li>Cancel subscription — access until period ends, no partial refund</li>
            <li>Technical failure preventing use — full refund within 7 days of payment</li>
            <li>Duplicate charge — full refund within 5 business days</li>
            <li>Refund processing: 5–10 business days to original payment method</li>
          </ul>
        </div>

        {h2('1. Free Trial')}
        {p('All new accounts include a 7-day free trial. No payment is charged during the trial period. You may cancel at any time during the trial without any charge.')}

        {h2('2. Subscription Cancellation')}
        {p('You may cancel your subscription at any time through:')}
        {ul(['Settings → Plan & Subscription → Cancel Auto-renewal', 'Emailing us at support@sahajvyapar.in'])}
        {p('Upon cancellation:')}
        {ul([
          'Your subscription will not auto-renew at the next billing date.',
          'You retain full access to all features until the end of your current paid billing period.',
          'No partial refunds are issued for unused days within a billing period.',
        ])}

        {h2('3. Eligibility for Refund')}
        <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.8, marginBottom: '0.75rem' }}>Refunds are issued in the following cases:</p>

        <div style={{ display: 'grid', gap: 12, marginBottom: '1.5rem' }}>
          {[
            {
              title: 'Technical failure',
              desc: 'If a platform failure prevents you from accessing core features for more than 48 consecutive hours, you are eligible for a prorated refund for the affected period.',
              color: '#22c55e',
            },
            {
              title: 'Duplicate charge',
              desc: 'If you were charged more than once for the same billing period, the duplicate amount will be fully refunded.',
              color: '#3b82f6',
            },
            {
              title: 'Charge after cancellation',
              desc: 'If you were charged after properly cancelling your subscription, the charge will be fully refunded.',
              color: '#f59e0b',
            },
          ].map(item => (
            <div key={item.title} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 12 }}>
              <div style={{ width: 8, background: item.color, borderRadius: 4, flexShrink: 0 }} />
              <div>
                <div style={{ color: 'white', fontWeight: 500, fontSize: 14, marginBottom: 4 }}>{item.title}</div>
                <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.7 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {h2('4. Non-Refundable Cases')}
        {p('Refunds will NOT be issued for:')}
        {ul([
          'Change of mind after subscription payment',
          'Partial month usage after cancellation (access continues to period end)',
          'Failure to cancel before auto-renewal date',
          'Dissatisfaction with features that were accurately described on our website',
          'Accounts suspended due to Terms of Service violations',
        ])}

        {h2('5. How to Request a Refund')}
        {p('To request a refund, email support@sahajvyapar.in with:')}
        {ul([
          'Subject: "Refund Request — [your registered email]"',
          'Your registered email address',
          'Razorpay payment reference / transaction ID',
          'Reason for the refund request',
        ])}
        {p('We will respond within 2 business days. Approved refunds are processed within 5–10 business days to your original payment method (card, UPI, bank account).')}

        {h2('6. Plan Upgrades & Downgrades')}
        {p('If you upgrade your plan mid-cycle, the new plan takes effect immediately and you are charged the difference prorated for the remaining days. If you downgrade, the lower plan takes effect at the next billing cycle. No refund is issued for the difference.')}

        {h2('7. Contact for Billing Issues')}
        {ul([
          'Email: support@sahajvyapar.in',
          'Response time: Within 2 business days',
          'Escalation: grievance@sahajvyapar.in (for unresolved issues within 7 days)',
        ])}
        {p('This policy is governed by Indian consumer protection laws including the Consumer Protection Act, 2019.')}
      </div>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '24px 5%', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
          {[['/', 'Home'], ['/privacy-policy', 'Privacy Policy'], ['/terms-of-service', 'Terms'], ['/contact', 'Contact']].map(([href, label]) => (
            <Link key={href} href={href} style={{ color: '#64748b', fontSize: 13, textDecoration: 'none' }}>{label}</Link>
          ))}
        </div>
        <p style={{ color: '#334155', fontSize: 12, marginTop: 12 }}>© 2026 Emotiquant Technologies OPC Pvt. Ltd. All rights reserved.</p>
      </footer>
    </div>
  )
}
