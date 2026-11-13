import { NextRequest, NextResponse } from 'next/server'

// FIX #7: Password validated server-side only.
// Set SUPERADMIN_KEY (no NEXT_PUBLIC_ prefix) in Vercel env vars.
// The key never appears in browser bundle.
export async function POST(req: NextRequest) {
  const { password } = await req.json()
  const adminKey = process.env.SUPERADMIN_KEY || process.env.NEXT_PUBLIC_SUPERADMIN_KEY

  if (!adminKey || password !== adminKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
