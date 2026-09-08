import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/billing/daily-summary?date=2024-01-15
 * Resumen de ventas del día: total facturado, IVA, efectivo, tarjeta, etc.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { restaurantId?: string; role: string }
    if (!user.restaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 403 })

    const allowedRoles = ['SUPERADMIN', 'RESTAURANT_ADMIN', 'ACCOUNTANT', 'MANAGER']
    if (!allowedRoles.includes(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const dateParam = request.nextUrl.searchParams.get('date')
    const date = dateParam ? new Date(dateParam) : new Date()
    const dayStart = new Date(date)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(23, 59, 59, 999)

    const [invoices, payments] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          restaurantId: user.restaurantId,
          issuedAt: { gte: dayStart, lte: dayEnd },
          status: { in: ['PAID', 'ISSUED'] },
        },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          subtotal: true,
          taxAmount: true,
          serviceCharge: true,
          discountAmount: true,
          total: true,
          paymentMethod: true,
          issuedAt: true,
        },
      }),
      prisma.payment.findMany({
        where: {
          invoice: {
            restaurantId: user.restaurantId,
            issuedAt: { gte: dayStart, lte: dayEnd },
          },
        },
        select: { amount: true, method: true },
      }),
    ])

    // Agregados
    const totalRevenue = invoices.reduce((s, i) => s + i.subtotal.toNumber(), 0)
    const totalTax = invoices.reduce((s, i) => s + i.taxAmount.toNumber(), 0)
    const totalServiceCharge = invoices.reduce((s, i) => s + i.serviceCharge.toNumber(), 0)
    const totalDiscounts = invoices.reduce((s, i) => s + i.discountAmount.toNumber(), 0)
    const totalCollected = invoices
      .filter((i) => i.status === 'PAID')
      .reduce((s, i) => s + i.total.toNumber(), 0)
    const totalPending = invoices
      .filter((i) => i.status === 'ISSUED')
      .reduce((s, i) => s + i.total.toNumber(), 0)

    // Desglose por método de pago
    const byPaymentMethod: Record<string, number> = {}
    for (const payment of payments) {
      const method = payment.method
      byPaymentMethod[method] = (byPaymentMethod[method] ?? 0) + payment.amount.toNumber()
    }

    // Top productos del día (desde OrderItems de las sesiones facturadas)
    const invoiceIds = invoices.map((i) => i.id)
    const topProducts = invoiceIds.length > 0
      ? await prisma.invoiceItem.groupBy({
          by: ['description'],
          where: { invoiceId: { in: invoiceIds } },
          _sum: { quantity: true, subtotal: true },
          orderBy: { _sum: { subtotal: 'desc' } },
          take: 10,
        })
      : []

    return NextResponse.json({
      date: dayStart.toISOString().split('T')[0],
      summary: {
        invoiceCount: invoices.length,
        paidCount: invoices.filter((i) => i.status === 'PAID').length,
        pendingCount: invoices.filter((i) => i.status === 'ISSUED').length,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalTax: parseFloat(totalTax.toFixed(2)),
        totalServiceCharge: parseFloat(totalServiceCharge.toFixed(2)),
        totalDiscounts: parseFloat(totalDiscounts.toFixed(2)),
        totalCollected: parseFloat(totalCollected.toFixed(2)),
        totalPending: parseFloat(totalPending.toFixed(2)),
        byPaymentMethod,
        topProducts: topProducts.map((p) => ({
          description: p.description,
          quantity: p._sum.quantity ?? 0,
          total: (p._sum.subtotal as unknown as { toNumber: () => number })?.toNumber?.() ?? 0,
        })),
      },
      invoices: invoices.map((i) => ({
        ...i,
        subtotal: i.subtotal.toNumber(),
        taxAmount: i.taxAmount.toNumber(),
        serviceCharge: i.serviceCharge.toNumber(),
        discountAmount: i.discountAmount.toNumber(),
        total: i.total.toNumber(),
      })),
    })
  } catch (error) {
    console.error('[GET /api/billing/daily-summary]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
