import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculatePL, calculateVATSummary } from '@/lib/accounting/calculator'
import { z } from 'zod'

const closePeriodSchema = z.object({
  year: z.number().int().min(2020).max(2050),
  month: z.number().int().min(1).max(12),
})

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as { restaurantId?: string }
    if (!user.restaurantId) {
      return NextResponse.json({ error: 'Restaurante no configurado' }, { status: 400 })
    }

    const periods = await prisma.accountingPeriod.findMany({
      where: { restaurantId: user.restaurantId },
      include: {
        closedBy: { select: { name: true, email: true } },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })

    return NextResponse.json(periods)
  } catch (error) {
    console.error('Error al obtener períodos contables:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as { id?: string; restaurantId?: string; role?: string }
    if (!user.restaurantId || !user.id) {
      return NextResponse.json({ error: 'Restaurante no configurado' }, { status: 400 })
    }

    // Solo administradores pueden cerrar períodos
    if (!['SUPERADMIN', 'RESTAURANT_ADMIN', 'ACCOUNTANT'].includes(user.role || '')) {
      return NextResponse.json({ error: 'Permisos insuficientes para cerrar períodos' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = closePeriodSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
    }

    const { year, month } = parsed.data
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999)

    // Calculamos P&L e IVA consolidado del mes
    const pl = await calculatePL(user.restaurantId, startDate, endDate)
    const vat = await calculateVATSummary(user.restaurantId, startDate, endDate)

    const period = await prisma.accountingPeriod.upsert({
      where: {
        restaurantId_year_month: {
          restaurantId: user.restaurantId,
          year,
          month,
        },
      },
      create: {
        restaurantId: user.restaurantId,
        year,
        month,
        isClosed: true,
        closedAt: new Date(),
        closedById: user.id,
        totalRevenue: pl.revenue.netSales,
        totalExpenses: pl.costOfSales.totalCOGS + pl.operatingExpenses.totalOpex,
        grossProfit: pl.costOfSales.grossProfit,
        vatCollected: vat.vatCollected,
        vatPaid: vat.vatPaid,
        vatOwed: vat.netVatBalance,
      },
      update: {
        isClosed: true,
        closedAt: new Date(),
        closedById: user.id,
        totalRevenue: pl.revenue.netSales,
        totalExpenses: pl.costOfSales.totalCOGS + pl.operatingExpenses.totalOpex,
        grossProfit: pl.costOfSales.grossProfit,
        vatCollected: vat.vatCollected,
        vatPaid: vat.vatPaid,
        vatOwed: vat.netVatBalance,
      },
      include: {
        closedBy: { select: { name: true, email: true } },
      },
    })

    return NextResponse.json(period, { status: 200 })
  } catch (error) {
    console.error('Error al cerrar período contable:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
