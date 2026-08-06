-- ============================================================
-- SAHAJVYAPAR v2 — Demo Data Seed
-- Run AFTER schema.sql
-- Creates 3 demo accounts for Starter / Growth / Pro tiers
-- ============================================================
-- NOTE: Create these 3 users in Supabase Auth manually first:
--   starter@demo.sahajvyapar.in / Demo@1234
--   growth@demo.sahajvyapar.in  / Demo@1234
--   pro@demo.sahajvyapar.in     / Demo@1234
-- Then replace the UUIDs below with their actual auth.users IDs
-- ============================================================

DO $$
DECLARE
  -- Replace these with actual auth.users UUIDs after creating users
  starter_user_id UUID := '186ce644-e53d-4555-9e83-4bebfd76ea36';
  growth_user_id  UUID := 'f3892989-acfb-40ec-ade7-29896c7ea615';
  pro_user_id     UUID := 'b7aeae79-c76a-4261-8f29-2d4572f2a3e0';

  starter_tenant_id UUID;
  growth_tenant_id  UUID;
  pro_tenant_id     UUID;

  -- Category IDs
  s_cat1 UUID; s_cat2 UUID;
  g_cat1 UUID; g_cat2 UUID; g_cat3 UUID;
  p_cat1 UUID; p_cat2 UUID; p_cat3 UUID;

  -- Product IDs
  s_p1 UUID; s_p2 UUID; s_p3 UUID;
  g_p1 UUID; g_p2 UUID; g_p3 UUID; g_p4 UUID;
  p_p1 UUID; p_p2 UUID; p_p3 UUID; p_p4 UUID; p_p5 UUID;

  -- Customer IDs
  g_c1 UUID; g_c2 UUID;
  p_c1 UUID; p_c2 UUID; p_c3 UUID;

  -- Supplier IDs
  g_s1 UUID;
  p_s1 UUID; p_s2 UUID;

  -- Sale IDs
  g_sale1 UUID; g_sale2 UUID;
  p_sale1 UUID; p_sale2 UUID; p_sale3 UUID;

  -- PO IDs
  g_po1 UUID;
  p_po1 UUID;

BEGIN

-- ============================================================
-- STARTER TENANT — Ritu's Candles
-- ============================================================
INSERT INTO tenants (owner_id, business_name, owner_name, email, phone, plan, plan_status, plan_expires_at)
VALUES (starter_user_id, 'Ritu''s Candles', 'Ritu Agarwal', 'starter@demo.sahajvyapar.in', '9876500001', 'starter', 'active', NOW() + INTERVAL '30 days')
RETURNING id INTO starter_tenant_id;

INSERT INTO business_profiles (tenant_id, invoice_prefix, financial_year, state, city)
VALUES (starter_tenant_id, 'RC', '2025-26', 'Rajasthan', 'Jaipur');

-- Categories
INSERT INTO categories (tenant_id, name) VALUES (starter_tenant_id, 'Candles') RETURNING id INTO s_cat1;
INSERT INTO categories (tenant_id, name) VALUES (starter_tenant_id, 'Accessories') RETURNING id INTO s_cat2;

-- Products
INSERT INTO products (tenant_id, category_id, name, sku, unit, cost_price, selling_price, stock_quantity, low_stock_alert, gst_rate)
VALUES (starter_tenant_id, s_cat1, 'Lavender Soy Candle 100g', 'RC-001', 'piece', 80, 180, 45, 10, 12)
RETURNING id INTO s_p1;

INSERT INTO products (tenant_id, category_id, name, sku, unit, cost_price, selling_price, stock_quantity, low_stock_alert, gst_rate)
VALUES (starter_tenant_id, s_cat1, 'Rose Garden Pillar Candle', 'RC-002', 'piece', 120, 280, 30, 5, 12)
RETURNING id INTO s_p2;

