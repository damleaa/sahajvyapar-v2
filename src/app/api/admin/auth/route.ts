import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { hashAdminToken } from '@/lib/admin-auth'

// C-02 FIX: Persistent Supabase-backed admin sessions.
// Sessions are stored in the admin_sessions table (see migrations).
// Each session token is a random 64-char hex string; we store its SHA-256 hash in the DB.
// The raw token is set as an HttpOnly cookie — never stored in process memory.
// Requires: SUPERADMIN_KEY env var (server-only, no NEXT_PUBLIC_ prefix).
//
// NOTE: verifyAdminSession is in @/lib/admin-auth — Next.js 15 App Router
// only allows HTTP handler exports (GET/POST/etc.) from route files.

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST: login
export async function POST(req: NextRequest) {
  const { password } = await req.json()
  // Server-only key — NEVER use NEXT_PUBLIC_ prefix for admin credentials
  const adminKey = process.env.SUPERADMIN_KEY

  if (!adminKey) {
    console.error('SUPERADMIN_KEY env var not set')
    return NextResponse.json({ error: 'Admin not configured' }, { status: 500 })
  }

  // Constant-time comparison to prevent timing attacks
  const passwordBuf = Buffer.from(password || '')
  const keyBuf = Buffer.from(adminKey)
  const matches =
    passwordBuf.length === keyBuf.length &&
    crypto.timingSafeEqual(passwordBuf, keyBuf)

  if (!matches) {
    await new Promise(r => setTimeout(r, 300))  // Slow brute-force
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Generate random session token
  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashAdminToken(rawToken)
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000)  // 8 hours

  const supabase = getAdminClient()
  const { error: insertErr } = await supabase.from('admin_sessions').insert({
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
    created_at: new Date().toISOString(),
  })

  if (insertErr) {
    console.error('Failed to store admin session:', insertErr.message)
    return NextResponse.json({ error: 'Session creation failed' }, { status: 500 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('sv_admin_session', rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    expires: expiresAt,
  })
  return res
}

// DELETE: logout
export async function DELETE(req: NextRequest) {
  const cookie = req.cookies.get('sv_admin_session')?.value

  if (cookie) {
    const supabase = getAdminClient()
    await supabase
      .from('admin_sessions')
      .delete()
      .eq('token_hash', hashAdminToken(cookie))
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('sv_admin_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  })
  return res
}
