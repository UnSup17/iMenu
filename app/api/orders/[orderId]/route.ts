import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSocketServer } from '@/lib/socket-server'
import { WsServerEvent } from '@/types/websocket-events'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ orderId: string }>
}

const UpdateOrderSchema = z.object({
  status: z.enum(['RECEIVED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED']).optional(),
  priority: z.enum(['NORMAL', 'URGENT']).optional(),
  notes: z.string().optional(),
})

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { orderId } = await params

    const order = await prisma.order.findUnique({
      where: { id: orderId },
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
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                categoryId: true,
                category: { select: { name: true } },
              },
            },
            modifiers: { include: { modifierOption: true } },
            additions: { include: { addition: true } },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('[GET /api/orders/[orderId]] Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { orderId } = await params
    const body = await request.json()
    const parsed = UpdateOrderSchema.parse(body)

    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      include: { table: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    const updateData: any = {}
    if (parsed.status) {
      updateData.status = parsed.status
      if (parsed.status === 'READY' && !existing.preparedAt) {
        updateData.preparedAt = new Date()
      }
      if (parsed.status === 'DELIVERED' && !existing.deliveredAt) {
        updateData.deliveredAt = new Date()
      }
    }
    if (parsed.priority) {
      updateData.priority = parsed.priority
    }
    if (parsed.notes !== undefined) {
      updateData.notes = parsed.notes
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        table: { select: { tableNumber: true } },
        items: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
    })

    // Si se cancela la orden, restaurar automáticamente stock de inventario
    if (parsed.status === 'CANCELLED') {
      try {
        const { restoreStockForOrder } = await import('@/lib/inventory/stock-manager')
        const { emitInventoryUpdate } = await import('@/lib/socket-server')
        const result = await restoreStockForOrder(orderId, existing.restaurantId, session.user.id || 'system')
        if (result.restoredItems && result.restoredItems.length > 0) {
          const items = await prisma.inventoryItem.findMany({
            where: { id: { in: result.restoredItems } },
          })
          for (const item of items) {
            emitInventoryUpdate(existing.restaurantId, {
              restaurantId: existing.restaurantId,
              inventoryItemId: item.id,
              inventoryItemName: item.name,
              currentStock: item.currentStock.toNumber(),
              minStock: item.minStock.toNumber(),
              isLow: item.currentStock.toNumber() <= item.minStock.toNumber(),
              isEmpty: item.currentStock.toNumber() <= 0,
            })
          }
        }
      } catch (stockErr) {
        console.warn('[PATCH /api/orders/[orderId]] Error al restaurar stock:', stockErr)
      }
    }

    // Emitir Socket.IO para actualizar mesa de comensal y paneles de staff
    try {
      const io = getSocketServer()
      if (io) {
        const tableRoom = `restaurant:${existing.restaurantId}:table:${existing.tableId}`
        const statusPayload = {
          orderId,
          restaurantId: existing.restaurantId,
          tableId: existing.tableId,
          newStatus: updatedOrder.status,
          priority: updatedOrder.priority,
          timestamp: new Date().toISOString(),
        }
        io.to(tableRoom).emit(WsServerEvent.ORDER_STATUS_UPDATED, statusPayload as any)
        ;(io as any).emit('staff:order_updated', {
          ...statusPayload,
          tableNumber: updatedOrder.table.tableNumber,
        })
      }
    } catch (socketErr) {
      console.warn('[PATCH /api/orders/[orderId]] Socket error:', socketErr)
    }

    // Notificación Web Push a la mesa cuando el pedido está listo
    if (parsed.status === 'READY') {
      try {
        const rest = await prisma.restaurant.findUnique({
          where: { id: existing.restaurantId },
          select: { name: true },
        })
        const { notifyTableOrderReady } = await import('@/lib/push/send')
        notifyTableOrderReady(
          existing.tableId,
          orderId.slice(-4).toUpperCase(),
          rest?.name || 'el Restaurante'
        ).catch((e) => console.warn('[Web Push] Error enviando push:', e))
      } catch (pushErr) {
        console.warn('[Web Push] Error preparando push:', pushErr)
      }
    }

    return NextResponse.json(updatedOrder)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Datos inválidos' }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'Error al actualizar orden'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
