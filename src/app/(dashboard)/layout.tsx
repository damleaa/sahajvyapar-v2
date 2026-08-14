import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const cookieStore = await cookies()
  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const { data: tenant, error } = await adminClient
    .from('tenants')
    .select('id, business_name, owner_name, plan, plan_status, plan_expires_at, next_payment_due')
    .eq('owner_id', user.id)
    .single()

  if (error || !tenant) {
    console.error('Tenant fetch error:', error?.message)
    redirect('/login?error=no_tenant')
  }

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar tenant={tenant} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar tenant={tenant} user={user} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
