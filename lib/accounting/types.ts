import { ExpenseCategory, PaymentMethod } from '@prisma/client'

export interface ExpenseSummaryItem {
  category: ExpenseCategory
  categoryLabel: string
  totalAmount: number
  totalTax: number
  count: number
}

export interface PLReportData {
  periodLabel: string
  startDate: string
  endDate: string
  revenue: {
    grossSales: number
    discountTotal: number
    netSales: number
    taxCollected: number
    serviceChargeTotal: number
    invoicesCount: number
  }
  costOfSales: {
    foodAndBeveragePurchases: number
    directInventoryCost: number
    totalCOGS: number
    grossProfit: number
    grossMarginPercent: number
  }
  operatingExpenses: {
    byCategory: ExpenseSummaryItem[]
    totalOpex: number
  }
  netOperatingIncome: number
  netMarginPercent: number
}

export interface VatReportData {
  periodLabel: string
  startDate: string
  endDate: string
  taxRatePercent: number
  // Ventas (IVA Generado)
  salesTaxableBase: number
  vatCollected: number
  invoicesCount: number
  // Compras y Gastos (IVA Descontable)
  expensesTaxableBase: number
  vatPaid: number
  expensesCount: number
  // Balance ante la DIAN
  netVatBalance: number // Positivo: a pagar a DIAN, Negativo: saldo a favor
  status: 'PAYABLE_TO_DIAN' | 'CREDIT_IN_FAVOR'
}

export interface CashRegisterLiveSummary {
  date: string
  openingBalance: number
  salesByMethod: {
    cash: number
    card: number
    transfer: number
    qr: number
    other: number
    total: number
  }
  expensesInCash: number
  expectedCashInDrawer: number
  invoicesPaidCount: number
}
