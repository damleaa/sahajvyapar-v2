# SahajVyapar — Deployment Instructions
## Production v3 Release (14 Nov 2026)

---

## 1. Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18.17 |
| npm | ≥ 9 |
| Vercel CLI (optional) | latest |

---

## 2. Environment Variables

Set all of the following in **Vercel → Project → Settings → Environment Variables** (or `.env.local` for local dev).

### Required — Server-only (never `NEXT_PUBLIC_` prefix)

| Variable | Description |
|----------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (bypasses RLS) |
| `SUPERADMIN_KEY` | Superadmin password — **never** `NEXT_PUBLIC_SUPERADMIN_KEY` |
| `RAZORPAY_KEY_SECRET` | Razorpay API secret |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook HMAC secret — **rotate immediately** (old value is compromised) |
| `RESEND_API_KEY` | Resend transactional email key |
| `ADMIN_ALERT_EMAIL` | Email for new-user alerts |

### Required — Public (safe to bundle)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay publishable key |

### Optional — Razorpay Plan IDs (defaults hardcoded in webhook)

| Variable | Default |
|----------|---------|
| `RAZORPAY_PLAN_STARTER` | `plan_TRezg1wQxJx0V0` |
| `RAZORPAY_PLAN_GROWTH` | `plan_TRf0LpcAbFOU9c` |
| `RAZORPAY_PLAN_PRO` | `plan_TRf0seDjj0Io7D` |

---

## 3. Database Migrations

Run **in order** in Supabase SQL Editor (or `supabase db push`):

```
1. supabase/migrations/20261113_production_grade.sql   ← base schema
2. supabase/migrations/20261114_security_fixes.sql     ← security patches (v3)
```

**Migration 1** (`20261113_production_grade.sql`) creates/alters:

- `admin_sessions` — HttpOnly cookie-backed admin auth (C-02)
- `webhook_events` — durable Razorpay event state machine (H-01)
- `sale_payments` — payment tranches for partial/credit sales (H-05)
- `sales` columns: `sale_date`, `total_gst_amount`, `cgst_amount`, `sgst_amount`, `igst_amount`, `is_inter_state`, `customer_gstin`, `customer_address`
- `sale_items` columns: `taxable_amount`, `cgst_amount`, `sgst_amount`, `igst_amount`
- `tenants` columns: `next_payment_due`, `grace_period_ends_at`, `suspended_at`, `deleted_at`, `deletion_reason`, `razorpay_plan_id`, `beta_accepted_at`, `beta_accepted_version`
- `business_profiles` columns: `invoice_counter`, `invoice_prefix`
- `plan_status` enum: adds `'cancelling'` value
- `increment_invoice_counter()` RPC function (atomic invoice counter)
- RLS policies updated

**Migration 2** (`20261114_security_fixes.sql`) applies:
- `atomic_stock_increment` — adds `auth.uid()` ownership check inside SECURITY DEFINER function
- `tenants` billing columns — REVOKE UPDATE on `plan`, `plan_status`, `plan_expires_at` from `authenticated` role (only service-role / webhook can change them)

**Verify after migration:**
```sql
-- Test invoice counter
SELECT * FROM increment_invoice_counter('<your-tenant-uuid>');

-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('admin_sessions', 'webhook_events', 'sale_payments');
```

---

## 4. Install Dependencies

```bash
npm install
# Installs Next.js 15.1.6
```

---

## 5. Local Development

```bash
cp .env.example .env.local   # fill in all variables above
npm run dev                  # starts at http://localhost:3000
```

---

## 6. Production Deploy (Vercel)

```bash
# Option A — Git push (recommended)
git add -A
git commit -m "Apply audit security fixes — 13 Nov 2026"
git push origin main
# Vercel auto-deploys on push

# Option B — Vercel CLI
vercel --prod
```

---

## 7. Post-Deploy Verification

### Admin Auth (C-02)
1. Visit `/superadmin`
2. Enter `SUPERADMIN_KEY` value
3. Confirm redirect to `/superadmin/dashboard`
4. Confirm HttpOnly cookie `sv_admin_session` is set (DevTools → Application → Cookies)
5. No `sessionStorage` entries should be set

### Subscription Webhook (H-01)
1. Send a test event from Razorpay dashboard
2. Check `webhook_events` table: row should appear with `status = 'processed'`
3. Check tenant's `plan_status` updated correctly

