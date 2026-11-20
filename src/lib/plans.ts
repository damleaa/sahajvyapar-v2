import type { PlanType } from '@/types'

/**
 * Prices and the customer-facing feature list for each plan.
 * These lines are shown on the landing page, register page, upgrade page,
 * settings and account-expired page — they must match src/lib/entitlements.ts.
 *
 * Prices are monthly, in INR, inclusive of GST (see Terms of Service).
 */
export const TRIAL_DAYS = 7

export type PlanInfo = {
  id: PlanType
  name: string
  price: number
  tagline: string
  features: Array<[string, boolean]>
}

export const PLANS: PlanInfo[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 399,
    tagline: 'Home sellers getting started',
    features: [
      ['Up to 100 products', true],
      ['Sales + GST invoice', true],
      ['Expenses + basic reports', true],
      ['Customers, ledger & returns', false],
      ['Suppliers & purchase orders', false],
      ['Exhibitions', false],
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 699,
    tagline: 'Active sellers managing customers',
    features: [
      ['Up to 500 products', true],
      ['Everything in Starter', true],
      ['Customers, ledger & returns', true],
      ['Suppliers & purchase orders', true],
      ['Profit & customer reports', true],
      ['Exhibitions', false],
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 999,
    tagline: 'Exhibition sellers & growing businesses',
    features: [
      ['Unlimited products', true],
      ['Everything in Growth', true],
      ['Exhibitions + P&L', true],
      ['Stock health + business health score', true],
      ['Sahaj Insights + monthly report', true],
    ],
  },
]

export const PLAN_PRICES: Record<PlanType, number> = { starter: 399, growth: 699, pro: 999 }

export function isPlanType(x: unknown): x is PlanType {
  return x === 'starter' || x === 'growth' || x === 'pro'
}

/**
 * Razorpay plan IDs come ONLY from environment variables (server-side).
 * No hardcoded fallbacks: a missing value must fail loudly, never charge against a wrong plan.
 */
export function razorpayPlanId(plan: PlanType): string {
  const id = {
    starter: process.env.RAZORPAY_PLAN_STARTER,
    growth: process.env.RAZORPAY_PLAN_GROWTH,
    pro: process.env.RAZORPAY_PLAN_PRO,
  }[plan]
  if (!id) throw new Error(`RAZORPAY_PLAN_${plan.toUpperCase()} is not configured`)
  return id
}

/** Reverse lookup used by the webhook. Returns null for unknown plan IDs. */
export function planFromRazorpayPlanId(planId: string | undefined | null): PlanType | null {
  if (!planId) return null
  if (planId === process.env.RAZORPAY_PLAN_STARTER) return 'starter'
  if (planId === process.env.RAZORPAY_PLAN_GROWTH) return 'growth'
  if (planId === process.env.RAZORPAY_PLAN_PRO) return 'pro'
  return null
}
