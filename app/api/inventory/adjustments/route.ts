import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { MovementType } from '@prisma/client'
import { emitInventoryUpdate, emitProductAvailable } from '@/lib/socket-server'
import { sendLowStockAlertEmail } from '@/lib/email'

const AdjustmentSchema = z.object({
  inventoryItemId: z.string().min(1),
  quantity: z.number(), // Puede ser negativo (merma) o positivo (corrección)
  notes: z.string().min(1, 'Las notas son obligatorias para ajustes manuales'),
  type: z.enum(['ADJUSTMENT', 'WASTE']).default('ADJUSTMENT'),
})

/**
 * POST /api/inventory/adjustments
 * Registra un ajuste manual de stock (merma, corrección de inventario físico, etc.)
 * El quantity puede ser positivo (suma) o negativo (resta).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { id: string; restaurantId?: string; role: string }
    const restaurantId = user.restaurantId
    if (!restaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 403 })

    const adminRoles = ['SUPERADMIN', 'RESTAURANT_ADMIN', 'MANAGER']
    if (!adminRoles.includes(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const body = await request.json()
    const { inventoryItemId, quantity, notes, type } = AdjustmentSchema.parse(body)

    const item = await prisma.inventoryItem.findFirst({
      where: { id: inventoryItemId, restaurantId },
    })
    if (!item) return NextResponse.json({ error: 'Ítem de inventario no encontrado' }, { status: 404 })

    const stockBefore = item.currentStock.toNumber()
    const stockAfter = Math.max(0, stockBefore + quantity) // No puede ir por debajo de 0

    const [movement, updatedItem] = await prisma.$transaction([
      prisma.inventoryMovement.create({
        data: {
          restaurantId,
          inventoryItemId,
          type: type as MovementType,
          quantity,
          stockBefore,
          stockAfter,
          notes,
          createdById: user.id,
        },
      }),
      prisma.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { currentStock: stockAfter },
      }),
    ])

    // Si el stock aumentó de 0 → resolver stock issues
    if (stockBefore <= 0 && stockAfter > 0) {
      const resolved = await prisma.productStockIssue.findMany({
        where: { inventoryItemId, resolvedAt: null },
      })

      await prisma.productStockIssue.updateMany({
        where: { inventoryItemId, resolvedAt: null },
        data: { resolvedAt: new Date() },
      })

      for (const issue of resolved) {
        emitProductAvailable(restaurantId, {
          restaurantId,
          productId: issue.productId,
          inventoryItemId,
        })
      }
    }

    emitInventoryUpdate(restaurantId, {
      restaurantId,
      inventoryItemId,
      inventoryItemName: updatedItem.name,
      currentStock: stockAfter,
      minStock: updatedItem.minStock.toNumber(),
      isLow: stockAfter <= updatedItem.minStock.toNumber(),
      isEmpty: stockAfter <= 0,
    })

    // Alerta por email si el stock alcanzó el umbral mínimo
    if (stockAfter <= updatedItem.minStock.toNumber()) {
      prisma.user
        .findMany({
          where: { restaurantId, role: { in: ['RESTAURANT_ADMIN', 'MANAGER'] } },
          select: { email: true },
        })
        .then(async (admins) => {
          const rest = await prisma.restaurant.findUnique({
            where: { id: restaurantId },
            select: { name: true },
          })
          for (const admin of admins) {
            await sendLowStockAlertEmail(
              admin.email,
              rest?.name || 'Restaurante',
              [
                {
                  name: updatedItem.name,
                  currentStock: stockAfter,
                  minStock: updatedItem.minStock.toNumber(),
                  unit: updatedItem.unit,
                },
              ]
            ).catch((e) => console.warn('[Inventory] Low stock alert email error:', e))
          }
        })
        .catch((e) => console.warn('[Inventory] Query admins for low stock email error:', e))
    }

    return NextResponse.json(
      {
        movement: {
          ...movement,
          quantity: movement.quantity.toNumber(),
          stockBefore: movement.stockBefore.toNumber(),
          stockAfter: movement.stockAfter.toNumber(),
        },
        newStock: stockAfter,
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos', details: error.flatten() }, { status: 400 })
    console.error('[POST /api/inventory/adjustments]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
