-- SAHAJ INTELLIGENCE EXTENSION (v2.1)
-- Run this section once on an existing v2 database.
-- ============================================================
CREATE TYPE expense_category_type AS ENUM ('exhibition','transport','staff','food','marketing','packaging','rent','utilities','marketplace_fee','other');

CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    exhibition_id UUID REFERENCES exhibitions(id) ON DELETE SET NULL,
    category expense_category_type DEFAULT 'other',
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    expense_date DATE DEFAULT CURRENT_DATE,
    payment_method payment_method_type DEFAULT 'cash',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sales ADD COLUMN IF NOT EXISTS exhibition_id UUID REFERENCES exhibitions(id) ON DELETE SET NULL;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) DEFAULT 0;
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS transport_cost NUMERIC(10,2) DEFAULT 0;
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS staff_cost NUMERIC(10,2) DEFAULT 0;
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS food_cost NUMERIC(10,2) DEFAULT 0;
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS marketing_cost NUMERIC(10,2) DEFAULT 0;
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS target_sales NUMERIC(10,2) DEFAULT 0;

CREATE INDEX idx_expenses_tenant_date ON expenses(tenant_id, expense_date DESC);
CREATE INDEX idx_expenses_exhibition ON expenses(exhibition_id);
CREATE INDEX idx_sales_exhibition ON sales(exhibition_id);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant data access" ON expenses FOR ALL USING (tenant_id = get_my_tenant_id() OR is_admin());