### Invoice Counter (H-03)
1. Create a test sale
2. Confirm invoice number format: `INV/25-26/001`
3. Create second sale — should be `INV/25-26/002`

### Plan Lock (C-03)
1. Attempt to register with `{ plan: "pro" }` in request body
2. Confirm tenant created with `plan = 'starter'` regardless

### Stock Guard (H-03/H-04)
1. Try to sell more than available stock
2. Confirm 400 error: "Insufficient stock for..."

---

## 8. Credential Rotation (REQUIRED after deploy)

> **These must be rotated — they were part of the audit findings.**

| Credential | How to Rotate |
|-----------|---------------|
| Supabase service role key | Supabase → Settings → API → Rotate |
| Razorpay webhook secret | Razorpay → Webhooks → Edit → Regenerate |
| Razorpay API secret | Razorpay → Settings → API Keys → Regenerate |
| Resend API key | Resend → API Keys → Create new → Delete old |
| GitHub PAT (if used) | GitHub → Settings → Developer settings → Tokens → Revoke |

After rotation, update all Vercel environment variables and redeploy.

---

## 9. What Was Fixed (Audit Reference)

| ID | Severity | Issue | Fix |
|----|----------|-------|-----|
| C-02 | Critical | In-memory admin sessions lost on restart | Supabase `admin_sessions` table + SHA-256 token hash |
| C-03 | Critical | Client could set own plan to 'pro' | Server hardcodes `plan: 'starter'` on registration |
| C-05 | Critical | Next.js CVE GHSA-2464-fhr4-w9xw | Upgraded to `15.1.6` |
| H-01 | High | Webhook events not durable — retries re-process | `webhook_events` state machine (received→processed/failed) |
| H-03 | High | Client-supplied product prices accepted | Server fetches authoritative prices from DB |
| H-04 | High | Stock not validated before sale | Pre-flight stock check; atomic `.gte()` guard |
| H-05 | High | Partial payment over-collection possible | Validates amount ≤ outstanding before recording |
| H-09 | High | No `cancelling` state in plan_status | Added to enum; webhook handles gracefully |
| H-10 | High | No server-side subscription expiry enforcement | Middleware blocks expired/inactive accounts |
| H-11 | High | PO receiving trusted client qty | Server loads DB quantities; rejects over-receipt |
| M-03 | Medium | `set_password` had hardcoded default | Requires explicit `new_password` (no fallback) |
| M-06 | Medium | HTML injection in alert emails | `escapeHtml()` on all user values |
| P1-01 | P1 | Category filter missed revenue calculation | Revenue filtered to same category items |
| P1-03 | P1 | Reports used `created_at` not `sale_date` | All date filters use `sale_date` |

---

## 10. Architecture Notes

### Multi-tenant Isolation
All DB writes use the **service role key** (`SUPABASE_SERVICE_ROLE_KEY`). The service role bypasses RLS; tenant isolation is enforced at the application layer by always scoping queries to `tenant_id = tenant.id` where `tenant` is fetched server-side from the authenticated user's `owner_id`.

### Admin Auth Flow
```
POST /api/admin/auth  →  validates SUPERADMIN_KEY (timingSafeEqual)
                      →  generates 32-byte random token
                      →  stores SHA-256(token) in admin_sessions table
                      →  sets HttpOnly cookie sv_admin_session (8h TTL)

Admin API routes      →  verifyAdminSession(req)
                      →  reads cookie, hashes it, checks admin_sessions table
                      →  checks expiry, deletes if expired
```

### Invoice Counter
```
supabase.rpc('increment_invoice_counter', { p_tenant_id })
  → UPDATE business_profiles SET invoice_counter = invoice_counter + 1
     WHERE tenant_id = $1
     RETURNING invoice_counter, invoice_prefix, financial_year
```
Atomic at the DB level — no race condition between concurrent sales.

### Webhook State Machine
```
Razorpay → POST /api/webhooks/razorpay
  1. Verify HMAC signature
  2. Check webhook_events: if 'processed' → return 200 (idempotent)
  3. Insert as 'received' (or skip if race with identical event_id)
  4. Run business update (tenant plan/status change)
  5. If success → update to 'processed'
     If failure → update to 'failed' (Razorpay will retry)
```
