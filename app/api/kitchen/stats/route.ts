import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const restaurantId =
      request.nextUrl.searchParams.get('restaurantId') ||
      (session.user as { restaurantId?: string }).restaurantId

    if (!restaurantId) {
      return NextResponse.json({ error: 'Se requiere restaurantId' }, { status: 400 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Órdenes activas en cocina
    const activeOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        status: { in: ['RECEIVED', 'PREPARING'] },
      },
      select: {
        id: true,
        priority: true,
        createdAt: true,
      },
    })

    // Órdenes completadas o listas hoy
    const completedOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: { gte: today },
        status: { in: ['READY', 'DELIVERED'] },
      },
      include: {
        items: {
          select: {
            productId: true,
            quantity: true,
            product: { select: { id: true, name: true } },
          },
        },
      },
    })

    let totalPrepMinutes = 0
    let prepOrdersCount = 0
    let onTimeCount = 0

    // Tiempos por producto
    const productPrepMap: Record<
      string,
      { productId: string; name: string; totalMinutes: number; count: number }
    > = {}

    for (const order of completedOrders) {
      const finishTime = order.preparedAt ? new Date(order.preparedAt) : new Date(order.updatedAt)
      const diffMinutes = Math.max(
        1,
        Math.floor((finishTime.getTime() - new Date(order.createdAt).getTime()) / 60000)
      )

      totalPrepMinutes += diffMinutes
      prepOrdersCount++

      if (diffMinutes <= 20) {
        onTimeCount++
      }

      // Distribuir el tiempo a los productos que integran la orden
      for (const item of order.items) {
        if (!productPrepMap[item.productId]) {
          productPrepMap[item.productId] = {
            productId: item.productId,
            name: item.product.name,
            totalMinutes: 0,
            count: 0,
          }
        }
        productPrepMap[item.productId].totalMinutes += diffMinutes * item.quantity
        productPrepMap[item.productId].count += item.quantity
      }
    }

    const avgPreparationTimeMinutes =
      prepOrdersCount > 0 ? Math.round(totalPrepMinutes / prepOrdersCount) : 15

    const onTimeRate =
      prepOrdersCount > 0 ? Math.round((onTimeCount / prepOrdersCount) * 100) : 100

    const productStats = Object.values(productPrepMap)
      .map((p) => {
        const avgMinutes = Math.round(p.totalMinutes / p.count)
        return {
          productId: p.productId,
          name: p.name,
          orderCount: p.count,
          avgMinutes,
          isBottleneck: avgMinutes > 20,
        }
      })
      .sort((a, b) => b.avgMinutes - a.avgMinutes)

    return NextResponse.json({
      avgPreparationTimeMinutes,
      activeOrdersCount: activeOrders.length,
      urgentOrdersCount: activeOrders.filter((o) => o.priority === 'URGENT').length,
      todayCompletedCount: completedOrders.length,
      onTimeRate,
      productStats,
    })
  } catch (error) {
    console.error('[GET /api/kitchen/stats] Error:', error)
    return NextResponse.json({ error: 'Error al calcular estadísticas de cocina' }, { status: 500 })
  }
}
