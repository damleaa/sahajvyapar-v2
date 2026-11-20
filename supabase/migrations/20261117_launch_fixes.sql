-- =============================================================================
-- 20261117_launch_fixes.sql
-- Run AFTER 0001 base schema, 20261113_production_grade.sql, 20261114_security_fixes.sql.
-- Idempotent: safe to run more than once.
--
--  1. Billing columns truly write-protected (column REVOKE alone does nothing on Supabase,
--     because the API roles hold table-level UPDATE).
--  2. Missing columns/tables the app already uses: products.track_inventory, customers.state,
--     return_deduction_rules, returns.deduction_*.
--  3. RPCs callable from the server (service_role). Previously they checked auth.uid(), which is
--     NULL for the service-role key the API uses, so every sale / restock / PO receipt failed.
--  4. Invoice numbers restart each Indian financial year (GST requires a unique serial per FY).
--  5. create_sale(): whole sale (invoice no., items, stock, ledger, payment) in ONE transaction.
--  6. initialize_tenant(): 7-day trial with all Pro features + business state captured at signup.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. LOCK DOWN BILLING / ACCOUNT COLUMNS
-- ---------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;          -- app never reads tables as anon
REVOKE INSERT, UPDATE, DELETE ON public.tenants FROM authenticated;
GRANT  UPDATE (business_name, owner_name, phone) ON public.tenants TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.admin_users FROM authenticated;
REVOKE ALL ON public.admin_sessions, public.webhook_events FROM authenticated;

-- ---------------------------------------------------------------------------
-- 2. MISSING COLUMNS / TABLES
-- ---------------------------------------------------------------------------
ALTER TABLE public.products  ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS state   VARCHAR(100);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS gstin   VARCHAR(20);

CREATE TABLE IF NOT EXISTS public.return_deduction_rules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name         VARCHAR(255) NOT NULL,
  rule_type    TEXT NOT NULL CHECK (rule_type IN ('flat','percentage','time_based')),
  flat_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
  percentage   NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 100),
  time_tiers   JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS return_deduction_rules_tenant_idx ON public.return_deduction_rules(tenant_id);
ALTER TABLE public.return_deduction_rules ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'return_deduction_rules' AND policyname = 'Tenant data access') THEN
    CREATE POLICY "Tenant data access" ON public.return_deduction_rules
      FOR ALL USING (tenant_id = get_my_tenant_id() OR is_admin());
  END IF;
END $$;
REVOKE ALL ON public.return_deduction_rules FROM anon;

ALTER TABLE public.returns
  ADD COLUMN IF NOT EXISTS deduction_rule_id UUID REFERENCES public.return_deduction_rules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deduction_type    TEXT,
  ADD COLUMN IF NOT EXISTS deduction_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deduction_note    TEXT;

-- One credit-note number per tenant
CREATE UNIQUE INDEX IF NOT EXISTS returns_tenant_number_uidx ON public.returns(tenant_id, return_number);
-- One invoice number per tenant
CREATE UNIQUE INDEX IF NOT EXISTS sales_tenant_invoice_uidx ON public.sales(tenant_id, invoice_number);

