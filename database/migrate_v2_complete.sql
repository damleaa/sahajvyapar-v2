-- ============================================================
-- SAHAJVYAPAR v2 — Migration for existing Supabase project
-- Run this if you already ran schema.sql
-- Adds missing columns needed by the complete codebase
-- ============================================================

-- Add cost_price to sale_items (needed for COGS / profitability)
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) DEFAULT 0;

-- Add exhibition_id to sales (needed for exhibition P&L)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS exhibition_id UUID REFERENCES exhibitions(id) ON DELETE SET NULL;

-- Add expenses table (needed for reports)
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    expense_date DATE DEFAULT CURRENT_DATE,
    exhibition_id UUID REFERENCES exhibitions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant data access" ON expenses FOR ALL USING (tenant_id = get_my_tenant_id() OR is_admin());

-- Add transport and other cost columns to exhibitions
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS transport_cost NUMERIC(10,2) DEFAULT 0;
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS staff_cost NUMERIC(10,2) DEFAULT 0;
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS food_cost NUMERIC(10,2) DEFAULT 0;
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS marketing_cost NUMERIC(10,2) DEFAULT 0;

-- Update trial period to 7 days for demo accounts
-- (only run if you want to reset trial for demo accounts)
-- UPDATE tenants SET plan_expires_at = NOW() + INTERVAL '7 days' WHERE email LIKE '%demo.sahajvyapar%';

-- Verify
SELECT
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='sale_items' AND column_name='cost_price') as sale_items_cost_price,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='sales' AND column_name='exhibition_id') as sales_exhibition_id,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name='expenses') as expenses_table;
