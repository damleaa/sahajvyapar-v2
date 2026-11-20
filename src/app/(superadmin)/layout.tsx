import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const host = headersList.get('host') || ''

  // Allow: admin subdomain, localhost (dev), or main domain (until admin DNS is set up)
  const isAllowed =
    host.startsWith('admin.') ||
    host.includes('localhost') ||
    host.includes('sahajvyapar.in') ||
    host.includes('vercel.app')

  if (!isAllowed) {
    redirect('/')
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#0f172a', minHeight: '100vh', color: '#f1f5f9' }}>
      {children}
    </div>
  )
}