-- ---------------------------------------------------------------------------
-- 3/4. HELPERS + RPCs (server-side only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_indian_fy()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  -- Indian FY April–March, e.g. '2026-27'
  SELECT CASE WHEN EXTRACT(MONTH FROM (now() AT TIME ZONE 'Asia/Kolkata')) >= 4
              THEN EXTRACT(YEAR FROM (now() AT TIME ZONE 'Asia/Kolkata'))::INT
              ELSE EXTRACT(YEAR FROM (now() AT TIME ZONE 'Asia/Kolkata'))::INT - 1 END::TEXT
         || '-' || RIGHT((CASE WHEN EXTRACT(MONTH FROM (now() AT TIME ZONE 'Asia/Kolkata')) >= 4
              THEN EXTRACT(YEAR FROM (now() AT TIME ZONE 'Asia/Kolkata'))::INT
              ELSE EXTRACT(YEAR FROM (now() AT TIME ZONE 'Asia/Kolkata'))::INT - 1 END + 1)::TEXT, 2)
$$;

-- Server code calls RPCs with the service-role key. Allow that caller, or the tenant's owner.
CREATE OR REPLACE FUNCTION public.assert_tenant_access(p_tenant_id UUID)
RETURNS VOID LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_owner UUID;
BEGIN
  -- NB: current_user is the function owner inside SECURITY DEFINER, so only the JWT role is trusted.
  IF coalesce(auth.role(), '') = 'service_role' THEN
    RETURN;
  END IF;
  SELECT owner_id INTO v_owner FROM public.tenants WHERE id = p_tenant_id;
  IF v_owner IS NULL OR v_owner IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Access denied for tenant %', p_tenant_id USING ERRCODE = 'insufficient_privilege';
  END IF;
END $$;

-- Invoice counter: atomic, and restarts at 1 when the financial year changes.
CREATE OR REPLACE FUNCTION public.increment_invoice_counter(p_tenant_id UUID)
RETURNS TABLE(counter INT, prefix TEXT, financial_year TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_fy TEXT := public.current_indian_fy();
  v_counter INT; v_prefix TEXT;
BEGIN
  PERFORM public.assert_tenant_access(p_tenant_id);

  UPDATE public.business_profiles bp
     SET invoice_counter = CASE WHEN bp.financial_year IS DISTINCT FROM v_fy THEN 1
                                ELSE COALESCE(bp.invoice_counter, 0) + 1 END,
         financial_year  = v_fy
   WHERE bp.tenant_id = p_tenant_id
  RETURNING bp.invoice_counter, bp.invoice_prefix INTO v_counter, v_prefix;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business profile not found for tenant %', p_tenant_id;
  END IF;
  RETURN QUERY SELECT v_counter, COALESCE(v_prefix, 'INV')::TEXT, v_fy;
END $$;

CREATE OR REPLACE FUNCTION public.atomic_stock_increment(p_product_id UUID, p_tenant_id UUID, p_delta INT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  PERFORM public.assert_tenant_access(p_tenant_id);
  IF p_delta <= 0 THEN
    RAISE EXCEPTION 'p_delta must be positive, got %', p_delta USING ERRCODE = 'check_violation';
  END IF;
  UPDATE public.products SET stock_quantity = COALESCE(stock_quantity, 0) + p_delta, updated_at = now()
   WHERE id = p_product_id AND tenant_id = p_tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product % not found', p_product_id USING ERRCODE = 'no_data_found';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. create_sale — all-or-nothing sale creation
--    p_sale : header fields (amounts already calculated + validated by the API)
--    p_items: [{product_id, product_name, quantity, unit_price, total_price, cost_price,
--               gst_rate, hsn_code, taxable_amount, cgst_amount, sgst_amount, igst_amount,
--               track_inventory}]
--    Raises INSUFFICIENT_STOCK:<product name> if any tracked product would go below zero.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_sale(p_tenant_id UUID, p_sale JSONB, p_items JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_inv RECORD;
  v_invoice TEXT;
  v_sale_id UUID;
  v_item JSONB;
  v_customer UUID := NULLIF(p_sale->>'customer_id', '')::UUID;
  v_status TEXT := COALESCE(p_sale->>'payment_status', 'paid');
  v_final NUMERIC := (p_sale->>'final_amount')::NUMERIC;
  v_partial NUMERIC := NULLIF(p_sale->>'partial_amount', '')::NUMERIC;
  v_due NUMERIC := 0;
BEGIN
  PERFORM public.assert_tenant_access(p_tenant_id);

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Sale must have at least one item';
  END IF;
  IF v_customer IS NOT NULL AND NOT EXISTS
     (SELECT 1 FROM public.customers WHERE id = v_customer AND tenant_id = p_tenant_id) THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;
  IF v_status IN ('pending', 'partial') AND v_customer IS NULL THEN
    RAISE EXCEPTION 'CUSTOMER_REQUIRED';
  END IF;
  IF v_status = 'partial' AND (v_partial IS NULL OR v_partial <= 0 OR v_partial >= v_final) THEN
    RAISE EXCEPTION 'PARTIAL_AMOUNT_INVALID';
  END IF;

  SELECT * INTO v_inv FROM public.increment_invoice_counter(p_tenant_id);
  v_invoice := v_inv.prefix || '/' || v_inv.financial_year || '/' || lpad(v_inv.counter::TEXT, 3, '0');

  INSERT INTO public.sales (
    tenant_id, customer_id, customer_name, customer_gstin, customer_address, sale_date,
    exhibition_id, invoice_number, invoice_serial, total_amount, taxable_amount, discount_amount,
    total_gst_amount, cgst_amount, sgst_amount, igst_amount, is_inter_state, final_amount,
    payment_method, payment_status, notes
  ) VALUES (
    p_tenant_id, v_customer, COALESCE(NULLIF(p_sale->>'customer_name', ''), 'Walk-in Customer'),
    NULLIF(p_sale->>'customer_gstin', ''), NULLIF(p_sale->>'customer_address', ''),
    COALESCE((p_sale->>'sale_date')::DATE, CURRENT_DATE),
    NULLIF(p_sale->>'exhibition_id', '')::UUID, v_invoice, v_invoice,
    (p_sale->>'total_amount')::NUMERIC, (p_sale->>'total_amount')::NUMERIC,
    COALESCE((p_sale->>'discount_amount')::NUMERIC, 0),
    COALESCE((p_sale->>'total_gst_amount')::NUMERIC, 0), COALESCE((p_sale->>'cgst_amount')::NUMERIC, 0),
    COALESCE((p_sale->>'sgst_amount')::NUMERIC, 0), COALESCE((p_sale->>'igst_amount')::NUMERIC, 0),
    COALESCE((p_sale->>'is_inter_state')::BOOLEAN, false), v_final,
    COALESCE(NULLIF(p_sale->>'payment_method', ''), 'cash')::payment_method_type,
    v_status::payment_status_type, NULLIF(p_sale->>'notes', '')
  ) RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO public.sale_items (
      sale_id, product_id, product_name, quantity, unit_price, total_price, cost_price, gst_rate,
      hsn_code, taxable_amount, cgst_amount, sgst_amount, igst_amount
    ) VALUES (
      v_sale_id, (v_item->>'product_id')::UUID, v_item->>'product_name', (v_item->>'quantity')::INT,
      (v_item->>'unit_price')::NUMERIC, (v_item->>'total_price')::NUMERIC,
      COALESCE((v_item->>'cost_price')::NUMERIC, 0), COALESCE((v_item->>'gst_rate')::NUMERIC, 0),
      NULLIF(v_item->>'hsn_code', ''), COALESCE((v_item->>'taxable_amount')::NUMERIC, 0),
      COALESCE((v_item->>'cgst_amount')::NUMERIC, 0), COALESCE((v_item->>'sgst_amount')::NUMERIC, 0),
      COALESCE((v_item->>'igst_amount')::NUMERIC, 0)
    );

    IF COALESCE((v_item->>'track_inventory')::BOOLEAN, true) THEN
      UPDATE public.products
         SET stock_quantity = stock_quantity - (v_item->>'quantity')::INT, updated_at = now()
       WHERE id = (v_item->>'product_id')::UUID AND tenant_id = p_tenant_id
         AND stock_quantity >= (v_item->>'quantity')::INT;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', v_item->>'product_name';
      END IF;
      INSERT INTO public.stock_movements (tenant_id, product_id, movement_type, quantity, note, reference_id, reference_type)
      VALUES (p_tenant_id, (v_item->>'product_id')::UUID, 'out', (v_item->>'quantity')::INT,
              'Sale: ' || v_invoice, v_sale_id, 'sale');
    END IF;
  END LOOP;

  IF v_status = 'pending' THEN
    v_due := v_final;
  ELSIF v_status = 'partial' THEN
    v_due := v_final - v_partial;
    INSERT INTO public.sale_payments (sale_id, tenant_id, amount, payment_method, note)
    VALUES (v_sale_id, p_tenant_id, v_partial, COALESCE(NULLIF(p_sale->>'payment_method', ''), 'cash'),
            'First payment for ' || v_invoice);
  END IF;

  IF v_due > 0 THEN
    UPDATE public.customers SET credit_balance = COALESCE(credit_balance, 0) + v_due, updated_at = now()
     WHERE id = v_customer AND tenant_id = p_tenant_id;
    INSERT INTO public.customer_ledger (tenant_id, customer_id, entry_type, amount, note, reference_id, reference_type)
    VALUES (p_tenant_id, v_customer, 'credit', v_due,
            CASE WHEN v_status = 'partial'
                 THEN 'Balance due: ' || v_invoice || ' (paid ' || v_partial || ' of ' || v_final || ')'
                 ELSE 'Credit sale: ' || v_invoice END,
            v_sale_id, 'sale');
  END IF;

  RETURN jsonb_build_object('sale_id', v_sale_id, 'invoice_number', v_invoice);
END $$;

-- ---------------------------------------------------------------------------
-- 6. initialize_tenant — trial with all Pro features, state captured at signup
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.initialize_tenant(TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.initialize_tenant(
  p_business_name TEXT, p_owner_name TEXT, p_email TEXT, p_phone TEXT DEFAULT NULL, p_state TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_user UUID := auth.uid(); v_tenant UUID;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT id INTO v_tenant FROM public.tenants WHERE owner_id = v_user LIMIT 1;
  IF FOUND THEN RETURN jsonb_build_object('success', true, 'tenant_id', v_tenant, 'existing', true); END IF;

  INSERT INTO public.tenants (owner_id, business_name, owner_name, email, phone, plan, plan_status, plan_expires_at, is_active)
  VALUES (v_user, TRIM(p_business_name), COALESCE(TRIM(p_owner_name), ''), LOWER(TRIM(p_email)), NULLIF(TRIM(p_phone), ''),
          'pro', 'trial', now() + INTERVAL '7 days', true)
  RETURNING id INTO v_tenant;

  INSERT INTO public.categories (tenant_id, name) VALUES (v_tenant, 'General'), (v_tenant, 'Products'), (v_tenant, 'Accessories');

  INSERT INTO public.business_profiles (tenant_id, invoice_prefix, financial_year, invoice_counter, state)
  VALUES (v_tenant, 'INV', public.current_indian_fy(), 0, NULLIF(TRIM(p_state), ''));

  RETURN jsonb_build_object('success', true, 'tenant_id', v_tenant, 'existing', false);
END $$;

-- New signups default to the trial shape even if inserted by other paths
ALTER TABLE public.tenants ALTER COLUMN plan SET DEFAULT 'pro';
ALTER TABLE public.tenants ALTER COLUMN plan_expires_at SET DEFAULT now() + INTERVAL '7 days';
ALTER TABLE public.business_profiles ALTER COLUMN state DROP DEFAULT;

-- Function permissions
REVOKE EXECUTE ON FUNCTION public.assert_tenant_access(UUID)              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_invoice_counter(UUID)         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.atomic_stock_increment(UUID, UUID, INT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_sale(UUID, JSONB, JSONB)         FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.increment_invoice_counter(UUID)         TO service_role;
GRANT  EXECUTE ON FUNCTION public.atomic_stock_increment(UUID, UUID, INT) TO service_role;
GRANT  EXECUTE ON FUNCTION public.create_sale(UUID, JSONB, JSONB)         TO service_role;
GRANT  EXECUTE ON FUNCTION public.assert_tenant_access(UUID)              TO service_role;
REVOKE EXECUTE ON FUNCTION public.initialize_tenant(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.initialize_tenant(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. create_return — credit note + items + stock back in ONE transaction
--    p_return: {sale_id, customer_id, customer_name, reason, total_amount, deduction_rule_id,
--               deduction_type, deduction_amount, deduction_note, refund_amount}
--    p_items : [{sale_item_id, product_id, product_name, returned_qty, unit_price}]
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_return(p_tenant_id UUID, p_return JSONB, p_items JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_fy TEXT := public.current_indian_fy();
  v_seq INT;
  v_number TEXT;
  v_return_id UUID;
  v_item JSONB;
  v_tracked BOOLEAN;
BEGIN
  PERFORM public.assert_tenant_access(p_tenant_id);
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'No items to return';
  END IF;

  -- Serialise numbering per tenant for this transaction
  PERFORM 1 FROM public.tenants WHERE id = p_tenant_id FOR UPDATE;
  SELECT COUNT(*) + 1 INTO v_seq FROM public.returns
   WHERE tenant_id = p_tenant_id AND return_number LIKE 'CN/' || v_fy || '/%';
  v_number := 'CN/' || v_fy || '/' || lpad(v_seq::TEXT, 3, '0');

  INSERT INTO public.returns (tenant_id, sale_id, customer_id, customer_name, return_number, reason,
    total_amount, deduction_rule_id, deduction_type, deduction_amount, deduction_note,
    refund_amount, refund_status, status)
  VALUES (p_tenant_id, (p_return->>'sale_id')::UUID, NULLIF(p_return->>'customer_id', '')::UUID,
    COALESCE(NULLIF(p_return->>'customer_name', ''), 'Walk-in'), v_number, NULLIF(p_return->>'reason', ''),
    (p_return->>'total_amount')::NUMERIC, NULLIF(p_return->>'deduction_rule_id', '')::UUID,
    NULLIF(p_return->>'deduction_type', ''), COALESCE((p_return->>'deduction_amount')::NUMERIC, 0),
    NULLIF(p_return->>'deduction_note', ''), (p_return->>'refund_amount')::NUMERIC, 'pending', 'initiated')
  RETURNING id INTO v_return_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO public.return_items (return_id, sale_item_id, product_id, product_name, returned_qty, unit_price)
    VALUES (v_return_id, (v_item->>'sale_item_id')::UUID, (v_item->>'product_id')::UUID, v_item->>'product_name',
            (v_item->>'returned_qty')::INT, (v_item->>'unit_price')::NUMERIC);

    SELECT track_inventory INTO v_tracked FROM public.products
     WHERE id = (v_item->>'product_id')::UUID AND tenant_id = p_tenant_id;
    IF COALESCE(v_tracked, false) THEN
      UPDATE public.products SET stock_quantity = COALESCE(stock_quantity, 0) + (v_item->>'returned_qty')::INT, updated_at = now()
       WHERE id = (v_item->>'product_id')::UUID AND tenant_id = p_tenant_id;
      INSERT INTO public.stock_movements (tenant_id, product_id, movement_type, quantity, note, reference_id, reference_type)
      VALUES (p_tenant_id, (v_item->>'product_id')::UUID, 'in', (v_item->>'returned_qty')::INT,
              'Return: ' || v_number, v_return_id, 'return');
    END IF;
  END LOOP;

  RETURN jsonb_build_object('return_id', v_return_id, 'return_number', v_number);
END $$;

REVOKE EXECUTE ON FUNCTION public.create_return(UUID, JSONB, JSONB) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.create_return(UUID, JSONB, JSONB) TO service_role;

-- ---------------------------------------------------------------------------
-- 8. GST TAX INVOICES FOR SUBSCRIPTION PAYMENTS
--    Consecutive serial per financial year (e.g. SV/2026-27/00001, ≤16 chars as GST rules require),
--    issued once per Razorpay payment by the webhook. IGST when the customer's state differs
--    from the company's state, otherwise CGST + SGST.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_invoice_series (
  financial_year TEXT PRIMARY KEY,
  last_number    INT  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.subscription_invoices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID REFERENCES public.tenants(id) ON DELETE SET NULL,   -- invoice survives account deletion (GST record)
  payment_id     TEXT NOT NULL UNIQUE,
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_date   TIMESTAMPTZ NOT NULL,
  plan           TEXT NOT NULL,
  payment_method TEXT,
  amount         NUMERIC(12,2) NOT NULL,   -- GST-inclusive amount paid
  taxable_amount NUMERIC(12,2) NOT NULL,
  cgst_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  sgst_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  igst_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  buyer_name     TEXT NOT NULL,
  buyer_email    TEXT,
  buyer_gstin    TEXT,
  buyer_state    TEXT,
  buyer_address  TEXT,
  period_start   TIMESTAMPTZ,
  period_end     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscription_invoices_tenant_idx ON public.subscription_invoices(tenant_id, invoice_date DESC);
ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_invoice_series ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_invoices' AND policyname = 'read_own') THEN
    CREATE POLICY read_own ON public.subscription_invoices FOR SELECT USING (tenant_id = get_my_tenant_id());
  END IF;
END $$;
REVOKE ALL ON public.subscription_invoices, public.subscription_invoice_series FROM anon, authenticated;
GRANT SELECT ON public.subscription_invoices TO authenticated;

CREATE OR REPLACE FUNCTION public.issue_subscription_invoice(
  p_tenant_id UUID, p_payment_id TEXT, p_amount NUMERIC, p_plan TEXT, p_method TEXT,
  p_paid_at TIMESTAMPTZ, p_period_end TIMESTAMPTZ, p_company_state TEXT
) RETURNS public.subscription_invoices
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_inv public.subscription_invoices;
  v_fy TEXT;
  v_n INT;
  v_t RECORD;
  v_taxable NUMERIC; v_gst NUMERIC; v_cgst NUMERIC := 0; v_sgst NUMERIC := 0; v_igst NUMERIC := 0;
  v_local TIMESTAMP := p_paid_at AT TIME ZONE 'Asia/Kolkata';
BEGIN
  PERFORM public.assert_tenant_access(p_tenant_id);

  SELECT * INTO v_inv FROM public.subscription_invoices WHERE payment_id = p_payment_id;
  IF FOUND THEN RETURN v_inv; END IF;   -- idempotent (webhook retries)

  v_fy := (CASE WHEN EXTRACT(MONTH FROM v_local) >= 4 THEN EXTRACT(YEAR FROM v_local)::INT ELSE EXTRACT(YEAR FROM v_local)::INT - 1 END)::TEXT;
  v_fy := v_fy || '-' || RIGHT((v_fy::INT + 1)::TEXT, 2);

  INSERT INTO public.subscription_invoice_series AS s (financial_year, last_number) VALUES (v_fy, 1)
  ON CONFLICT (financial_year) DO UPDATE SET last_number = s.last_number + 1
  RETURNING last_number INTO v_n;

  SELECT t.business_name, t.email, bp.gstin, bp.state,
         concat_ws(', ', NULLIF(bp.address, ''), NULLIF(bp.city, ''), NULLIF(bp.pincode, '')) AS address
    INTO v_t
    FROM public.tenants t LEFT JOIN public.business_profiles bp ON bp.tenant_id = t.id
   WHERE t.id = p_tenant_id;

  v_taxable := round(p_amount / 1.18, 2);
  v_gst := p_amount - v_taxable;
  IF v_t.state IS NOT NULL AND p_company_state IS NOT NULL AND v_t.state <> p_company_state THEN
    v_igst := v_gst;
  ELSE
    v_cgst := round(v_gst / 2, 2);
    v_sgst := v_gst - v_cgst;
  END IF;

  INSERT INTO public.subscription_invoices (tenant_id, payment_id, invoice_number, invoice_date, plan, payment_method,
    amount, taxable_amount, cgst_amount, sgst_amount, igst_amount, buyer_name, buyer_email, buyer_gstin,
    buyer_state, buyer_address, period_start, period_end)
  VALUES (p_tenant_id, p_payment_id, 'SV/' || v_fy || '/' || lpad(v_n::TEXT, 5, '0'), p_paid_at, p_plan, p_method,
    p_amount, v_taxable, v_cgst, v_sgst, v_igst, v_t.business_name, v_t.email, NULLIF(v_t.gstin, ''),
    v_t.state, NULLIF(v_t.address, ''), p_paid_at, p_period_end)
  RETURNING * INTO v_inv;
  RETURN v_inv;
END $$;

REVOKE EXECUTE ON FUNCTION public.issue_subscription_invoice(UUID, TEXT, NUMERIC, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.issue_subscription_invoice(UUID, TEXT, NUMERIC, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- 9. Manual stock adjustment (in or out). Never lets stock go below zero.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.atomic_stock_adjust(p_product_id UUID, p_tenant_id UUID, p_delta INT)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_new INT;
BEGIN
  PERFORM public.assert_tenant_access(p_tenant_id);
  UPDATE public.products SET stock_quantity = COALESCE(stock_quantity, 0) + p_delta, updated_at = now()
   WHERE id = p_product_id AND tenant_id = p_tenant_id AND COALESCE(stock_quantity, 0) + p_delta >= 0
  RETURNING stock_quantity INTO v_new;
  IF NOT FOUND THEN RAISE EXCEPTION 'STOCK_BELOW_ZERO'; END IF;
  RETURN v_new;
END $$;
REVOKE EXECUTE ON FUNCTION public.atomic_stock_adjust(UUID, UUID, INT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.atomic_stock_adjust(UUID, UUID, INT) TO service_role;
