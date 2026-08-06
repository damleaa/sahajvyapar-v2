export type PlanType = 'starter' | 'growth' | 'pro'
export type PlanStatus = 'trial' | 'active' | 'expired' | 'cancelled'
export type PaymentMethodType = 'cash' | 'upi' | 'card' | 'credit' | 'bank'
export type PaymentStatusType = 'paid' | 'pending' | 'partial'
export type PoStatusType = 'draft' | 'sent' | 'partial' | 'received' | 'cancelled'
export type RefundModeType = 'cash' | 'upi' | 'bank' | 'adjusted_in_ledger'
export type ExhibitionStatusType = 'upcoming' | 'active' | 'completed'

export interface Tenant {
  id: string
  owner_id: string
  business_name: string
  owner_name: string
  email: string
  phone?: string
  plan: PlanType
  plan_status: PlanStatus
  plan_expires_at: string
  is_active: boolean
  created_at: string
}

export interface BusinessProfile {
  id: string
  tenant_id: string
  logo_base64?: string
  gstin?: string
  pan?: string
  address?: string
  city?: string
  state: string
  pincode?: string
  bank_name?: string
  account_no?: string
  ifsc?: string
  invoice_prefix: string
  invoice_counter: number
  financial_year: string
}

export interface Category {
  id: string
  tenant_id: string
  name: string
  created_at: string
}

export interface Product {
  id: string
  tenant_id: string
  category_id?: string
  name: string
  sku?: string
  description?: string
  unit: string
  cost_price: number
  selling_price: number
  stock_quantity: number
  low_stock_alert: number
  hsn_code?: string
  gst_rate: number
  is_active: boolean
  created_at: string
  updated_at: string
  // joined
  category_name?: string
}

export interface Customer {
  id: string
  tenant_id: string
  name: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  credit_balance: number
  created_at: string
  // computed
  total_sales?: number
  total_spent?: number
}

export interface Sale {
  id: string
  tenant_id: string
  customer_id?: string
  customer_name: string
  invoice_number?: string
  invoice_serial?: string
  total_amount: number
  discount_amount: number
  final_amount: number
  taxable_amount: number
  cgst_amount: number
  sgst_amount: number
  payment_method: PaymentMethodType
  payment_status: PaymentStatusType
  notes?: string
  created_at: string
  // joined
  item_count?: number
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id?: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
  hsn_code?: string
  gst_rate: number
}

export interface Supplier {
  id: string
  tenant_id: string
  name: string
  phone?: string
  email?: string
  gstin?: string
  address?: string
  city?: string
  state?: string
  payment_terms?: string
  notes?: string
  is_active: boolean
  created_at: string
}

export interface PurchaseOrder {
  id: string
  tenant_id: string
  supplier_id?: string
  po_number: string
  status: PoStatusType
  order_date: string
  expected_date?: string
  total_amount: number
  supplier_ref_number?: string
  notes?: string
  created_at: string
  // joined
  supplier_name?: string
  item_count?: number
}

export interface PoItem {
  id: string
  po_id: string
  product_id?: string
  product_name: string
  ordered_qty: number
  received_qty: number
  unit_price: number
  // computed
  receiving_now?: number
}

export interface Return {
  id: string
  tenant_id: string
  sale_id?: string
  customer_id?: string
  customer_name: string
  return_number: string
  return_date: string
  reason?: string
  total_amount: number
  refund_status: string
  refund_amount: number
  refund_mode?: RefundModeType
  refund_note?: string
  refund_date?: string
  status: string
  created_at: string
  // joined
  sale_invoice?: string
}

export interface Exhibition {
  id: string
  tenant_id: string
  name: string
  venue?: string
  city?: string
  start_date?: string
  end_date?: string
  stall_cost: number
  other_expenses: number
  total_sales: number
  notes?: string
  status: ExhibitionStatusType
  created_at: string
}

export interface DashboardStats {
  total_products: number
  low_stock: number
  monthly_revenue: number
  monthly_sales: number
  total_customers: number
  total_credit_outstanding: number
  upcoming_exhibitions: number
}

// Plan feature gates
export const PLAN_FEATURES = {
  starter: {
    max_products: 100,
    max_categories: 5,
    customers: false,
    gst_invoice: false,
    whatsapp_share: false,
    suppliers: false,
    purchase_orders: false,
    returns: false,
    exhibitions: false,
    full_reports: false,
    business_profile: false,
    max_admin_users: 1,
  },
  growth: {
    max_products: 500,
    max_categories: -1, // unlimited
    customers: true,
    gst_invoice: true,
    whatsapp_share: true,
    suppliers: true,
    purchase_orders: true,
    returns: true,
    exhibitions: true,
    full_reports: true,
    business_profile: true,
    max_admin_users: 1,
  },
  pro: {
    max_products: -1, // unlimited
    max_categories: -1,
    customers: true,
    gst_invoice: true,
    whatsapp_share: true,
    suppliers: true,
    purchase_orders: true,
    returns: true,
    exhibitions: true,
    full_reports: true,
    business_profile: true,
    max_admin_users: 3,
  },
} as const

export type PlanFeatures = typeof PLAN_FEATURES[PlanType]

export function canAccess(plan: PlanType, feature: keyof typeof PLAN_FEATURES.pro): boolean {
  return PLAN_FEATURES[plan][feature] as boolean
}
