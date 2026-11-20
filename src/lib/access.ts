/**
 * src/lib/access.ts — single source of truth for "can this account use the app right now?"
 *
 * Rules (must match Terms of Service §Free Trial and §Payment):
 *  - Every account has a plan_expires_at (trial end, or end of the paid period).
 *  - Until plan_expires_at            → full access.
 *  - Up to GRACE_DAYS after expiry    → full access + "renew" banner (grace).
 *  - After that                       → blocked (redirect to /account-expired). Data is kept.
 *  - is_active = false or deleted_at  → blocked (admin suspension / deletion).
 *
 * Razorpay renewals move plan_expires_at forward via the webhook, so an auto-renewing
 * customer never hits the grace window unless a renewal payment actually fails.
 *
 * Pure function — safe to use in middleware (edge runtime), server components and API routes.
 */

export const GRACE_DAYS = 3
const DAY_MS = 24 * 60 * 60 * 1000

export type AccessTenant = {
  plan_status: string | null
  plan_expires_at: string | null
  is_active: boolean | null
  deleted_at?: string | null
}

export type AccessState = 'ok' | 'grace' | 'blocked' | 'suspended'

export function getAccessState(t: AccessTenant, now: Date = new Date()): AccessState {
  if (t.deleted_at || t.is_active === false) return 'suspended'

  // 'expired' is set by the webhook when Razorpay halts a subscription after failed retries.
  // plan_expires_at is already in the past in that case, so the date rule below handles it too.
  if (!t.plan_expires_at) return t.plan_status === 'expired' ? 'blocked' : 'ok'

  const expiresAt = new Date(t.plan_expires_at).getTime()
  if (Number.isNaN(expiresAt)) return 'ok'

  if (now.getTime() <= expiresAt) return t.plan_status === 'expired' ? 'grace' : 'ok'
  if (now.getTime() <= expiresAt + GRACE_DAYS * DAY_MS) return 'grace'
  return 'blocked'
}

/** Plan statuses where Razorpay will NOT charge again automatically. */
export function isAutoRenewing(planStatus: string | null | undefined): boolean {
  return planStatus === 'active'
}
