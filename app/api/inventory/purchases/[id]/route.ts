import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { MovementType } from '@prisma/client'
import { emitInventoryUpdate } from '@/lib/socket-server'

const ReceiveSchema = z.object({
  items: z.array(z.object({
    purchaseOrderItemId: z.string(),
    receivedQty: z.number().nonnegative(),
  })),
})

/**
 * GET /api/inventory/purchases/[id]
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const user = session.user as { restaurantId?: string }
  if (!user.restaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 403 })

  const { id } = await params
  const order = await prisma.purchaseOrder.findFirst({
    where: { id, restaurantId: user.restaurantId },
    include: {
      supplier: true,
      items: {
        include: { inventoryItem: { select: { id: true, name: true, unit: true, currentStock: true } } },
      },
      createdBy: { select: { name: true } },
    },
  })

  if (!order) return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
  return NextResponse.json({ order })
}

/**
 * PATCH /api/inventory/purchases/[id]
 * Cambia estado o recibe mercancía (actualiza stock automáticamente)
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { id: string; restaurantId?: string; role: string }
    const restaurantId = user.restaurantId
    if (!restaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 403 })

    const allowed = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER']
    if (!allowed.includes(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { id } = await params
    const order = await prisma.purchaseOrder.findFirst({
      where: { id, restaurantId },
      include: { items: { include: { inventoryItem: true } } },
    })
    if (!order) return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })

    const body = await request.json()
    const { action, items } = body

    if (action === 'cancel') {
      await prisma.purchaseOrder.update({
        where: { id },
        data: { status: 'CANCELLED' },
      })
      return NextResponse.json({ success: true, status: 'CANCELLED' })
    }

    if (action === 'send') {
      await prisma.purchaseOrder.update({
        where: { id },
        data: { status: 'SENT' },
      })
      return NextResponse.json({ success: true, status: 'SENT' })
    }

    if (action === 'receive') {
      // Validate received items
      const { items: receiveItems } = ReceiveSchema.parse({ items })

      // Create inventory movements for each item received
      await prisma.$transaction(async (tx) => {
        for (const ri of receiveItems) {
          if (ri.receivedQty <= 0) continue

          const orderItem = order.items.find((oi) => oi.id === ri.purchaseOrderItemId)
          if (!orderItem) continue

          const invItem = orderItem.inventoryItem
          const stockBefore = invItem.currentStock.toNumber()
          const stockAfter = stockBefore + ri.receivedQty

          // Update inventory item stock
          await tx.inventoryItem.update({
            where: { id: invItem.id },
            data: { currentStock: stockAfter },
          })

          // Record PURCHASE movement
          await tx.inventoryMovement.create({
            data: {
              restaurantId,
              inventoryItemId: invItem.id,
              type: 'PURCHASE' as MovementType,
              quantity: ri.receivedQty,
              stockBefore,
              stockAfter,
              unitCost: orderItem.unitCost,
              reference: order.orderNumber,
              notes: `Recepción parcial — Orden ${order.orderNumber}`,
              createdById: user.id,
            },
          })

          // Update received quantity in purchase order item
          await tx.purchaseOrderItem.update({
            where: { id: ri.purchaseOrderItemId },
            data: { receivedQty: ri.receivedQty },
          })
        }

        // Check if fully received or partial
        const allReceived = receiveItems.every((ri) => {
          const orderItem = order.items.find((oi) => oi.id === ri.purchaseOrderItemId)
          return orderItem ? ri.receivedQty >= orderItem.quantity.toNumber() : false
        })

        await tx.purchaseOrder.update({
          where: { id },
          data: {
            status: allReceived ? 'RECEIVED' : 'PARTIAL',
            receivedAt: new Date(),
          },
        })
      })

      // Emit socket update for real-time inventory UI refresh
      emitInventoryUpdate(restaurantId, {
        restaurantId,
        inventoryItemId: 'purchase-received',
        inventoryItemName: 'Recepción de compra',
        currentStock: 0,
        minStock: 0,
        isLow: false,
        isEmpty: false,
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 })
  } catch (error: any) {
    console.error('[Purchases PATCH]:', error)
    return NextResponse.json({ error: 'Error al procesar orden de compra' }, { status: 500 })
  }
}
