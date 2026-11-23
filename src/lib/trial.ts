/**
 * src/lib/trial.ts
 * Central config for trial mode access.
 * Trial users get: Dashboard, Inventory, Sales, Payments.
 * Everything else shows an "Available in paid plan" lock prompt.
 */

export const TRIAL_ALLOWED_PATHS = [
  '/dashboard',
  '/dashboard/inventory',
  '/dashboard/sales',
  '/dashboard/payments',
  '/dashboard/settings',  // settings always accessible
]

/** Returns true if the path is accessible during trial */
export function isTrialAllowed(pathname: string): boolean {
  return TRIAL_ALLOWED_PATHS.some(
    allowed => pathname === allowed || pathname.startsWith(allowed + '/')
  )
}

/** Nav items locked during trial */
export const TRIAL_LOCKED_LABELS = [
  'Customers',
  'Suppliers',
  'Purchase Orders',
  'Returns',
  'Exhibitions',
  'Expenses',
  'Reports',
  'Sahaj Insights',
]
