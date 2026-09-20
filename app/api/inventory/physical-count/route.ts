import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { emitInventoryUpdate } from '@/lib/socket-server'

const PhysicalCountSchema = z.object({
  counts: z.array(z.object({
    inventoryItemId: z.string().min(1),
    countedQty: z.number().nonnegative(),
  })),
  notes: z.string().optional(),
})

/**
 * GET /api/inventory/physical-count
 * Devuelve el listado de ítems con stock actual para el conteo físico
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { restaurantId?: string; role: string }
    const restaurantId = user.restaurantId
    if (!restaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 403 })

    const items = await prisma.inventoryItem.findMany({
      where: { restaurantId, isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        currentStock: true,
        minStock: true,
        costPerUnit: true,
        supplier: true,
      },
      orderBy: { name: 'asc' },
    })

    // Compute last physical count date from movements
    const lastCount = await prisma.inventoryMovement.findFirst({
      where: { restaurantId, type: 'PHYSICAL_COUNT' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })

    return NextResponse.json({ items, lastCountAt: lastCount?.createdAt ?? null })
  } catch (error) {
    console.error('[PhysicalCount GET]:', error)
    return NextResponse.json({ error: 'Error al cargar ítems para conteo' }, { status: 500 })
  }
}

/**
 * POST /api/inventory/physical-count
 * Guarda el conteo físico: calcula discrepancias y genera movimientos PHYSICAL_COUNT
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { id: string; restaurantId?: string; role: string }
    const restaurantId = user.restaurantId
    if (!restaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 403 })

    const allowed = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER']
    if (!allowed.includes(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const body = await request.json()
    const { counts, notes } = PhysicalCountSchema.parse(body)

    const results: Array<{
      itemId: string
      itemName: string
      systemStock: number
      countedQty: number
      discrepancy: number
    }> = []

    await prisma.$transaction(async (tx) => {
      for (const { inventoryItemId, countedQty } of counts) {
        const item = await tx.inventoryItem.findFirst({
          where: { id: inventoryItemId, restaurantId },
        })
        if (!item) continue

        const systemStock = item.currentStock.toNumber()
        const discrepancy = countedQty - systemStock

        // Only create movement if there's a discrepancy
        if (Math.abs(discrepancy) > 0.001) {
          await tx.inventoryMovement.create({
            data: {
              restaurantId,
              inventoryItemId,
              type: 'PHYSICAL_COUNT',
              quantity: discrepancy,
              stockBefore: systemStock,
              stockAfter: countedQty,
              notes: notes || `Conteo físico ${new Date().toLocaleDateString('es-CO')} — Discrepancia: ${discrepancy > 0 ? '+' : ''}${discrepancy.toFixed(3)}`,
              createdById: user.id,
            },
          })

          await tx.inventoryItem.update({
            where: { id: inventoryItemId },
            data: { currentStock: countedQty },
          })
        }

        results.push({
          itemId: item.id,
          itemName: item.name,
          systemStock,
          countedQty,
          discrepancy,
        })
      }
    })

    emitInventoryUpdate(restaurantId, {
      restaurantId,
      inventoryItemId: 'bulk',
      inventoryItemName: 'Conteo físico',
      currentStock: 0,
      minStock: 0,
      isLow: false,
      isEmpty: false,
    })

    const adjustedCount = results.filter((r) => Math.abs(r.discrepancy) > 0.001).length

    return NextResponse.json({
      success: true,
      totalItems: results.length,
      adjustedItems: adjustedCount,
      results,
    })
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 422 })
    }
    console.error('[PhysicalCount POST]:', error)
    return NextResponse.json({ error: 'Error al guardar conteo físico' }, { status: 500 })
  }
}
