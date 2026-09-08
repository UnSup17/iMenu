import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { InvoiceStatus } from '@prisma/client'

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as { organizationId?: string; restaurantId?: string }
    let orgId = user.organizationId

    if (!orgId && user.restaurantId) {
      const rest = await prisma.restaurant.findUnique({ where: { id: user.restaurantId } })
      orgId = rest?.organizationId || undefined
    }

    if (!orgId) {
      return NextResponse.json({ error: 'Organización requerida' }, { status: 400 })
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    // Obtener todas las sucursales de la organización
    const branches = await prisma.restaurant.findMany({
      where: { organizationId: orgId },
      include: {
        invoices: {
          where: {
            status: InvoiceStatus.PAID,
            issuedAt: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          select: {
            subtotal: true,
            taxAmount: true,
            total: true,
            paymentMethod: true,
          },
        },
        orders: {
          where: {
            createdAt: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          select: {
            id: true,
            status: true,
          },
        },
      },
    })

    let totalRevenue = 0
    let totalInvoices = 0
    let totalOrders = 0
    let totalTaxCollected = 0

    const branchBreakdown = branches.map((b) => {
      let bRevenue = 0
      let bTax = 0

      for (const inv of b.invoices) {
        bRevenue += Number(inv.subtotal)
        bTax += Number(inv.taxAmount)
      }

      totalRevenue += bRevenue
      totalTaxCollected += bTax
      totalInvoices += b.invoices.length
      totalOrders += b.orders.length

      return {
        id: b.id,
        name: b.name,
        slug: b.slug,
        invoicesCount: b.invoices.length,
        ordersCount: b.orders.length,
        revenue: bRevenue,
        taxCollected: bTax,
        totalSales: bRevenue + bTax,
      }
    })

    return NextResponse.json({
      period: `${now.toLocaleString('es-CO', { month: 'long' })} ${now.getFullYear()}`,
      summary: {
        branchesCount: branches.length,
        totalRevenue,
        totalTaxCollected,
        totalSales: totalRevenue + totalTaxCollected,
        totalInvoices,
        totalOrders,
      },
      branchBreakdown,
    })
  } catch (error) {
    console.error('Error al generar reporte consolidado de organización:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
