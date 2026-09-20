import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculatePL } from '@/lib/accounting/calculator'

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""'
  const str = String(val).replace(/"/g, '""')
  return `"${str}"`
}

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as { id?: string; restaurantId?: string; role?: string }
    const allowed = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'ACCOUNTANT', 'MANAGER']
    if (!allowed.includes(sessionUser.role || '')) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    let restaurantId = sessionUser.restaurantId
    if (!restaurantId && sessionUser.id) {
      const user = await prisma.user.findUnique({
        where: { id: sessionUser.id },
        select: { restaurantId: true, organizationId: true },
      })
      restaurantId = user?.restaurantId ?? undefined
    }

    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurante no configurado' }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const monthParam = searchParams.get('month') // YYYY-MM
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    let startDate: Date
    let endDate: Date
    let periodLabel: string

    if (monthParam) {
      const [year, month] = monthParam.split('-').map(Number)
      startDate = new Date(year, month - 1, 1)
      endDate = new Date(year, month, 0, 23, 59, 59, 999)
      periodLabel = monthParam
    } else if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam)
      endDate = new Date(endDateParam)
      periodLabel = `${startDateParam}_${endDateParam}`
    } else {
      const now = new Date()
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      periodLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    }

    const pl = await calculatePL(restaurantId, startDate, endDate, periodLabel)
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { name: true },
    })

    const rows: string[] = [
      escapeCsv(`ESTADO DE RESULTADOS (P&L) — ${restaurant?.name ?? 'iMenu'}`),
      escapeCsv(`Período: ${pl.periodLabel}`),
      escapeCsv(`Fecha de generación: ${new Date().toLocaleString('es-CO')}`),
      '',
      // 1. Ingresos
      escapeCsv('1. INGRESOS OPERACIONALES'),
      [escapeCsv('Concepto'), escapeCsv('Monto (COP)'), escapeCsv('% Sobre Ventas Netas')].join(','),
      [escapeCsv('Ventas Brutas Facturadas'), escapeCsv(pl.revenue.grossSales.toFixed(2)), escapeCsv('')].join(','),
      [escapeCsv('Descuentos Comerciales Otorgados'), escapeCsv((-pl.revenue.discountTotal).toFixed(2)), escapeCsv('')].join(','),
      [escapeCsv('Ventas Netas Operacionales'), escapeCsv(pl.revenue.netSales.toFixed(2)), escapeCsv('100.0%')].join(','),
      [escapeCsv('Impuestos Recaudados (IVA/INC)'), escapeCsv(pl.revenue.taxCollected.toFixed(2)), escapeCsv('')].join(','),
      [escapeCsv('Servicio Voluntario / Propinas'), escapeCsv(pl.revenue.serviceChargeTotal.toFixed(2)), escapeCsv('')].join(','),
      [escapeCsv('Total Facturas Pagadas'), escapeCsv(pl.revenue.invoicesCount), escapeCsv('')].join(','),
      '',
      // 2. Costo de ventas
      escapeCsv('2. COSTO DE VENTAS (COGS)'),
      [escapeCsv('Concepto'), escapeCsv('Monto (COP)'), escapeCsv('% Sobre Ventas Netas')].join(','),
      [escapeCsv('Costo de Alimentos y Bebidas (Materia Prima)'), escapeCsv(pl.costOfSales.totalCOGS.toFixed(2)), escapeCsv(pl.revenue.netSales > 0 ? ((pl.costOfSales.totalCOGS / pl.revenue.netSales) * 100).toFixed(1) + '%' : '0%')].join(','),
      [escapeCsv('UTILIDAD BRUTA'), escapeCsv(pl.costOfSales.grossProfit.toFixed(2)), escapeCsv(`${pl.costOfSales.grossMarginPercent.toFixed(1)}%`)].join(','),
      '',
      // 3. Gastos operativos
      escapeCsv('3. GASTOS OPERACIONALES (OPEX)'),
      [escapeCsv('Categoría de Gasto'), escapeCsv('Monto (COP)'), escapeCsv('Nº Comprobantes'), escapeCsv('% de Ventas Netas')].join(','),
      ...pl.operatingExpenses.byCategory.map((cat) =>
        [
          escapeCsv(cat.categoryLabel),
          escapeCsv(cat.totalAmount.toFixed(2)),
          escapeCsv(cat.count),
          escapeCsv(pl.revenue.netSales > 0 ? ((cat.totalAmount / pl.revenue.netSales) * 100).toFixed(1) + '%' : '0%'),
        ].join(',')
      ),
      [escapeCsv('TOTAL GASTOS OPERACIONALES'), escapeCsv(pl.operatingExpenses.totalOpex.toFixed(2)), escapeCsv(''), escapeCsv(pl.revenue.netSales > 0 ? ((pl.operatingExpenses.totalOpex / pl.revenue.netSales) * 100).toFixed(1) + '%' : '0%')].join(','),
      '',
      // 4. Utilidad neta
      escapeCsv('4. RESULTADO OPERACIONAL FINAL'),
      [escapeCsv('Concepto'), escapeCsv('Monto (COP)'), escapeCsv('Margen Neto %')].join(','),
      [escapeCsv('UTILIDAD OPERACIONAL NETA (EBITDA)'), escapeCsv(pl.netOperatingIncome.toFixed(2)), escapeCsv(`${pl.netMarginPercent.toFixed(1)}%`)].join(','),
    ]

    const csvContent = '\uFEFF' + rows.join('\r\n')
    const filename = `pl-${periodLabel}.csv`

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[Export PL Error]:', error)
    return NextResponse.json({ error: 'Error al exportar P&L' }, { status: 500 })
  }
}
