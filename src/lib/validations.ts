import { z } from 'zod'

// ── Indian phone number ──
const phoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Enter valid 10-digit Indian mobile number')
  .optional()
  .or(z.literal(''))

// ── GSTIN ──
const gstinSchema = z
  .string()
  .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format (e.g. 27AAPFU0939F1ZV)')
  .optional()
  .or(z.literal(''))

// ── PAN ──
const panSchema = z
  .string()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format (e.g. ABCDE1234F)')
  .optional()
  .or(z.literal(''))

// ── Pincode ──
const pincodeSchema = z
  .string()
  .regex(/^\d{6}$/, 'Enter valid 6-digit pincode')
  .optional()
  .or(z.literal(''))

// ── IFSC ──
const ifscSchema = z
  .string()
  .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code (e.g. HDFC0001234)')
  .optional()
  .or(z.literal(''))

// ── HSN Code ──
const hsnSchema = z
  .string()
  .regex(/^\d{4,8}$/, 'HSN code must be 4-8 digits')
  .optional()
  .or(z.literal(''))

// ============================================================
// PRODUCT
// ============================================================
export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255),
  sku: z.string().max(100).optional().or(z.literal('')),
  category_id: z.string().uuid().optional().or(z.literal('')),
  unit: z.string().min(1, 'Unit is required'),
  cost_price: z.coerce.number().min(0, 'Cost price cannot be negative'),
  selling_price: z.coerce.number().min(0, 'Selling price cannot be negative'),
  stock_quantity: z.coerce.number().int().min(0, 'Stock cannot be negative'),
  low_stock_alert: z.coerce.number().int().min(0),
  hsn_code: hsnSchema,
  gst_rate: z.coerce.number().min(0).max(28),
  description: z.string().max(1000).optional().or(z.literal('')),
}).refine(
  (data) => data.selling_price >= data.cost_price,
  { message: 'Selling price should be ≥ cost price', path: ['selling_price'] }
)

export type ProductFormData = z.infer<typeof productSchema>

// ============================================================
// CUSTOMER
// ============================================================
export const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(255),
  phone: phoneSchema,
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
})

export type CustomerFormData = z.infer<typeof customerSchema>

// ============================================================
// SUPPLIER
// ============================================================
export const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').max(255),
  phone: phoneSchema,
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  gstin: gstinSchema,
  address: z.string().max(500).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(100).optional().or(z.literal('')),
  payment_terms: z.string().max(100).optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
})

export type SupplierFormData = z.infer<typeof supplierSchema>

// ============================================================
// BUSINESS PROFILE
// ============================================================
export const businessProfileSchema = z.object({
  gstin: gstinSchema,
  pan: panSchema,
  address: z.string().max(500).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(100).optional().or(z.literal('')),
  pincode: pincodeSchema,
  bank_name: z.string().max(100).optional().or(z.literal('')),
  account_no: z.string().max(30).optional().or(z.literal('')),
  ifsc: ifscSchema,
  invoice_prefix: z.string().min(1).max(20),
  financial_year: z.string().regex(/^\d{4}-\d{2}$/, 'Format: 2025-26'),
})

export type BusinessProfileFormData = z.infer<typeof businessProfileSchema>

// ============================================================
// SALE
// ============================================================
export const saleItemSchema = z.object({
  product_id: z.string().uuid('Select a product'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  unit_price: z.coerce.number().min(0.01, 'Price must be greater than 0'),
})

export const saleSchema = z.object({
  customer_id: z.string().uuid().optional().or(z.literal('')),
  customer_name: z.string().min(1, 'Customer name is required'),
  payment_method: z.enum(['cash', 'upi', 'card', 'credit', 'bank']),
  payment_status: z.enum(['paid', 'pending', 'partial']),
  discount_amount: z.coerce.number().min(0),
  notes: z.string().max(500).optional().or(z.literal('')),
  items: z.array(saleItemSchema).min(1, 'Add at least one item'),
})

export type SaleFormData = z.infer<typeof saleSchema>

// ============================================================
// PURCHASE ORDER
// ============================================================
export const poItemSchema = z.object({
  product_id: z.string().uuid('Select a product'),
  ordered_qty: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  unit_price: z.coerce.number().min(0.01, 'Price must be greater than 0'),
})

export const purchaseOrderSchema = z.object({
  supplier_id: z.string().uuid('Select a supplier'),
  expected_date: z.string().optional().or(z.literal('')),
  supplier_ref_number: z.string().max(100).optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
  items: z.array(poItemSchema).min(1, 'Add at least one item'),
})

export type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>

// ============================================================
// RETURN
// ============================================================
export const returnSchema = z.object({
  sale_id: z.string().uuid('Select a sale'),
  reason: z.string().max(500).optional().or(z.literal('')),
  items: z.array(z.object({
    sale_item_id: z.string().uuid(),
    product_id: z.string().uuid(),
    product_name: z.string(),
    returned_qty: z.coerce.number().int().min(0),
    unit_price: z.coerce.number(),
    max_qty: z.number(),
  })).refine(
    items => items.some(i => i.returned_qty > 0),
    'Enter return quantity for at least one item'
  ),
})

export type ReturnFormData = z.infer<typeof returnSchema>

// ============================================================
// EXHIBITION
// ============================================================
export const exhibitionSchema = z.object({
  name: z.string().min(1, 'Exhibition name is required').max(255),
  venue: z.string().max(255).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  start_date: z.string().optional().or(z.literal('')),
  end_date: z.string().optional().or(z.literal('')),
  stall_cost: z.coerce.number().min(0),
  other_expenses: z.coerce.number().min(0),
  status: z.enum(['upcoming', 'active', 'completed']),
  notes: z.string().max(500).optional().or(z.literal('')),
})

export type ExhibitionFormData = z.infer<typeof exhibitionSchema>

// ============================================================
// AUTH
// ============================================================
export const registerSchema = z.object({
  business_name: z.string().min(2, 'Business name must be at least 2 characters').max(255),
  owner_name: z.string().min(2, 'Your name must be at least 2 characters').max(255),
  email: z.string().email('Invalid email address'),
  phone: phoneSchema,
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  plan: z.enum(['starter', 'growth', 'pro']).default('starter'),
})

export type RegisterFormData = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export type LoginFormData = z.infer<typeof loginSchema>
