-- ============================================================
-- SAHAJVYAPAR v2 — Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE plan_type AS ENUM ('starter', 'growth', 'pro');
CREATE TYPE plan_status AS ENUM ('trial', 'active', 'expired', 'cancelled');
CREATE TYPE payment_method_type AS ENUM ('cash', 'upi', 'card', 'credit', 'bank');
CREATE TYPE payment_status_type AS ENUM ('paid', 'pending', 'partial');
CREATE TYPE po_status_type AS ENUM ('draft', 'sent', 'partial', 'received', 'cancelled');
CREATE TYPE refund_mode_type AS ENUM ('cash', 'upi', 'bank', 'adjusted_in_ledger');
CREATE TYPE exhibition_status_type AS ENUM ('upcoming', 'active', 'completed');

-- ============================================================
-- TENANTS (business accounts)
-- ============================================================
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    plan plan_type DEFAULT 'starter',
    plan_status plan_status DEFAULT 'trial',
    plan_expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '14 days',
    razorpay_subscription_id VARCHAR(100),
    payment_id VARCHAR(255),
    payment_notes TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BUSINESS PROFILES
-- ============================================================
CREATE TABLE business_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    logo_base64 TEXT,
    gstin VARCHAR(15),
    pan VARCHAR(10),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100) DEFAULT 'Maharashtra',
    pincode VARCHAR(6),
    bank_name VARCHAR(100),
    account_no VARCHAR(30),
    ifsc VARCHAR(15),
    invoice_prefix VARCHAR(20) DEFAULT 'INV',
    invoice_counter INTEGER DEFAULT 0,
    financial_year VARCHAR(10) DEFAULT '2025-26',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE global_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    description TEXT,
    unit VARCHAR(50) DEFAULT 'piece',
    cost_price NUMERIC(10,2) DEFAULT 0,
    selling_price NUMERIC(10,2) DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    low_stock_alert INTEGER DEFAULT 5,
    hsn_code VARCHAR(20),
    gst_rate NUMERIC(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STOCK MOVEMENTS
-- ============================================================
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    movement_type VARCHAR(20) NOT NULL,
    quantity INTEGER NOT NULL,
    note TEXT,
    reference_id UUID,
    reference_type VARCHAR(30),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(10),
    email VARCHAR(255),
    address TEXT,
    notes TEXT,
    credit_balance NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SALES
-- ============================================================
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) DEFAULT 'Walk-in Customer',
    invoice_number VARCHAR(50),
    invoice_serial VARCHAR(50),
    total_amount NUMERIC(10,2) DEFAULT 0,
    discount_amount NUMERIC(10,2) DEFAULT 0,
    final_amount NUMERIC(10,2) DEFAULT 0,
    taxable_amount NUMERIC(10,2) DEFAULT 0,
    cgst_amount NUMERIC(10,2) DEFAULT 0,
    sgst_amount NUMERIC(10,2) DEFAULT 0,
    payment_method payment_method_type DEFAULT 'cash',
    payment_status payment_status_type DEFAULT 'paid',
    notes TEXT,
    exhibition_id UUID REFERENCES exhibitions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(10,2) NOT NULL,
    cost_price NUMERIC(10,2) DEFAULT 0,
    hsn_code VARCHAR(20),
    gst_rate NUMERIC(5,2) DEFAULT 0
);

-- ============================================================
-- CUSTOMER LEDGER
-- ============================================================
CREATE TABLE customer_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    entry_type VARCHAR(20) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    note TEXT,
    reference_id UUID,
    reference_type VARCHAR(30),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SUPPLIERS
-- ============================================================
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(10),
    email VARCHAR(255),
    gstin VARCHAR(15),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    payment_terms VARCHAR(100),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PURCHASE ORDERS
-- ============================================================
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    po_number VARCHAR(50) NOT NULL,
    status po_status_type DEFAULT 'draft',
    order_date DATE DEFAULT CURRENT_DATE,
    expected_date DATE,
    total_amount NUMERIC(10,2) DEFAULT 0,
    supplier_ref_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE po_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255),
    ordered_qty INTEGER NOT NULL DEFAULT 0,
    received_qty INTEGER NOT NULL DEFAULT 0,
    unit_price NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- ============================================================
-- RETURNS
-- ============================================================
CREATE TABLE returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    return_number VARCHAR(50) NOT NULL,
    return_date DATE DEFAULT CURRENT_DATE,
    reason TEXT,
    total_amount NUMERIC(10,2) DEFAULT 0,
    refund_status VARCHAR(20) DEFAULT 'pending',
    refund_amount NUMERIC(10,2) DEFAULT 0,
    refund_mode refund_mode_type,
    refund_note TEXT,
    refund_date DATE,
    status VARCHAR(20) DEFAULT 'initiated',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE return_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_id UUID REFERENCES returns(id) ON DELETE CASCADE,
    sale_item_id UUID REFERENCES sale_items(id) ON DELETE SET NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255),
    returned_qty INTEGER NOT NULL DEFAULT 0,
    unit_price NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- ============================================================
