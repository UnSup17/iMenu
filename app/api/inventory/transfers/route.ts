import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { emitInventoryUpdate } from '@/lib/socket-server'

const TransferSchema = z.object({
  destinationRestaurantId: z.string().min(1, 'Selecciona la sede de destino'),
  items: z.array(z.object({
    inventoryItemId: z.string().min(1),
    quantity: z.number().positive('La cantidad debe ser positiva'),
    unitCost: z.number().nonnegative().optional(),
  })).min(1, 'Agrega al menos un ítem'),
  notes: z.string().optional(),
})

/**
 * GET /api/inventory/transfers
 * Lista transferencias de/hacia este restaurante (movimientos TRANSFER)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { restaurantId?: string; organizationId?: string }
    const restaurantId = user.restaurantId
    if (!restaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 403 })

    const outboundMovements = await prisma.inventoryMovement.findMany({
      where: {
        restaurantId,
        type: 'TRANSFER',
        quantity: { lt: 0 }, // Salidas = transferencias enviadas
      },
      include: {
        inventoryItem: { select: { name: true, unit: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const inboundMovements = await prisma.inventoryMovement.findMany({
      where: {
        restaurantId,
        type: 'TRANSFER',
        quantity: { gt: 0 }, // Entradas = transferencias recibidas
      },
      include: {
        inventoryItem: { select: { name: true, unit: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Get sibling restaurants for transfer destination selector
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { organizationId: true, name: true },
    })

    let siblings: Array<{ id: string; name: string }> = []
    if (restaurant?.organizationId) {
      siblings = await prisma.restaurant.findMany({
        where: {
          organizationId: restaurant.organizationId,
          isActive: true,
          NOT: { id: restaurantId },
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    }

    return NextResponse.json({ outboundMovements, inboundMovements, siblings })
  } catch (error) {
    console.error('[Transfers GET]:', error)
    return NextResponse.json({ error: 'Error al cargar transferencias' }, { status: 500 })
  }
}

/**
 * POST /api/inventory/transfers
 * Crea una transferencia: descuenta de sede origen y suma en sede destino (atómico)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { id: string; restaurantId?: string; organizationId?: string; role: string }
    const originRestaurantId = user.restaurantId
    if (!originRestaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 403 })

    const allowed = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER']
    if (!allowed.includes(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const body = await request.json()
    const { destinationRestaurantId, items, notes } = TransferSchema.parse(body)

    if (destinationRestaurantId === originRestaurantId) {
      return NextResponse.json({ error: 'La sede de destino debe ser diferente al origen' }, { status: 422 })
    }

    // Verify destination belongs to same organization
    const origin = await prisma.restaurant.findUnique({
      where: { id: originRestaurantId },
      select: { organizationId: true, name: true },
    })
    const destination = await prisma.restaurant.findUnique({
      where: { id: destinationRestaurantId },
      select: { organizationId: true, name: true },
    })

    if (!destination) return NextResponse.json({ error: 'Sede de destino no encontrada' }, { status: 404 })

    if (origin?.organizationId && destination?.organizationId !== origin.organizationId) {
      return NextResponse.json({ error: 'Las sedes no pertenecen a la misma organización' }, { status: 403 })
    }

    const transferRef = `TRF-${Date.now().toString().slice(-6)}`
    const note = notes || `Transferencia de ${origin?.name ?? 'Sede'} a ${destination.name}`

    await prisma.$transaction(async (tx) => {
      for (const { inventoryItemId, quantity, unitCost } of items) {
        // Find the origin inventory item
        const originItem = await tx.inventoryItem.findFirst({
          where: { id: inventoryItemId, restaurantId: originRestaurantId },
        })
        if (!originItem) continue

        const stockBefore = originItem.currentStock.toNumber()
        const stockAfterOrigin = Math.max(0, stockBefore - quantity)

        // Deduct from origin
        await tx.inventoryItem.update({
          where: { id: inventoryItemId },
          data: { currentStock: stockAfterOrigin },
        })

        // Record outbound TRANSFER movement at origin
        await tx.inventoryMovement.create({
          data: {
            restaurantId: originRestaurantId,
            inventoryItemId,
            type: 'TRANSFER',
            quantity: -quantity, // Negative = outbound
            stockBefore,
            stockAfter: stockAfterOrigin,
            unitCost: unitCost ?? originItem.costPerUnit,
            reference: transferRef,
            notes: `[SALIDA] ${note}`,
            createdById: user.id,
          },
        })

        // Find or create the destination inventory item (same sku/name)
        let destItem = await tx.inventoryItem.findFirst({
          where: { restaurantId: destinationRestaurantId, name: originItem.name },
        })

        if (!destItem) {
          // Create a mirror inventory item at destination if it doesn't exist
          destItem = await tx.inventoryItem.create({
            data: {
              restaurantId: destinationRestaurantId,
              name: originItem.name,
              sku: originItem.sku,
              unit: originItem.unit,
              currentStock: 0,
              minStock: originItem.minStock,
              costPerUnit: originItem.costPerUnit,
            },
          })
        }

        const destStockBefore = destItem.currentStock.toNumber()
        const destStockAfter = destStockBefore + quantity

        // Add to destination
        await tx.inventoryItem.update({
          where: { id: destItem.id },
          data: { currentStock: destStockAfter },
        })

        // Record inbound TRANSFER movement at destination
        await tx.inventoryMovement.create({
          data: {
            restaurantId: destinationRestaurantId,
            inventoryItemId: destItem.id,
            type: 'TRANSFER',
            quantity: quantity, // Positive = inbound
            stockBefore: destStockBefore,
            stockAfter: destStockAfter,
            unitCost: unitCost ?? originItem.costPerUnit,
            reference: transferRef,
            notes: `[ENTRADA] ${note}`,
            createdById: user.id,
          },
        })
      }
    })

    // Emit realtime updates for both sides
    emitInventoryUpdate(originRestaurantId, {
      restaurantId: originRestaurantId,
      inventoryItemId: 'transfer',
      inventoryItemName: 'Transferencia salida',
      currentStock: 0,
      minStock: 0,
      isLow: false,
      isEmpty: false,
    })
    emitInventoryUpdate(destinationRestaurantId, {
      restaurantId: destinationRestaurantId,
      inventoryItemId: 'transfer',
      inventoryItemName: 'Transferencia entrada',
      currentStock: 0,
      minStock: 0,
      isLow: false,
      isEmpty: false,
    })

    return NextResponse.json({ success: true, transferRef })
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 422 })
    }
    console.error('[Transfers POST]:', error)
    return NextResponse.json({ error: 'Error al procesar transferencia' }, { status: 500 })
  }
}
