import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const restaurantId = req.nextUrl.searchParams.get('restaurantId')

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId es requerido' }, { status: 400 })
    }

    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // ── Carga actual ─────────────────────────────────────────────────────────
    const [activeOrdersCount, activeOrders] = await Promise.all([
      prisma.order.count({
        where: { restaurantId, status: { in: ['RECEIVED', 'PREPARING'] } },
      }),
      prisma.order.findMany({
        where: { restaurantId, status: { in: ['RECEIVED', 'PREPARING'] } },
        include: {
          items: {
            where: { isPrepared: false },
            include: { product: { select: { prepTimeMinutes: true } } },
          },
        },
      }),
    ])

    // ── Promedio histórico real (últimas 20 órdenes entregadas en 24h) ───────
    const recentDelivered = await prisma.order.findMany({
      where: {
        restaurantId,
        status: 'DELIVERED',
        deliveredAt: { gte: last24h },
        preparedAt: { not: null },
        createdAt: { gte: last24h },
      },
      select: { createdAt: true, preparedAt: true },
      orderBy: { deliveredAt: 'desc' },
      take: 20,
    })

    let avgHistoricalMinutes: number | null = null
    if (recentDelivered.length >= 3) {
      const totalMs = recentDelivered.reduce((acc, o) => {
        const prepMs = o.preparedAt!.getTime() - o.createdAt.getTime()
        return acc + prepMs
      }, 0)
      avgHistoricalMinutes = Math.round(totalMs / recentDelivered.length / 60000)
    }

    // ── ETA basado en prepTimeMinutes de ítems pendientes ────────────────────
    const pendingItemsEtaMinutes = activeOrders.reduce((maxEta, order) => {
      const orderEta = order.items.reduce((sum, item) => {
        return sum + (item.product.prepTimeMinutes ?? 0) * item.quantity
      }, 0)
      return Math.max(maxEta, orderEta)
    }, 0)

    // ── Estimación final combinada ────────────────────────────────────────────
    const baseMinutes = 15
    const additionalPerOrder = 3
    const loadBased = baseMinutes + activeOrdersCount * additionalPerOrder
    const historicalBased = avgHistoricalMinutes ? avgHistoricalMinutes + Math.floor(activeOrdersCount * 1.5) : null
    const etaBased = pendingItemsEtaMinutes > 0 ? pendingItemsEtaMinutes : null

    // Usar la estimación más informada: histórico > ETA por items > carga
    const rawEstimate = historicalBased ?? etaBased ?? loadBased
    const estimatedMinutes = Math.min(Math.max(rawEstimate, 8), 65)

    let pace: 'calm' | 'normal' | 'busy' = 'normal'
    if (activeOrdersCount <= 2) {
      pace = 'calm'
    } else if (activeOrdersCount > 6) {
      pace = 'busy'
    }

    return NextResponse.json({
      activeOrdersCount,
      estimatedMinutes,
      pace,
      avgHistoricalMinutes,
      pendingItemsEtaMinutes: pendingItemsEtaMinutes > 0 ? pendingItemsEtaMinutes : null,
      historicalSampleSize: recentDelivered.length,
    })
  } catch (error) {
    console.error('[Kitchen Load API error]:', error)
    return NextResponse.json({ error: 'Error al calcular carga de cocina' }, { status: 500 })
  }
}

