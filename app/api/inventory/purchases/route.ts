import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { PurchaseOrderStatus } from '@prisma/client'

const PurchaseItemSchema = z.object({
  inventoryItemId: z.string().min(1),
  quantity: z.number().positive(),
  unitCost: z.number().nonnegative(),
})

const PurchaseOrderSchema = z.object({
  supplierId: z.string().min(1, 'Selecciona un proveedor'),
  items: z.array(PurchaseItemSchema).min(1, 'Agrega al menos un ítem'),
  notes: z.string().optional(),
  expectedAt: z.string().optional(), // ISO date
})

/**
 * GET /api/inventory/purchases
 * Lista órdenes de compra del restaurante
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { restaurantId?: string; role: string }
    const restaurantId = user.restaurantId
    if (!restaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')

    const orders = await prisma.purchaseOrder.findMany({
      where: {
        restaurantId,
        ...(statusFilter ? { status: statusFilter as PurchaseOrderStatus } : {}),
      },
      include: {
        supplier: { select: { id: true, name: true, phone: true } },
        items: {
          include: {
            inventoryItem: { select: { id: true, name: true, unit: true } },
          },
        },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({ orders })
  } catch (error) {
    console.error('[Purchases GET]:', error)
    return NextResponse.json({ error: 'Error al listar órdenes de compra' }, { status: 500 })
  }
}

/**
 * POST /api/inventory/purchases
 * Crea una nueva orden de compra (DRAFT)
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
    const { supplierId, items, notes, expectedAt } = PurchaseOrderSchema.parse(body)

    // Verify supplier belongs to this restaurant
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, restaurantId, isActive: true },
    })
    if (!supplier) return NextResponse.json({ error: 'Proveedor no válido' }, { status: 404 })

    // Auto-generate order number
    const orderCount = await prisma.purchaseOrder.count({ where: { restaurantId } })
    const orderNumber = `PO-${String(orderCount + 1).padStart(4, '0')}`

    // Calculate totals
    const subtotal = items.reduce((acc, item) => acc + item.quantity * item.unitCost, 0)
    const total = subtotal // IVA en compras puede calcularse opcionalmente

    const order = await prisma.purchaseOrder.create({
      data: {
        restaurantId,
        supplierId,
        orderNumber,
        notes,
        expectedAt: expectedAt ? new Date(expectedAt) : null,
        subtotal,
        taxAmount: 0,
        total,
        createdById: user.id,
        items: {
          create: items.map((item) => ({
            inventoryItemId: item.inventoryItemId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            subtotal: item.quantity * item.unitCost,
          })),
        },
      },
      include: {
        supplier: { select: { name: true, phone: true } },
        items: {
          include: { inventoryItem: { select: { name: true, unit: true } } },
        },
      },
    })

    return NextResponse.json({ order }, { status: 201 })
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 422 })
    }
    console.error('[Purchases POST]:', error)
    return NextResponse.json({ error: 'Error al crear orden de compra' }, { status: 500 })
  }
}
