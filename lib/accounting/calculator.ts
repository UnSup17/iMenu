import { prisma } from '@/lib/prisma'
import { ExpenseCategory, PaymentMethod, InvoiceStatus } from '@prisma/client'
import { PLReportData, VatReportData, CashRegisterLiveSummary, ExpenseSummaryItem } from './types'

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  FOOD_INGREDIENTS: 'Insumos y Alimentos',
  BEVERAGES: 'Bebidas y Licores',
  LABOR: 'Nómina y Propinas',
  UTILITIES: 'Servicios Públicos (Luz, Agua, Gas)',
  RENT: 'Arriendo de Local',
  EQUIPMENT: 'Equipos y Mantenimiento',
  MARKETING: 'Publicidad y Mercadeo',
  ADMIN: 'Administración y Software',
  TAXES: 'Impuestos y Tasas',
  OTHER: 'Otros Gastos Operativos',
}

/**
 * Calcula el Estado de Resultados (P&L) para un restaurante en un rango de fechas.
 */
export async function calculatePL(
  restaurantId: string,
  startDate: Date,
  endDate: Date,
  periodLabel?: string
): Promise<PLReportData> {
  // 1. Facturas Pagadas en el rango
  const invoices = await prisma.invoice.findMany({
    where: {
      restaurantId,
      status: InvoiceStatus.PAID,
      issuedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  })

  let grossSales = 0
  let discountTotal = 0
  let taxCollected = 0
  let serviceChargeTotal = 0

  for (const inv of invoices) {
    grossSales += Number(inv.subtotal)
    discountTotal += Number(inv.discountAmount)
    taxCollected += Number(inv.taxAmount)
    serviceChargeTotal += Number(inv.serviceCharge)
  }

  const netSales = grossSales - discountTotal

  // 2. Gastos en el rango
  const expenses = await prisma.expense.findMany({
    where: {
      restaurantId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  })

  let foodAndBeveragePurchases = 0
  const categoryMap: Record<ExpenseCategory, { totalAmount: number; totalTax: number; count: number }> = {
    FOOD_INGREDIENTS: { totalAmount: 0, totalTax: 0, count: 0 },
    BEVERAGES: { totalAmount: 0, totalTax: 0, count: 0 },
    LABOR: { totalAmount: 0, totalTax: 0, count: 0 },
    UTILITIES: { totalAmount: 0, totalTax: 0, count: 0 },
    RENT: { totalAmount: 0, totalTax: 0, count: 0 },
    EQUIPMENT: { totalAmount: 0, totalTax: 0, count: 0 },
    MARKETING: { totalAmount: 0, totalTax: 0, count: 0 },
    ADMIN: { totalAmount: 0, totalTax: 0, count: 0 },
    TAXES: { totalAmount: 0, totalTax: 0, count: 0 },
    OTHER: { totalAmount: 0, totalTax: 0, count: 0 },
  }

  for (const exp of expenses) {
    const amt = Number(exp.amount)
    const tax = Number(exp.taxAmount)
    categoryMap[exp.category].totalAmount += amt
    categoryMap[exp.category].totalTax += tax
    categoryMap[exp.category].count += 1

    if (exp.category === 'FOOD_INGREDIENTS' || exp.category === 'BEVERAGES') {
      foodAndBeveragePurchases += amt
    }
  }

  // 3. Costo de ventas (COGS)
  const totalCOGS = foodAndBeveragePurchases
  const grossProfit = netSales - totalCOGS
  const grossMarginPercent = netSales > 0 ? (grossProfit / netSales) * 100 : 0

  // 4. Gastos operativos (OPEX - excluyendo insumos que ya entraron en COGS)
  const opexCategories: ExpenseSummaryItem[] = []
  let totalOpex = 0

  for (const [cat, data] of Object.entries(categoryMap) as [ExpenseCategory, typeof categoryMap[ExpenseCategory]][]) {
    if (cat !== 'FOOD_INGREDIENTS' && cat !== 'BEVERAGES') {
      totalOpex += data.totalAmount
      opexCategories.push({
        category: cat,
        categoryLabel: EXPENSE_CATEGORY_LABELS[cat],
        totalAmount: data.totalAmount,
        totalTax: data.totalTax,
        count: data.count,
      })
    }
  }

  const netOperatingIncome = grossProfit - totalOpex
  const netMarginPercent = netSales > 0 ? (netOperatingIncome / netSales) * 100 : 0

  return {
    periodLabel: periodLabel || `${startDate.toLocaleDateString('es-CO')} - ${endDate.toLocaleDateString('es-CO')}`,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    revenue: {
      grossSales,
      discountTotal,
      netSales,
      taxCollected,
      serviceChargeTotal,
      invoicesCount: invoices.length,
    },
    costOfSales: {
      foodAndBeveragePurchases,
      directInventoryCost: foodAndBeveragePurchases,
      totalCOGS,
      grossProfit,
      grossMarginPercent,
    },
    operatingExpenses: {
      byCategory: opexCategories,
      totalOpex,
    },
    netOperatingIncome,
    netMarginPercent,
  }
}

/**
 * Genera el reporte tributario de IVA (Formulario 300 DIAN Colombia o equivalente)
 */
export async function calculateVATSummary(
  restaurantId: string,
  startDate: Date,
  endDate: Date,
  periodLabel?: string
): Promise<VatReportData> {
  const taxConfig = await prisma.taxConfig.findUnique({
    where: { restaurantId },
  })
  const vatRate = taxConfig ? Number(taxConfig.vatRate) : 0.19

  // 1. Facturas emitidas y pagadas (IVA Generado)
  const invoices = await prisma.invoice.findMany({
    where: {
      restaurantId,
      status: InvoiceStatus.PAID,
      issuedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      subtotal: true,
      taxAmount: true,
    },
  })

  let salesTaxableBase = 0
  let vatCollected = 0

  for (const inv of invoices) {
    salesTaxableBase += Number(inv.subtotal)
    vatCollected += Number(inv.taxAmount)
  }

  // 2. Gastos con IVA soportado (IVA Descontable)
  const expenses = await prisma.expense.findMany({
    where: {
      restaurantId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      amount: true,
      taxAmount: true,
    },
  })

  let expensesTaxableBase = 0
  let vatPaid = 0

  for (const exp of expenses) {
    expensesTaxableBase += Number(exp.amount)
    vatPaid += Number(exp.taxAmount)
  }

  // Balance ante la DIAN
  const netVatBalance = vatCollected - vatPaid

  return {
    periodLabel: periodLabel || `${startDate.toLocaleDateString('es-CO')} - ${endDate.toLocaleDateString('es-CO')}`,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    taxRatePercent: vatRate * 100,
    salesTaxableBase,
    vatCollected,
    invoicesCount: invoices.length,
    expensesTaxableBase,
    vatPaid,
    expensesCount: expenses.length,
    netVatBalance,
    status: netVatBalance >= 0 ? 'PAYABLE_TO_DIAN' : 'CREDIT_IN_FAVOR',
  }
}

/**
 * Calcula en tiempo real las ventas por método de pago y el efectivo esperado en caja para hoy.
 */
export async function calculateDailyCashRegister(
  restaurantId: string,
  targetDate: Date,
  openingBalance: number = 0
): Promise<CashRegisterLiveSummary> {
  const startOfDay = new Date(targetDate)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(targetDate)
  endOfDay.setHours(23, 59, 59, 999)

  // Pagos registrados hoy
  const payments = await prisma.payment.findMany({
    where: {
      receivedAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
      invoice: {
        restaurantId,
        status: InvoiceStatus.PAID,
      },
    },
  })

  let cash = 0
  let card = 0
  let transfer = 0
  let qr = 0
  let other = 0

  for (const p of payments) {
    const amt = Number(p.amount)
    switch (p.method) {
      case PaymentMethod.CASH:
        cash += amt
        break
      case PaymentMethod.DEBIT_CARD:
      case PaymentMethod.CREDIT_CARD:
        card += amt
        break
      case PaymentMethod.TRANSFER:
        transfer += amt
        break
      case PaymentMethod.QR_CODE:
        qr += amt
        break
      default:
        other += amt
        break
    }
  }

  const total = cash + card + transfer + qr + other

  // Gastos registrados hoy que fueron pagados en efectivo
  const expenses = await prisma.expense.findMany({
    where: {
      restaurantId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  })

  const expensesInCash = expenses.reduce((acc, e) => acc + Number(e.amount), 0)
  const expectedCashInDrawer = openingBalance + cash - expensesInCash

  return {
    date: targetDate.toISOString(),
    openingBalance,
    salesByMethod: {
      cash,
      card,
      transfer,
      qr,
      other,
      total,
    },
    expensesInCash,
    expectedCashInDrawer,
    invoicesPaidCount: payments.length,
  }
}

/**
 * Calcula el reporte financiero y de rentabilidad de Ofertas Especiales y Festividades
 */
export async function calculateSpecialOffersReport(
  restaurantId: string,
  startDate: Date,
  endDate: Date,
  periodLabel?: string
) {
  const paidInvoices = await prisma.invoice.findMany({
    where: {
      restaurantId,
      status: InvoiceStatus.PAID,
      issuedAt: { gte: startDate, lte: endDate },
    },
    include: {
      items: true,
    },
  })

  // Cargar productos relacionados para costeo de recetas y cupos
  const productIds = Array.from(
    new Set(
      paidInvoices.flatMap((inv) => inv.items.map((i) => i.productId).filter(Boolean) as string[])
    )
  )

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: {
      recipeItems: {
        include: { inventoryItem: true },
      },
    },
  })

  const productMap = new Map(products.map((p) => [p.id, p]))

  let totalSpecialSales = 0
  let totalRegularSales = 0
  let totalSpecialUnits = 0
  let estimatedSpecialCost = 0

  const offerMap = new Map<string, {
    offerLabel: string
    unitsSold: number
    grossSales: number
    taxAmount: number
    netSales: number
    estimatedCost: number
  }>()

  const dishMap = new Map<string, {
    productId: string | null
    name: string
    offerLabel: string | null
    unitsSold: number
    unitPrice: number
    totalSales: number
    specialOfferStock: number | null
    remainingStock: number | null
  }>()

  for (const inv of paidInvoices) {
    for (const item of inv.items) {
      const lineSubtotal = Number(item.subtotal)
      const lineTax = Number(item.taxAmount)
      const lineTotal = lineSubtotal + lineTax
      const product = item.productId ? productMap.get(item.productId) : null

      if (item.isSpecialOffer) {
        totalSpecialSales += lineTotal
        totalSpecialUnits += item.quantity

        let unitCost = 0
        if (product?.specialOfferCost) {
          unitCost = Number(product.specialOfferCost)
        } else if (product?.recipeItems?.length) {
          for (const ri of product.recipeItems) {
            const costPerUnit = Number(ri.inventoryItem.costPerUnit || 0)
            unitCost += Number(ri.quantity) * costPerUnit
          }
        }
        const itemTotalCost = unitCost * item.quantity
        estimatedSpecialCost += itemTotalCost

        const label = item.offerLabel || 'Oferta Especial General'
        const existingOffer = offerMap.get(label) || {
          offerLabel: label,
          unitsSold: 0,
          grossSales: 0,
          taxAmount: 0,
          netSales: 0,
          estimatedCost: 0,
        }
        existingOffer.unitsSold += item.quantity
        existingOffer.grossSales += lineTotal
        existingOffer.taxAmount += lineTax
        existingOffer.netSales += lineSubtotal
        existingOffer.estimatedCost += itemTotalCost
        offerMap.set(label, existingOffer)

        const dishKey = item.productId || item.description
        const existingDish = dishMap.get(dishKey) || {
          productId: item.productId,
          name: item.description,
          offerLabel: label,
          unitsSold: 0,
          unitPrice: Number(item.unitPrice),
          totalSales: 0,
          specialOfferStock: product?.specialOfferStock ?? null,
          remainingStock: product?.specialOfferStock !== null && product?.specialOfferStock !== undefined
            ? Math.max(0, product.specialOfferStock - product.specialOfferStockSold)
            : null,
        }
        existingDish.unitsSold += item.quantity
        existingDish.totalSales += lineTotal
        dishMap.set(dishKey, existingDish)
      } else {
        totalRegularSales += lineTotal
      }
    }
  }

  const grandTotal = totalSpecialSales + totalRegularSales
  const specialSalesPercent = grandTotal > 0 ? (totalSpecialSales / grandTotal) * 100 : 0
  const specialGrossProfit = totalSpecialSales - estimatedSpecialCost
  const specialGrossMarginPercent = totalSpecialSales > 0 ? (specialGrossProfit / totalSpecialSales) * 100 : 0

  const byOffer = Array.from(offerMap.values()).map((o) => {
    const grossProfit = o.grossSales - o.estimatedCost
    const marginPercent = o.grossSales > 0 ? (grossProfit / o.grossSales) * 100 : 0
    return {
      ...o,
      grossProfit,
      marginPercent: parseFloat(marginPercent.toFixed(1)),
    }
  })

  return {
    periodLabel: periodLabel || `${startDate.toLocaleDateString('es-CO')} - ${endDate.toLocaleDateString('es-CO')}`,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    summary: {
      totalSpecialSales,
      totalRegularSales,
      specialSalesPercent: parseFloat(specialSalesPercent.toFixed(1)),
      totalSpecialUnits,
      estimatedSpecialCost,
      specialGrossProfit,
      specialGrossMarginPercent: parseFloat(specialGrossMarginPercent.toFixed(1)),
    },
    byOffer,
    dishes: Array.from(dishMap.values()),
  }
}

