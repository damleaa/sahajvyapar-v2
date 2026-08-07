import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  // Check if accessing from admin subdomain or allow direct access in dev
  const headersList = await headers()
  const host = headersList.get('host') || ''
  const isAdminDomain = host.startsWith('admin.') || host === 'localhost:4000' || host.includes('localhost')

  if (!isAdminDomain) {
    redirect('/')
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#0f172a', minHeight: '100vh', color: '#f1f5f9' }}>
      {children}
    </div>
  )
}
