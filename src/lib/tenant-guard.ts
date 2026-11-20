/**
 * src/lib/tenant-guard.ts
 *
 * Central tenant-access guard — called at the top of EVERY API route handler.
 *
 * Returns a fully typed result instead of throwing, so the caller can decide
 * whether to block with a 403 or allow with a warning banner.
 *
 * Usage:
 *   const guard = await requireTenantAccess(req)
 *   if (!guard.ok) return guard.response   // 401 / 403 already serialised
 *   const { user, tenant } = guard
 *
 * Plan enforcement:
 *   - 'suspended' / deleted (deleted_at set) → 403 Account Suspended
 *   - expired + grace period elapsed          → 403 Account Expired
 *   - trial / active / in-grace-period         → allowed (guard.inGrace = true when in grace)
 */

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export type TenantGuardOk = {
  ok: true
  user: { id: string; email: string }
  tenant: {
    id: string
    plan: 'starter' | 'growth' | 'pro'
    plan_status: string
    plan_expires_at: string | null
    grace_period_ends_at: string | null
    is_active: boolean
    deleted_at: string | null
    razorpay_subscription_id: string | null
  }
  isActive: boolean
  isExpired: boolean
  inGrace: boolean
}

export type TenantGuardFail = {
  ok: false
  response: NextResponse
}

export type TenantGuard = TenantGuardOk | TenantGuardFail

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function requireTenantAccess(): Promise<TenantGuard> {
  // 1. Verify authenticated user via cookie session
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  // 2. Load tenant using service role (bypasses RLS; we enforce tenant isolation ourselves)
  const admin = serviceClient()
  const { data: tenant, error } = await admin
    .from('tenants')
    .select(
      'id, plan, plan_status, plan_expires_at, grace_period_ends_at, is_active, deleted_at, razorpay_subscription_id'
    )
    .eq('owner_id', user.id)
    .single()

  if (error || !tenant) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Tenant not found. Complete registration first.' },
        { status: 403 }
      ),
    }
  }

  // 3. Hard-block: account deleted / suspended
  if (tenant.deleted_at || !tenant.is_active) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Account suspended. Contact support.' },
        { status: 403 }
      ),
    }
  }

  const now = new Date()
  const expiresAt = tenant.plan_expires_at ? new Date(tenant.plan_expires_at) : null
  const graceEnds = tenant.grace_period_ends_at ? new Date(tenant.grace_period_ends_at) : null

  // Trial or active plan whose expiry date has passed is treated as expired.
  // This prevents trials from running forever when plan_expires_at is set but
  // plan_status was never updated by the webhook (e.g., Razorpay never charged).
  const isExpired =
    tenant.plan_status === 'expired' ||
    (tenant.plan_status === 'cancelled' && expiresAt !== null && now > expiresAt) ||
    (tenant.plan_status === 'trial' && expiresAt !== null && now > expiresAt) ||
    (tenant.plan_status === 'active' && expiresAt !== null && now > expiresAt)

  // 3-day grace period: use grace_period_ends_at if explicitly set, else derive from expiry
  const derivedGraceEnds = graceEnds ?? (expiresAt ? new Date(expiresAt.getTime() + 3 * 24 * 60 * 60 * 1000) : null)
  const inGrace = isExpired && derivedGraceEnds !== null && now <= derivedGraceEnds

  // 4. Hard-block: expired AND grace period elapsed
  if (isExpired && !inGrace) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'Subscription expired. Please renew to continue.',
          plan_status: tenant.plan_status,
          expired_at: tenant.plan_expires_at,
        },
        { status: 403 }
      ),
    }
  }

  return {
    ok: true,
    user: { id: user.id, email: user.email ?? '' },
    tenant: tenant as TenantGuardOk['tenant'],
    isActive: tenant.is_active,
    isExpired,
    inGrace,
  }
}
