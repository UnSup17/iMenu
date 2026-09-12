import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as { role: string; foodCourtId?: string; organizationId?: string }
    const allowedRoles = ['SUPERADMIN', 'ORG_ADMIN', 'FOOD_COURT_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
    }

    const { id: foodCourtId } = await params
    if (user.role === 'FOOD_COURT_ADMIN' && user.foodCourtId && user.foodCourtId !== foodCourtId) {
      return NextResponse.json({ error: 'No autorizado para esta plaza' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const timeframe = searchParams.get('timeframe') || '30d'

    // Calcular fecha desde
    let dateFilter: Date | undefined
    const now = new Date()
    if (timeframe === 'today') {
      dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (timeframe === '7d') {
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (timeframe === '30d') {
      dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    // 1. Obtener la plaza con sus miembros
    const foodCourt = await prisma.foodCourt.findUnique({
      where: { id: foodCourtId },
      include: {
        memberships: {
          include: {
            restaurant: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
                cuisineType: true,
              },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
        tables: {
          select: {
            id: true,
            tableNumber: true,
            zone: true,
            status: true,
          },
        },
      },
    })

    if (!foodCourt) {
      return NextResponse.json({ error: 'Plaza no encontrada' }, { status: 404 })
    }

    const tableIds = foodCourt.tables.map((t) => t.id)

    // 2. Obtener sesiones de mesa para métricas de rotación
    const [activeSessionsCount, totalSessionsCount] = await Promise.all([
      prisma.tableSession.count({
        where: {
          tableId: { in: tableIds },
          closedAt: null,
        },
      }),
      prisma.tableSession.count({
        where: {
          tableId: { in: tableIds },
          ...(dateFilter ? { createdAt: { gte: dateFilter } } : {}),
        },
      }),
    ])

    // 3. Obtener órdenes en mesas de la plaza
    const orders = await prisma.order.findMany({
      where: {
        tableId: { in: tableIds },
        status: { not: 'CANCELLED' },
        ...(dateFilter ? { createdAt: { gte: dateFilter } } : {}),
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
        table: {
          select: {
            tableNumber: true,
          },
        },
        items: {
          include: {
            product: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // 4. Calcular métricas por restaurante miembro
    const vendorMetrics = foodCourt.memberships.map((m) => {
      const vendorOrders = orders.filter((o) => o.restaurantId === m.restaurantId)
      const grossSales = vendorOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0)
      const ordersCount = vendorOrders.length
      const commissionPercentage = Number(m.commissionPercentage ?? 0)
      const commissionFixedFee = Number(m.commissionFixedFee ?? 0)

      const commissionFromPercentage = grossSales * (commissionPercentage / 100)
      const commissionFromFixed = ordersCount * commissionFixedFee
      const totalCommission = commissionFromPercentage + commissionFromFixed
      const netPayout = Math.max(0, grossSales - totalCommission)

      return {
        membershipId: m.id,
        restaurantId: m.restaurant.id,
        restaurantName: m.restaurant.name,
        restaurantSlug: m.restaurant.slug,
        restaurantLogo: m.restaurant.logoUrl,
        cuisineType: m.restaurant.cuisineType,
        commissionPercentage,
        commissionFixedFee,
        grossSales: Math.round(grossSales * 100) / 100,
        ordersCount,
        commissionAmount: Math.round(totalCommission * 100) / 100,
        netPayout: Math.round(netPayout * 100) / 100,
        averageTicket: ordersCount > 0 ? Math.round((grossSales / ordersCount) * 100) / 100 : 0,
      }
    })

    // Ordenar restaurantes por ventas brutas descendente (ranking)
    vendorMetrics.sort((a, b) => b.grossSales - a.grossSales)

    // Totales globales
    const totalGrossSales = vendorMetrics.reduce((sum, v) => sum + v.grossSales, 0)
    const totalOrders = orders.length
    const totalFoodCourtCommissions = vendorMetrics.reduce((sum, v) => sum + v.commissionAmount, 0)
    const totalNetPayout = vendorMetrics.reduce((sum, v) => sum + v.netPayout, 0)
    const avgTicket = totalOrders > 0 ? Math.round((totalGrossSales / totalOrders) * 100) / 100 : 0

    // Órdenes recientes (máximo 20)
    const recentOrders = orders.slice(0, 20).map((o) => ({
      id: o.id,
      orderNumber: o.id.slice(-4).toUpperCase(),
      restaurantId: o.restaurantId,
      restaurantName: o.restaurant.name,
      restaurantLogo: o.restaurant.logoUrl,
      tableNumber: o.table.tableNumber,
      status: o.status,
      totalAmount: Number(o.totalAmount),
      itemsCount: o.items.reduce((s, i) => s + i.quantity, 0),
      createdAt: o.createdAt.toISOString(),
      itemSummary: o.items.map((i) => `${i.quantity}x ${i.product.name}`).join(', '),
    }))

    return NextResponse.json({
      foodCourt: {
        id: foodCourt.id,
        name: foodCourt.name,
        currency: foodCourt.currency,
      },
      timeframe,
      kpis: {
        totalGrossSales: Math.round(totalGrossSales * 100) / 100,
        totalOrders,
        avgTicket,
        totalFoodCourtCommissions: Math.round(totalFoodCourtCommissions * 100) / 100,
        totalNetPayout: Math.round(totalNetPayout * 100) / 100,
        activeSessionsCount,
        totalSessionsCount,
        tablesCount: foodCourt.tables.length,
      },
      vendors: vendorMetrics,
      recentOrders,
    })
  } catch (error: any) {
    console.error('[GET /api/food-courts/[id]/reports] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al generar reportes consolidados' },
      { status: 500 }
    )
  }
}