-- EXHIBITIONS (Pro plan only)
-- ============================================================
CREATE TABLE exhibitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    venue VARCHAR(255),
    city VARCHAR(100),
    start_date DATE,
    end_date DATE,
    stall_cost NUMERIC(10,2) DEFAULT 0,
    other_expenses NUMERIC(10,2) DEFAULT 0,
    total_sales NUMERIC(10,2) DEFAULT 0,
    notes TEXT,
    status exhibition_status_type DEFAULT 'upcoming',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CATEGORY REQUESTS
-- ============================================================
CREATE TABLE category_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    requested_name VARCHAR(100) NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    admin_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

-- ============================================================
-- ADMIN USERS
-- ============================================================
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_tenants_owner ON tenants(owner_id);
CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_products_active ON products(tenant_id, is_active);
CREATE INDEX idx_sales_tenant ON sales(tenant_id);
CREATE INDEX idx_sales_created ON sales(tenant_id, created_at DESC);
CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_suppliers_tenant ON suppliers(tenant_id);
CREATE INDEX idx_po_tenant ON purchase_orders(tenant_id);
CREATE INDEX idx_returns_tenant ON returns(tenant_id);
CREATE INDEX idx_exhibitions_tenant ON exhibitions(tenant_id);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_customer_ledger_customer ON customer_ledger(customer_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE exhibitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_requests ENABLE ROW LEVEL SECURITY;

-- Helper function: get tenant_id for current user
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS UUID AS $$
  SELECT id FROM tenants WHERE owner_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = TRUE);
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- TENANTS policies
CREATE POLICY "Users can view own tenant" ON tenants FOR SELECT USING (owner_id = auth.uid() OR is_admin());
CREATE POLICY "Users can update own tenant" ON tenants FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Admins can insert tenants" ON tenants FOR INSERT WITH CHECK (is_admin() OR owner_id = auth.uid());
CREATE POLICY "Admins can manage all tenants" ON tenants FOR ALL USING (is_admin());

-- Generic tenant-scoped policy helper (used for all other tables)
CREATE POLICY "Tenant data access" ON business_profiles FOR ALL USING (tenant_id = get_my_tenant_id() OR is_admin());
CREATE POLICY "Tenant data access" ON categories FOR ALL USING (tenant_id = get_my_tenant_id() OR is_admin());
CREATE POLICY "Tenant data access" ON products FOR ALL USING (tenant_id = get_my_tenant_id() OR is_admin());
CREATE POLICY "Tenant data access" ON stock_movements FOR ALL USING (tenant_id = get_my_tenant_id() OR is_admin());
CREATE POLICY "Tenant data access" ON customers FOR ALL USING (tenant_id = get_my_tenant_id() OR is_admin());
CREATE POLICY "Tenant data access" ON sales FOR ALL USING (tenant_id = get_my_tenant_id() OR is_admin());
CREATE POLICY "Tenant data access" ON customer_ledger FOR ALL USING (tenant_id = get_my_tenant_id() OR is_admin());
CREATE POLICY "Tenant data access" ON suppliers FOR ALL USING (tenant_id = get_my_tenant_id() OR is_admin());
CREATE POLICY "Tenant data access" ON purchase_orders FOR ALL USING (tenant_id = get_my_tenant_id() OR is_admin());
CREATE POLICY "Tenant data access" ON returns FOR ALL USING (tenant_id = get_my_tenant_id() OR is_admin());
CREATE POLICY "Tenant data access" ON exhibitions FOR ALL USING (tenant_id = get_my_tenant_id() OR is_admin());
CREATE POLICY "Tenant data access" ON category_requests FOR ALL USING (tenant_id = get_my_tenant_id() OR is_admin());

-- Sale items and PO items — access via parent
CREATE POLICY "Sale items access" ON sale_items FOR ALL USING (
    EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id AND sales.tenant_id = get_my_tenant_id())
    OR is_admin()
);
CREATE POLICY "PO items access" ON po_items FOR ALL USING (
    EXISTS (SELECT 1 FROM purchase_orders WHERE purchase_orders.id = po_items.po_id AND purchase_orders.tenant_id = get_my_tenant_id())
    OR is_admin()
);
CREATE POLICY "Return items access" ON return_items FOR ALL USING (
    EXISTS (SELECT 1 FROM returns WHERE returns.id = return_items.return_id AND returns.tenant_id = get_my_tenant_id())
    OR is_admin()
);

-- Global categories — readable by all authenticated users
ALTER TABLE global_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Global categories readable by all" ON global_categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage global categories" ON global_categories FOR ALL USING (is_admin());

-- Admin users table
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins only" ON admin_users FOR ALL USING (is_admin());

-- ============================================================
-- GLOBAL CATEGORIES SEED
-- ============================================================
INSERT INTO global_categories (name) VALUES
  ('Candles'), ('Jewellery'), ('Home Decor'), ('Gift Boxes'),
  ('Skincare'), ('Clothing'), ('Food & Beverages'), ('Stationery'),
  ('Sarees'), ('Dupattas'), ('Kurtis'), ('Accessories'),
  ('Toys'), ('Electronics'), ('General')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER returns_updated_at BEFORE UPDATE ON returns FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER business_profiles_updated_at BEFORE UPDATE ON business_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
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