INSERT INTO products (tenant_id, category_id, name, sku, unit, cost_price, selling_price, stock_quantity, low_stock_alert, gst_rate)
VALUES (starter_tenant_id, s_cat1, 'Vanilla Tea Light Set (6pc)', 'RC-003', 'set', 60, 150, 3, 5, 12)
RETURNING id INTO s_p3;

-- Basic sales (no customer)
INSERT INTO sales (tenant_id, customer_name, invoice_number, final_amount, total_amount, payment_method, payment_status)
VALUES (starter_tenant_id, 'Walk-in Customer', 'RC/2025-26/001', 360, 360, 'cash', 'paid');

INSERT INTO sales (tenant_id, customer_name, invoice_number, final_amount, total_amount, payment_method, payment_status)
VALUES (starter_tenant_id, 'Walk-in Customer', 'RC/2025-26/002', 560, 560, 'upi', 'paid');

INSERT INTO sales (tenant_id, customer_name, invoice_number, final_amount, total_amount, payment_method, payment_status)
VALUES (starter_tenant_id, 'Walk-in Customer', 'RC/2025-26/003', 180, 180, 'cash', 'paid');


-- ============================================================
-- GROWTH TENANT — Meera's Jewellery
-- ============================================================
INSERT INTO tenants (owner_id, business_name, owner_name, email, phone, plan, plan_status, plan_expires_at)
VALUES (growth_user_id, 'Meera''s Jewellery', 'Meera Sharma', 'growth@demo.sahajvyapar.in', '9876500002', 'growth', 'active', NOW() + INTERVAL '30 days')
RETURNING id INTO growth_tenant_id;

INSERT INTO business_profiles (tenant_id, invoice_prefix, financial_year, state, city, gstin)
VALUES (growth_tenant_id, 'MJ', '2025-26', 'Maharashtra', 'Pune', '27AAECM1234F1Z5');

-- Categories
INSERT INTO categories (tenant_id, name) VALUES (growth_tenant_id, 'Necklaces') RETURNING id INTO g_cat1;
INSERT INTO categories (tenant_id, name) VALUES (growth_tenant_id, 'Earrings') RETURNING id INTO g_cat2;
INSERT INTO categories (tenant_id, name) VALUES (growth_tenant_id, 'Bangles') RETURNING id INTO g_cat3;

-- Products
INSERT INTO products (tenant_id, category_id, name, sku, unit, cost_price, selling_price, stock_quantity, low_stock_alert, hsn_code, gst_rate)
VALUES (growth_tenant_id, g_cat1, 'Kundan Necklace Set', 'MJ-N01', 'piece', 800, 1800, 15, 3, '7117', 3)
RETURNING id INTO g_p1;

INSERT INTO products (tenant_id, category_id, name, sku, unit, cost_price, selling_price, stock_quantity, low_stock_alert, hsn_code, gst_rate)
VALUES (growth_tenant_id, g_cat2, 'Jhumka Earrings - Gold', 'MJ-E01', 'pair', 350, 850, 25, 5, '7117', 3)
RETURNING id INTO g_p2;

INSERT INTO products (tenant_id, category_id, name, sku, unit, cost_price, selling_price, stock_quantity, low_stock_alert, hsn_code, gst_rate)
VALUES (growth_tenant_id, g_cat3, 'Lac Bangles Set of 12', 'MJ-B01', 'set', 200, 550, 2, 5, '7117', 3)
RETURNING id INTO g_p3;

INSERT INTO products (tenant_id, category_id, name, sku, unit, cost_price, selling_price, stock_quantity, low_stock_alert, hsn_code, gst_rate)
VALUES (growth_tenant_id, g_cat1, 'Pearl Choker Necklace', 'MJ-N02', 'piece', 600, 1400, 8, 3, '7117', 3)
RETURNING id INTO g_p4;

