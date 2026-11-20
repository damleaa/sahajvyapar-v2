import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

/**
 * Superadmin session check. Sessions live in admin_sessions (SHA-256 of the cookie token).
 * Lives in lib/ — Next.js route files may only export HTTP handlers.
 */
export function hashAdminToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function verifyAdminSession(req: NextRequest): Promise<boolean> {
  const cookie = req.cookies.get('sv_admin_session')?.value
  if (!cookie) return false

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data, error } = await supabase
    .from('admin_sessions')
    .select('id, expires_at')
    .eq('token_hash', hashAdminToken(cookie))
    .single()

  if (error || !data) return false
  if (new Date(data.expires_at) < new Date()) {
    await supabase.from('admin_sessions').delete().eq('id', data.id)
    return false
  }
  return true
}
