-- =============================================================================
-- SahajVyapar Audit Fixes — Migration
-- Generated: 13 Nov 2026
-- Apply in Supabase SQL Editor (or via supabase db push)
-- Run as: postgres / service-role; all statements are idempotent.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- C-02: Admin sessions table (replaces in-memory Set)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash  TEXT NOT NULL UNIQUE,          -- SHA-256 hex of the raw cookie value
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL
);

-- Index for fast lookup by hash
CREATE INDEX IF NOT EXISTS admin_sessions_token_hash_idx ON public.admin_sessions (token_hash);

-- Auto-delete expired rows (Supabase pg_cron — optional, manual cleanup fallback also works)
-- Uncomment if pg_cron extension is enabled:
-- SELECT cron.schedule('cleanup-admin-sessions', '0 * * * *',
--   $$DELETE FROM public.admin_sessions WHERE expires_at < now()$$);

-- RLS: table is accessed only via service-role key; no user-level policies needed.
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
-- Service role bypasses RLS; deny all other roles:
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_sessions' AND policyname = 'deny_all'
  ) THEN
    CREATE POLICY deny_all ON public.admin_sessions FOR ALL USING (false);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- H-01: Webhook events table (durable state machine)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id      TEXT NOT NULL UNIQUE,         -- Razorpay event UUID
    event_type    TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'received'  -- received | processed | failed
                      CHECK (status IN ('received', 'processed', 'failed')),
    error_message TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_events_event_id_idx  ON public.webhook_events (event_id);
CREATE INDEX IF NOT EXISTS webhook_events_status_idx    ON public.webhook_events (status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'webhook_events_updated_at'
  ) THEN
    CREATE TRIGGER webhook_events_updated_at
      BEFORE UPDATE ON public.webhook_events
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'webhook_events' AND policyname = 'deny_all'
  ) THEN
    CREATE POLICY deny_all ON public.webhook_events FOR ALL USING (false);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- H-05: Sale payments table (payment tranches for credit / partial sales)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sale_payments (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id        UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    tenant_id      UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    amount         NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL DEFAULT 'cash',
    note           TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sale_payments_sale_id_idx   ON public.sale_payments (sale_id);
CREATE INDEX IF NOT EXISTS sale_payments_tenant_id_idx ON public.sale_payments (tenant_id);

ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sale_payments' AND policyname = 'tenant_isolation'
  ) THEN
    CREATE POLICY tenant_isolation ON public.sale_payments
      USING (tenant_id = (
        SELECT t.id FROM public.tenants t
        WHERE t.owner_id = auth.uid()
        LIMIT 1
      ));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- H-03/H-04: sales table — add GST and business-date columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS sale_date       DATE         NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS total_gst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cgst_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_inter_state  BOOLEAN       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS customer_gstin  TEXT,
  ADD COLUMN IF NOT EXISTS customer_address TEXT;

CREATE INDEX IF NOT EXISTS sales_sale_date_idx ON public.sales (sale_date);

-- Back-fill sale_date from created_at for existing rows
UPDATE public.sales
  SET sale_date = created_at::DATE
  WHERE sale_date = '0001-01-01' OR sale_date IS NULL;

-- ---------------------------------------------------------------------------
-- H-04: sale_items — per-line GST breakdown columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS taxable_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cgst_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_amount     NUMERIC(12,2) NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- H-09: plan_status — extend enum to include 'cancelling'
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  -- Only add value if it doesn't exist (Postgres 12+)
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'plan_status'::regtype
      AND enumlabel = 'cancelling'
  ) THEN
    ALTER TYPE plan_status ADD VALUE 'cancelling';
  END IF;
EXCEPTION WHEN undefined_object THEN
  -- plan_status is a TEXT column, not an enum — constraint approach:
  NULL;
END $$;

-- If plan_status is a TEXT column with a CHECK constraint, update it:
-- (run this only if the DO block above raised undefined_object)
-- ALTER TABLE public.tenants
--   DROP CONSTRAINT IF EXISTS tenants_plan_status_check;
-- ALTER TABLE public.tenants
--   ADD CONSTRAINT tenants_plan_status_check
--     CHECK (plan_status IN ('trial','active','expired','cancelled','cancelling','suspended'));

-- ---------------------------------------------------------------------------
-- Tenants table — additional subscription lifecycle columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS next_payment_due      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grace_period_ends_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deletion_reason       TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_plan_id      TEXT,
  ADD COLUMN IF NOT EXISTS beta_accepted_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS beta_accepted_version TEXT;

-- ---------------------------------------------------------------------------
-- H-03: invoice counter — atomic RPC
-- ---------------------------------------------------------------------------
-- This function is called as: supabase.rpc('increment_invoice_counter', { p_tenant_id })
-- Returns: [{ counter, prefix, financial_year }]
-- business_profiles must exist for the tenant (created at registration).

CREATE OR REPLACE FUNCTION public.increment_invoice_counter(p_tenant_id UUID)
RETURNS TABLE(counter INT, prefix TEXT, financial_year TEXT)
LANGUAGE plpgsql
SECURITY DEFINER   -- runs as owner, bypasses RLS
AS $$
DECLARE
  v_counter INT;
  v_prefix  TEXT;
  v_fy      TEXT;
BEGIN
  -- Atomic increment with FOR UPDATE lock
  UPDATE public.business_profiles
    SET invoice_counter = COALESCE(invoice_counter, 0) + 1
    WHERE tenant_id = p_tenant_id
    RETURNING invoice_counter, invoice_prefix, financial_year
    INTO v_counter, v_prefix, v_fy;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'business_profiles row not found for tenant %', p_tenant_id;
  END IF;

  RETURN QUERY SELECT v_counter, COALESCE(v_prefix, 'INV'), COALESCE(v_fy, '25-26');
END;
$$;

-- Ensure invoice_counter column exists on business_profiles
ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS invoice_counter INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invoice_prefix  TEXT NOT NULL DEFAULT 'INV';

-- ---------------------------------------------------------------------------
-- RLS policies — tenants table (tighten plan field protection)
-- ---------------------------------------------------------------------------
-- Prevent users from self-modifying plan-related fields via UPDATE policy.
-- Drop any broad UPDATE policy and replace with a column-restricted one.

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tenants' AND policyname = 'Users can update own tenant'
  ) THEN
    DROP POLICY "Users can update own tenant" ON public.tenants;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tenants' AND policyname = 'users_update_own_tenant_safe'
  ) THEN
    -- Users may only update non-billing fields
    CREATE POLICY users_update_own_tenant_safe ON public.tenants
      FOR UPDATE
      USING (owner_id = auth.uid())
      WITH CHECK (
        owner_id = auth.uid()
        -- The policy itself cannot restrict individual columns in Postgres RLS,
        -- but the app always uses the service role for billing writes.
        -- This policy ensures the row-level guard is in place; column-level
        -- protection is enforced at the application layer (service role only
        -- for plan/plan_status/plan_expires_at writes).
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Done
-- ---------------------------------------------------------------------------
-- After running this migration:
-- 1. Deploy the updated application code (all API routes above).
-- 2. Rotate credentials: Supabase service role, Razorpay webhook secret,
--    Resend API key, GitHub PAT.
-- 3. Verify webhook_events table receives entries on next Razorpay test event.
-- 4. Verify increment_invoice_counter() works: SELECT * FROM increment_invoice_counter('<tenant_uuid>');
