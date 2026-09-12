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

    const search = request.nextUrl.searchParams.get('search')?.trim().toLowerCase()
    const waiterId = request.nextUrl.searchParams.get('waiterId')
    const hourRange = request.nextUrl.searchParams.get('hourRange') // morning, noon, evening, night
    const productId = request.nextUrl.searchParams.get('productId')
    const status = request.nextUrl.searchParams.get('status')
    const priority = request.nextUrl.searchParams.get('priority')
    const dateParam = request.nextUrl.searchParams.get('date') // YYYY-MM-DD

    // Rango de fecha (por defecto hoy)
    const targetDate = dateParam ? new Date(dateParam + 'T00:00:00') : new Date()
    const startDate = new Date(targetDate)
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(targetDate)
    endDate.setHours(23, 59, 59, 999)

    // Filtros base
    const where: any = {
      restaurantId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    }

    if (status && status !== 'ALL') {
      where.status = status
    }

    if (priority && priority !== 'ALL') {
      where.priority = priority
    }

    if (waiterId && waiterId !== 'ALL') {
      where.table = {
        assignedWaiterId: waiterId,
      }
    }

    if (productId && productId !== 'ALL') {
      where.items = {
        some: { productId },
      }
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        table: {
          select: {
            id: true,
            tableNumber: true,
            zone: true,
            assignedWaiter: { select: { id: true, name: true, email: true } },
          },
        },
        items: {
          include: {
            product: { select: { id: true, name: true, category: { select: { name: true } } } },
            modifiers: { include: { modifierOption: true } },
            additions: { include: { addition: true } },
          },
        },
      },
    })

    // Filtrar en memoria por búsqueda libre y por rango horario
    let filtered = orders

    if (hourRange && hourRange !== 'ALL') {
      filtered = filtered.filter((order) => {
        const hour = new Date(order.createdAt).getHours()
        switch (hourRange) {
          case 'morning':
            return hour >= 6 && hour < 12
          case 'noon':
            return hour >= 12 && hour < 16
          case 'evening':
            return hour >= 16 && hour < 20
          case 'night':
            return hour >= 20 || hour < 6
          default:
            return true
        }
      })
    }

    if (search) {
      filtered = filtered.filter((order) => {
        const tableStr = `mesa ${order.table.tableNumber}`.toLowerCase()
        const orderIdStr = order.id.toLowerCase()
        const notesStr = (order.notes || '').toLowerCase()
        const productsStr = order.items.map((i) => i.product.name.toLowerCase()).join(' ')
        const itemNotesStr = order.items.map((i) => (i.itemNotes || '').toLowerCase()).join(' ')

        return (
          tableStr.includes(search) ||
          orderIdStr.includes(search) ||
          notesStr.includes(search) ||
          productsStr.includes(search) ||
          itemNotesStr.includes(search)
        )
      })
    }

    // Métricas calculadas
    let totalRevenue = 0
    let totalPrepMinutes = 0
    let prepCount = 0
    let onTimeOrdersCount = 0

    for (const o of filtered) {
      if (o.status !== 'CANCELLED') {
        totalRevenue += o.totalAmount.toNumber()
      }

      // Tiempo de preparación si fue completado o entregado
      if (o.preparedAt) {
        const diffMinutes = Math.floor(
          (new Date(o.preparedAt).getTime() - new Date(o.createdAt).getTime()) / 60000
        )
        if (diffMinutes >= 0) {
          totalPrepMinutes += diffMinutes
          prepCount++
          if (diffMinutes <= 20) {
            onTimeOrdersCount++
          }
        }
      }
    }

    const avgPrepMinutes = prepCount > 0 ? Math.round(totalPrepMinutes / prepCount) : null
    const onTimeRate = prepCount > 0 ? Math.round((onTimeOrdersCount / prepCount) * 100) : 100

    return NextResponse.json({
      orders: filtered.map((o) => {
        const elapsedMinutes = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60000)
        const prepTimeMinutes = o.preparedAt
          ? Math.floor((new Date(o.preparedAt).getTime() - new Date(o.createdAt).getTime()) / 60000)
          : null

        return {
          id: o.id,
          tableId: o.tableId,
          tableNumber: o.table.tableNumber,
          zone: o.table.zone,
          waiterName: o.table.assignedWaiter?.name || null,
          status: o.status,
          priority: o.priority,
          totalAmount: o.totalAmount.toNumber(),
          notes: o.notes,
          createdAt: o.createdAt.toISOString(),
          preparedAt: o.preparedAt ? o.preparedAt.toISOString() : null,
          deliveredAt: o.deliveredAt ? o.deliveredAt.toISOString() : null,
          elapsedMinutes,
          prepTimeMinutes,
          itemsCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
          items: o.items.map((i) => ({
            id: i.id,
            productId: i.productId,
            name: i.product.name,
            category: i.product.category?.name || 'General',
            quantity: i.quantity,
            unitPrice: i.unitPrice.toNumber(),
            subtotal: i.subtotal.toNumber(),
            itemNotes: i.itemNotes,
            isPrepared: i.isPrepared,
            modifiers: i.modifiers.map((m) => m.modifierOption.name),
            additions: i.additions.map((a) => ({
              id: a.additionId,
              name: a.addition.name,
              quantity: a.quantity,
              price: a.priceCharged.toNumber(),
            })),
          })),
        }
      }),
      summary: {
        totalOrders: filtered.length,
        totalRevenue,
        avgPrepMinutes,
        onTimeRate,
      },
    })
  } catch (error) {
    console.error('[GET /api/orders/history] Error:', error)
    return NextResponse.json({ error: 'Error al consultar historial de órdenes' }, { status: 500 })
  }
}
