-- =============================================================================
-- Migration: 20261114_security_fixes.sql
-- Purpose  : Fix cross-tenant vulnerability in atomic_stock_increment RPC and
--            protect billing columns on tenants table from direct client writes.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. FIX atomic_stock_increment — add auth.uid() ownership check
--
-- BEFORE: Any authenticated user could increment stock on any tenant's product
--         by passing an arbitrary p_tenant_id. The function trusted the caller.
--
-- AFTER:  The function verifies that the caller (auth.uid()) owns the tenant
--         identified by p_tenant_id before updating. Cross-tenant calls
--         receive a RAISE EXCEPTION, not a silent no-op.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.atomic_stock_increment(
  p_product_id UUID,
  p_tenant_id  UUID,
  p_delta      INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  -- Verify caller owns the tenant
  SELECT owner_id INTO v_owner_id
    FROM public.tenants
    WHERE id = p_tenant_id
    LIMIT 1;

  IF v_owner_id IS NULL OR v_owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Access denied: caller does not own tenant %', p_tenant_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Delta must be positive (no negative-stock exploits via this path)
  IF p_delta <= 0 THEN
    RAISE EXCEPTION 'p_delta must be positive, got %', p_delta
      USING ERRCODE = 'check_violation';
  END IF;

  -- Atomic increment — safe against concurrent PO receipts
  UPDATE public.products
    SET stock_quantity = stock_quantity + p_delta
    WHERE id = p_product_id
      AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product % not found in tenant %', p_product_id, p_tenant_id
      USING ERRCODE = 'no_data_found';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.atomic_stock_increment(UUID, UUID, INT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.atomic_stock_increment(UUID, UUID, INT) TO authenticated;

COMMENT ON FUNCTION public.atomic_stock_increment IS
  'Atomically increments product stock. Caller must own the tenant. Delta must be positive.';

-- ---------------------------------------------------------------------------
-- 2. PROTECT billing columns on tenants table
--
-- Authenticated users (tenant owners) can update their own row via RLS,
-- but should NEVER be able to change plan, plan_status, or plan_expires_at
-- directly. Those columns are managed only by the webhook handler (service-role).
--
-- Column-level privileges: revoke UPDATE on billing columns from authenticated.
-- Service-role is unaffected (superuser bypasses column grants).
-- ---------------------------------------------------------------------------

-- Revoke all column-level UPDATE grants first (clean slate)
REVOKE UPDATE (plan, plan_status, plan_expires_at) ON public.tenants FROM authenticated;

-- Re-grant UPDATE only on safe, user-editable columns
GRANT UPDATE (
  business_name,
  owner_name,
  phone,
  is_active
) ON public.tenants TO authenticated;

COMMENT ON TABLE public.tenants IS
  'Billing columns (plan, plan_status, plan_expires_at) are write-protected for authenticated role. Only service-role (webhook handler) may change them.';

-- ---------------------------------------------------------------------------
-- Done
-- ---------------------------------------------------------------------------
