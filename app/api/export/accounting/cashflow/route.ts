import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateCashflow } from '@/lib/accounting/calculator'

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
    const monthParam = searchParams.get('month')
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

    const cashflow = await calculateCashflow(restaurantId, startDate, endDate, periodLabel)
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { name: true },
    })

    const rows: string[] = [
      escapeCsv(`ESTADO DE FLUJO DE CAJA (CASHFLOW) — ${restaurant?.name ?? 'iMenu'}`),
      escapeCsv(`Período: ${cashflow.periodLabel}`),
      escapeCsv(`Fecha de Generación: ${new Date().toLocaleString('es-CO')}`),
      '',
      escapeCsv('RESUMEN DE LIQUIDEZ Y CAJA'),
      [escapeCsv('Concepto'), escapeCsv('Monto (COP)'), escapeCsv('Detalle')].join(','),
      [escapeCsv('Total Entradas de Efectivo (+)'), escapeCsv(cashflow.summary.totalInflows.toFixed(2)), escapeCsv(`${cashflow.summary.inflowTransactionsCount} cobros`)].join(','),
      [escapeCsv('Total Salidas Operativas (-)'), escapeCsv(cashflow.summary.totalOutflows.toFixed(2)), escapeCsv(`${cashflow.summary.outflowTransactionsCount} pagos`)].join(','),
      [escapeCsv('FLUJO NETO DE CAJA'), escapeCsv(cashflow.summary.netCashflow.toFixed(2)), escapeCsv(cashflow.summary.netCashflow >= 0 ? 'Superávit' : 'Déficit')].join(','),
      [escapeCsv('Margen de Conversión de Caja %'), escapeCsv(`${cashflow.summary.cashConversionRatio}%`), escapeCsv('Retención neta sobre entradas')].join(','),
      '',
      escapeCsv('1. ENTRADAS DETALLADAS POR MEDIO DE COBRO'),
      [escapeCsv('Medio de Pago'), escapeCsv('Monto (COP)'), escapeCsv('Nº Cobros'), escapeCsv('% del Total')].join(','),
      ...cashflow.inflows.byMethod.map((m) =>
        [escapeCsv(m.methodLabel), escapeCsv(m.amount.toFixed(2)), escapeCsv(m.count), escapeCsv(`${m.percentOfTotal}%`)].join(',')
      ),
      '',
      escapeCsv('2. SALIDAS DETALLADAS POR CONCEPTO DE GASTO'),
      [escapeCsv('Categoría de Gasto'), escapeCsv('Monto (COP)'), escapeCsv('Nº Comprobantes'), escapeCsv('% del Total')].join(','),
      ...cashflow.outflows.byCategory.map((c) =>
        [escapeCsv(c.categoryLabel), escapeCsv(c.amount.toFixed(2)), escapeCsv(c.count), escapeCsv(`${c.percentOfTotal}%`)].join(',')
      ),
      '',
      escapeCsv('3. EVOLUCIÓN DIARIA Y SALDO ACUMULADO'),
      [escapeCsv('Fecha'), escapeCsv('Entradas (+)'), escapeCsv('Salidas (-)'), escapeCsv('Flujo Neto Diario'), escapeCsv('Saldo Acumulado')].join(','),
      ...cashflow.dailyTrend.map((d) =>
        [
          escapeCsv(d.date),
          escapeCsv(d.inflows.toFixed(2)),
          escapeCsv(d.outflows.toFixed(2)),
          escapeCsv(d.net.toFixed(2)),
          escapeCsv(d.cumulativeNet.toFixed(2)),
        ].join(',')
      ),
    ]

    const csvContent = '\uFEFF' + rows.join('\r\n')
    const filename = `cashflow-${periodLabel}.csv`

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[Export Cashflow Error]:', error)
    return NextResponse.json({ error: 'Error al exportar Cashflow' }, { status: 500 })
  }
}
