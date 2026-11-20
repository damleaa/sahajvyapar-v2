/** Data the customer can download as CSV (Settings → Your data, and the plan-ended page). */
export const EXPORTS: Record<string, { table: string; label: string; order: string }> = {
  products:        { table: 'products',        label: 'Products',         order: 'created_at' },
  sales:           { table: 'sales',           label: 'Sales (invoices)', order: 'created_at' },
  sale_items:      { table: 'sale_items',      label: 'Sale line items',  order: 'id' },
  customers:       { table: 'customers',       label: 'Customers',        order: 'created_at' },
  customer_ledger: { table: 'customer_ledger', label: 'Customer ledger',  order: 'created_at' },
  expenses:        { table: 'expenses',        label: 'Expenses',         order: 'created_at' },
  suppliers:       { table: 'suppliers',       label: 'Suppliers',        order: 'created_at' },
  purchase_orders: { table: 'purchase_orders', label: 'Purchase orders',  order: 'created_at' },
  returns:         { table: 'returns',         label: 'Returns',          order: 'created_at' },
  exhibitions:     { table: 'exhibitions',     label: 'Exhibitions',      order: 'created_at' },
  stock_movements: { table: 'stock_movements', label: 'Stock movements',  order: 'created_at' },
}

export const EXPORT_TYPES = Object.entries(EXPORTS).map(([key, v]) => ({ key, label: v.label }))
