'use client'
import { useState } from 'react'
import { Download, FileText, Table2 } from 'lucide-react'

interface ReportDownloadProps {
  data: any
  reportName: string
}

function toCSV(rows: any[], headers: string[], keys: string[]) {
  const headerRow = headers.join(',')
  const dataRows = rows.map(row =>
    keys.map(k => {
      const val = row[k]
      if (val === null || val === undefined) return ''
      const str = String(val).replace(/"/g, '""')
      return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str
    }).join(',')
  )
  return [headerRow, ...dataRows].join('\n')
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReportDownload({ data, reportName }: ReportDownloadProps) {
  const [open, setOpen] = useState(false)

  const exports = [
    {
      label: 'Sales Summary (CSV)',
      icon: Table2,
      action: () => {
        if (!data?.trend?.length) return
        const csv = toCSV(
          data.trend,
          ['Period', 'Revenue (Rs.)', 'Sales Count'],
          ['label', 'revenue', 'count']
        )
        downloadCSV(csv, `${reportName}_sales_summary.csv`)
        setOpen(false)
      }
    },
    {
      label: 'Product Performance (CSV)',
      icon: Table2,
      action: () => {
        if (!data?.productPerformance?.length) return
        const csv = toCSV(
          data.productPerformance,
          ['Product', 'Revenue (Rs.)', 'Cost (Rs.)', 'Profit (Rs.)', 'Margin (%)', 'Qty Sold'],
          ['name', 'revenue', 'cogs', 'profit', 'margin', 'qty']
        )
        downloadCSV(csv, `${reportName}_product_performance.csv`)
        setOpen(false)
      }
    },
    {
      label: 'Payment Methods (CSV)',
      icon: Table2,
      action: () => {
        if (!data?.byPaymentMethod?.length) return
        const csv = toCSV(
          data.byPaymentMethod,
          ['Method', 'Revenue (Rs.)', 'Count'],
          ['method', 'revenue', 'count']
        )
        downloadCSV(csv, `${reportName}_payment_methods.csv`)
        setOpen(false)
      }
    },
    {
      label: 'Expense Breakdown (CSV)',
      icon: Table2,
      action: () => {
        if (!data?.expenseBreakdown?.length) return
        const csv = toCSV(
          data.expenseBreakdown,
          ['Category', 'Amount (Rs.)'],
          ['category', 'amount']
        )
        downloadCSV(csv, `${reportName}_expenses.csv`)
        setOpen(false)
      }
    },
    {
      label: 'Customer Outstanding (CSV)',
      icon: Table2,
      action: () => {
        if (!data?.customerOutstanding?.length) return
        const csv = toCSV(
          data.customerOutstanding,
          ['Customer Name', 'Outstanding (Rs.)'],
          ['name', 'credit_balance']
        )
        downloadCSV(csv, `${reportName}_outstanding.csv`)
        setOpen(false)
      }
    },
    {
      label: 'Stock Health (CSV)',
      icon: Table2,
      action: () => {
        if (!data?.stockHealth?.items?.length) return
        const csv = toCSV(
          data.stockHealth.items,
          ['Product', 'Status', 'Stock Qty', 'Monthly Sold', 'Cover (months)', 'Stock Value (Rs.)'],
          ['name', 'status', 'stock_quantity', 'monthly_sold', 'cover_months', 'inventory_value']
        )
        downloadCSV(csv, `${reportName}_stock_health.csv`)
        setOpen(false)
      }
    },
    {
      label: 'Full Report (Print / PDF)',
      icon: FileText,
      action: () => {
        window.print()
        setOpen(false)
      }
    },
  ]

  // Filter to only show exports with data
  const available = exports.filter((e, i) => {
    if (i === 6) return true // Always show print
    if (i === 0 && data?.trend?.length) return true
    if (i === 1 && data?.productPerformance?.length) return true
    if (i === 2 && data?.byPaymentMethod?.length) return true
    if (i === 3 && data?.expenseBreakdown?.length) return true
    if (i === 4 && data?.customerOutstanding?.length) return true
    if (i === 5 && data?.stockHealth?.items?.length) return true
    return false
  })

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 text-sm font-medium transition-all"
      >
        <Download className="w-4 h-4" />
        <span>Download</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
            <div className="p-2">
              {available.map((exp, i) => {
                const Icon = exp.icon
                return (
                  <button
                    key={i}
                    onClick={exp.action}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all text-left"
                  >
                    <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    {exp.label}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
