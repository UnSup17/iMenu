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

export interface ComparisonMetric {
  current: number
  previous: number
  growthPercent: number
}

export interface ComparisonsData {
  mom: {
    revenue: ComparisonMetric
    averageTicket: ComparisonMetric
    invoicesCount: ComparisonMetric
  }
  yoy: {
    revenue: ComparisonMetric
    averageTicket: ComparisonMetric
    invoicesCount: ComparisonMetric
  }
}

export interface SalesTrendPoint {
  date: string // YYYY-MM-DD
  dayLabel: string // "20 Sep"
  revenue: number
  invoicesCount: number
}

export interface CategoryDistributionItem {
  categoryName: string
  totalRevenue: number
  percentage: number
  quantitySold: number
  color: string
}

export interface WaiterPerformanceItem {
  waiterId: string
  name: string
  email?: string
  totalSales: number
  invoicesCount: number
  averageTicket: number
  serviceChargeCollected: number
}

export interface TablePerformanceItem {
  tableId: string
  tableNumber: number
  zone: string
  totalSales: number
  invoicesCount: number
  averageTicket: number
  intensity: number // 0.0 a 1.0 para el Heatmap
  posX: number
  posY: number
  width: number
  height: number
  shape: string
  capacity: number
}

export interface DemandPredictionItem {
  date: string
  dayName: string
  projectedRevenue: number
  projectedGuests: number
  projectedOrders: number
  minConfidence: number
  maxConfidence: number
}

export interface ServiceChannelData {
  channel: 'DINE_IN' | 'BAR' | 'DELIVERY'
  label: string
  revenue: number
  invoicesCount: number
  averageTicket: number
  percentage: number
}

