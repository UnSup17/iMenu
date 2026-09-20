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

export interface CashflowInflowItem {
  method: string
  methodLabel: string
  amount: number
  count: number
  percentOfTotal: number
}

export interface CashflowOutflowItem {
  category: ExpenseCategory
  categoryLabel: string
  amount: number
  count: number
  percentOfTotal: number
}

export interface CashflowDailyPoint {
  date: string
  dayLabel: string
  inflows: number
  outflows: number
  net: number
  cumulativeNet: number
}

export interface CashflowReportData {
  periodLabel: string
  startDate: string
  endDate: string
  summary: {
    totalInflows: number
    totalOutflows: number
    netCashflow: number
    cashConversionRatio: number // (Net cash / total inflows) * 100
    inflowTransactionsCount: number
    outflowTransactionsCount: number
  }
  inflows: {
    byMethod: CashflowInflowItem[]
    total: number
  }
  outflows: {
    byCategory: CashflowOutflowItem[]
    total: number
  }
  dailyTrend: CashflowDailyPoint[]
}