-- Customers
INSERT INTO customers (tenant_id, name, phone, email, credit_balance)
VALUES (growth_tenant_id, 'Sunita Desai', '9876501001', 'sunita@email.com', 1800)
RETURNING id INTO g_c1;

INSERT INTO customers (tenant_id, name, phone, credit_balance)
VALUES (growth_tenant_id, 'Anita Patil', '9876501002', 550)
RETURNING id INTO g_c2;

-- Supplier
INSERT INTO suppliers (tenant_id, name, phone, gstin, city, state, payment_terms)
VALUES (growth_tenant_id, 'Jaipur Jewels Wholesale', '9876502001', '08AABCJ1234D1Z2', 'Jaipur', 'Rajasthan', 'Net 30')
RETURNING id INTO g_s1;

-- Sales with customers
INSERT INTO sales (tenant_id, customer_id, customer_name, invoice_number, invoice_serial, final_amount, total_amount, taxable_amount, cgst_amount, sgst_amount, payment_method, payment_status, created_at)
VALUES (growth_tenant_id, g_c1, 'Sunita Desai', 'MJ/2025-26/001', 'MJ/2025-26/001', 1800, 1800, 1748.54, 26.23, 26.23, 'credit', 'pending', NOW() - INTERVAL '5 days')
RETURNING id INTO g_sale1;

INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price, hsn_code, gst_rate)
VALUES (g_sale1, g_p1, 'Kundan Necklace Set', 1, 1800, 1800, '7117', 3);

INSERT INTO customer_ledger (tenant_id, customer_id, entry_type, amount, note, reference_id, reference_type)
VALUES (growth_tenant_id, g_c1, 'credit', 1800, 'Credit sale - MJ/2025-26/001', g_sale1, 'sale');

INSERT INTO sales (tenant_id, customer_id, customer_name, invoice_number, invoice_serial, final_amount, total_amount, taxable_amount, cgst_amount, sgst_amount, payment_method, payment_status, created_at)
VALUES (growth_tenant_id, g_c2, 'Anita Patil', 'MJ/2025-26/002', 'MJ/2025-26/002', 1400, 1400, 1359.22, 20.39, 20.39, 'upi', 'paid', NOW() - INTERVAL '3 days')
RETURNING id INTO g_sale2;

INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price, hsn_code, gst_rate)
VALUES (g_sale2, g_p4, 'Pearl Choker Necklace', 1, 1400, 1400, '7117', 3);

-- PO
INSERT INTO purchase_orders (tenant_id, supplier_id, po_number, status, order_date, expected_date, total_amount, supplier_ref_number)
VALUES (growth_tenant_id, g_s1, 'PO-2025-001', 'sent', CURRENT_DATE - 3, CURRENT_DATE + 5, 15000, 'JJW-INV-4521')
RETURNING id INTO g_po1;

INSERT INTO po_items (po_id, product_id, product_name, ordered_qty, received_qty, unit_price)
VALUES (g_po1, g_p1, 'Kundan Necklace Set', 10, 0, 800);
INSERT INTO po_items (po_id, product_id, product_name, ordered_qty, received_qty, unit_price)
VALUES (g_po1, g_p2, 'Jhumka Earrings - Gold', 15, 0, 350);


-- ============================================================
-- PRO TENANT — Priya's Handmade
-- ============================================================
INSERT INTO tenants (owner_id, business_name, owner_name, email, phone, plan, plan_status, plan_expires_at)
VALUES (pro_user_id, 'Priya''s Handmade', 'Priya Mehta', 'pro@demo.sahajvyapar.in', '9876500003', 'pro', 'active', NOW() + INTERVAL '30 days')
RETURNING id INTO pro_tenant_id;

INSERT INTO business_profiles (tenant_id, invoice_prefix, financial_year, state, city, gstin, bank_name, account_no, ifsc)
VALUES (pro_tenant_id, 'PH', '2025-26', 'Maharashtra', 'Mumbai', '27AAECP5678G1Z3', 'HDFC Bank', '50100123456789', 'HDFC0001234');

