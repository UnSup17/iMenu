import { prisma } from '@/lib/prisma'
import { InvoiceStatus } from '@prisma/client'

export interface HourlySalesData {
  hour: number
  hourLabel: string
  totalSales: number
  invoicesCount: number
}

export interface DayOfWeekSalesData {
  dayIndex: number
  dayName: string
  totalSales: number
  invoicesCount: number
}

export interface ProductABCItem {
  productId: string
  name: string
  categoryName: string
  quantitySold: number
  totalRevenue: number
  revenuePercentage: number
  cumulativePercentage: number
  classification: 'A' | 'B' | 'C'
}

export interface TableTurnoverData {
  totalTables: number
  averageSessionMinutes: number
  turnoverRatePerTable: number
  occupiedNow: number
}

export interface AnalyticsDashboardData {
  periodLabel: string
  summary: {
    totalRevenue: number
    totalInvoices: number
    averageTicket: number
    totalItemsSold: number
  }
  salesByHour: HourlySalesData[]
  salesByDayOfWeek: DayOfWeekSalesData[]
  tableTurnover: TableTurnoverData
  abcAnalysis: ProductABCItem[]
  topProducts: { name: string; quantity: number; revenue: number }[]
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

/**
 * Calcula todas las métricas de inteligencia y analítica para un restaurante.
 */
export async function getAnalyticsDashboard(
  restaurantId: string,
  startDate: Date,
  endDate: Date
): Promise<AnalyticsDashboardData> {
  // 1. Facturas pagadas en el rango
  const invoices = await prisma.invoice.findMany({
    where: {
      restaurantId,
      status: InvoiceStatus.PAID,
      issuedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      items: true,
      session: true,
    },
  })

  // 2. Mesas
  const tables = await prisma.table.findMany({
    where: { restaurantId },
  })

  // 3. Productos y categorías
  const products = await prisma.product.findMany({
    where: { restaurantId },
    include: { category: true },
  })

  let totalRevenue = 0
  let totalItemsSold = 0

  // Inicializar ventas por hora (0 a 23)
  const hourlyMap: Record<number, { totalSales: number; invoicesCount: number }> = {}
  for (let i = 0; i < 24; i++) {
    hourlyMap[i] = { totalSales: 0, invoicesCount: 0 }
  }

  // Inicializar ventas por día de la semana (0 a 6)
  const dayMap: Record<number, { totalSales: number; invoicesCount: number }> = {}
  for (let d = 0; d < 7; d++) {
    dayMap[d] = { totalSales: 0, invoicesCount: 0 }
  }

  // Mapa de productos vendidos
  const productSalesMap: Record<
    string,
    { name: string; categoryName: string; quantity: number; revenue: number }
  > = {}

  for (const p of products) {
    productSalesMap[p.id] = {
      name: p.name,
      categoryName: p.category.name,
      quantity: 0,
      revenue: 0,
    }
  }

  let totalSessionDurationMs = 0
  let closedSessionsCount = 0

  for (const inv of invoices) {
    const saleAmt = Number(inv.total)
    totalRevenue += saleAmt

    const invDate = new Date(inv.issuedAt)
    const hour = invDate.getHours()
    const day = invDate.getDay()

    hourlyMap[hour].totalSales += saleAmt
    hourlyMap[hour].invoicesCount += 1

    dayMap[day].totalSales += saleAmt
    dayMap[day].invoicesCount += 1

    for (const item of inv.items) {
      totalItemsSold += item.quantity
      const prodId = item.productId || item.description
      if (!productSalesMap[prodId]) {
        productSalesMap[prodId] = {
          name: item.description,
          categoryName: 'General',
          quantity: 0,
          revenue: 0,
        }
      }
      productSalesMap[prodId].quantity += item.quantity
      productSalesMap[prodId].revenue += Number(item.subtotal)
    }

    if (inv.session && inv.session.closedAt) {
      const start = new Date(inv.session.createdAt).getTime()
      const end = new Date(inv.session.closedAt).getTime()
      totalSessionDurationMs += Math.max(0, end - start)
      closedSessionsCount += 1
    }
  }

  // Formatear ventas por hora
  const salesByHour: HourlySalesData[] = Object.entries(hourlyMap).map(([hStr, data]) => {
    const h = Number(hStr)
    return {
      hour: h,
      hourLabel: `${h.toString().padStart(2, '0')}:00`,
      totalSales: data.totalSales,
      invoicesCount: data.invoicesCount,
    }
  })

  // Formatear ventas por día
  const salesByDayOfWeek: DayOfWeekSalesData[] = Object.entries(dayMap).map(([dStr, data]) => {
    const d = Number(dStr)
    return {
      dayIndex: d,
      dayName: DAY_NAMES[d],
      totalSales: data.totalSales,
      invoicesCount: data.invoicesCount,
    }
  })

  // Rotación de mesas
  const occupiedNow = tables.filter((t) => t.status === 'ACTIVE_QR_SESSION').length
  const averageSessionMinutes =
    closedSessionsCount > 0 ? Math.round(totalSessionDurationMs / closedSessionsCount / (1000 * 60)) : 45
  const turnoverRatePerTable =
    tables.length > 0 ? parseFloat((invoices.length / tables.length).toFixed(2)) : 0

  // Análisis ABC de Productos
  const sortedProducts = Object.entries(productSalesMap)
    .map(([id, data]) => ({
      productId: id,
      name: data.name,
      categoryName: data.categoryName,
      quantitySold: data.quantity,
      totalRevenue: data.revenue,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)

  let cumulativeRevenue = 0
  const abcAnalysis: ProductABCItem[] = sortedProducts.map((p) => {
    const revenuePercentage = totalRevenue > 0 ? (p.totalRevenue / totalRevenue) * 100 : 0
    cumulativeRevenue += revenuePercentage

    let classification: 'A' | 'B' | 'C' = 'C'
    if (cumulativeRevenue <= 80) {
      classification = 'A' // Top 80% ingresos
    } else if (cumulativeRevenue <= 95) {
      classification = 'B' // Siguiente 15%
    }

    return {
      productId: p.productId,
      name: p.name,
      categoryName: p.categoryName,
      quantitySold: p.quantitySold,
      totalRevenue: p.totalRevenue,
      revenuePercentage: parseFloat(revenuePercentage.toFixed(2)),
      cumulativePercentage: parseFloat(Math.min(100, cumulativeRevenue).toFixed(2)),
      classification,
    }
  })

  const topProducts = sortedProducts.slice(0, 5).map((p) => ({
    name: p.name,
    quantity: p.quantitySold,
    revenue: p.totalRevenue,
  }))

  return {
    periodLabel: `${startDate.toLocaleDateString('es-CO')} - ${endDate.toLocaleDateString('es-CO')}`,
    summary: {
      totalRevenue,
      totalInvoices: invoices.length,
      averageTicket: invoices.length > 0 ? Math.round(totalRevenue / invoices.length) : 0,
      totalItemsSold,
    },
    salesByHour,
    salesByDayOfWeek,
    tableTurnover: {
      totalTables: tables.length,
      averageSessionMinutes,
      turnoverRatePerTable,
      occupiedNow,
    },
    abcAnalysis,
    topProducts,
  }
}

/**
 * Genera un archivo CSV con las facturas del restaurante para exportación contable.
 */
export function generateInvoicesCsv(invoices: any[]): string {
  const headers = [
    'Numero_Factura',
    'Fecha_Emision',
    'Mesa',
    'Cliente',
    'NIT_Cliente',
    'Metodo_Pago',
    'Subtotal_COP',
    'IVA_COP',
    'Servicio_COP',
    'Total_COP',
    'Estado',
    'CUFE_DIAN',
  ]

  const rows = invoices.map((inv) => [
    `"${inv.invoiceNumber}"`,
    `"${new Date(inv.issuedAt).toISOString()}"`,
    `"${inv.table?.tableNumber || 'N/A'}"`,
    `"${inv.customerName || 'Consumidor Final'}"`,
    `"${inv.customerTaxId || ''}"`,
    `"${inv.paymentMethod || 'CASH'}"`,
    Number(inv.subtotal).toFixed(2),
    Number(inv.taxAmount).toFixed(2),
    Number(inv.serviceCharge).toFixed(2),
    Number(inv.total).toFixed(2),
    `"${inv.status}"`,
    `"${inv.electronicInvoiceId || ''}"`,
  ])

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
}
