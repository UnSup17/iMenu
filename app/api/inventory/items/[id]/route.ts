import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { MovementType } from '@prisma/client'
import {
  emitInventoryUpdate,
  emitProductAvailable,
} from '@/lib/socket-server'

const UpdateItemSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  sku: z.string().max(50).optional(),
  unit: z.enum(['KG', 'GRAM', 'LITER', 'ML', 'UNIT', 'PORTION']).optional(),
  minStock: z.number().min(0).optional(),
  costPerUnit: z.number().min(0).optional(),
  supplier: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
})

const PurchaseSchema = z.object({
  quantity: z.number().positive(),
  unitCost: z.number().min(0).optional(),
  notes: z.string().optional(),
})

function getAuth(session: unknown) {
  const user = (session as { user: { id: string; restaurantId?: string; role: string } }).user
  return user
}

/**
 * GET /api/inventory/items/[id]
 * Detalle de un ítem con historial de movimientos recientes.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const user = getAuth(session)
    if (!user.restaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 403 })

    const { id } = await params

    const item = await prisma.inventoryItem.findFirst({
      where: { id, restaurantId: user.restaurantId },
      include: {
        productRecipes: {
          include: { product: { select: { id: true, name: true } } },
        },
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { createdBy: { select: { name: true, email: true } } },
        },
        stockIssues: {
          where: { resolvedAt: null },
          include: { product: { select: { name: true } } },
        },
      },
    })

    if (!item) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    return NextResponse.json({
      item: {
        ...item,
        currentStock: item.currentStock.toNumber(),
        minStock: item.minStock.toNumber(),
        costPerUnit: item.costPerUnit.toNumber(),
        isLowStock: item.currentStock.toNumber() <= item.minStock.toNumber(),
        isEmpty: item.currentStock.toNumber() <= 0,
        movements: item.movements.map((m) => ({
          ...m,
          quantity: m.quantity.toNumber(),
          stockBefore: m.stockBefore.toNumber(),
          stockAfter: m.stockAfter.toNumber(),
          unitCost: m.unitCost?.toNumber() ?? null,
        })),
        productRecipes: item.productRecipes.map((r) => ({
          ...r,
          quantity: r.quantity.toNumber(),
        })),
      },
    })
  } catch (error) {
    console.error('[GET /api/inventory/items/[id]]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/**
 * PATCH /api/inventory/items/[id]
 * Actualiza metadatos del ítem (no el stock — para eso usar /purchases o /adjustments).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const user = getAuth(session)
    if (!user.restaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 403 })

    const adminRoles = ['SUPERADMIN', 'RESTAURANT_ADMIN', 'MANAGER']
    if (!adminRoles.includes(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { id } = await params
    const body = await request.json()
    const data = UpdateItemSchema.parse(body)

    const item = await prisma.inventoryItem.findFirst({
      where: { id, restaurantId: user.restaurantId },
    })
    if (!item) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const updated = await prisma.inventoryItem.update({ where: { id }, data })

    return NextResponse.json({
      item: { ...updated, currentStock: updated.currentStock.toNumber(), minStock: updated.minStock.toNumber() },
    })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos', details: error.flatten() }, { status: 400 })
    console.error('[PATCH /api/inventory/items/[id]]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/**
 * DELETE /api/inventory/items/[id]
 * Desactivación lógica (isActive = false). No borra físicamente.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const user = getAuth(session)
    if (!user.restaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 403 })

    const adminRoles = ['SUPERADMIN', 'RESTAURANT_ADMIN']
    if (!adminRoles.includes(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { id } = await params

    await prisma.inventoryItem.updateMany({
      where: { id, restaurantId: user.restaurantId },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/inventory/items/[id]]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/**
 * POST /api/inventory/items/[id]/purchase
 * Registra una entrada de stock (compra a proveedor).
 * Usar ?action=purchase en el body.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const user = getAuth(session)
    if (!user.restaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 403 })

    const adminRoles = ['SUPERADMIN', 'RESTAURANT_ADMIN', 'MANAGER']
    if (!adminRoles.includes(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { id } = await params
    const body = await request.json()
    const { quantity, unitCost, notes } = PurchaseSchema.parse(body)

    const item = await prisma.inventoryItem.findFirst({
      where: { id, restaurantId: user.restaurantId },
    })
    if (!item) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const stockBefore = item.currentStock.toNumber()
    const stockAfter = stockBefore + quantity

    const [movement, updatedItem] = await prisma.$transaction([
      prisma.inventoryMovement.create({
        data: {
          restaurantId: user.restaurantId,
          inventoryItemId: id,
          type: MovementType.PURCHASE,
          quantity,
          stockBefore,
          stockAfter,
          unitCost: unitCost ?? undefined,
          notes,
          createdById: user.id,
        },
      }),
      prisma.inventoryItem.update({
        where: { id },
        data: {
          currentStock: stockAfter,
          ...(unitCost ? { costPerUnit: unitCost } : {}),
        },
      }),
    ])

    // Resolver stock issues si el ítem volvió a tener stock
    if (stockBefore <= 0 && stockAfter > 0) {
      const resolved = await prisma.productStockIssue.findMany({
        where: { inventoryItemId: id, resolvedAt: null },
      })

      await prisma.productStockIssue.updateMany({
        where: { inventoryItemId: id, resolvedAt: null },
        data: { resolvedAt: new Date() },
      })

      // Emitir disponibilidad restaurada para cada producto afectado
      for (const issue of resolved) {
        emitProductAvailable(user.restaurantId!, {
          restaurantId: user.restaurantId!,
          productId: issue.productId,
          inventoryItemId: id,
        })
      }
    }

    // Emitir actualización de inventario al staff
    emitInventoryUpdate(user.restaurantId!, {
      restaurantId: user.restaurantId!,
      inventoryItemId: id,
      inventoryItemName: updatedItem.name,
      currentStock: stockAfter,
      minStock: updatedItem.minStock.toNumber(),
      isLow: stockAfter <= updatedItem.minStock.toNumber(),
      isEmpty: stockAfter <= 0,
    })

    return NextResponse.json({ movement, newStock: stockAfter }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos', details: error.flatten() }, { status: 400 })
    console.error('[POST /api/inventory/items/[id]]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