-- Categories
INSERT INTO categories (tenant_id, name) VALUES (pro_tenant_id, 'Macrame') RETURNING id INTO p_cat1;
INSERT INTO categories (tenant_id, name) VALUES (pro_tenant_id, 'Resin Art') RETURNING id INTO p_cat2;
INSERT INTO categories (tenant_id, name) VALUES (pro_tenant_id, 'Gift Hampers') RETURNING id INTO p_cat3;

-- Products
INSERT INTO products (tenant_id, category_id, name, sku, unit, cost_price, selling_price, stock_quantity, low_stock_alert, gst_rate)
VALUES (pro_tenant_id, p_cat1, 'Macrame Wall Hanging Large', 'PH-M01', 'piece', 400, 1200, 12, 3, 12)
RETURNING id INTO p_p1;

INSERT INTO products (tenant_id, category_id, name, sku, unit, cost_price, selling_price, stock_quantity, low_stock_alert, gst_rate)
VALUES (pro_tenant_id, p_cat1, 'Macrame Keychain Set (5pc)', 'PH-M02', 'set', 120, 350, 30, 10, 12)
RETURNING id INTO p_p2;

INSERT INTO products (tenant_id, category_id, name, sku, unit, cost_price, selling_price, stock_quantity, low_stock_alert, gst_rate)
VALUES (pro_tenant_id, p_cat2, 'Resin Coaster Set (4pc)', 'PH-R01', 'set', 200, 600, 2, 5, 12)
RETURNING id INTO p_p3;

INSERT INTO products (tenant_id, category_id, name, sku, unit, cost_price, selling_price, stock_quantity, low_stock_alert, gst_rate)
VALUES (pro_tenant_id, p_cat2, 'Resin Jewellery Tray', 'PH-R02', 'piece', 150, 450, 18, 5, 12)
RETURNING id INTO p_p4;

INSERT INTO products (tenant_id, category_id, name, sku, unit, cost_price, selling_price, stock_quantity, low_stock_alert, gst_rate)
VALUES (pro_tenant_id, p_cat3, 'Festival Gift Hamper', 'PH-G01', 'piece', 600, 1500, 8, 3, 12)
RETURNING id INTO p_p5;

-- Customers
INSERT INTO customers (tenant_id, name, phone, email, credit_balance)
VALUES (pro_tenant_id, 'Kavita Shah', '9876503001', 'kavita@email.com', 0)
RETURNING id INTO p_c1;

INSERT INTO customers (tenant_id, name, phone, credit_balance)
VALUES (pro_tenant_id, 'Rekha Nair', '9876503002', 1200)
RETURNING id INTO p_c2;

INSERT INTO customers (tenant_id, name, phone, email, credit_balance)
VALUES (pro_tenant_id, 'Deepa Iyer', '9876503003', 'deepa@email.com', 0)
RETURNING id INTO p_c3;

-- Suppliers
INSERT INTO suppliers (tenant_id, name, phone, city, state, payment_terms)
VALUES (pro_tenant_id, 'Craft Supplies India', '9876504001', 'Surat', 'Gujarat', 'Net 15')
RETURNING id INTO p_s1;

INSERT INTO suppliers (tenant_id, name, phone, city, state)
VALUES (pro_tenant_id, 'Ribbon & Thread Co', '9876504002', 'Mumbai', 'Maharashtra')
RETURNING id INTO p_s2;

-- Sales
INSERT INTO sales (tenant_id, customer_id, customer_name, invoice_number, invoice_serial, final_amount, total_amount, taxable_amount, cgst_amount, sgst_amount, payment_method, payment_status, created_at)
VALUES (pro_tenant_id, p_c1, 'Kavita Shah', 'PH/2025-26/001', 'PH/2025-26/001', 2400, 2400, 2142.86, 128.57, 128.57, 'upi', 'paid', NOW() - INTERVAL '10 days')
RETURNING id INTO p_sale1;

INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price, gst_rate)
VALUES (p_sale1, p_p1, 'Macrame Wall Hanging Large', 2, 1200, 2400, 12);

INSERT INTO sales (tenant_id, customer_id, customer_name, invoice_number, invoice_serial, final_amount, total_amount, payment_method, payment_status, created_at)
VALUES (pro_tenant_id, p_c2, 'Rekha Nair', 'PH/2025-26/002', 'PH/2025-26/002', 1200, 1200, 'credit', 'pending', NOW() - INTERVAL '7 days')
RETURNING id INTO p_sale2;

INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price, gst_rate)
VALUES (p_sale2, p_p5, 'Festival Gift Hamper', 1, 1200, 1200, 12);

INSERT INTO customer_ledger (tenant_id, customer_id, entry_type, amount, note, reference_id, reference_type)
VALUES (pro_tenant_id, p_c2, 'credit', 1200, 'Credit sale - PH/2025-26/002', p_sale2, 'sale');

INSERT INTO sales (tenant_id, customer_id, customer_name, invoice_number, invoice_serial, final_amount, total_amount, taxable_amount, cgst_amount, sgst_amount, payment_method, payment_status, created_at)
VALUES (pro_tenant_id, p_c3, 'Deepa Iyer', 'PH/2025-26/003', 'PH/2025-26/003', 1050, 1050, 937.5, 56.25, 56.25, 'cash', 'paid', NOW() - INTERVAL '2 days')
RETURNING id INTO p_sale3;

INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price, gst_rate)
VALUES (p_sale3, p_p3, 'Resin Coaster Set (4pc)', 1, 600, 600, 12);
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price, gst_rate)
VALUES (p_sale3, p_p4, 'Resin Jewellery Tray', 1, 450, 450, 12);

-- Return (stock reversal)
INSERT INTO returns (tenant_id, sale_id, customer_id, customer_name, return_number, reason, total_amount, refund_status, refund_amount, refund_mode, refund_date, status)
VALUES (pro_tenant_id, p_sale3, p_c3, 'Deepa Iyer', 'CN/2025-26/001', 'Colour mismatch', 600, 'refunded', 600, 'upi', CURRENT_DATE - 1, 'completed');

-- PO
INSERT INTO purchase_orders (tenant_id, supplier_id, po_number, status, order_date, expected_date, total_amount, supplier_ref_number)
VALUES (pro_tenant_id, p_s1, 'PO-2025-001', 'received', CURRENT_DATE - 15, CURRENT_DATE - 8, 12000, 'CSI-2025-889')
RETURNING id INTO p_po1;

INSERT INTO po_items (po_id, product_id, product_name, ordered_qty, received_qty, unit_price)
VALUES (p_po1, p_p1, 'Macrame Wall Hanging Large', 10, 10, 400);
INSERT INTO po_items (po_id, product_id, product_name, ordered_qty, received_qty, unit_price)
VALUES (p_po1, p_p2, 'Macrame Keychain Set (5pc)', 30, 30, 120);

-- Exhibitions (Pro feature!)
INSERT INTO exhibitions (tenant_id, name, venue, city, start_date, end_date, stall_cost, other_expenses, total_sales, status)
VALUES (pro_tenant_id, 'Pune Craft Festival 2025', 'Pune Exhibition Center', 'Pune', '2025-12-05', '2025-12-07', 8000, 2500, 24800, 'completed');

INSERT INTO exhibitions (tenant_id, name, venue, city, start_date, end_date, stall_cost, other_expenses, total_sales, status)
VALUES (pro_tenant_id, 'Mumbai Christmas Mela', 'Bandra Kurla Complex', 'Mumbai', '2025-12-20', '2025-12-25', 15000, 4000, 0, 'upcoming');

END $$;
