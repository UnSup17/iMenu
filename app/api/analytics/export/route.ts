import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateInvoicesCsv } from '@/lib/analytics/engine'

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse('No autorizado', { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    const user = session.user as { restaurantId?: string }
    if (!user.restaurantId) {
      return new NextResponse('Restaurante no configurado', { status: 400 })
    }

    const now = new Date()
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(now.getFullYear(), now.getMonth(), 1)
    const endDate = endDateParam
      ? new Date(endDateParam)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    const invoices = await prisma.invoice.findMany({
      where: {
        restaurantId: user.restaurantId,
        issuedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        table: { select: { tableNumber: true } },
      },
      orderBy: { issuedAt: 'desc' },
    })

    const csvContent = generateInvoicesCsv(invoices)

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="facturas_imenu_${startDate.toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error al exportar CSV:', error)
    return new NextResponse('Error interno al exportar CSV', { status: 500 })
  }
}
