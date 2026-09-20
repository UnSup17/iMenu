import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateVATSummary } from '@/lib/accounting/calculator'

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

    const vat = await calculateVATSummary(restaurantId, startDate, endDate, periodLabel)
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { name: true },
    })

    const rows: string[] = [
      escapeCsv(`DECLARACIÓN DE IVA (FORMULARIO 300 DIAN) — ${restaurant?.name ?? 'iMenu'}`),
      escapeCsv(`Período Fiscal: ${vat.periodLabel}`),
      escapeCsv(`Tarifa General de IVA: ${vat.taxRatePercent}%`),
      escapeCsv(`Fecha de Generación: ${new Date().toLocaleString('es-CO')}`),
      '',
      escapeCsv('1. IVA GENERADO EN OPERACIONES DE VENTA'),
      [escapeCsv('Concepto'), escapeCsv('Valor (COP)'), escapeCsv('Detalle')].join(','),
      [escapeCsv('Base Gravable de Ventas'), escapeCsv(vat.salesTaxableBase.toFixed(2)), escapeCsv('Subtotal facturado sin impuesto')].join(','),
      [escapeCsv('Total IVA Generado en Ventas'), escapeCsv(vat.vatCollected.toFixed(2)), escapeCsv(`${vat.taxRatePercent}% sobre base gravable`)].join(','),
      [escapeCsv('Nº de Facturas Emitidas y Pagadas'), escapeCsv(vat.invoicesCount), escapeCsv('')].join(','),
      '',
      escapeCsv('2. IVA DESCONTABLE EN COMPRAS Y GASTOS CON FACTURA'),
      [escapeCsv('Concepto'), escapeCsv('Valor (COP)'), escapeCsv('Detalle')].join(','),
      [escapeCsv('Base Gravable de Compras y Gastos'), escapeCsv(vat.expensesTaxableBase.toFixed(2)), escapeCsv('Base de compras con soporte fiscal')].join(','),
      [escapeCsv('Total IVA Descontable Soportado'), escapeCsv(vat.vatPaid.toFixed(2)), escapeCsv('IVA pagado deducible')].join(','),
      [escapeCsv('Nº de Comprobantes de Egreso'), escapeCsv(vat.expensesCount), escapeCsv('')].join(','),
      '',
      escapeCsv('3. LIQUIDACIÓN PRIVADA Y BALANCE ANTE LA DIAN'),
      [escapeCsv('Concepto'), escapeCsv('Valor (COP)'), escapeCsv('Estado DIAN')].join(','),
      [
        escapeCsv(vat.status === 'PAYABLE_TO_DIAN' ? 'IMPUESTO A CARGO (A PAGAR DIAN)' : 'SALDO A FAVOR DEL CONTRIBUYENTE'),
        escapeCsv(Math.abs(vat.netVatBalance).toFixed(2)),
        escapeCsv(vat.status === 'PAYABLE_TO_DIAN' ? 'SALDO A PAGAR' : 'SALDO A FAVOR'),
      ].join(','),
    ]

    const csvContent = '\uFEFF' + rows.join('\r\n')
    const filename = `iva-${periodLabel}.csv`

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[Export VAT Error]:', error)
    return NextResponse.json({ error: 'Error al exportar IVA' }, { status: 500 })
  }
}