export interface AnalyticsDashboardData {
  periodLabel: string
  summary: {
    totalRevenue: number
    totalInvoices: number
    averageTicket: number
    totalItemsSold: number
  }
  comparisons: ComparisonsData
  salesTrend: SalesTrendPoint[]
  categoryDistribution: CategoryDistributionItem[]
  salesByHour: HourlySalesData[]
  salesByDayOfWeek: DayOfWeekSalesData[]
  tableTurnover: TableTurnoverData
  abcAnalysis: ProductABCItem[]
  topProducts: { name: string; quantity: number; revenue: number }[]
  waiters: WaiterPerformanceItem[]
  tableHeatmap: TablePerformanceItem[]
  demandPrediction: DemandPredictionItem[]
  serviceChannels: ServiceChannelData[]
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const CATEGORY_COLORS = [
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#eab308', // Yellow
  '#14b8a6', // Teal
  '#6366f1', // Indigo
]

/**
 * Calcula todas las métricas de inteligencia y analítica para un restaurante.
 */
export async function getAnalyticsDashboard(
  restaurantId: string,
  startDate: Date,
  endDate: Date
): Promise<AnalyticsDashboardData> {
  // 1. Facturas del período actual
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
      waiter: { select: { id: true, name: true, email: true } },
      table: true,
    },
  })

  // 2. Facturas de períodos comparativos (MoM y YoY)
  const durationMs = endDate.getTime() - startDate.getTime()
  const prevStartDate = new Date(startDate.getTime() - durationMs)
  const prevEndDate = new Date(startDate.getTime() - 1)

  const yoyStartDate = new Date(startDate)
  yoyStartDate.setFullYear(yoyStartDate.getFullYear() - 1)
  const yoyEndDate = new Date(endDate)
  yoyEndDate.setFullYear(yoyEndDate.getFullYear() - 1)

  const [prevInvoices, yoyInvoices, tables, products] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        restaurantId,
        status: InvoiceStatus.PAID,
        issuedAt: { gte: prevStartDate, lte: prevEndDate },
      },
      select: { total: true },
    }),
    prisma.invoice.findMany({
      where: {
        restaurantId,
        status: InvoiceStatus.PAID,
        issuedAt: { gte: yoyStartDate, lte: yoyEndDate },
      },
      select: { total: true },
    }),
    prisma.table.findMany({ where: { restaurantId } }),
    prisma.product.findMany({
      where: { restaurantId },
      include: { category: true },
    }),
  ])

  // Cálculos de Resumen Actual
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

  // Mapa de ventas por fecha (serie temporal diaria)
  const dailyTrendMap: Record<string, { label: string; revenue: number; invoicesCount: number }> = {}

  // Canales de Servicio
  const channelsMap: Record<'DINE_IN' | 'BAR' | 'DELIVERY', { revenue: number; count: number }> = {
    DINE_IN: { revenue: 0, count: 0 },
    BAR: { revenue: 0, count: 0 },
    DELIVERY: { revenue: 0, count: 0 },
  }

  // Rendimiento por Mesero
  const waiterMap: Record<
    string,
    { name: string; email?: string; sales: number; count: number; tips: number }
  > = {}

  // Rendimiento por Mesa
  const tableStatsMap: Record<string, { sales: number; count: number }> = {}

  // Productos y Categorías
  const productSalesMap: Record<
    string,
    { name: string; categoryName: string; quantity: number; revenue: number }
  > = {}
  const categorySalesMap: Record<string, { revenue: number; quantity: number }> = {}

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
    const tipAmt = Number(inv.serviceCharge || 0)
    totalRevenue += saleAmt

    const invDate = new Date(inv.issuedAt)
    const hour = invDate.getHours()
    const day = invDate.getDay()
    const dateKey = invDate.toISOString().slice(0, 10)

    // Hora y Día
    hourlyMap[hour].totalSales += saleAmt
    hourlyMap[hour].invoicesCount += 1

    dayMap[day].totalSales += saleAmt
    dayMap[day].invoicesCount += 1

    // Serie Temporal Diaria
    if (!dailyTrendMap[dateKey]) {
      const dayLabel = `${invDate.getDate()} ${invDate.toLocaleDateString('es-CO', { month: 'short' })}`
      dailyTrendMap[dateKey] = { label: dayLabel, revenue: 0, invoicesCount: 0 }
    }
    dailyTrendMap[dateKey].revenue += saleAmt
    dailyTrendMap[dateKey].invoicesCount += 1

    // Canal de Servicio
    const isDelivery =
      inv.notes?.toLowerCase().includes('delivery') ||
      inv.notes?.toLowerCase().includes('domicilio') ||
      inv.notes?.toLowerCase().includes('para llevar')
    const channelKey: 'DINE_IN' | 'BAR' | 'DELIVERY' = isDelivery
      ? 'DELIVERY'
      : inv.tableId
      ? 'DINE_IN'
      : 'BAR'

    channelsMap[channelKey].revenue += saleAmt
    channelsMap[channelKey].count += 1

    // Rendimiento Mesero
    if (inv.waiterId && inv.waiter) {
      if (!waiterMap[inv.waiterId]) {
        waiterMap[inv.waiterId] = {
          name: inv.waiter.name || 'Mesero',
          email: inv.waiter.email || undefined,
          sales: 0,
          count: 0,
          tips: 0,
        }
      }
      waiterMap[inv.waiterId].sales += saleAmt
      waiterMap[inv.waiterId].count += 1
      waiterMap[inv.waiterId].tips += tipAmt
    }

    // Rendimiento Mesa
    if (inv.tableId) {
      if (!tableStatsMap[inv.tableId]) {
        tableStatsMap[inv.tableId] = { sales: 0, count: 0 }
      }
      tableStatsMap[inv.tableId].sales += saleAmt
      tableStatsMap[inv.tableId].count += 1
    }

    // Ítems y Categorías
    for (const item of inv.items) {
      totalItemsSold += item.quantity
      const prodId = item.productId || item.description
      const itemSubtotal = Number(item.subtotal)

      if (!productSalesMap[prodId]) {
        productSalesMap[prodId] = {
          name: item.description,
          categoryName: 'General',
          quantity: 0,
          revenue: 0,
        }
      }
      productSalesMap[prodId].quantity += item.quantity
      productSalesMap[prodId].revenue += itemSubtotal

      const catName = productSalesMap[prodId]?.categoryName || 'General'
      if (!categorySalesMap[catName]) {
        categorySalesMap[catName] = { revenue: 0, quantity: 0 }
      }
      categorySalesMap[catName].revenue += itemSubtotal
      categorySalesMap[catName].quantity += item.quantity
    }

    if (inv.session && inv.session.closedAt) {
      const start = new Date(inv.session.createdAt).getTime()
      const end = new Date(inv.session.closedAt).getTime()
      totalSessionDurationMs += Math.max(0, end - start)
      closedSessionsCount += 1
    }
  }

  // 3. Comparativas MoM y YoY
  const prevRevenue = prevInvoices.reduce((sum, i) => sum + Number(i.total), 0)
  const prevCount = prevInvoices.length
  const prevTicket = prevCount > 0 ? Math.round(prevRevenue / prevCount) : 0

  const yoyRevenue = yoyInvoices.reduce((sum, i) => sum + Number(i.total), 0)
  const yoyCount = yoyInvoices.length
  const yoyTicket = yoyCount > 0 ? Math.round(yoyRevenue / yoyCount) : 0

  const averageTicket = invoices.length > 0 ? Math.round(totalRevenue / invoices.length) : 0

  const comparisons: ComparisonsData = {
    mom: {
      revenue: calculateGrowth(totalRevenue, prevRevenue),
      averageTicket: calculateGrowth(averageTicket, prevTicket),
      invoicesCount: calculateGrowth(invoices.length, prevCount),
    },
    yoy: {
      revenue: calculateGrowth(totalRevenue, yoyRevenue),
      averageTicket: calculateGrowth(averageTicket, yoyTicket),
      invoicesCount: calculateGrowth(invoices.length, yoyCount),
    },
  }

  // 4. Serie Temporal Diaria (Sales Trend)
  const salesTrend: SalesTrendPoint[] = Object.entries(dailyTrendMap)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, data]) => ({
      date,
      dayLabel: data.label,
      revenue: data.revenue,
      invoicesCount: data.invoicesCount,
    }))

  // 5. Distribución por Categoría
  const totalCategoryRev = Object.values(categorySalesMap).reduce((s, c) => s + c.revenue, 0) || 1
  const categoryDistribution: CategoryDistributionItem[] = Object.entries(categorySalesMap)
    .map(([categoryName, data], index) => ({
      categoryName,
      totalRevenue: data.revenue,
      percentage: parseFloat(((data.revenue / totalCategoryRev) * 100).toFixed(1)),
      quantitySold: data.quantity,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)

  // 6. Ventas por hora y día
  const salesByHour: HourlySalesData[] = Object.entries(hourlyMap).map(([hStr, data]) => {
    const h = Number(hStr)
    return {
      hour: h,
      hourLabel: `${h.toString().padStart(2, '0')}:00`,
      totalSales: data.totalSales,
      invoicesCount: data.invoicesCount,
    }
  })

  const salesByDayOfWeek: DayOfWeekSalesData[] = Object.entries(dayMap).map(([dStr, data]) => {
    const d = Number(dStr)
    return {
      dayIndex: d,
      dayName: DAY_NAMES[d],
      totalSales: data.totalSales,
      invoicesCount: data.invoicesCount,
    }
  })

  // 7. Rotación y Rendimiento de Mesas (Heatmap)
  const occupiedNow = tables.filter((t) => t.status === 'ACTIVE_QR_SESSION').length
  const averageSessionMinutes =
    closedSessionsCount > 0 ? Math.round(totalSessionDurationMs / closedSessionsCount / (1000 * 60)) : 45
  const turnoverRatePerTable =
    tables.length > 0 ? parseFloat((invoices.length / tables.length).toFixed(2)) : 0

  const maxTableSales = Math.max(...Object.values(tableStatsMap).map((t) => t.sales), 1)

  const tableHeatmap: TablePerformanceItem[] = tables.map((t) => {
    const stats = tableStatsMap[t.id] || { sales: 0, count: 0 }
    const intensity = parseFloat((stats.sales / maxTableSales).toFixed(2))
    return {
      tableId: t.id,
      tableNumber: t.tableNumber,
      zone: t.zone || 'Salón Principal',
      totalSales: stats.sales,
      invoicesCount: stats.count,
      averageTicket: stats.count > 0 ? Math.round(stats.sales / stats.count) : 0,
      intensity,
      posX: t.posX || 50,
      posY: t.posY || 50,
      width: t.width || 80,
      height: t.height || 80,
      shape: t.shape || 'square',
      capacity: t.capacity || 4,
    }
  })

  // 8. Desglose de Meseros
  const waiters: WaiterPerformanceItem[] = Object.entries(waiterMap)
    .map(([waiterId, w]) => ({
      waiterId,
      name: w.name,
      email: w.email,
      totalSales: w.sales,
      invoicesCount: w.count,
      averageTicket: w.count > 0 ? Math.round(w.sales / w.count) : 0,
      serviceChargeCollected: w.tips,
    }))
    .sort((a, b) => b.totalSales - a.totalSales)

  // 9. Canales de Servicio
  const channelLabels: Record<'DINE_IN' | 'BAR' | 'DELIVERY', string> = {
    DINE_IN: 'Salón & Mesas (QR / Presencial)',
    BAR: 'Barra & Para Llevar',
    DELIVERY: 'Domicilios & Delivery',
  }

  const serviceChannels: ServiceChannelData[] = (['DINE_IN', 'BAR', 'DELIVERY'] as const).map((key) => {
    const ch = channelsMap[key]
    const pct = totalRevenue > 0 ? (ch.revenue / totalRevenue) * 100 : 0
    return {
      channel: key,
      label: channelLabels[key],
      revenue: ch.revenue,
      invoicesCount: ch.count,
      averageTicket: ch.count > 0 ? Math.round(ch.revenue / ch.count) : 0,
      percentage: parseFloat(pct.toFixed(1)),
    }
  })

  // 10. Análisis ABC de Productos
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
      classification = 'A'
    } else if (cumulativeRevenue <= 95) {
      classification = 'B'
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

  // 11. Algoritmo de Predicción de Demanda (7 Días Futuros)
  const demandPrediction = calculateDemandPrediction(dayMap, averageTicket, invoices.length)

  return {
    periodLabel: `${startDate.toLocaleDateString('es-CO')} - ${endDate.toLocaleDateString('es-CO')}`,
    summary: {
      totalRevenue,
      totalInvoices: invoices.length,
      averageTicket,
      totalItemsSold,
    },
    comparisons,
    salesTrend,
    categoryDistribution,
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
    waiters,
    tableHeatmap,
    demandPrediction,
    serviceChannels,
  }
}

function calculateGrowth(current: number, previous: number): ComparisonMetric {
  if (previous === 0) {
    return {
      current,
      previous,
      growthPercent: current > 0 ? 100 : 0,
    }
  }
  const growth = ((current - previous) / previous) * 100
  return {
    current,
    previous,
    growthPercent: parseFloat(growth.toFixed(1)),
  }
}

/**
 * Algoritmo de regresión predictiva a 7 días con estacionalidad de día de semana.
 */
function calculateDemandPrediction(
  dayOfWeekMap: Record<number, { totalSales: number; invoicesCount: number }>,
  avgTicket: number,
  totalInvoicesInPeriod: number
): DemandPredictionItem[] {
  const predictions: DemandPredictionItem[] = []
  const now = new Date()

  // Calcular peso estacional por día de la semana (0 a 6)
  const totalWeeklySales = Object.values(dayOfWeekMap).reduce((s, d) => s + d.totalSales, 0)
  const averageDailySales = totalWeeklySales > 0 ? totalWeeklySales / 7 : 500000

  const dayWeights: Record<number, number> = {}
  for (let d = 0; d < 7; d++) {
    const daySale = dayOfWeekMap[d]?.totalSales || 0
    dayWeights[d] = totalWeeklySales > 0 ? Math.max(0.4, (daySale / totalWeeklySales) * 7) : 1.0
  }

  // Proyectar próximos 7 días a partir de mañana
  for (let i = 1; i <= 7; i++) {
    const futureDate = new Date(now)
    futureDate.setDate(futureDate.getDate() + i)

    const dayIndex = futureDate.getDay()
    const weight = dayWeights[dayIndex] ?? 1.0

    // Crecimiento tendencial moderado (1% por cada día de proyección)
    const trendFactor = 1 + (i * 0.008)
    const projectedRevenue = Math.round(averageDailySales * weight * trendFactor)
    const ticket = avgTicket > 0 ? avgTicket : 45000
    const projectedOrders = Math.max(1, Math.round(projectedRevenue / ticket))
    const projectedGuests = Math.round(projectedOrders * 2.2) // ~2.2 comensales por orden

    const minConfidence = Math.round(projectedRevenue * 0.88)
    const maxConfidence = Math.round(projectedRevenue * 1.12)

    predictions.push({
      date: futureDate.toISOString().slice(0, 10),
      dayName: DAY_NAMES[dayIndex],
      projectedRevenue,
      projectedGuests,
      projectedOrders,
      minConfidence,
      maxConfidence,
    })
  }

  return predictions
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
    Number(inv.serviceCharge || 0).toFixed(2),
    Number(inv.total).toFixed(2),
    `"${inv.status}"`,
    `"${inv.electronicInvoiceId || ''}"`,
  ])

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
}
