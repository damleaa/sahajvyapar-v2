import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SahajVyapar — Vyapar itna aasaan kabhi nahi tha',
  description: 'Home business aur exhibition sellers ke liye inventory, sales, GST invoice — sab ek jagah. Tally se simple, feature mein poora.',
  keywords: ['inventory management', 'GST invoice', 'exhibition tracker', 'small business India', 'home business app'],
  authors: [{ name: 'SahajVyapar' }],
  creator: 'Emotiquant Technologies OPC Pvt. Ltd.',
  metadataBase: new URL('https://sahajvyapar.in'),
  openGraph: {
    title: 'SahajVyapar — Vyapar itna aasaan kabhi nahi tha',
    description: 'Inventory, sales, GST invoice, exhibitions — sab ek jagah. Indian home business ke liye.',
    url: 'https://sahajvyapar.in',
    siteName: 'SahajVyapar',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SahajVyapar — Business management for Indian home sellers',
    description: 'Inventory, GST invoice, exhibitions — all in one place.',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: '#0f172a',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
