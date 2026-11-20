import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const BETA_VERSION = 'v1.0'

async function getAdminClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ accepted: false })

  const { data } = await supabase
    .from('beta_acceptances')
    .select('accepted_at, version')
    .eq('user_id', user.id)
    .eq('version', BETA_VERSION)
    .single()

  return NextResponse.json({ accepted: !!data, accepted_at: data?.accepted_at })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = await getAdminClient()
  const { data: tenant } = await adminClient.from('tenants').select('id').eq('owner_id', user.id).single()

  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  const ua = req.headers.get('user-agent') || 'unknown'

  // Upsert acceptance record
  await supabase.from('beta_acceptances').upsert({
    user_id: user.id,
    tenant_id: tenant?.id || null,
    version: BETA_VERSION,
    ip_address: ip.split(',')[0].trim(),
    user_agent: ua.substring(0, 500),
    accepted_at: new Date().toISOString(),
  }, { onConflict: 'user_id,version' })

  // Also mark on tenant for quick lookup
  if (tenant) {
    await adminClient.from('tenants').update({
      beta_accepted_at: new Date().toISOString(),
      beta_accepted_version: BETA_VERSION,
    }).eq('id', tenant.id)
  }

  return NextResponse.json({ success: true, accepted_at: new Date().toISOString() })
}
