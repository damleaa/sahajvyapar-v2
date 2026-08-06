import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Tenant lookup runs as the signed-in user and is protected by RLS.
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id, business_name, owner_name, plan, plan_status, plan_expires_at')
    .eq('owner_id', user.id)
    .single()

  if (error || !tenant) {
    console.error('No tenant for user:', user.id, error?.message)
    redirect('/login?error=no_tenant')
  }

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar tenant={tenant} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar tenant={tenant} user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
